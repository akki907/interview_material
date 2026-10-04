// src/components/content/DiagramWalk.tsx
//
// A guided walkthrough of a rendered mermaid diagram.
//
// The steps are not authored per diagram. There are 109 diagrams in this app
// and hand-writing a narration for each would rot immediately, so the sequence
// is read out of the SVG mermaid already produced: flowcharts walk their nodes
// in document order, sequence diagrams walk their messages. That is honest
// about what it is — a way to step through the shape of the system — and it
// works for every diagram without a content change.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";

const STEP_INTERVAL_MS = 1700;

interface WalkStep {
    /** Node or message group to highlight. */
    target: Element;
    /** Message line paired with a sequence message, if any. */
    line?: Element;
    /** Text read off the shape, used in the caption. */
    label: string;
}

export function DiagramWalk({ root }: { root: HTMLElement | null }) {
    const [steps, setSteps] = useState<WalkStep[]>([]);
    const [index, setIndex] = useState(-1);
    const [playing, setPlaying] = useState(false);
    /** Handle for the playback timer, or null when nothing is scheduled. */
    const timer = useRef<number | null>(null);

    // Rebuild the step list whenever a new SVG lands in this box.
    useEffect(() => {
        if (!root) {
            setSteps([]);
            return;
        }
        const svg = root.querySelector("svg");
        if (!svg) {
            setSteps([]);
            return;
        }

        const messages = Array.from(
            svg.querySelectorAll(".messageText, .messageText0, .messageText1"),
        );
        if (messages.length > 0) {
            setSteps(
                messages.map((m, i) => ({
                    target: m,
                    line:
                        svg.querySelector(
                            `.messageLine${i}, .messageLine${i % 2}`,
                        ) ?? undefined,
                    label: (m.textContent ?? "").trim(),
                })),
            );
            return;
        }

        const nodes = Array.from(svg.querySelectorAll("g.node"));
        setSteps(
            nodes.map((n) => ({
                target: n,
                label: (n.textContent ?? "").replace(/\s+/g, " ").trim(),
            })),
        );
    }, [root]);

    // Drop the highlight from whatever was lit previously.
    const clearHighlight = useCallback(() => {
        root?.querySelectorAll(".walk-hl").forEach((el) => {
            el.classList.remove("walk-hl");
        });
    }, [root]);

    useEffect(() => {
        if (index < 0 || !steps[index]) {
            clearHighlight();
            return;
        }
        clearHighlight();
        const step = steps[index];
        step.target.classList.add("walk-hl");
        step.line?.classList.add("walk-hl");
        step.target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [index, steps, clearHighlight]);

    // One timer for the whole component; it is always cleared on unmount and
    // whenever playback stops.
    const stop = useCallback(() => {
        // `?? undefined` rather than a guard: clearing a null handle is already
        // a no-op, so this keeps that fact in the type instead of a branch.
        window.clearInterval(timer.current ?? undefined);
        timer.current = null;
        setPlaying(false);
    }, []);

    useEffect(() => stop, [stop]);

    const advance = useCallback(() => {
        setIndex((i) => {
            if (i >= steps.length - 1) {
                stop();
                return i;
            }
            return i + 1;
        });
    }, [steps.length, stop]);

    const reset = () => {
        stop();
        setIndex(-1);
        clearHighlight();
    };

    const play = () => {
        if (playing) {
            stop();
            return;
        }
        if (steps.length === 0) return;
        if (index >= steps.length - 1) setIndex(-1);
        setPlaying(true);
        advance();
        timer.current = window.setInterval(advance, STEP_INTERVAL_MS);
    };

    const stepOnce = () => {
        stop();
        if (index >= steps.length - 1) setIndex(-1);
        advance();
    };

    if (steps.length === 0) {
        return (
            <p className="mt-3 text-sm text-muted">
                This diagram has no walkable steps.
            </p>
        );
    }

    const current = steps[index];
    const done = index >= steps.length - 1 && index >= 0;

    return (
        <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={play}>
                    {playing ? "Pause" : done ? "Replay" : "Play"}
                </Button>
                <Button size="sm" variant="outline" onClick={stepOnce}>
                    Next step
                </Button>
                <Button size="sm" variant="ghost" onClick={reset}>
                    Reset
                </Button>
                <p
                    className="min-h-5 min-w-48 flex-1 text-sm text-muted"
                    aria-live="polite"
                >
                    {current
                        ? `${index + 1} of ${steps.length}: ${current.label}`
                        : "Play to step through this diagram."}
                </p>
            </div>
            <div
                className="mt-2 h-1 overflow-hidden rounded-full bg-neutral"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={Math.max(0, index + 1)}
                aria-label="Walkthrough progress"
            >
                <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{
                        width: `${((index + 1) / steps.length) * 100}%`,
                    }}
                />
            </div>
        </div>
    );
}