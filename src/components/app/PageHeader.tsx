// src/components/app/PageHeader.tsx
//
// Page title + lede. Extracted because five pages were repeating the same
// heading and paragraph markup with only the wording (and occasionally the
// measure) differing.
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function PageHeader({
    title,
    intro,
    eyebrow,
    action,
    className,
}: {
    title: string;
    intro?: string;
    /** Small uppercase label above the title, e.g. the topic's group. */
    eyebrow?: string;
    /** Right-aligned control, usually a primary button. */
    action?: ReactNode;
    className?: string;
}) {
    return (
        <header
            className={cn(
                "mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
                className,
            )}
        >
            <div className="min-w-0">
                {eyebrow && (
                    <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
                        {eyebrow}
                    </p>
                )}
                {/* Solid ink rather than the animated gradient: the reference
                    design sets its display type as one flat colour, and a
                    sweeping gradient competes with the accent used for
                    primary actions. */}
                <h1 className="font-serif mb-1.5 text-[clamp(28px,4.5vw,40px)] leading-[1.06] font-extrabold tracking-[-0.03em] text-ink">
                    {title}
                </h1>
                {intro && (
                    <p className="max-w-3xl leading-relaxed text-muted">
                        {intro}
                    </p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </header>
    );
}
