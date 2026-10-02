// src/pages/Interview.tsx — mock interview practice
import { useEffect, useRef, useState } from 'react';
import { INTERVIEW_QUESTIONS } from '../lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Diagram } from '../components/content/Diagram';
import { pad } from '../lib/utils';

interface Verdict {
    score: number;
    verdict: string;
    summary: string;
    breakdown: Record<string, { score: number; feedback: string }>;
    strengths: string[];
    improvements: string[];
    modelAnswer?: string;
    isLiveAI?: boolean;
}

const TOPICS = Array.from(new Set(INTERVIEW_QUESTIONS.map(q => q.topic)));

function formatTime(s: number) {
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

export function Interview() {
    const [topic, setTopic] = useState(TOPICS[0] ?? 'DSA');
    const [secondsLeft, setSecondsLeft] = useState(30 * 60);
    const [running, setRunning] = useState(false);
    const [answer, setAnswer] = useState('');
    const [hint, setHint] = useState(false);
    const [result, setResult] = useState<Verdict | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const question = INTERVIEW_QUESTIONS.find(q => q.topic === topic) ?? INTERVIEW_QUESTIONS[0];

    useEffect(() => {
        if (!running) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => {
            setSecondsLeft(s => {
                if (s <= 1) {
                    setRunning(false);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [running]);

    const submit = async () => {
        if (answer.trim().length < 50 || !question) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question.question,
                    answer: answer.trim(),
                    topic: question.topic,
                }),
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            setResult((await res.json()) as Verdict);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not evaluate answer');
        } finally {
            setBusy(false);
        }
    };

    const reset = () => {
        setRunning(false);
        setSecondsLeft(30 * 60);
        setAnswer('');
        setResult(null);
        setHint(false);
    };

    return (
        <div>
            <h1 className="font-serif mb-1 text-3xl font-bold tracking-tight">🎯 Mock Interview Practice</h1>
            <p className="mb-6 max-w-3xl text-muted">
                Simulate a 30-minute senior technical interview. Receive rubric scoring, edge case
                analysis, and actionable feedback.
            </p>

            <Card className="mb-5">
                <CardHeader>
                    <CardTitle>🧭 How a senior interview actually runs</CardTitle>
                </CardHeader>
                <CardContent>
                    <Diagram
                        source={`flowchart TD
    A[Phone screen: state your role] --> B{Recruiter}
    B --> C[Hiring manager: go deep<br/>on one project]
    C --> D{Did you show ownership?}
    D -->|No| E[Rejected here]
    D -->|Yes| F[System design:<br/>scope and tradeoffs]
    F --> G[Coding: clarify,<br/>then code out loud]
    G --> H[Debug collaboratively<br/>on your own code]
    H --> I[Behavioral: ownership stories]
    I --> J[Debrief and offer]
    E -.-> K[Most rejections happen<br/>before the coding round]`}
                        caption="Each stage filters for one trait; the manager and design stages eliminate the most candidates"
                    />
                </CardContent>
            </Card>

            <div className="mb-4 flex flex-wrap gap-2">
                {TOPICS.map(t => (
                    <Button
                        key={t}
                        size="sm"
                        variant={topic === t ? 'primary' : 'outline'}
                        onClick={() => {
                            setTopic(t);
                            setResult(null);
                            setAnswer('');
                        }}
                    >
                        {t}
                    </Button>
                ))}
            </div>

            {question && (
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>{question.question}</CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant={secondsLeft < 300 ? 'c3' : 'neutral'}>
                                ⏱ {formatTime(secondsLeft)}
                            </Badge>
                            <Button size="sm" onClick={() => setRunning(r => !r)}>
                                {running ? '⏸ Pause' : '▶ Start'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={reset}>
                                ↺ Reset
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {hint && (
                            <p className="mb-3 rounded-md bg-info px-3 py-2 text-sm">
                                <strong>💡 Interviewer Guidance:</strong> {question.hint}
                            </p>
                        )}
                        <Textarea
                            rows={12}
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            placeholder={'Structure your answer:\n- Clarifications: constraints, scale\n- High-level approach\n- Implementation details\n- Complexity (time & space)\n- Failure modes and edge cases'}
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-muted">
                                {answer.trim().length} characters
                                {answer.trim().length < 50 && ' (min 50 for evaluation)'}
                            </span>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => setHint(h => !h)}>
                                    {hint ? '🙈 Hide hint' : '💡 Hint'}
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={submit}
                                    disabled={busy || answer.trim().length < 50}
                                >
                                    {busy ? 'Evaluating…' : 'Submit answer'}
                                </Button>
                            </div>
                        </div>
                        {error && <p className="mt-3 text-sm text-c3i">{error}</p>}
                    </CardContent>
                </Card>
            )}

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Evaluation Rubric</CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant="c1">{result.verdict}</Badge>
                            <span className="font-serif text-2xl font-bold">{result.score}</span>
                            <span className="text-xs text-muted">/100</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-sm leading-relaxed">{result.summary}</p>

                        <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
                            {Object.entries(result.breakdown).map(([key, val]) => (
                                <div key={key} className="rounded-md border border-rule bg-neutral p-3">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="text-xs font-semibold">
                                            {key.replace(/([A-Z])/g, ' $1')}
                                        </span>
                                        <span className="text-xs text-muted">{val.score} / 25</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-muted">{val.feedback}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="mb-1.5 text-sm font-semibold text-c1i">✅ Key Strengths</p>
                                <ul className="list-disc pl-4 text-sm text-muted">
                                    {result.strengths.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="mb-1.5 text-sm font-semibold text-c3i">
                                    ⚠️ Areas for Improvement
                                </p>
                                <ul className="list-disc pl-4 text-sm text-muted">
                                    {result.improvements.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {result.modelAnswer && (
                            <div className="mt-4">
                                <p className="mb-1.5 text-sm font-semibold">
                                    💡 Senior Architect Model Solution
                                </p>
                                <pre className="overflow-x-auto rounded-md bg-code p-4 text-xs leading-relaxed text-[#e6edf7]">
                                    {result.modelAnswer}
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}