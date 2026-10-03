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

/** Pure: same input always produces the same steps. */
export type StepBuilder = (input: InteractiveInput) => InteractiveStep[];

/** Cap on how many numbers a visualizer will accept, to keep the row on screen. */
export const MAX_VALUES = 12;

/**
 * Mirrors the visualizer's own parsing: split on commas/spaces, coerce with
 * Number(), drop anything non-finite, cap the length.
 */
export function parseValues(raw: string): number[] {
    return raw
        .split(/[ ,]+/)
        .filter((chunk) => chunk !== "")
        .map((chunk) => Number(chunk))
        .filter((n) => Number.isFinite(n))
        .slice(0, MAX_VALUES);
}

export function parseTarget(raw: string): number | null {
    if (raw.trim().length === 0) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}