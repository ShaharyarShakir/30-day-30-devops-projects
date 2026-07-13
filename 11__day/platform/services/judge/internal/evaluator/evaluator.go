package evaluator

import (
	"context"
	"strings"
	"unicode"

	"github.com/platform/services/judge/internal/runner"
)

const (
	VerdictAccepted            = "Accepted"
	VerdictWrongAnswer         = "Wrong Answer"
	VerdictTimeLimitExceeded   = "Time Limit Exceeded"
	VerdictMemoryLimitExceeded = "Memory Limit Exceeded"
	VerdictRuntimeError        = "Runtime Error"
	VerdictCompilationError    = "Compilation Error"
	VerdictSystemError         = "System Error"
)

type TestCase struct {
	ID             string
	Input          string
	ExpectedOutput string
	Hidden         bool
	Weight         int
}

type TestCaseResult struct {
	TestCaseID string
	Status     string
	Runtime    int64
	Memory     int64
	Stdout     string
	Stderr     string
}

type EvaluationResult struct {
	Status          string
	Score           int
	TotalScore      int
	Runtime         int64
	Memory          int64
	TestCaseResults []TestCaseResult
}

type Evaluator struct {
	runner *runner.Runner
}

func New(r *runner.Runner) *Evaluator {
	return &Evaluator{runner: r}
}

func (e *Evaluator) Evaluate(ctx context.Context, language, code string, testCases []TestCase, timeLimitMs, memoryLimitMb int64) EvaluationResult {
	results := make([]TestCaseResult, 0, len(testCases))
	totalWeight := 0
	earnedWeight := 0
	finalStatus := VerdictAccepted
	var maxRuntime, maxMemory int64

	// Check if language supports compilation cache
	compiledLanguages := map[string]bool{
		"go":         true,
		"java":       true,
		"kotlin":     true,
		"c":          true,
		"cpp":        true,
		"rust":       true,
	}

	useCache := compiledLanguages[language]
	var compiledBinary string

	for _, tc := range testCases {
		totalWeight += tc.Weight

		out, err := e.runner.Run(ctx, runner.Request{
			Language:        language,
			Code:            code,
			Stdin:           tc.Input,
			TimeoutMs:       timeLimitMs,
			MemoryMb:        memoryLimitMb,
			UseCache:        useCache,
			CacheKey:        "", // Would be populated from cache service
			CompiledBinary:  compiledBinary,
		})

		var tcResult TestCaseResult
		tcResult.TestCaseID = tc.ID

		if err != nil {
			tcResult.Status = VerdictSystemError
			tcResult.Stderr = err.Error()
		} else if out.TimedOut {
			tcResult.Status = VerdictTimeLimitExceeded
		} else if out.Stderr != "" || out.ExitCode != 0 {
			tcResult.Status = VerdictRuntimeError
			tcResult.Stderr = out.Stderr
			tcResult.Stdout = out.Stdout
		} else if normalize(out.Stdout) != normalize(tc.ExpectedOutput) {
			tcResult.Status = VerdictWrongAnswer
			tcResult.Stdout = out.Stdout
		} else {
			tcResult.Status = VerdictAccepted
			tcResult.Stdout = out.Stdout
			earnedWeight += tc.Weight
		}

		tcResult.Runtime = out.Runtime
		tcResult.Memory = out.Memory

		if out.Runtime > maxRuntime {
			maxRuntime = out.Runtime
		}
		if out.Memory > maxMemory {
			maxMemory = out.Memory
		}

		results = append(results, tcResult)

		// First non-accepted verdict becomes the overall status
		if tcResult.Status != VerdictAccepted && finalStatus == VerdictAccepted {
			finalStatus = tcResult.Status
		}
	}

	score := 0
	if totalWeight > 0 {
		score = (earnedWeight * 100) / totalWeight
	}

	return EvaluationResult{
		Status:          finalStatus,
		Score:           score,
		TotalScore:      100,
		Runtime:         maxRuntime,
		Memory:          maxMemory,
		TestCaseResults: results,
	}
}

func normalize(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	lines := strings.Split(s, "\n")
	out := make([]string, 0, len(lines))
	for _, l := range lines {
		trimmed := strings.TrimRightFunc(l, unicode.IsSpace)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return strings.Join(out, "\n")
}
