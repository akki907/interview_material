// src/components/app/PageHeader.tsx
//
// Page title + lede. Extracted because five pages were repeating the same
// heading and paragraph markup with only the wording (and occasionally the
// measure) differing.
import { cn } from "../../lib/utils";

export function PageHeader({
    title,
    intro,
    className,
}: {
    title: string;
    intro?: string;
    className?: string;
}) {
    return (
        <header className={cn("mb-6", className)}>
            <h1 className="font-serif mb-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
            </h1>
            {intro && (
                <p className="max-w-3xl leading-relaxed text-muted">{intro}</p>
            )}
        </header>
    );
}