package runner

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"os"
)

const namespace = "coding-runners"

type Request struct {
	Language        string
	Code            string
	Stdin           string
	TimeoutMs       int64
	MemoryMb        int64
	UseCache        bool
	CacheKey        string
	CompiledBinary  string
}

type Result struct {
	Stdout   string
	Stderr   string
	ExitCode int
	Runtime  int64
	Memory   int64
	TimedOut bool
}

type Runner struct {
	client *kubernetes.Clientset
}

func New() (*Runner, error) {
	cfg, err := buildConfig()
	if err != nil {
		return nil, err
	}
	client, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return nil, err
	}
	return &Runner{client: client}, nil
}

func buildConfig() (*rest.Config, error) {
	// In-cluster first
	if cfg, err := rest.InClusterConfig(); err == nil {
		return cfg, nil
	}
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homedir.HomeDir(); home != "" {
			kubeconfig = filepath.Join(home, ".kube", "config")
		}
	}
	return clientcmd.BuildConfigFromFlags("", kubeconfig)
}

func (r *Runner) Run(ctx context.Context, req Request) (*Result, error) {
	podName := fmt.Sprintf("runner-%s", uuid.New().String()[:8])
	timeoutSec := req.TimeoutMs / 1000
	if timeoutSec < 1 {
		timeoutSec = 2
	}
	memLimit := fmt.Sprintf("%dMi", req.MemoryMb)
	if req.MemoryMb == 0 {
		memLimit = "256Mi"
	}

	// Set up environment variables
	envVars := []corev1.EnvVar{
		{Name: "LANGUAGE", Value: req.Language},
		{Name: "STDIN", Value: req.Stdin},
	}

	// Use cached binary if available
	if req.UseCache && req.CompiledBinary != "" {
		envVars = append(envVars, corev1.EnvVar{Name: "USE_CACHE", Value: "true"})
		envVars = append(envVars, corev1.EnvVar{Name: "COMPILED_BINARY", Value: req.CompiledBinary})
	} else {
		envVars = append(envVars, corev1.EnvVar{Name: "CODE", Value: req.Code})
	}

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      podName,
			Namespace: namespace,
			Labels:    map[string]string{"app": "code-runner"},
		},
		Spec: corev1.PodSpec{
			RestartPolicy: corev1.RestartPolicyNever,
			Containers: []corev1.Container{
				{
					Name:  "runner",
					Image: imageFor(req.Language),
					Resources: corev1.ResourceRequirements{
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("1"),
							corev1.ResourceMemory: resource.MustParse(memLimit),
						},
						Requests: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("100m"),
							corev1.ResourceMemory: resource.MustParse("64Mi"),
						},
					},
					SecurityContext: &corev1.SecurityContext{
						RunAsUser:                ptr64(1000),
						RunAsNonRoot:             ptrBool(true),
						ReadOnlyRootFilesystem:   ptrBool(true),
						AllowPrivilegeEscalation: ptrBool(false),
						Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
					},
					Env: envVars,
				},
			},
		},
	}

	if _, err := r.client.CoreV1().Pods(namespace).Create(ctx, pod, metav1.CreateOptions{}); err != nil {
		return nil, fmt.Errorf("create pod: %w", err)
	}
	defer r.client.CoreV1().Pods(namespace).Delete(ctx, podName, metav1.DeleteOptions{}) //nolint

	deadline := time.Duration(timeoutSec+5) * time.Second
	timedOut := false

	err := wait.PollUntilContextTimeout(ctx, time.Second, deadline, true, func(ctx context.Context) (bool, error) {
		p, err := r.client.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
		if err != nil {
			return false, err
		}
		return p.Status.Phase == corev1.PodSucceeded || p.Status.Phase == corev1.PodFailed, nil
	})
	if err != nil {
		timedOut = true
	}

	// Fetch logs regardless
	logStream, err := r.client.CoreV1().Pods(namespace).GetLogs(podName, &corev1.PodLogOptions{}).Stream(ctx)
	if err != nil {
		return &Result{TimedOut: timedOut, Stderr: "failed to get logs"}, nil
	}
	defer logStream.Close()

	buf := new(bytes.Buffer)
	io.Copy(buf, logStream) //nolint

	// Get pod metrics for runtime and memory usage
	var runtime int64
	var memory int64
	
	if !timedOut {
		pod, err := r.client.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
		if err == nil && len(pod.Status.ContainerStatuses) > 0 {
			// Calculate runtime from container state
			if pod.Status.ContainerStatuses[0].State.Terminated != nil {
				startTime := pod.Status.ContainerStatuses[0].State.Terminated.StartedAt.Time
				endTime := pod.Status.ContainerStatuses[0].State.Terminated.FinishedAt.Time
				runtime = endTime.Sub(startTime).Milliseconds()
			}
		}
	}

	// Check if memory limit was exceeded (Kubernetes would have killed the pod)
	if timedOut && buf.String() == "" {
		return &Result{
			Stdout:   "",
			Stderr:   "Memory limit exceeded",
			ExitCode: 137,
			Runtime:  runtime,
			Memory:   req.MemoryMb * 1024 * 1024,
			TimedOut: false,
		}, nil
	}

	return &Result{
		Stdout:   buf.String(),
		Runtime:  runtime,
		Memory:   memory,
		TimedOut: timedOut,
	}, nil
}

func imageFor(lang string) string {
	images := map[string]string{
		"go":         "runner-go:latest",
		"python":     "runner-python:latest",
		"javascript": "runner-node:latest",
		"typescript": "runner-node:latest",
		"java":       "runner-java:latest",
		"kotlin":     "runner-kotlin:latest",
		"c":          "runner-c:latest",
		"cpp":        "runner-cpp:latest",
		"rust":       "runner-rust:latest",
	}
	if img, ok := images[lang]; ok {
		return img
	}
	return "runner-python:latest"
}

func ptr64(i int64) *int64 { return &i }
func ptrBool(b bool) *bool { return &b }
