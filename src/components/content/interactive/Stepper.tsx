// src/components/content/interactive/Stepper.tsx — shared step walker
//
// Algorithm-agnostic: it renders whatever `builder` returns and owns the
// step/auto-play state. Nothing here knows what Two Sum is.
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import type { CellState, StepBuilder } from "../../../lib/interactive/types";

const CELL_STYLES: Record<CellState, string> = {
    idle: "border-rule bg-surface text-ink",
    a: "border-c4i bg-c4 text-c4i",
    b: "border-c3i bg-c3 text-c3i",
    ok: "border-success bg-good text-ink",
    active: "border-focus bg-focus text-white",
    range: "border-c1i bg-c1 text-c1i",
};

export function Stepper({
    values,
    target,
    builder,
    autoPlayMs = 950,
}: {
    values: number[];
    target: number;
    builder: StepBuilder;
    autoPlayMs?: number;
}) {
    const steps = useMemo(
        () => builder({ values, target }),
        [builder, values, target],
    );
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);

    // Any change to the inputs rebuilds the step list — start over and stop.
    useEffect(() => {
        setIndex(0);
        setPlaying(false);
    }, [steps]);

    const last = steps.length - 1;

    useEffect(() => {
        if (!playing) return;
        if (index >= last) {
            setPlaying(false);
            return;
        }
        const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), autoPlayMs);
        return () => clearTimeout(timer);
    }, [playing, index, last, autoPlayMs]);

    if (steps.length === 0) return null;

    const step = steps[Math.min(index, last)];

    return (
        <div className="rounded-lg border border-rule bg-neutral/50 p-4">
            {/* The row of numbers. */}
            <div className="flex flex-wrap gap-2">
                {values.map((v, i) => {
                    const state: CellState = step.marks?.[i] ?? "idle";
                    return (
                        <motion.div
                            key={i}
                            layout
                            animate={
                                state === "active" ? { scale: [1, 1.08, 1] } : { scale: 1 }
                            }
                            transition={{ duration: 0.25 }}
                            className={cn(
                                "flex size-11 items-center justify-center rounded-md border font-mono text-sm font-bold",
                                CELL_STYLES[state],
                            )}
                        >
                            {v}
                        </motion.div>
                    );
                })}
            </div>

            {/* Narration is the accessible live region. */}
            <p
                role="status"
                aria-live="polite"
                className="mt-4 min-h-10 text-sm leading-relaxed text-ink"
            >
                {step.narration}
            </p>

            {/* Optional live data structure, e.g. the running value -> index map. */}
            {step.panel && (
                <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-bold tracking-wider text-muted uppercase">
                        {step.panel.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {step.panel.rows.length === 0 && (
                            <span className="text-xs text-muted">(empty)</span>
                        )}
                        {step.panel.rows.map((row, i) => {
                            const hit = step.panel?.hits?.includes(i) ?? false;
                            return (
                                <Badge
                                    key={`${row}-${i}`}
                                    variant={hit ? "c1" : "neutral"}
                                    className="font-mono"
                                >
                                    {row}
                                </Badge>
                            );
                        })}
                    </div>
                </div>
            )}

            {step.stats && step.stats.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
                    {step.stats.map((s) => (
                        <div key={s.label}>
                            <span className="text-[10px] tracking-wider text-muted uppercase">
                                {s.label}{" "}
                            </span>
                            <span className="font-mono text-sm font-bold text-ink">
                                {s.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Controls. */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setIndex(0);
                        setPlaying(false);
                    }}
                >
                    Reset
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                >
                    Back
                </Button>
                <Button
                    variant="primary"
                    size="sm"
                    disabled={index >= last}
                    onClick={() => setIndex((i) => Math.min(i + 1, last))}
                >
                    Next step
                </Button>
                <Button
                    variant="subtle"
                    size="sm"
                    disabled={index >= last && !playing}
                    onClick={() => setPlaying((p) => !p)}
                >
                    {playing ? "Pause" : "Auto-play"}
                </Button>
                <span className="ml-auto font-mono text-xs text-muted">
                    step {index + 1} / {steps.length}
                </span>
            </div>
        </div>
    );
}