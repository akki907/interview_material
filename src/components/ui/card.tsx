import type * as React from "react";
import { createElement } from "react";
import { cn } from "../../lib/utils";

/**
 * Card is the app's content container. Every study surface — topic sections,
 * Q&A banks, code samples, dashboard panels — is a Card so the page reads as
 * a stack of cards rather than a wall of text.
 *
 * `interactive` adds a hover lift. It is opt-in so static cards (a diagram,
 * a read-only table) stay still instead of inviting a click that does nothing.
 */
function Card({
    className,
    interactive = false,
    ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
    return (
        <div
            data-slot="card"
            className={cn(
                "bg-surface text-ink border border-rule rounded-card shadow-soft",
                "transition-[box-shadow,transform,border-color] duration-200 ease-out",
                interactive &&
                    "hover:-translate-y-0.5 hover:border-focus/40 hover:shadow-raised",
                className,
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-header"
            className={cn(
                "flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-rule",
                className,
            )}
            {...props}
        />
    );
}

function CardTitle({
    className,
    level = "h2",
    ...props
}: React.ComponentProps<"h2"> & {
    /**
     * Heading level for the card title. Defaults to h2 because a card is
     * normally a top-level section under the page h1; drop to h3 when the card
     * is an item inside an h2-headed section.
     */
    level?: "h2" | "h3" | "h4";
}) {
    return (
        createElement(level, {
            "data-slot": "card-title",
            className: cn(
                "font-serif text-lg leading-snug font-extrabold tracking-[-0.02em] text-ink",
                className,
            ),
            ...props,
        })
    );
}

/** Small uppercase caption that sits under a CardTitle. */
function CardEyebrow({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            data-slot="card-eyebrow"
            className={cn(
                "text-[11px] font-semibold tracking-wider text-muted uppercase",
                className,
            )}
            {...props}
        />
    );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            data-slot="card-description"
            className={cn("text-sm text-muted leading-relaxed", className)}
            {...props}
        />
    );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-content"
            className={cn("px-5 py-4", className)}
            {...props}
        />
    );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-footer"
            className={cn("flex items-center gap-2 px-5 pb-4 pt-0", className)}
            {...props}
        />
    );
}

export {
    Card,
    CardHeader,
    CardTitle,
    CardEyebrow,
    CardDescription,
    CardContent,
    CardFooter,
};
