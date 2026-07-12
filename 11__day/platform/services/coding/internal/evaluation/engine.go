package evaluation

import (
	"strings"
	"unicode"
)

type TestCase struct {
	ID             string
	Input          string
	ExpectedOutput string
	Hidden         bool
	Weight         int
}

type RunnerOutput struct {
	Stdout   string
	Stderr   string
	ExitCode int
	Runtime  int64
	Memory   int64
}

func EvaluateTestCase(tc TestCase, output RunnerOutput) TestCaseResult {
	if output.Stderr != "" || output.ExitCode != 0 {
		return TestCaseResult{
			TestCaseID: tc.ID,
			Status:     VerdictRuntimeError,
			Runtime:    output.Runtime,
			Memory:     output.Memory,
			Stdout:     output.Stdout,
			Stderr:     output.Stderr,
		}
	}

	normalizedExpected := NormalizeOutput(tc.ExpectedOutput)
	normalizedActual := NormalizeOutput(output.Stdout)

	if normalizedActual != normalizedExpected {
		return TestCaseResult{
			TestCaseID: tc.ID,
			Status:     VerdictWrongAnswer,
			Runtime:    output.Runtime,
			Memory:     output.Memory,
			Stdout:     output.Stdout,
			Stderr:     output.Stderr,
		}
	}

	return TestCaseResult{
		TestCaseID: tc.ID,
		Status:     VerdictAccepted,
		Runtime:    output.Runtime,
		Memory:     output.Memory,
		Stdout:     output.Stdout,
		Stderr:     output.Stderr,
	}
}

func EvaluateSubmission(testCases []TestCase, outputs []RunnerOutput) EvaluationResult {
	var (
		results        = make([]TestCaseResult, len(testCases))
		totalScore     int
		totalRuntime   int64
		maxMemory      int64
		allAccepted    = true
	)

	for i, tc := range testCases {
		if i < len(outputs) {
			results[i] = EvaluateTestCase(tc, outputs[i])
		} else {
			results[i] = TestCaseResult{
				TestCaseID: tc.ID,
				Status:     VerdictSystemError,
			}
		}

		if results[i].Status != VerdictAccepted {
			allAccepted = false
		} else {
			totalScore += tc.Weight
		}

		if results[i].Runtime > totalRuntime {
			totalRuntime = results[i].Runtime
		}
		if results[i].Memory > maxMemory {
			maxMemory = results[i].Memory
		}
	}

	status := VerdictAccepted
	if !allAccepted {
		for _, res := range results {
			if res.Status != VerdictAccepted {
				status = res.Status
				break
			}
		}
	}

	return EvaluationResult{
		Status:         status,
		Score:          totalScore,
		TotalRuntime:  totalRuntime,
		MaxMemory:     maxMemory,
		TestCaseResults: results,
	}
}

func NormalizeOutput(output string) string {
	output = strings.TrimSpace(output)
	output = strings.ReplaceAll(output, "\r\n", "\n")
	output = strings.ReplaceAll(output, "\r", "\n")

	lines := strings.Split(output, "\n")
	normalizedLines := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimRightFunc(line, unicode.IsSpace)
		if trimmed != "" {
			normalizedLines = append(normalizedLines, trimmed)
		}
	}

	return strings.Join(normalizedLines, "\n")
}
