import { cn } from "../../lib/utils";

export function Skeleton({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="skeleton"
            aria-hidden
            className={cn("animate-pulse rounded-md bg-neutral", className)}
            {...props}
        />
    );
}

/** Placeholder that mirrors the shape of a content page while it loads. */
export function PageSkeleton() {
    return (
        <div className="flex flex-col gap-4" role="status" aria-label="Loading">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-40 w-full" />
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
        </div>
    );
}