// src/components/animated/Spotlight.tsx
//
// Cursor-tracked spotlight card, in the style of Aceternity's Spotlight. The
// highlight follows the pointer via CSS custom properties so the movement is
// pure paint work — no React re-render per mouse move.
import * as React from "react";
import { cn } from "../../lib/utils";

export function Spotlight({
    children,
    className,
    fill = "var(--focus)",
    /** Opacity of the spotlight, 0-1. */
    intensity = 0.22,
}: {
    children: React.ReactNode;
    className?: string;
    fill?: string;
    intensity?: number;
}) {
    const ref = React.useRef<HTMLDivElement>(null);

    const onMove = React.useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const el = ref.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            el.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
            el.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
        },
        [],
    );

    const onLeave = React.useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--spotlight-opacity", "0");
    }, []);

    return (
        <div
            ref={ref}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            className={cn(
                "group/spotlight relative isolate overflow-hidden",
                "[--spotlight-x:50%] [--spotlight-y:0%] [--spotlight-opacity:0]",
                "transition-[--spotlight-opacity] duration-500",
                "before:pointer-events-none before:absolute before:inset-0 before:-z-10",
                "before:bg-[radial-gradient(circle_at_var(--spotlight-x)_var(--spotlight-y),var(--spotlight-fill),transparent_65%)]",
                "before:opacity-0 before:transition-opacity duration-300",
                "hover:before:opacity-100 focus-within:before:opacity-100",
                className,
            )}
            style={
                {
                    "--spotlight-fill": `color-mix(in oklab, ${fill} ${intensity * 100}%, transparent)`,
                } as React.CSSProperties
            }
            onPointerEnter={(e) => {
                const el = ref.current;
                if (el) el.style.setProperty("--spotlight-opacity", "1");
                onMove(e);
            }}
        >
            {children}
        </div>
    );
}
