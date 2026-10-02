import type * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "../../lib/utils";

function Collapsible({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
    return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
    className,
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
    return (
        <CollapsiblePrimitive.CollapsibleTrigger
            data-slot="collapsible-trigger"
            className={cn(
                "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-neutral cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-focus/30",
                className,
            )}
            {...props}
        />
    );
}

function CollapsibleContent({
    className,
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
    return (
        <CollapsiblePrimitive.CollapsibleContent
            data-slot="collapsible-content"
            className={cn(
                "overflow-hidden data-[state=closed]:animate-none data-[state=open]:animate-none px-3 pb-3",
                className,
            )}
            {...props}
        />
    );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
