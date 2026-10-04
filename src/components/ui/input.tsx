import type * as React from "react";
import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "flex h-9 w-full rounded-full border border-rule bg-surface px-4 py-1 text-sm text-ink shadow-soft transition-colors outline-none placeholder:text-muted",
                "focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/30",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                className,
            )}
            {...props}
        />
    );
}

export { Input };
