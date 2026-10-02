// src/pages/Dashboard.tsx
import { useNavigate } from "react-router-dom";
import { PROGRESS, RECENTLY_STUDIED, STATS, WEAK_AREAS } from "../lib/data";
import { useStore } from "../lib/store";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

const AREAS = [
    { key: "dsa", label: "DSA", tone: "dsa" as const },
    { key: "react", label: "React", tone: "react" as const },
    { key: "python", label: "Python", tone: "python" as const },
    { key: "ai", label: "AI Engineering", tone: "ai" as const },
    { key: "design", label: "System Design", tone: "design" as const },
];

const STAT_TILES = [
    {
        label: "Problems Solved",
        value: STATS.problemsSolved,
        cls: "text-focus",
    },
    { label: "Topics Done", value: STATS.topicsCompleted, cls: "text-c1i" },
    { label: "Current Streak", value: `${STATS.streak} 🔥`, cls: "text-c3i" },
    { label: "Learning Hours", value: STATS.learningHours, cls: "text-c5i" },
];

export function Dashboard() {
    const navigate = useNavigate();
    const progress = useStore((s) => s.progress);
    const todos = useStore((s) => s.todos);
    const toggleTodo = useStore((s) => s.toggleTodo);

    const merged = { ...PROGRESS, ...progress };
    const active = todos.filter((t) => !t.completed);
    const top = [...active]
        .sort(
            (a, b) =>
                ({ high: 3, medium: 2, low: 1 })[b.priority] -
                { high: 3, medium: 2, low: 1 }[a.priority],
        )
        .slice(0, 4);

    return (
        <div>
            <h1 className="font-serif mb-1 text-3xl font-bold tracking-tight">
                Your Engineering Journey
            </h1>
            <p className="mb-6 text-muted">
                Track your progress across all areas
            </p>

            <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {STAT_TILES.map((s) => (
                    <Card key={s.label}>
                        <CardContent>
                            <p
                                className={`font-serif text-3xl font-bold ${s.cls}`}
                            >
                                {s.value}
                            </p>
                            <p className="mt-0.5 text-[11px] tracking-wider text-muted uppercase">
                                {s.label}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <h2 className="mb-3 text-sm font-semibold">Progress by Topic</h2>
            <Card className="mb-8">
                <CardContent className="flex flex-col gap-4">
                    {AREAS.map((a) => (
                        <div key={a.key}>
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-sm">{a.label}</span>
                                <span className="text-xs text-muted">
                                    {merged[a.key] ?? 0}%
                                </span>
                            </div>
                            <Progress
                                value={merged[a.key] ?? 0}
                                tone={a.tone}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <h2 className="mb-3 text-sm font-semibold">
                🎯 Priority Study Goals
            </h2>
            <Card className="mb-8">
                <CardContent>
                    {top.length === 0 ? (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted">
                                🎉 All study goals completed!
                            </p>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => navigate("/todos")}
                            >
                                Manage Goals
                            </Button>
                        </div>
                    ) : (
                        <>
                            <ul className="flex flex-col gap-1.5">
                                {top.map((t) => (
                                    <li
                                        key={t.id}
                                        className="flex items-center gap-2"
                                    >
                                        <button
                                            type="button"
                                            aria-label="Mark complete"
                                            onClick={() => toggleTodo(t.id)}
                                            className="flex size-5 shrink-0 items-center justify-center rounded border border-rule text-xs transition-colors hover:border-focus cursor-pointer"
                                        >
                                            ✓
                                        </button>
                                        <Badge
                                            variant="neutral"
                                            className="shrink-0"
                                        >
                                            {t.category.toUpperCase()}
                                        </Badge>
                                        <span className="truncate text-sm">
                                            {t.title}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 flex items-center justify-between border-t border-rule pt-3">
                                <span className="text-xs text-muted">
                                    {active.length} goal(s) remaining
                                </span>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => navigate("/todos")}
                                >
                                    View & Manage →
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>⚠️ Weak Areas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="flex flex-col gap-1.5 text-sm text-muted">
                            {WEAK_AREAS.map((a) => (
                                <li key={a}>• {a}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>📚 Recently Studied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                            {RECENTLY_STUDIED.map((t) => (
                                <Badge key={t} variant="c4">
                                    {t}
                                </Badge>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                onClick={() => navigate("/todos")}
                            >
                                ✅ Study Todos
                            </Button>
                            <Button
                                size="sm"
                                onClick={() =>
                                    navigate("/topic/dsa-sliding-window")
                                }
                            >
                                Sliding Window
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => navigate("/topic/react-hooks")}
                            >
                                React Hooks
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => navigate("/interview")}
                            >
                                🎯 Mock Interview
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
