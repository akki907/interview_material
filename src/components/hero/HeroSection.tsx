// src/components/hero/HeroSection.tsx
//
// The dashboard's welcome panel. It is a Card like everything else on the page
// — the decorative dot pattern is absolutely positioned inside this card, not
// fixed to the viewport, so it stays clipped to the panel instead of painting
// behind the sidebar and header.
import type { ReactNode } from "react";
import { Meteors } from "../animated/Meteors";
import { GridPattern } from "../animated/GridPattern";
import { DotPattern } from "../animated/DotPattern";
import { Card, CardContent } from "../ui/card";

export function HeroSection({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    /** Stat tiles or any other content that belongs under the heading. */
    children?: ReactNode;
}) {
    return (
        <Card className="relative mb-6 overflow-hidden">
            {/* The mask fades the dots out toward the panel edges so the card
                does not end on a hard grid line. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 opacity-70"
                style={{
                    maskImage:
                        "radial-gradient(120% 100% at 50% 0%, black 40%, transparent 100%)",
                    WebkitMaskImage:
                        "radial-gradient(120% 100% at 50% 0%, black 40%, transparent 100%)",
                }}
            >
                <DotPattern
                    className="absolute inset-0"
                    gap={22}
                    radius={1}
                    color="var(--rule)"
                    glow="var(--focus)"
                />
            </div>
            {/* Meteors and the cursor-tracked grid sit behind the existing dot
                pattern at low opacity. All three are decorative and
                pointer-events-none, so the panel stays readable and clickable. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <Meteors count={10} className="absolute inset-0 opacity-40" />
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        maskImage:
                            "radial-gradient(120% 100% at 50% 0%, black 30%, transparent 100%)",
                        WebkitMaskImage:
                            "radial-gradient(120% 100% at 50% 0%, black 30%, transparent 100%)",
                    }}
                >
                    <GridPattern
                        className="absolute inset-0"
                        cell={56}
                        glowColor="var(--c2i)"
                    />
                </div>
            </div>

            <CardContent className="relative z-10 px-6 py-7 sm:px-8 sm:py-8">
                <h1 className="font-serif text-[clamp(28px,4.5vw,40px)] leading-[1.06] font-extrabold tracking-[-0.03em] text-ink">
                    {title}
                </h1>
                <p className="mt-1.5 max-w-2xl leading-relaxed text-muted">
                    {subtitle}
                </p>
                {children && <div className="mt-5">{children}</div>}
            </CardContent>
        </Card>
    );
}
