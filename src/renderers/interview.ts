// src/renderers/interview.ts — AI-powered mock interview practice & evaluation
import { h, toast, escHtml, pad } from "../utils";
import { INTERVIEW_QUESTIONS } from "../data";
import { evaluateAnswer, EvaluationResult } from "../ai/evaluate";
import { card, diagram, statChips, callout } from "../components";

export function renderInterview(container: HTMLElement): void {
    const section = h("div", { className: "page-enter interview-page" });

    section.appendChild(h("h2", {}, "🎯 Mock Interview Practice"));
    section.appendChild(
        h(
            "p",
            { style: "color:var(--muted);margin-bottom:16px;" },
            "Simulate a 30-minute senior technical interview. Receive instant AI rubric scoring, edge case analysis, and actionable feedback.",
        ),
    );

    section
        .appendChild(
            card(
                "🧭 How a senior interview actually runs",
                `
<p>Interviews are a <b>funnel, not a checklist</b>. Each stage exists to answer one question, and a
weak stage almost always causes a rejection at the next one. Knowing which question a stage is
asking lets you aim your answer at it.</p>
<p>The single most common failure is <b>answering a different question than the one asked</b> —
diving into micro-optimizations when the interviewer asked about tradeoffs, or staying in
theory when they wanted a worked example. Restating the question in your own words before
answering costs eight seconds and consistently raises the score.</p>
    `,
                { bookmark: false },
            ),
        )
        .appendChild(
            diagram(
                `
flowchart TD
    A[Phone screen: state your role and bar] --> B{Recruiter screen}
    B -->|Resume, logistics, comp| C[Hiring manager: go deep on one project]
    C --> D{Did you show ownership?}
    D -->|Yes| E[System design: scope and tradeoffs]
    D -->|No| F[Rejected here — most candidates die at this gate]
    E --> G[Coding round: clarify, then code out loud]
    G --> H{Bugs or missed edge cases?}
    H -->|Some| I[Debug collaboratively on your own code]
    H -->|Clean| J[Behavioral: conflict and ownership stories]
    I --> J
    J --> K[Debrief and offer]
    F -.-> L[Most rejections happen here, not at the coding round]
`,
                "Each stage filters for one trait; the manager and system-design stages eliminate the most candidates",
            ),
        );

    section
        .appendChild(
            card(
                "⏱ How to spend the 30 minutes",
                `
<p>Budget by weight rather than dividing evenly. Most candidates over-invest in the coding
block because it is the only part they can silently practise.</p>
    `,
                { bookmark: false },
            ),
        )
        .appendChild(
            h(
                "div",
                { style: "padding:0 2px 14px;" },
                statChips([
                    ["Clarify + restate", "~2 min", "chip-info"],
                    ["Think out loud", "~4 min", ""],
                    ["Code + test", "~12 min", ""],
                    ["Debug + edge cases", "~6 min", ""],
                    ["Tradeoffs + wrap-up", "~6 min", "chip-good"],
                ]),
            ),
        );

    section.appendChild(
        h(
            "div",
            { style: "margin:0 0 20px;" },
            callout(
                "c3",
                `
<p><b>The debugging round is not a trap — it is the real test.</b> Nearly every interviewer
weights how you respond to a failing test above the code you wrote before it. Narrating your
hypothesis out loud ("the loop re-reads the array, so a duplicate input would double-count")
scores far higher than silently patching until it goes green, because it demonstrates the
debugging loop you will use on their production incidents.</p>`,
                "If you only revise one habit, revise this",
            ),
        ),
    );

    const topicBtns = h("div", { className: "btn-group topic-select-group" });
    const interviewArea = h("div", {
        id: "interview-area",
        style: "margin-top:20px;",
    });

    let activeTopic = "DSA";
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    let secondsLeft = 30 * 60; // 30 minutes
    let isTimerRunning = false;

    function formatTime(s: number): string {
        const m = Math.floor(s / 60);
        const remSec = s % 60;
        return `${pad(m)}:${pad(remSec)}`;
    }

    function stopTimer(): void {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isTimerRunning = false;
    }

    function startTimer(
        timerEl: HTMLElement,
        toggleBtn: HTMLButtonElement,
    ): void {
        stopTimer();
        isTimerRunning = true;
        toggleBtn.textContent = "⏸ Pause";
        toggleBtn.classList.add("btn-primary");

        timerInterval = setInterval(() => {
            if (secondsLeft <= 0) {
                stopTimer();
                timerEl.textContent = "⏱ 00:00 (Time Up)";
                timerEl.classList.add("timer-warning");
                toggleBtn.textContent = "▶ Start";
                toggleBtn.classList.remove("btn-primary");
                toast("Time is up! Review and submit your answer.", "warning");
                return;
            }
            secondsLeft--;
            timerEl.textContent = `⏱ ${formatTime(secondsLeft)}`;
            if (secondsLeft < 300) {
                timerEl.classList.add("timer-warning");
            }
        }, 1000);
    }

    function startInterview(topic: string): void {
        activeTopic = topic;
        stopTimer();
        secondsLeft = 30 * 60;

        // Highlight active topic button
        topicBtns.querySelectorAll(".btn").forEach((b) => {
            b.classList.toggle("btn-primary", b.textContent === topic);
        });

        const q =
            INTERVIEW_QUESTIONS.find((qq) => qq.topic === topic) ||
            INTERVIEW_QUESTIONS[0];
        interviewArea.innerHTML = "";

        const box = h("div", { className: "interview-box card" });

        // Header with timer controls
        const timerHeader = h("div", { className: "interview-timer-header" });
        const timerEl = h("div", {
            className: "interview-timer",
            textContent: "⏱ 30:00",
        });
        const timerControls = h("div", { className: "timer-controls" });

        const timerToggleBtn = h("button", {
            className: "btn btn-sm",
            textContent: "▶ Start Timer",
            onClick: () => {
                if (isTimerRunning) {
                    stopTimer();
                    timerToggleBtn.textContent = "▶ Resume";
                    timerToggleBtn.classList.remove("btn-primary");
                    toast("Timer paused", "info");
                } else {
                    startTimer(timerEl, timerToggleBtn as HTMLButtonElement);
                    toast("Timer started (30m countdown)", "info");
                }
            },
        });

        const timerResetBtn = h("button", {
            className: "btn btn-sm btn-ghost",
            textContent: "↺ Reset",
            onClick: () => {
                stopTimer();
                secondsLeft = 30 * 60;
                timerEl.textContent = "⏱ 30:00";
                timerEl.classList.remove("timer-warning");
                timerToggleBtn.textContent = "▶ Start Timer";
                timerToggleBtn.classList.remove("btn-primary");
                toast("Timer reset to 30:00", "info");
            },
        });

        timerControls.appendChild(timerToggleBtn);
        timerControls.appendChild(timerResetBtn);
        timerHeader.appendChild(timerEl);
        timerHeader.appendChild(timerControls);
        box.appendChild(timerHeader);

        // Question Title
        const qTitle = h("h3", { className: "interview-question-title" });
        qTitle.textContent = q.question;
        box.appendChild(qTitle);

        // Hint box
        const hint = h("div", { className: "hint-box hidden", id: "iq-hint" });
        hint.appendChild(h("strong", {}, "💡 Interviewer Guidance:"));
        hint.appendChild(document.createTextNode(" " + q.hint));
        box.appendChild(hint);

        // Strategy guidelines
        const guidanceBox = h("div", { className: "interview-guidance-pill" });
        guidanceBox.innerHTML = `
            <span>📋 <strong>Senior Structure:</strong> 1. Clarifying questions &amp; scale &bull; 2. Core architecture / algorithm &bull; 3. Complexity (O) &bull; 4. Edge cases &amp; trade-offs</span>
        `;
        box.appendChild(guidanceBox);

        // Answer textarea
        const answerWrapper = h("div", {
            className: "interview-answer-wrapper",
        });
        const answer = h("textarea", {
            className: "interview-answer",
            placeholder: `Type your complete senior engineering answer here...\n\nExample structure:\n- Clarifications: What is the peak read/write throughput? Are there memory constraints?\n- High-Level Approach: We will use a sliding window with a prefix table...\n- Code / Algorithm: ...\n- Complexity: Time O(N), Space O(1)\n- Failure modes: How we handle network timeouts, deadlocks, and empty datasets...`,
            rows: "10",
        });

        const charCounter = h("div", {
            className: "interview-char-counter",
            textContent: "0 characters (min 50 for full evaluation)",
        });
        answer.addEventListener("input", () => {
            const count = answer.value.trim().length;
            charCounter.textContent = `${count} characters ${count < 50 ? "(min 50 for full evaluation)" : "✓ ready for evaluation"}`;
            charCounter.classList.toggle("ready", count >= 50);
        });

        answerWrapper.appendChild(answer);
        answerWrapper.appendChild(charCounter);
        box.appendChild(answerWrapper);

        // Action buttons
        const actions = h("div", { className: "btn-group interview-actions" });
        const hintBtn = h("button", {
            className: "btn",
            textContent: "💡 Reveal Hint",
        });
        hintBtn.addEventListener("click", () => {
            hint.classList.toggle("hidden");
            hintBtn.textContent = hint.classList.contains("hidden")
                ? "💡 Reveal Hint"
                : "🙈 Hide Hint";
        });

        const submitBtn = h("button", {
            className: "btn btn-primary",
            textContent: "Submit Answer",
        });
        submitBtn.addEventListener("click", () =>
            submitInterview(
                q.question,
                answer.value.trim(),
                topic,
                submitBtn as HTMLButtonElement,
            ),
        );

        actions.appendChild(hintBtn);
        actions.appendChild(submitBtn);
        box.appendChild(actions);

        // Result container
        const result = h("div", {
            id: "iq-result",
            className: "hidden interview-eval-container",
        });
        box.appendChild(result);

        interviewArea.appendChild(box);
        toast(`Interview started: ${topic}`, "info");
    }

    async function submitInterview(
        question: string,
        answerText: string,
        topic: string,
        submitBtn: HTMLButtonElement,
    ): Promise<void> {
        const result = document.getElementById("iq-result");
        if (!result) return;

        if (answerText.length < 10) {
            toast(
                "Please write at least a few sentences before submitting.",
                "info",
            );
            return;
        }

        stopTimer();

        // Loading state
        result.classList.remove("hidden");
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Evaluating...";
        result.innerHTML = `
            <div class="card interview-loading-card">
                <div class="eval-spinner">🤖</div>
                <h4>Evaluating Your Interview Response...</h4>
                <p style="color:var(--muted);font-size:0.85rem;margin-top:6px;">
                    Benchmarking technical depth, edge cases, algorithmic complexity, and communication against senior engineering standards.
                </p>
            </div>
        `;
        result.scrollIntoView({ behavior: "smooth", block: "nearest" });

        try {
            const evalResult: EvaluationResult = await evaluateAnswer(
                question,
                answerText,
                topic,
            );
            renderEvaluationResult(result, evalResult, answerText);
            toast(
                `Evaluation complete: Score ${evalResult.score}/100`,
                "success",
            );
        } catch {
            result.innerHTML = `
                <div class="card" style="border-color:var(--orange);">
                    <h4>Evaluation Error</h4>
                    <p style="color:var(--muted);font-size:0.85rem;">Could not complete evaluation. Please try again.</p>
                </div>
            `;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Answer";
        }
    }

    function renderEvaluationResult(
        resultEl: HTMLElement,
        res: EvaluationResult,
        answerText: string,
    ): void {
        const verdictCls =
            res.verdict === "Strong Hire"
                ? "tag-green"
                : res.verdict === "Hire"
                  ? "tag-blue"
                  : res.verdict === "Lean Hire"
                    ? "tag-yellow"
                    : "tag-orange";

        const breakdown = res.breakdown;

        // Every interpolated value below is either a number, a fixed verdict
        // enum, or passed through escHtml — so this is safe author markup.
        resultEl.replaceChildren(
            h("div", {
                innerHTML: `
            <div class="card eval-card page-enter">
                <div class="eval-header">
                    <div>
                        <span class="tag ${verdictCls} eval-verdict-tag">${res.verdict}</span>
                        <h3 style="margin-top:6px;">Evaluation Rubric</h3>
                    </div>
                    <div class="eval-score-box">
                        <span class="eval-score-num">${res.score}</span>
                        <span class="eval-score-max">/ 100</span>
                    </div>
                </div>

                <p class="eval-summary">${escHtml(res.summary)}</p>

                <h4 style="margin:16px 0 10px;font-size:0.95rem;">📊 Rubric Breakdown</h4>
                <div class="eval-rubric-grid">
                    <div class="eval-criterion-card">
                        <div class="crit-header">
                            <span class="crit-name">1. Technical Accuracy &amp; Depth</span>
                            <span class="crit-score">${breakdown.technicalCorrectness.score} / 25</span>
                        </div>
                        <p class="crit-feedback">${escHtml(breakdown.technicalCorrectness.feedback)}</p>
                    </div>

                    <div class="eval-criterion-card">
                        <div class="crit-header">
                            <span class="crit-name">2. Edge Cases &amp; Reliability</span>
                            <span class="crit-score">${breakdown.edgeCases.score} / 25</span>
                        </div>
                        <p class="crit-feedback">${escHtml(breakdown.edgeCases.feedback)}</p>
                    </div>

                    <div class="eval-criterion-card">
                        <div class="crit-header">
                            <span class="crit-name">3. Complexity &amp; Trade-offs</span>
                            <span class="crit-score">${breakdown.complexityAnalysis.score} / 25</span>
                        </div>
                        <p class="crit-feedback">${escHtml(breakdown.complexityAnalysis.feedback)}</p>
                    </div>

                    <div class="eval-criterion-card">
                        <div class="crit-header">
                            <span class="crit-name">4. Communication &amp; Structure</span>
                            <span class="crit-score">${breakdown.communication.score} / 25</span>
                        </div>
                        <p class="crit-feedback">${escHtml(breakdown.communication.feedback)}</p>
                    </div>
                </div>

                <div class="eval-feedback-cols">
                    <div class="eval-col">
                        <h4 style="color:var(--green);font-size:0.9rem;margin-bottom:8px;">✅ Key Strengths</h4>
                        <ul class="eval-list strengths-list">
                            ${res.strengths.map((s) => `<li>${escHtml(s)}</li>`).join("")}
                        </ul>
                    </div>
                    <div class="eval-col">
                        <h4 style="color:var(--orange);font-size:0.9rem;margin-bottom:8px;">⚠️ Areas for Improvement</h4>
                        <ul class="eval-list improvements-list">
                            ${res.improvements.map((i) => `<li>${escHtml(i)}</li>`).join("")}
                        </ul>
                    </div>
                </div>

                ${
                    res.modelAnswer
                        ? `
                    <div class="eval-model-answer">
                        <h4 style="font-size:0.9rem;margin-bottom:6px;">💡 Senior Architect Model Solution</h4>
                        <pre class="model-answer-code"><code>${escHtml(res.modelAnswer)}</code></pre>
                    </div>
                `
                        : ""
                }

                <p style="margin-top:16px;padding-top:12px;border-top:1px solid var(--rule);color:var(--muted);font-size:0.8rem;">
                    ${res.isLiveAI ? "⚡ Evaluated via Live AI Gateway." : "🎯 Evaluated via Interview OS AI Rubric Engine."} Your answer (${answerText.length} chars) was recorded locally.
                </p>
            </div>
        `,
            }),
        );
    }

    // Populate topic selector buttons
    ["DSA", "React", "Python", "AI", "System Design"].forEach((t, i) => {
        const btn = h("button", {
            className: `btn ${i === 0 ? "btn-primary" : ""}`,
            textContent: t,
        });
        btn.addEventListener("click", () => startInterview(t));
        topicBtns.appendChild(btn);
    });

    section.appendChild(topicBtns);
    section.appendChild(interviewArea);
    container.appendChild(section);

    // Initial interview session for DSA
    startInterview(activeTopic);
}
