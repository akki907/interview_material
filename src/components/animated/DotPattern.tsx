// src/components/animated/DotPattern.tsx
//
// Aceternity-style dot grid. Dots fade in as the pointer approaches, so the
// backdrop reacts without needing a repaint on every pointer move.
// Decorative only: aria-hidden and pointer-events-none.
import * as React from "react";
import { cn } from "../../lib/utils";

export function DotPattern({
    className,
    gap = 18,
    radius = 1,
    color = "var(--rule)",
    glow = "var(--focus)",
}: {
    className?: string;
    gap?: number;
    radius?: number;
    color?: string;
    glow?: string;
}) {
    const ref = React.useRef<HTMLDivElement>(null);

    const onMove = React.useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const el = ref.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            el.style.setProperty("--dot-x", `${e.clientX - r.left}px`);
            el.style.setProperty("--dot-y", `${e.clientY - r.top}px`);
        },
        [],
    );

    return (
        <div
            ref={ref}
            onPointerMove={onMove}
            aria-hidden
            className={cn(
                "pointer-events-none absolute inset-0 overflow-hidden [--dot-x:50%] [--dot-y:50%]",
                className,
            )}
        >
            <div
                className="absolute inset-0 opacity-60"
                style={{
                    backgroundImage: `radial-gradient(circle, ${color} ${radius}px, transparent ${radius}px)`,
                    backgroundSize: `${gap}px ${gap}px`,
                }}
            />
            <div
                className="absolute inset-0"
                style={
                    {
                        background:
                            "radial-gradient(260px circle at var(--dot-x) var(--dot-y), color-mix(in oklab, var(--dot-glow) 22%, transparent), transparent 70%)",
                        "--dot-glow": glow,
                    } as React.CSSProperties
                }
            />
        </div>
    );
}
