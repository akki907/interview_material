// src/lib/interactive/visualizers/twoPointers.ts — Container With Most Water,
// walked two ways: every pair, then the two-pointer squeeze that only needs one
// pass from each end.
import type { VisualizerSpec } from "../spec";
import { nums } from "../parse";
import type { InteractiveStep } from "../types";

interface Best {
    area: number;
    i: number;
    j: number;
}

function allPairs(h: number[]): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    let best: Best = { area: -1, i: 0, j: 1 };
    let tried = 0;

    for (let i = 0; i < h.length; i++) {
        for (let j = i + 1; j < h.length; j++) {
            tried++;
            const width = j - i;
            const height = Math.min(h[i], h[j]);
            const area = width * height;
            const improved = area > best.area;
            if (improved) best = { area, i, j };

            steps.push({
                marks: { [i]: "a", [j]: "b" },
                narration:
                    `Hold the walls at index ${i} and ${j}: the gap is ${width} wide and the ` +
                    `shorter wall is ${height} tall, so the trapped water is ${area}. ` +
                    `The best so far is ${best.area}.`,
                tone: improved ? "good" : undefined,
                stats: [
                    { value: String(tried), label: "pairs tried:" },
                    { value: String(best.area), label: "best area:" },
                    { label: "Time O(n²), space O(1)" },
                ],
            });
        }
    }

    steps.push(summary(h, best, tried, "O(n²)"));
    return steps;
}

function squeezeFromBothEnds(h: number[]): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    let left = 0;
    let right = h.length - 1;
    let best: Best = { area: -1, i: 0, j: h.length - 1 };
    let moves = 0;

    while (left < right) {
        const width = right - left;
        const height = Math.min(h[left], h[right]);
        const area = width * height;
        const improved = area > best.area;
        if (improved) best = { area, i: left, j: right };
        const moveLeft = h[left] <= h[right];
        moves++;

        let advice: string;
        if (height === 0) {
            advice = "Neither wall holds water, so nothing here can win.";
        } else if (moveLeft) {
            advice =
                "The left wall is the bottleneck — no wider gap with it can do better, so move it inwards.";
        } else {
            advice = "The right wall is the bottleneck, so move it inwards.";
        }

        steps.push({
            marks: { [left]: "a", [right]: "b" },
            narration:
                `The gap runs from index ${left} to ${right}: ${width} wide, and the shorter wall ` +
                `is ${height} tall, so it traps ${area}. ${advice}`,
            tone: improved ? "good" : height === 0 ? "bad" : undefined,
            panel: {
                label: "The two pointers",
                rows: [
                    `left: index ${left} (height ${h[left]})`,
                    `right: index ${right} (height ${h[right]})`,
                ],
            },
            stats: [
                { value: String(moves), label: "moves:" },
                { value: String(best.area), label: "best area:" },
                { label: "Time O(n), space O(1)" },
            ],
        });

        if (moveLeft) left++;
        else right--;
    }

    steps.push(summary(h, best, moves, "O(n)"));
    return steps;
}

function summary(
    h: number[],
    best: Best,
    work: number,
    complexity: string,
): InteractiveStep {
    if (best.area <= 0) {
        return {
            marks: {},
            narration:
                "No pair of walls traps any water, so there is nothing to report. " +
                "This happens whenever every height is zero or there is only one wall.",
            tone: "bad",
            stats: [
                { value: String(work), label: "moves:" },
                { label: `Time ${complexity}, space O(1)` },
            ],
            found: false,
        };
    }
    return {
        marks: { [best.i]: "ok", [best.j]: "ok" },
        narration:
            `The widest span of water sits between index ${best.i} and ${best.j}: ` +
            `${Math.min(h[best.i], h[best.j])} tall and ${best.j - best.i} wide, holding ${best.area}. ` +
            `Every other pair has been ruled out.`,
        tone: "good",
        stats: [
            { value: String(work), label: "moves:" },
            { value: String(best.area), label: "best area:" },
            { label: `Time ${complexity}, space O(1)` },
        ],
        found: true,
    };
}

export const twoPointers: VisualizerSpec = {
    algo: "two-pointers",
    title: "Two pointers, step by step",
    fields: [
        {
            id: "heights",
            label: "Wall heights",
            size: "md",
            default: "1, 8, 6, 2, 5, 4, 8, 3, 7",
            placeholder: "1, 8, 6, 2, 5",
        },
    ],
    presets: [
        {
            label: "1, 8, 6, 2, 5, 4, 8, 3, 7",
            fields: { heights: "1, 8, 6, 2, 5, 4, 8, 3, 7" },
        },
        { label: "4, 3, 2, 1, 4", fields: { heights: "4, 3, 2, 1, 4" } },
        { label: "1, 1", fields: { heights: "1, 1" } },
        { label: "5, 1, 2, 3, 4", fields: { heights: "5, 1, 2, 3, 4" } },
    ],
    tiers: [
        {
            id: "brute",
            label: "Brute force",
            blurb: "Try every pair of walls, compute the water it traps, and keep the biggest. Correct, and it redoes a lot of arithmetic.",
            code: `best = 0
for i in range(len(h)):
    for j in range(i + 1, len(h)):
        best = max(best, (j - i) * min(h[i], h[j]))`,
            build: (f) => allPairs(nums(f.heights)),
        },
        {
            id: "pointers",
            label: "Two pointers",
            blurb: "Start one pointer at each end, measure, then move whichever wall is shorter — that wall can never win a wider gap.",
            code: `left, right = 0, len(h) - 1
while left < right:
    best = max(best, (right - left) * min(h[left], h[right]))
    if h[left] < h[right]:
        left += 1
    else:
        right -= 1`,
            build: (f) => squeezeFromBothEnds(nums(f.heights)),
        },
    ],
    invalid: (f) =>
        nums(f.heights).length < 2
            ? "Enter at least two wall heights to step through."
            : null,
};
