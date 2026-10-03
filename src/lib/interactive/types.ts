// src/lib/interactive/types.ts — the contract for step-wise visualizers
//
// A visualizer is a *pure* function from (values, target) to a list of steps.
// The Stepper component knows nothing about any particular algorithm: it just
// renders `marks`, `narration`, `panel` and `stats`. That is what lets a later
// sliding-window, graph-frontier or DP visualizer plug in without touching the
// shared UI.

/** Highlight state for a single cell in the row of values. */
export type CellState =
 | "idle"
 | "a" // first element of the current pair / the element being processed
 | "b" // second element of the current pair
 | "ok" // part of the answer
 | "active" // the element being processed right now
 | "range"; // inside a window/frontier (used by later visualizers)

export interface InteractiveStep {
 /** Per-index cell highlight. Missing index = "idle". */
 marks?: Record<number, CellState>;
 /**
  * Explicit cell row, for problems that are not a single array (DP tables,
  * mazes, trees). When present it replaces `marks` entirely.
  */
 cells?: StepCell[];
 /** Columns for `cells`; omitted means auto-flow. */
 cols?: number;
 /** Announced through the aria-live region, so write it as a sentence. */
 narration: string;
 /** Tints the narration: green for a hit, red for a dead end. */
 tone?: "good" | "bad";
 /** Optional side panel, e.g. a live `value -> index` map. */
 panel?: { label: string; rows: string[]; hits?: number[] };
 /**
  * Bottom stats row. `{ value, label }` renders as "value label"; a bare
  * `{ label }` renders as a plain sentence.
  */
 stats?: Array<{ label: string; value?: string }>;
 /** True when this step produces the answer. */
 found?: boolean;
}

export interface InteractiveInput {
 values: number[];
 target: number;
}

/** One rendered cell when a step draws its own canvas. */
export interface StepCell {
 text: string;
 state: CellState;
 /** Show the `index N` caption under the cell (default true). */
 showIndices?: boolean;
}

/** Pure: same input always produces the same steps. */
export type StepBuilder = (input: InteractiveInput) => InteractiveStep[];
