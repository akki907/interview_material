// src/components/animated/MovingBorder.tsx
//
// Aceternity-style moving border: a conic-gradient outline that sweeps around
// the card on hover. The gradient angle is animated via a registered custom
// property, which is why @property --moving-angle is declared in globals.css —
// conic-gradient angles are otherwise not interpolable.
import type * as React from "react";
import { cn } from "../../lib/utils";

export function MovingBorder({
    children,
    className,
    duration = 4,
    /** Gradient stops for the travelling light. */
    colors = [
        "var(--focus)",
        "var(--c2i)",
        "var(--c4i)",
        "var(--focus)",
    ],
}: {
    children: React.ReactNode;
    className?: string;
    duration?: number;
    colors?: string[];
}) {
    return (
        <div
            className={cn(
                "group/moving-border relative isolate overflow-hidden rounded-card p-px",
                className,
            )}
        >
            {/* The travelling border: a conic gradient masked to a 1px ring. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/moving-border:opacity-100 group-focus-within/moving-border:opacity-100 motion-safe:animate-[spin-around_var(--dur)_linear_infinite]"
                style={
                    {
                        "--dur": `${duration}s`,
                        background: `conic-gradient(from var(--moving-angle, 0deg), transparent 0%, ${colors.join(", ")} 50%, transparent 100%)`,
                    } as React.CSSProperties
                }
            />
            <div className="relative rounded-[calc(0.625rem-1px)] bg-surface">
                {children}
            </div>
        </div>
    );
}