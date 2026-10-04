// src/pages/Dashboard.tsx — the home page, laid out as a grid of cards
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowRightIcon,
    CheckIcon,
    BrainIcon,
    ListChecksIcon,
    MicIcon,
    LayersIcon,
    AlertTriangleIcon,
} from "lucide-react";
import {
    PROGRESS,
    RECENTLY_STUDIED,
    STATS,
    TOPIC_LABELS,
    WEAK_AREAS,
} from "../lib/data";
import { hrefFor } from "../lib/routes";
import { useStore } from "../lib/store";
import { cn } from "../lib/utils";
import {
    Card,
    CardContent,
    CardEyebrow,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { StatTiles } from "../components/app/StatTiles";
import { HeroSection } from "../components/hero/HeroSection";
import { motion } from "motion/react";
import { MovingBorder } from "../components/animated/MovingBorder";

const AREAS = [
    { key: "dsa", label: "Data Structures & Algorithms", short: "DSA", tone: "dsa" as const },
    { key: "react", label: "React", short: "React", tone: "react" as const },
    { key: "python", label: "Python", short: "Python", tone: "python" as const },
    { key: "ai", label: "AI Engineering", short: "AI Eng", tone: "ai" as const },
    { key: "design", label: "System Design", short: "Sys Des", tone: "design" as const },
];

const STAT_TILES = [
    { label: "Problems Solved", value: STATS.problemsSolved, tone: "text-focus" },
    { label: "Topics Done", value: STATS.topicsCompleted, tone: "text-c1i" },
    { label: "Current Streak", value: `${STATS.streak}`, tone: "text-c3i" },
    { label: "Learning Hours", value: STATS.learningHours, tone: "text-c5i" },
];

/**
 * RECENTLY_STUDIED holds human labels, not ids. Resolve each to a real topic
 * so the cards link somewhere instead of only looking clickable.
 */
const RECENT_IDS = new Map<string, string>(
    Object.entries(TOPIC_LABELS).map(([id, label]) => [label, id]),
);

function recentId(label: string): string {
    if (RECENT_IDS.has(label)) return RECENT_IDS.get(label)!;
    // Fall back to a substring match so "React.useEffect" style labels still
    // resolve when the nav label differs slightly.
    for (const [navLabel, id] of RECENT_IDS) {
        if (navLabel.toLowerCase().includes(label.toLowerCase())) return id;
    }
    return "dsa-sliding-window";
}

const SHORTCUTS = [
    {
        to: "/todos",
        icon: ListChecksIcon,
        title: "Study Todos",
        body: "Work through your priority blockers.",
    },
    {
        to: "/flashcards",
        icon: LayersIcon,
        title: "Flashcards",
        body: "Fast recall drills on the facts you must not fumble.",
    },
    {
        to: "/interview",
        icon: MicIcon,
        title: "Mock Interview",
        body: "A 30-minute run with rubric scoring.",
    },
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
                ({ high: 3, medium: 2, low: 1 } as const)[b.priority] -
                ({ high: 3, medium: 2, low: 1 } as const)[a.priority],
        )
        .slice(0, 4);

    // The strongest area leads the progress grid.
    const areasByStrength = [...AREAS].sort(
        (a, b) => (merged[b.key] ?? 0) - (merged[a.key] ?? 0),
    );
    const overall = Math.round(
        AREAS.reduce((sum, a) => sum + (merged[a.key] ?? 0), 0) / AREAS.length,
    );

    return (
        <div className="stack-section pb-4">
            {/* Hero — heading, lede and headline numbers in one card */}
            <HeroSection
                title="Your Engineering Journey"
                subtitle="Track your progress across DSA, React, Python, AI engineering and system design."
            >
                <StatTiles tiles={STAT_TILES} columns={4} />
            </HeroSection>

            {/* Overall progress summary */}
            <MovingBorder className="mb-0">
                <Card interactive>
                    <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-c2 text-c2i">
                                <BrainIcon className="size-5" />
                            </div>
                            <div>
                                <p className="font-serif text-2xl leading-none font-bold tabular-nums">
                                    {overall}%
                                </p>
                                <p className="mt-1 text-[11px] tracking-wider text-muted uppercase">
                                    Overall mastery
                                </p>
                            </div>
                        </div>

                        <div className="min-w-48 flex-1">
                            <Progress
                                value={overall}
                                tone="dsa"
                                aria-label={`Overall mastery, ${overall}%`}
                            />
                        </div>

                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate("/todos")}
                        >
                            Continue studying
                            <ArrowRightIcon className="size-4" />
                        </Button>
                    </CardContent>
                </Card>
            </MovingBorder>

            {/* Progress by area — one card per area instead of one tall block */}
            <section>
                <h2 className="mb-3 text-sm font-semibold">Progress by Topic</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {areasByStrength.map((a, i) => {
                        const pct = merged[a.key] ?? 0;
                        return (
                            <motion.div
                                key={a.key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: 0.05 * i,
                                    ease: [0.4, 0, 0.2, 1],
                                }}
                                className="h-full"
                            >
                                <Card interactive className="h-full gap-0">
                                    <CardHeader className="border-b-0 pb-1">
                                        <CardTitle
                                            level="h3"
                                            className="text-sm"
                                        >
                                            {a.label}
                                        </CardTitle>
                                        <span
                                            className={cn(
                                                "font-serif text-lg font-bold tabular-nums",
                                                pct >= 60
                                                    ? "text-c1i"
                                                    : pct >= 30
                                                      ? "text-focus"
                                                      : "text-c3i",
                                            )}
                                        >
                                            {pct}%
                                        </span>
                                    </CardHeader>
                                    <CardContent className="pt-1">
                                        <Progress
                                            value={pct}
                                            tone={a.tone}
                                            aria-label={`${a.label} mastery, ${pct}%`}
                                        />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* Quick shortcuts */}
            <section>
                <h2 className="mb-3 text-sm font-semibold">Jump back in</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                    {SHORTCUTS.map((s, i) => (
                        <motion.div
                            key={s.to}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.3,
                                delay: 0.05 * i,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                            className="h-full"
                        >
                            <Card
                                interactive
                                role="button"
                                tabIndex={0}
                                onClick={() => navigate(s.to)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        navigate(s.to);
                                    }
                                }}
                                className="h-full cursor-pointer"
                            >
                                <CardContent>
                                    <div className="flex size-9 items-center justify-center rounded-md bg-c4 text-c4i">
                                        <s.icon className="size-4.5" />
                                    </div>
                                    <p className="mt-3 text-sm font-semibold">
                                        {s.title}
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-muted">
                                        {s.body}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Priority goals */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <div>
                            <CardEyebrow>Focus</CardEyebrow>
                            <CardTitle>Priority Study Goals</CardTitle>
                        </div>
                        {active.length > 0 && (
                            <Badge variant="c3">{active.length} open</Badge>
                        )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                        {top.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
                                <p className="text-sm text-muted">
                                   All study goals completed!
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate("/todos")}
                                >
                                    Manage goals
                                </Button>
                            </div>
                        ) : (
                            <>
                                <ul className="flex flex-1 flex-col gap-1">
                                    {top.map((t) => (
                                        <li
                                            key={t.id}
                                            className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-neutral"
                                        >
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label="Mark complete"
                                                aria-pressed={t.completed}
                                                onClick={() =>
                                                    toggleTodo(t.id)
                                                }
                                                className="size-5 shrink-0 rounded border text-xs"
                                            >
                                                <CheckIcon className="size-3" />
                                            </Button>
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
                                <div className="mt-4 border-t border-rule pt-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate("/todos")}
                                        className="w-full"
                                    >
                                        View & manage
                                        <ArrowRightIcon className="size-4" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Weak areas */}
                <Card>
                    <CardHeader>
                        <div>
                            <CardEyebrow>Attention</CardEyebrow>
                            <CardTitle>Weak Areas</CardTitle>
                        </div>
                        <AlertTriangleIcon className="size-4 shrink-0 text-c3i" />
                    </CardHeader>
                    <CardContent>
                        <ul className="flex flex-col gap-2">
                            {WEAK_AREAS.map((a) => (
                                <li
                                    key={a}
                                    className="flex items-center gap-2.5 rounded-md bg-warn px-3 py-2 text-sm"
                                >
                                    <span className="size-1.5 shrink-0 rounded-full bg-c3i" />
                                    {a}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Recently studied — one clickable card per topic */}
            <section>
                <h2 className="mb-3 text-sm font-semibold">
                   Recently Studied
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {RECENTLY_STUDIED.map((t) => (
                        <Link key={t} to={hrefFor(recentId(t))} className="block">
                            <Card interactive className="h-full cursor-pointer">
                                <CardContent className="flex items-center gap-2.5 py-3">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-c1 text-c1i">
                                        <ArrowRightIcon className="size-3.5" />
                                    </span>
                                    <span className="truncate text-sm font-medium">
                                        {t}
                                    </span>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
