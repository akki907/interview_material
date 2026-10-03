// src/components/animated/WobbleCard.tsx
//
// Aceternity-style tilt card: the card leans toward the pointer with a spring.
// The 3D transform is written straight to the element's style during the drag so
// pointer movement never triggers a React render; only the reset animates back.
import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "../../lib/utils";

export function WobbleCard({
    children,
    className,
    intensity = 10,
}: {
    children: React.ReactNode;
    className?: string;
    /** Maximum tilt in degrees. */
    intensity?: number;
}) {
    const ref = React.useRef<HTMLDivElement>(null);

    // Pointer position in -0.5..0.5 around the card centre.
    const px = useMotionValue(0);
    const py = useMotionValue(0);

    // Springs give the lean its weight; the raw values would feel twitchy.
    const sx = useSpring(px, { stiffness: 220, damping: 20, mass: 0.4 });
    const sy = useSpring(py, { stiffness: 220, damping: 20, mass: 0.4 });

    const rotateY = useTransform(sx, [-0.5, 0.5], [-intensity, intensity]);
    const rotateX = useTransform(sy, [-0.5, 0.5], [intensity, -intensity]);

    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el || e.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
    };

    const reset = () => {
        px.set(0);
        py.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onPointerMove={onMove}
            onPointerLeave={reset}
            style={{ rotateX, rotateY, transformPerspective: 1000 }}
            className={cn("motion-reduce:transform-none", className)}
        >
            {children}
        </motion.div>
    );
}