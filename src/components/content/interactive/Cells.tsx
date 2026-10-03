// src/components/content/interactive/Cells.tsx — the cell canvas
//
// Shared by the Stepper, the declarative visualizers and Two Sum's "Try it"
// mode, so the cell geometry, index captions and highlight language stay
// identical across visualizers.
import { motion } from "motion/react";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import type { CellState, StepCell } from "../../../lib/interactive/types";

const CELL_STYLES: Record<CellState, string> = {
    idle: "border-rule bg-surface text-ink",
    a: "border-c4i bg-c4 text-c4i", // blue — the element in play
    b: "border-c5i bg-c5 text-c5i", // amber — its partner, or the offending cell
    ok: "border-c1i bg-c1 text-c1i", // green — part of the answer
    active: "border-focus bg-focus text-paper",
    range: "border-c2i bg-c2 text-c2i", // purple — a window or frontier
};

/** "a" and "b" lift off the row, the way the reference does. */
const LIFTED: CellState[] = ["a", "b"];

/** Adapt a plain array + per-index state into the generic cell list. */
export function cellsFromValues(
    values: number[] | string[],
    stateOf: (index: number) => CellState,
    showIndices = true,
): StepCell[] {
    return values.map((v, i) => ({
        text: String(v),
        state: stateOf(i),
        showIndices,
    }));
}

export function Cells({
    cells,
    cols,
    onPick,
}: {
    cells: StepCell[];
    /** Fixed column count (grids). Omitted means auto-flow. */
    cols?: number;
    onPick?: (index: number) => void;
}) {
    return (
        <div
            className={cn("flex flex-wrap gap-2", cols && "grid")}
            style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined}
        >
            {cells.map((cell, i) => {
                if (cell.text === "") {
                    // Pad cells keep a grid rectangular without drawing anything.
                    return (
                        <div
                            key={i}
                            aria-hidden
                            className="size-14 rounded-xl border-2 border-transparent"
                        />
                    );
                }

                const showIndices = cell.showIndices !== false;
                const box = (
                    <motion.span
                        animate={{ y: LIFTED.includes(cell.state) ? -4 : 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "flex size-14 items-center justify-center rounded-xl border-2 font-mono text-lg font-bold transition-colors",
                            CELL_STYLES[cell.state],
                        )}
                    >
                        {cell.text}
                    </motion.span>
                );
                const caption = showIndices ? (
                    <span className="text-[11px] text-muted">index {i}</span>
                ) : null;

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
                        aria-pressed={cell.state !== "idle"}
                        aria-label={`index ${i}, value ${cell.text}`}
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