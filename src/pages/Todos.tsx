// src/pages/Todos.tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import type { TodoCategory, TodoPriority } from "../lib/types";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Diagram } from "../components/content/Diagram";
import { PageHeader } from "../components/app/PageHeader";
import { StatTiles } from "../components/app/StatTiles";

const CATEGORIES: Array<[TodoCategory, string]> = [
    ["dsa", "DSA"],
    ["react", "React"],
    ["python", "Python"],
    ["ai", "AI"],
    ["systemDesign", "System Design"],
    ["general", "General"],
];

const PRIORITIES: Array<[TodoPriority, string]> = [
    ["high", "High"],
    ["medium", "Medium"],
    ["low", "Low"],
];

export function Todos() {
    const { todos, addTodo, toggleTodo, deleteTodo, clearCompletedTodos } =
        useStore();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<TodoCategory>("dsa");
    const [priority, setPriority] = useState<TodoPriority>("high");
    const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

    const visible = todos.filter((t) =>
        filter === "all"
            ? true
            : filter === "active"
              ? !t.completed
              : t.completed,
    );
    const done = todos.filter((t) => t.completed).length;

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        addTodo({ title: t, category, priority, completed: false });
        setTitle("");
    };

    return (
        <div>
            <PageHeader
                title="Study Plan & Action Items"
                intro="Track targeted interview preparation milestones across algorithms, system design, and AI engineering."
            />

            <StatTiles
                className="mb-6"
                columns={3}
                tiles={[
                    { label: "Total Goals", value: todos.length },
                    { label: "Completed", value: done, tone: "text-c1i" },
                    {
                        label: "Remaining",
                        value: todos.length - done,
                        tone: "text-c3i",
                    },
                ]}
            />

            <Card className="mb-5">
                <CardHeader>
                    <CardTitle>A plan that survives a bad week</CardTitle>
                </CardHeader>
                <CardContent>
                    <Diagram
                        source={`flowchart TD
    A[Pick the highest-priority<br/>blocker, not a topic] --> B[Read the mental model<br/>and the diagram]
    B --> C[Attempt one problem<br/>before looking at the solution]
    C -->|Read the solution<br/>without trying| D[Requeue for tomorrow]
    D --> A
    C -->|Derived it| E[Compare against the<br/>annotated solution]
    E --> F[Mark the topic complete]
    F --> G{Any high-priority<br/>items left?}
    G -->|Yes| A
    G -->|No| H[Clear the backlog,<br/>then raise the bar]`}
                        caption="Attempt before reading — a solution you read but did not derive is not a solved problem"
                    />
                </CardContent>
            </Card>

            <Card className="mb-4">
                <CardHeader>
                    <CardTitle>Add a study goal</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="flex flex-col gap-3">
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Implement LRU Cache with O(1) get and put"
                        />
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(([value, label]) => (
                                <Button
                                    key={value}
                                    type="button"
                                    size="sm"
                                    variant={
                                        category === value
                                            ? "primary"
                                            : "outline"
                                    }
                                    onClick={() => setCategory(value)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {PRIORITIES.map(([value, label]) => (
                                <Button
                                    key={value}
                                    type="button"
                                    size="sm"
                                    variant={
                                        priority === value
                                            ? "primary"
                                            : "outline"
                                    }
                                    onClick={() => setPriority(value)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            className="self-start"
                        >
                            Add goal
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mb-3 flex flex-wrap items-center gap-2">
                {(["all", "active", "completed"] as const).map((f) => (
                    <Button
                        key={f}
                        size="sm"
                        variant={filter === f ? "primary" : "outline"}
                        onClick={() => setFilter(f)}
                    >
                        {f[0].toUpperCase() + f.slice(1)}
                    </Button>
                ))}
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearCompletedTodos}
                    className="ml-auto"
                >
                    Clear completed
                </Button>
            </div>

            <ul className="flex flex-col gap-2">
                {visible.map((t) => (
                    <li key={t.id}>
                        <Card>
                            <CardContent className="flex items-start gap-3">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Toggle complete"
                                    aria-pressed={t.completed}
                                    onClick={() => toggleTodo(t.id)}
                                    className={cn(
                                        "mt-0.5 size-5 shrink-0 rounded border text-xs",
                                        t.completed
                                            ? "border-c1i bg-c1 text-c1i"
                                            : "border-rule hover:border-focus",
                                    )}
                                >
                                    {t.completed ? "" : ""}
                                </Button>
                                <div className="min-w-0 flex-1">
                                    <p
                                        className={
                                            "text-sm " +
                                            (t.completed
                                                ? "text-muted line-through"
                                                : "")
                                        }
                                    >
                                        {t.title}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <Badge variant="neutral">
                                            {t.category}
                                        </Badge>
                                        <Badge
                                            variant={
                                                t.priority === "high"
                                                    ? "c3"
                                                    : "neutral"
                                            }
                                        >
                                            {t.priority}
                                        </Badge>
                                        {t.dueDate && (
                                            <Badge variant="c4">
                                               {t.dueDate}
                                            </Badge>
                                        )}
                                    </div>
                                    {t.notes && (
                                        <p className="mt-1.5 text-xs text-muted">
                                            {t.notes}
                                        </p>
                                    )}
                                    <div className="mt-2 flex gap-2">
                                        {t.linkedTopicId && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    navigate(
                                                        `/topic/${t.linkedTopicId}`,
                                                    )
                                                }
                                            >
                                               Study topic →
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteTodo(t.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </li>
                ))}
                {visible.length === 0 && (
                    <li className="py-8 text-center text-sm text-muted">
                        No goals match this filter.
                    </li>
                )}
            </ul>
        </div>
    );
}
