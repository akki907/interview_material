// src/components/content/interactive/Cells.tsx — the row of values
//
// Shared by the Stepper (read-only) and by problem-specific "solve it by hand"
// modes (clickable), so the cell geometry, index captions and highlight
// language stay identical across visualizers.
import { motion } from "motion/react";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import type { CellState } from "../../../lib/interactive/types";

const CELL_STYLES: Record<CellState, string> = {
    idle: "border-rule bg-surface text-ink",
    a: "border-c4i bg-c4 text-c4i", // blue — the element in play
    b: "border-c5i bg-c5 text-c5i", // amber — its partner
    ok: "border-c1i bg-c1 text-c1i", // green — part of the answer
    active: "border-focus bg-focus text-paper",
    range: "border-c2i bg-c2 text-c2i", // purple — a window/frontier
};

/** "a" and "b" lift off the row, the way the mockup does. */
const LIFTED: CellState[] = ["a", "b"];

export function Cells({
    values,
    stateOf,
    onPick,
}: {
    values: number[];
    stateOf: (index: number) => CellState;
    onPick?: (index: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {values.map((v, i) => {
                const state = stateOf(i);
                const box = (
                    <motion.span
                        animate={{ y: LIFTED.includes(state) ? -4 : 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "flex size-14 items-center justify-center rounded-xl border-2 font-mono text-lg font-bold transition-colors",
                            CELL_STYLES[state],
                        )}
                    >
                        {v}
                    </motion.span>
                );
                const caption = (
                    <span className="text-[11px] text-muted">index {i}</span>
                );

                if (!onPick) {
                    return (
                        <div
                            key={i}
                            className="flex flex-col items-center gap-1"
                        >
                            {box}
                            {caption}
                        </div>
                    );
                }

                return (
                    <Button
                        key={i}
                        variant="ghost"
                        aria-pressed={state !== "idle"}
                        aria-label={`index ${i}, value ${v}`}
                        onClick={() => onPick(i)}
                        className="h-auto w-auto flex-col gap-1 p-0 hover:bg-transparent"
                    >
                        {box}
                        {caption}
                    </Button>
                );
            })}
        </div>
    );
}