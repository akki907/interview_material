// src/components/animated/GridPattern.tsx
//
// Aceternity-style animated grid background: a fine line grid with a soft
// cursor-tracked glow. Decorative only, so it is hidden from assistive tech
// and never intercepts pointer events.
import * as React from "react";
import { cn } from "../../lib/utils";

export function GridPattern({
    className,
    cell = 44,
    glowColor = "var(--focus)",
}: {
    className?: string;
    cell?: number;
    glowColor?: string;
}) {
    const ref = React.useRef<HTMLDivElement>(null);

    const onMove = React.useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const el = ref.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            el.style.setProperty("--grid-x", `${e.clientX - rect.left}px`);
            el.style.setProperty("--grid-y", `${e.clientY - rect.top}px`);
        },
        [],
    );

    return (
        <div
            ref={ref}
            onPointerMove={onMove}
            aria-hidden
            className={cn(
                "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
                className,
            )}
        >
            <div
                className="absolute inset-0 opacity-40"
                style={{
                    backgroundImage: `linear-gradient(to right, var(--rule) 1px, transparent 1px), linear-gradient(to bottom, var(--rule) 1px, transparent 1px)`,
                    backgroundSize: `${cell}px ${cell}px`,
                }}
            />
            <div
                className="absolute inset-0"
                style={
                    {
                        background:
                            "radial-gradient(340px circle at var(--grid-x, 50%) var(--grid-y, 0%), color-mix(in oklab, var(--grid-glow) 18%, transparent), transparent 70%)",
                        "--grid-glow": glowColor,
                    } as React.CSSProperties
                }
            />
            {/* Fades the grid out toward the edges so it never competes with text. */}
            <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-transparent to-paper" />
        </div>
    );
}
