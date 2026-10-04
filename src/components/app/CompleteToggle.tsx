// src/components/app/CompleteToggle.tsx
//
// Marks a study topic complete. Only rendered on /topic/:id routes.
import { CheckIcon } from "lucide-react";
import { useStore } from "../../lib/store";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

export function CompleteToggle({ topicId }: { topicId: string }) {
    const done = useStore((s) => !!s.checked[topicId]);
    const toggleCheck = useStore((s) => s.toggleCheck);

    return (
        <Button
            variant={done ? "primary" : "outline"}
            size="sm"
            onClick={() => toggleCheck(topicId)}
            aria-pressed={done}
            className={cn(
                "gap-1.5 text-xs font-semibold",
                done ? "bg-c1 text-c1i hover:bg-c1" : "text-muted",
            )}
        >
            <CheckIcon className="size-3.5" />
            {done ? "Completed" : "Mark complete"}
        </Button>
    );
}
