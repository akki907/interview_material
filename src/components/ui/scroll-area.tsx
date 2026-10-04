// src/components/ui/scroll-area.tsx
// Radix ScrollArea. The app's custom scrollbars (globals.css) already follow
// the theme, but a plain overflow box cannot show a fade at the scroll boundary;
// ScrollArea gives the nav and the shell's content rail that edge treatment.
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "../../lib/utils";

function ScrollArea({
    className,
    children,
    viewportClassName,
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
    viewportClassName?: string;
}) {
    return (
        <ScrollAreaPrimitive.Root
            data-slot="scroll-area"
            className={cn("relative overflow-hidden", className)}
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                data-slot="scroll-area-viewport"
                className={cn(
                    "size-full rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-focus/30",
                    viewportClassName,
                )}
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
}

function ScrollBar({
    className,
    orientation = "vertical",
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
    return (
        <ScrollAreaPrimitive.ScrollAreaScrollbar
            data-slot="scroll-area-scrollbar"
            orientation={orientation}
            className={cn(
                "flex touch-none p-px transition-colors select-none",
                orientation === "vertical" && "h-full w-2 border-l border-l-transparent",
                orientation === "horizontal" && "h-2 flex-col border-t border-t-transparent",
                className,
            )}
            {...props}
        >
            <ScrollAreaPrimitive.ScrollAreaThumb
                data-slot="scroll-area-thumb"
                className="relative flex-1 rounded-full bg-rule"
            />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
    );
}

export { ScrollArea, ScrollBar };