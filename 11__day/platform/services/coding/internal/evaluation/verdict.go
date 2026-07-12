package evaluation

const (
	VerdictAccepted            = "Accepted"
	VerdictWrongAnswer         = "Wrong Answer"
	VerdictTimeLimitExceeded   = "Time Limit Exceeded"
	VerdictMemoryLimitExceeded = "Memory Limit Exceeded"
	VerdictRuntimeError        = "Runtime Error"
	VerdictCompilationError    = "Compilation Error"
	VerdictOutputLimitExceeded = "Output Limit Exceeded"
	VerdictSystemError         = "System Error"
)

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
	TotalRuntime    int64
	MaxMemory       int64
	TestCaseResults []TestCaseResult
}
