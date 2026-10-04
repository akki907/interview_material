// src/components/content/interactive/Stepper.tsx — shared step walker
//
// Algorithm-agnostic: it renders whatever `builder` returns and owns the
// step/auto-play state. Nothing here knows what Two Sum is.
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Cells, cellsFromValues } from "./Cells";
import { cn } from "../../../lib/utils";
import type { CellState, StepBuilder } from "../../../lib/interactive/types";

export function Stepper({
    values,
    target,
    builder,
    code,
    autoPlayMs = 950,
}: {
    values: number[];
    target: number;
    builder: StepBuilder;
    /** Optional snippet shown under the controls, as the reference does. */
    code?: string;
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
        const timer = setTimeout(
            () => setIndex((i) => Math.min(i + 1, last)),
            autoPlayMs,
        );
        return () => clearTimeout(timer);
    }, [playing, index, last, autoPlayMs]);

    if (steps.length === 0) return null;

    const step = steps[Math.min(index, last)];
    const atEnd = index >= last;

    // A step either draws its own canvas (grids, trees) or highlights the
    // plain array it was built from.
    const cells =
        step.cells ??
        cellsFromValues(values, (i): CellState => step.marks?.[i] ?? "idle");

    return (
        <div>
            <Cells cells={cells} cols={step.cols} />

            {/* Narration is the accessible live region. */}
            <p
                role="status"
                aria-live="polite"
                className={cn(
                    "mt-3 min-h-[3.2em] text-[1.05rem] leading-relaxed text-ink",
                    step.tone === "good" && "font-semibold text-c1i",
                    step.tone === "bad" && "font-semibold text-c3i",
                )}
            >
                {step.narration}
            </p>

            {/* Optional live data structure, e.g. the running value -> index map. */}
            {step.panel && (
                <div className="mt-1">
                    <p className="mb-1 text-[13px] text-muted">
                        {step.panel.label}
                    </p>
                    <div className="flex min-h-9 flex-wrap items-center gap-1.5">
                        {step.panel.rows.length === 0 && (
                            <span className="text-[15px] text-muted">
                                empty
                            </span>
                        )}
                        {step.panel.rows.map((row, i) => {
                            const hit = step.panel?.hits?.includes(i) ?? false;
                            return (
                                <span
                                    key={`${row}-${i}`}
                                    className={cn(
                                        "rounded-lg border px-2 py-0.5 font-mono text-[0.95rem]",
                                        hit
                                            ? "border-c1i bg-c1 text-c1i"
                                            : "border-rule bg-neutral text-ink",
                                    )}
                                >
                                    {row}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Controls. */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
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
                    disabled={atEnd}
                    onClick={() => setIndex((i) => Math.min(i + 1, last))}
                >
                    Next step
                </Button>
                <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => {
                        // Pressing auto-play at the end restarts from the top.
                        if (atEnd) setIndex(0);
                        setPlaying((p) => !p);
                    }}
                >
                    {playing ? "Pause" : "Auto-play"}
                </Button>
                <span className="ml-auto font-mono text-xs text-muted">
                    step {index + 1} / {steps.length}
                </span>
            </div>

            {step.stats && step.stats.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[0.9rem] text-muted">
                    {step.stats.map((s, i) => (
                        <span key={i}>
                            {s.value !== undefined && (
                                <span className="font-mono font-semibold text-ink">
                                    {s.value}{" "}
                                </span>
                            )}
                            {s.label}
                        </span>
                    ))}
                </div>
            )}

            {code && (
                <pre className="mt-3 overflow-x-auto rounded-xl bg-code p-3 text-[0.85rem] leading-relaxed text-code-ink">
                    <code>{code}</code>
                </pre>
            )}
        </div>
    );
}
