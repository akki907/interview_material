// src/components/ui/breadcrumb.tsx
// Radix-free breadcrumb. The nav tree is two levels deep at most, so a plain
// ordered list is enough; the chevrons are decorative separators, which the
// `aria-hidden` keeps out of the accessible name.
import * as React from "react";
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { cn } from "../../lib/utils";

function Breadcrumb(props: React.ComponentProps<"nav">) {
    return <nav aria-label="Breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
    return (
        <ol
            data-slot="breadcrumb-list"
            className={cn(
                "flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
                className,
            )}
            {...props}
        />
    );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
    return (
        <li
            data-slot="breadcrumb-item"
            className={cn("inline-flex items-center gap-1.5", className)}
            {...props}
        />
    );
}

function BreadcrumbLink({
    className,
    ...props
}: React.ComponentProps<"a">) {
    return (
        <a
            data-slot="breadcrumb-link"
            className={cn(
                "rounded-sm transition-colors hover:text-ink focus-visible:ring-[3px] focus-visible:ring-focus/30",
                className,
            )}
            {...props}
        />
    );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            data-slot="breadcrumb-page"
            aria-current="page"
            className={cn("font-medium text-ink", className)}
            {...props}
        />
    );
}

function BreadcrumbSeparator({
    children,
    className,
    ...props
}: React.ComponentProps<"li">) {
    return (
        <li
            data-slot="breadcrumb-separator"
            role="presentation"
            aria-hidden="true"
            className={cn("[&>svg]:size-3.5", className)}
            {...props}
        >
            {children ?? <ChevronRightIcon />}
        </li>
    );
}

function BreadcrumbEllipsis({
    className,
    ...props
}: React.ComponentProps<"span">) {
    return (
        <span
            data-slot="breadcrumb-ellipsis"
            role="presentation"
            aria-hidden="true"
            className={cn("flex size-9 items-center justify-center", className)}
            {...props}
        >
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">More</span>
        </span>
    );
}

export {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
};