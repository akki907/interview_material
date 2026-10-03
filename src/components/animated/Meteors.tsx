// src/components/animated/Meteors.tsx
//
// Aceternity-style falling meteor streaks for the dashboard backdrop.
// Purely decorative: aria-hidden and pointer-events-none so it can never
// interfere with reading or interaction.
import { useMemo } from "react";
import { cn } from "../../lib/utils";

interface Meteor {
    top: number;
    left: number;
    delay: number;
    duration: number;
}

export function Meteors({ count = 12, className }: { count?: number; className?: string }) {
    // Deterministic per-mount layout: Math.random in render would reshuffle on
    // every re-render and read as flickering.
    const meteors = useMemo<Meteor[]>(() => {
        const out: Meteor[] = [];
        for (let i = 0; i < count; i++) {
            // Simple LCG so the field looks scattered but is stable.
            const a = Math.sin(i * 12.9898) * 43758.5453;
            const b = Math.sin(i * 78.233) * 12345.6789;
            const ra = a - Math.floor(a);
            const rb = b - Math.floor(b);
            out.push({
                top: rb * 20 - 10,
                left: ra * 100,
                delay: ra * 6,
                duration: 4 + rb * 4,
            });
        }
        return out;
    }, [count]);

    return (
        <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
        >
            {meteors.map((m, i) => (
                <span
                    key={i}
                    className="absolute size-0.5 rotate-[215deg] rounded-full bg-focus/70 motion-safe:animate-[meteor-fall_var(--mdur)_linear_infinite]"
                    style={
                        {
                            top: `${m.top}%`,
                            left: `${m.left}%`,
                            "--mdur": `${m.duration}s`,
                            animationDelay: `${m.delay}s`,
                            boxShadow: "0 0 0 1px color-mix(in oklab, var(--focus) 40%, transparent)",
                        } as React.CSSProperties
                    }
                >
                    <span className="absolute top-1/2 size-1 -translate-y-1/2 rotate-[45deg] bg-focus/60 blur-[1px]">
                        {/* trailing streak */}
                    </span>
                </span>
            ))}
        </div>
    );
}