import type * as React from "react";
import { cn } from "../../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                "flex min-h-20 w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink shadow-soft transition-colors outline-none placeholder:text-muted",
                "focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/30",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
