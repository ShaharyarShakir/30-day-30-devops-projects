<html><head></head><body><p>Excellent. Now we build the <strong>Online Judge (OJ)</strong>.</p><p>This is the component that turns "Run Code" into <strong>"Submit Solution"</strong>, making your platform comparable to <strong>LeetCode, HackerRank, Codeforces, and CodeChef</strong>.</p><p>One architectural recommendation before we begin:</p><blockquote><p>Separate <strong>execution</strong> from <strong>evaluation</strong>.</p></blockquote><ul><li><p><strong>Execution</strong> = compile and run code.</p></li><li><p><strong>Evaluation</strong> = compare outputs, score, and determine the verdict.</p></li></ul><p>This separation makes it easier to support contests, custom scoring, SQL problems, AI grading, and more in the future.</p><hr><h1>Sprint 5 — Phase 2</h1><h1>Online Judge Service</h1><h2>Architecture</h2><pre><code class="language-text">                  Browser
                      │
                Submit Solution
                      │
                      ▼
               Coding Service
                      │
                      ▼
               Judge Service
                      │
          ┌───────────┴────────────┐
          ▼                        ▼
    Runner Pod              Evaluation Engine
          │                        │
          └───────────┬────────────┘
                      ▼
                 Final Verdict
</code></pre><hr><h1>Responsibilities</h1><h2>Coding Service</h2><p>Owns</p><pre><code class="language-text">Problems

Submissions

History

Languages

Starter Code
</code></pre><hr><h2>Judge Service</h2><p>Owns</p><pre><code class="language-text">Scheduling

Execution

Retries

Resource Limits
</code></pre><hr><h2>Evaluation Engine</h2><p>Owns</p><pre><code class="language-text">Test Cases

Scoring

Verdicts

Diff

Partial Score
</code></pre><p>This can be a separate Go package or a dedicated microservice if you expect very large scale.</p><hr><h1>Database</h1><h2>problems</h2><pre><code class="language-sql">id

title

slug

difficulty

statement

constraints

time_limit_ms

memory_limit_mb

created_at
</code></pre><hr><h2>problem_languages</h2><pre><code class="language-sql">problem_id

language

starter_code
</code></pre><hr><h2>test_cases</h2><pre><code class="language-sql">id

problem_id

input

expected_output

hidden

weight
</code></pre><p>Hidden test cases are <strong>never</strong> sent to the browser.</p><hr><h2>submissions</h2><pre><code class="language-sql">id

user_id

problem_id

language

status

score

runtime

memory

created_at
</code></pre><hr><h2>submission_results</h2><pre><code class="language-sql">submission_id

test_case_id

runtime

memory

status
</code></pre><hr><h1>Problem Types</h1><p>Support:</p><pre><code class="language-text">Algorithm

Database SQL

Shell

Regex

Debugging

Multiple Files
</code></pre><p>Algorithm problems come first.</p><hr><h1>Submission Flow</h1><pre><code class="language-text">Student

↓

Submit

↓

Coding Service

↓

Kafka

↓

Judge

↓

Runner

↓

Evaluation

↓

Final Score

↓

Store Result
</code></pre><hr><h1>Runner Execution</h1><p>The runner receives:</p><pre><code class="language-json">{
  "language":"go",

  "code":"...",

  "stdin":"..."
}
</code></pre><p>It returns:</p><pre><code class="language-json">{
  "stdout":"42",

  "stderr":"",

  "exitCode":0,

  "runtime":23,

  "memory":14000
}
</code></pre><hr><h1>Evaluation</h1><p>The Evaluation Engine compares:</p><pre><code class="language-text">Expected Output

↓

Actual Output
</code></pre><p>Verdicts:</p><pre><code class="language-text">Accepted

Wrong Answer

Time Limit Exceeded

Memory Limit Exceeded

Runtime Error

Compilation Error

Output Limit Exceeded

System Error
</code></pre><hr><h1>Output Comparison</h1><p>Avoid simple string equality.</p><p>Normalize:</p><ul><li><p>Trailing spaces</p></li><li><p>Final newline</p></li><li><p>Line endings (<code inline="">\n</code> vs <code inline="">\r\n</code>)</p></li></ul><p>Optionally support floating-point tolerance for numerical problems.</p><hr><h1>Scoring</h1><p>Example:</p><pre><code class="language-text">10 Tests

↓

Each = 10 Points

↓

Total = 100
</code></pre><p>Or weighted:</p><pre><code class="language-text">Easy Tests

5%

Hard Tests

20%
</code></pre><hr><h1>Partial Score</h1><p>Useful for optimization problems.</p><pre><code class="language-text">Passed

7 / 10

↓

70 Points
</code></pre><hr><h1>Test Execution Strategy</h1><p>Don't execute all tests in one process.</p><p>Instead:</p><pre><code class="language-text">Submission

↓

Runner

↓

Test 1

↓

Test 2

↓

Test 3
</code></pre><p>If a process becomes unstable, it affects only one test case.</p><p>For trusted languages and performance reasons, you may also compile once and execute the compiled binary multiple times with different inputs.</p><hr><h1>Time Limits</h1><p>Each test has:</p><pre><code class="language-text">2 Seconds
</code></pre><p>If exceeded:</p><pre><code class="language-text">Time Limit Exceeded
</code></pre><p>Terminate the process cleanly, then force-kill if necessary.</p><hr><h1>Memory Limits</h1><p>Example:</p><pre><code class="language-text">256 MB
</code></pre><p>The runner measures peak usage.</p><hr><h1>Compilation Cache</h1><p>For compiled languages:</p><pre><code class="language-text">Compile Once

↓

Binary

↓

Reuse Binary

↓

Run Tests
</code></pre><p>Much faster than recompiling per test.</p><hr><h1>Kafka Topics</h1><pre><code class="language-text">submission.created

submission.running

submission.completed

submission.failed
</code></pre><p>Additional analytics topics can be added later.</p><hr><h1>Frontend</h1><p>Submission page:</p><pre><code class="language-text">Problem

↓

Editor

↓

Run

↓

Submit

↓

Results

↓

Test Cases
</code></pre><hr><h1>Result View</h1><pre><code class="language-text">Accepted

Runtime

21 ms

Memory

18 MB

Score

100
</code></pre><p>If allowed by the problem:</p><pre><code class="language-text">Passed

18 / 20 Tests
</code></pre><p>Avoid revealing hidden test inputs.</p><hr><h1>Leaderboards</h1><p>Track:</p><pre><code class="language-text">Fastest Runtime

Lowest Memory

Highest Score
</code></pre><p>Contest leaderboards will be added later.</p><hr><h1>Submission History</h1><p>Student sees:</p><pre><code class="language-text">Submission

↓

Verdict

↓

Runtime

↓

Memory

↓

Timestamp
</code></pre><p>Allow reopening previous code versions.</p><hr><h1>Security</h1><ul><li><p>Never expose hidden test cases.</p></li><li><p>Sanitize compiler and runtime output.</p></li><li><p>Enforce CPU, memory, output, and execution limits.</p></li><li><p>Isolate every execution.</p></li><li><p>Validate language support before scheduling.</p></li></ul><hr><h1>Definition of Done</h1><p>Before Phase 3:</p><ul><li><p>Problems stored in the database.</p></li><li><p>Public and hidden test cases supported.</p></li><li><p>Evaluation Engine implemented.</p></li><li><p>Multiple test execution.</p></li><li><p>Partial scoring.</p></li><li><p>Submission history.</p></li><li><p>Runtime and memory metrics.</p></li><li><p>Verdict generation.</p></li></ul><hr><h1>Sprint 5 Progress</h1><pre><code class="language-text">Sprint 5

██████□□□□□□□□□□□□ 30%

✅ Coding Platform
✅ Online Judge
⬜ Multi-file Projects
⬜ Interactive Terminal
⬜ AI Assistant
⬜ Collaborative Coding
⬜ Contests
</code></pre><h1>Phase 3 Preview</h1><p>The next phase upgrades the coding experience from an online judge to a <strong>cloud IDE</strong>, including:</p><ul><li><p>Full project workspaces.</p></li><li><p>Multi-file editing.</p></li><li><p>Persistent development environments.</p></li><li><p>Interactive terminals.</p></li><li><p>Git integration.</p></li><li><p>Package installation.</p></li><li><p>Live preview for web applications.</p></li><li><p>Auto-save.</p></li><li><p>Workspace snapshots.</p></li></ul><p>This is the foundation for building a browser-based development experience comparable to GitHub Codespaces or GitPod while still supporting LeetCode-style exercises.</p></body></html>
