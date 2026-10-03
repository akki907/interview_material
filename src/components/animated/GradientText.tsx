// src/components/animated/GradientText.tsx
//
// Aceternity-style animated gradient headline. Respects prefers-reduced-motion,
// which matters here because this sits in every page header.
import type * as React from "react";
import { cn } from "../../lib/utils";

export function GradientText({
    children,
    className,
    /** Seconds per sweep. */
    duration = 6,
}: {
    children: React.ReactNode;
    className?: string;
    duration?: number;
}) {
    return (
        <span
            className={cn(
                "bg-linear-to-r from-focus via-c2i to-c4i bg-[length:200%_auto] bg-clip-text text-transparent",
                "motion-safe:animate-[gradient-pan_var(--dur)_linear_infinite]",
                className,
            )}
            style={{ "--dur": `${duration}s` } as React.CSSProperties}
        >
            {children}
        </span>
    );
}
