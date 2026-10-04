// src/lib/interactive/visualizers/arrays.ts — partition an array around a
// pivot, two ways: count-then-rewrite vs the three-way (Dutch flag) partition
// that classifies each element in a single pass.
import type { VisualizerSpec } from "../spec";
import { int, nums } from "../parse";
import type { CellState, InteractiveStep } from "../types";

/** Below = green (settled), the pivot region = purple, above = amber. */
function partitionMarks(
    a: number[],
    lo: number,
    mid: number,
    hi: number,
): Record<number, CellState> {
    const marks: Record<number, CellState> = {};
    for (let i = 0; i < a.length; i++) {
        if (i < lo) marks[i] = "ok";
        else if (i > hi) marks[i] = "b";
        else if (i === mid) marks[i] = "a";
        else marks[i] = "range";
    }
    return marks;
}

/** Final colouring: settled below, pivot region, settled above. */
function settledMarks(a: number[], pivot: number): Record<number, CellState> {
    const marks: Record<number, CellState> = {};
    for (let i = 0; i < a.length; i++) {
        marks[i] = a[i] < pivot ? "ok" : a[i] > pivot ? "b" : "a";
    }
    return marks;
}

function verdict(a: number[], pivot: number): string {
    const below = a.filter((x) => x < pivot).length;
    const above = a.filter((x) => x > pivot).length;
    return `${below} value(s) below ${pivot}, ${a.length - below - above} equal to it, and ${above} above it — all in the right order.`;
}

function countThenRewrite(source: number[], pivot: number): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const a = [...source];
    let below = 0;
    let equal = 0;
    let above = 0;

    for (let i = 0; i < a.length; i++) {
        const v = a[i];
        const side = v < pivot ? "below" : v > pivot ? "above" : "equal";
        if (side === "below") below++;
        else if (side === "above") above++;
        else equal++;
        steps.push({
            marks: {
                [i]: side === "below" ? "ok" : side === "above" ? "b" : "a",
            },
            narration:
                `Look at ${v} at index ${i}. It is ${side} the pivot ${pivot}, so it counts towards ` +
                `the ${side} total.`,
            tone: side === "equal" ? "good" : undefined,
            panel: {
                label: "Tally so far",
                rows: [
                    `below ${pivot}: ${below}`,
                    `equal ${pivot}: ${equal}`,
                    `above ${pivot}: ${above}`,
                ],
            },
            stats: [
                { value: String(i + 1), label: "values counted:" },
                { label: "Time O(n), space O(1)" },
            ],
        });
    }

    const sorted = [
        ...a.filter((x) => x < pivot),
        ...a.filter((x) => x === pivot),
        ...a.filter((x) => x > pivot),
    ];
    for (let i = 0; i < a.length; i++) {
        const from = a.indexOf(sorted[i]);
        a[i] = sorted[i];
        steps.push({
            marks: { [i]: "a", [from]: "a" },
            narration:
                `Position ${i} takes ${sorted[i]}, which was sitting at index ${from}. ` +
                `The array is being rewritten in place — no extra array, but every write costs a move.`,
            panel: {
                label: "Tally",
                rows: [
                    `below ${pivot}: ${below}`,
                    `equal ${pivot}: ${equal}`,
                    `above ${pivot}: ${above}`,
                ],
            },
            stats: [
                { value: String(i + 1), label: "positions filled:" },
                { label: "Time O(n), space O(1)" },
            ],
        });
    }

    steps.push({
        marks: settledMarks(a, pivot),
        narration: `Two passes are done: ${verdict(a, pivot)}`,
        tone: "good",
        stats: [
            { value: "2", label: "passes:" },
            { label: "Time O(n), space O(1)" },
        ],
        found: true,
    });
    return steps;
}

function dutchFlag(source: number[], pivot: number): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const a = [...source];
    let lo = 0;
    let mid = 0;
    let hi = a.length - 1;
    let swaps = 0;

    while (mid <= hi) {
        const v = a[mid];
        if (v < pivot) {
            [a[lo], a[mid]] = [a[mid], a[lo]];
            steps.push({
                marks: {
                    ...partitionMarks(a, lo, mid, hi),
                    [mid]: "range",
                    [lo]: "a",
                },
                narration:
                    `${v} at mid (${mid}) is below ${pivot}, so swap it with the front of the unknown region ` +
                    `at ${lo}. Everything up to ${lo} is now settled.`,
                panel: pointerPanel(lo, mid, hi),
                stats: [
                    { value: String(swaps + 1), label: "swap:" },
                    { label: "Time O(n), space O(1)" },
                ],
            });
            swaps++;
            lo++;
            mid++;
        } else if (v > pivot) {
            [a[mid], a[hi]] = [a[hi], a[mid]];
            steps.push({
                marks: {
                    ...partitionMarks(a, lo, mid, hi),
                    [mid]: "range",
                    [hi]: "a",
                },
                narration:
                    `${v} at mid (${mid}) is above ${pivot}, so swap it with the back of the unknown region at ` +
                    `${hi}. That value was never inspected, so mid stays put and looks at it again.`,
                tone: "bad",
                panel: pointerPanel(lo, mid, hi),
                stats: [
                    { value: String(swaps + 1), label: "swap:" },
                    { label: "Time O(n), space O(1)" },
                ],
            });
            swaps++;
            hi--;
        } else {
            steps.push({
                marks: { ...partitionMarks(a, lo, mid, hi), [mid]: "ok" },
                narration: `${v} at mid (${mid}) equals the pivot, so it is already in place. Advance mid.`,
                tone: "good",
                panel: pointerPanel(lo, mid, hi),
                stats: [
                    { value: String(swaps), label: "swap:" },
                    { label: "Time O(n), space O(1)" },
                ],
            });
            mid++;
        }
    }

    steps.push({
        marks: settledMarks(a, pivot),
        narration: `One pass, ${swaps} swap${swaps === 1 ? "" : "s"}: ${verdict(a, pivot)}`,
        tone: "good",
        stats: [
            { value: String(swaps), label: "swap:" },
            { label: "Time O(n), space O(1)" },
        ],
        found: true,
    });
    return steps;
}

function pointerPanel(lo: number, mid: number, hi: number) {
    return {
        label: "Three pointers",
        rows: [`low: ${lo}`, `mid: ${mid}`, `high: ${hi}`],
        hits: [1],
    };
}

export const arrayPartition: VisualizerSpec = {
    algo: "arrays",
    title: "Partition around a pivot, step by step",
    fields: [
        {
            id: "nums",
            label: "Array",
            size: "md",
            default: "2, 0, 1, 2, 0, 1, 2",
            placeholder: "2, 0, 1, 2, 0, 1, 2",
        },
        {
            id: "pivot",
            label: "Pivot",
            kind: "number",
            size: "sm",
            default: "1",
            placeholder: "1",
        },
    ],
    presets: [
        {
            label: "2,0,1,2,0,1,2 → 1",
            fields: { nums: "2, 0, 1, 2, 0, 1, 2", pivot: "1" },
        },
        {
            label: "3,1,4,1,5 → 3",
            fields: { nums: "3, 1, 4, 1, 5", pivot: "3" },
        },
        { label: "9,7,8,1 → 5", fields: { nums: "9, 7, 8, 1", pivot: "5" } },
    ],
    tiers: [
        {
            id: "counting",
            label: "Count then rewrite",
            blurb: "Tally how many values sit on each side of the pivot, then overwrite the array in that order. Simple, and it touches every element twice.",
            code: `below = sum(x < pivot for x in a)
equal = sum(x == pivot for x in a)
a = [x for x in a if x < pivot] \\
  + [x for x in a if x == pivot] \\
  + [x for x in a if x > pivot]`,
            build: (f) => {
                const a = nums(f.nums);
                const pivot = int(f.pivot) ?? 0;
                return countThenRewrite(a, pivot);
            },
        },
        {
            id: "dutch",
            label: "Three-way partition",
            blurb: "One pass, three pointers. Every element is classified as it is read, and the unknown region only ever shrinks.",
            code: `lo = mid = 0
hi = len(a) - 1
while mid <= hi:
    if a[mid] < pivot:
        a[lo], a[mid] = a[mid], a[lo]; lo += 1; mid += 1
    elif a[mid] > pivot:
        a[mid], a[hi] = a[hi], a[mid]; hi -= 1
    else:
        mid += 1`,
            build: (f) => {
                const a = nums(f.nums);
                const pivot = int(f.pivot) ?? 0;
                return dutchFlag(a, pivot);
            },
        },
    ],
    invalid: (f) => {
        if (nums(f.nums).length < 2)
            return "Enter at least two numbers to step through.";
        if (int(f.pivot) === null)
            return "Enter a numeric pivot to step through.";
        return null;
    },
};
