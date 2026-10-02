import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-focus/30 focus-visible:border-focus cursor-pointer",
    {
        variants: {
            variant: {
                default: "bg-ink text-paper hover:bg-ink/90",
                primary: "bg-focus text-white hover:bg-focus/90",
                outline:
                    "border border-rule bg-surface text-ink hover:bg-neutral",
                ghost: "text-muted hover:bg-neutral hover:text-ink",
                subtle: "bg-neutral text-ink hover:bg-rule/60",
                danger: "bg-danger text-white hover:bg-danger/90",
            },
            size: {
                sm: "h-8 rounded-md px-3 text-xs",
                default: "h-9 px-4 py-2",
                lg: "h-10 rounded-md px-6",
                icon: "size-9",
            },
        },
        defaultVariants: { variant: "default", size: "default" },
    },
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : "button";
    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
