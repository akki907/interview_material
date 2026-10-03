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
                "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-neutral outline-none focus-visible:ring-[3px] focus-visible:ring-focus/30",
                "group/collapsible",
                className,
            )}
            {...props}
        />
    );
}

/**
 * Height animation without JS measurement.
 *
 * Animating `height` needs a pixel value, which means either a layout read on
 * every open or a fixed max-height that clips long answers. The grid-rows
 * technique (0fr -> 1fr) transitions to the content's natural height, so the
 * Q&A accordions open smoothly at any length and cost nothing to animate.
 */
function CollapsibleContent({
    className,
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
    return (
        <CollapsiblePrimitive.CollapsibleContent
            data-slot="collapsible-content"
            className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]",
                // Keep the panel out of the tab order and hit-testing while closed.
                "data-[state=closed]:invisible data-[state=closed]:pointer-events-none",
                className,
            )}
            {...props}
        />
    );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };