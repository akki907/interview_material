import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
    // Buttons carry a press state, not just a colour change: without an explicit
    // active scale they read as links on touch, where there is no hover.
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold select-none active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-focus/30 focus-visible:border-focus cursor-pointer",
    {
        variants: {
            variant: {
                default: "bg-ink text-paper hover:bg-ink/90",
                primary:
                    "bg-accent text-on-accent shadow-soft hover:bg-accent/90 hover:shadow-raised",
                outline:
                    "border border-rule bg-surface text-ink hover:border-focus/40 hover:bg-neutral",
                ghost: "text-muted hover:bg-neutral hover:text-ink",
                subtle: "bg-neutral text-ink hover:bg-rule/60",
                danger:
                    "bg-danger text-on-danger hover:bg-danger/90",
            },
            size: {
                sm: "h-8 px-3.5 text-xs",
                default: "h-9 px-4 py-2",
                lg: "h-10 px-6",
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
