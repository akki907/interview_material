// src/components/app/StatTiles.tsx
//
// A row of headline numbers. Shared by the dashboard metrics, the todo
// counters, and the chip block in topic content, which were three separate
// implementations of the same shape.
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";

export interface StatTile {
    label: string;
    value: React.ReactNode;
    /** Tailwind text colour for the value. */
    tone?: string;
}

export function StatTiles({
    tiles,
    columns = 4,
    className,
}: {
    tiles: StatTile[];
    columns?: 2 | 3 | 4;
    className?: string;
}) {
    const cols =
        columns === 2
            ? "grid-cols-2"
            : columns === 3
              ? "grid-cols-2 sm:grid-cols-3"
              : "grid-cols-2 lg:grid-cols-4";

    return (
        <div className={cn("grid gap-3", cols, className)}>
            {tiles.map((t) => (
                <Card key={t.label}>
                    <CardContent>
                        <p
                            className={cn(
                                "font-serif text-2xl font-bold",
                                t.tone ?? "text-ink",
                            )}
                        >
                            {t.value}
                        </p>
                        <p className="mt-0.5 text-[11px] tracking-wider text-muted uppercase">
                            {t.label}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}