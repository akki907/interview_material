// src/components/animated/CountUp.tsx
//
// Animates a number from 0 when it scrolls into view. Uses motion's
// useInView so it fires once per mount and never re-animates on re-render.
import * as React from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

export function CountUp({
    value,
    duration = 1.2,
    className,
}: {
    value: number;
    duration?: number;
    className?: string;
}) {
    const ref = React.useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: "-40px" });
    const reduced = useReducedMotion();

    React.useEffect(() => {
        const el = ref.current;
        if (!el || !inView) return;

        // Respect the OS setting: jump straight to the final value.
        if (reduced) {
            el.textContent = String(value);
            return;
        }

        const controls = animate(0, value, {
            duration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => {
                el.textContent = String(Math.round(v));
            },
        });
        return () => controls.stop();
    }, [inView, value, duration, reduced]);

    return (
        <span ref={ref} className={className}>
            {value}
        </span>
    );
}