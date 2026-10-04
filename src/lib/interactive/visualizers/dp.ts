// src/lib/interactive/visualizers/dp.ts — climbing stairs, expanded as a call
// tree and then flattened into a table. The point of the pair is that the same
// subproblems are recomputed exponentially in the first tier and once each in
// the second.
import type { VisualizerSpec } from "../spec";
import { int } from "../parse";
import type { CellState, InteractiveStep } from "../types";

/** Steps are capped so an exponential tier cannot build an 8000-step array. */
const MAX_STEPS = 40;

/** Calls the naive recursion makes: T(n) = 1 + T(n-1) + T(n-2), T(0)=T(1)=1. */
function callCount(n: number): number {
    if (n <= 1) return 1;
    let prev2 = 1;
    let prev1 = 1;
    for (let i = 2; i <= n; i++) {
        const next = 1 + prev1 + prev2;
        prev2 = prev1;
        prev1 = next;
    }
    return prev1;
}

function naiveRecursion(n: number): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    let calls = 0;
    const truncated = () => steps.length >= MAX_STEPS;

    function expand(stairs: number, path: number[]): number {
        calls++;
        if (!truncated()) {
            const marks: Record<number, CellState> = {};
            for (const p of path) marks[p] = "range";
            marks[stairs] = "a";
            steps.push({
                marks,
                narration:
                    stairs <= 1
                        ? `f(${stairs}) is the base case — one way to be standing there.`
                        : `f(${stairs}) asks for f(${stairs - 1}) and f(${stairs - 2}): from step ${stairs - 1} you take one stride, from step ${stairs - 2} you take two.`,
                panel: {
                    label: "Call path (innermost last)",
                    rows: path.concat(stairs).map((s) => `f(${s})`),
                    hits: [path.length],
                },
                stats: [
                    { value: String(calls), label: "calls made:" },
                    { label: "Time O(2ⁿ), space O(n)" },
                ],
            });
        }
        if (stairs <= 1) return 1;
        return (
            expand(stairs - 1, path.concat(stairs)) +
            expand(stairs - 2, path.concat(stairs))
        );
    }

    const answer = expand(n, []);
    const shown = Math.min(MAX_STEPS, steps.length);
    steps.push({
        marks: { [n]: "ok" },
        narration:
            `f(${n}) = ${answer} ways — but it took ${calls} calls to get there, ` +
            `because f(${n - 1}) and f(${n - 2}) are recomputed from scratch every time. ` +
            (shown < calls ? `Only the first ${shown} are shown here. ` : ``) +
            `That is the exponential you have to remove.`,
        tone: "good",
        stats: [
            { value: String(calls), label: "calls made:" },
            { label: "Time O(2ⁿ), space O(n)" },
        ],
        found: true,
    });
    return steps;
}

function bottomUpTable(n: number): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const dp = new Array<number>(n + 1).fill(0);
    dp[0] = 1;
    if (n >= 1) dp[1] = 1;

    const table = (active: number): InteractiveStep["cells"] => {
        const header: InteractiveStep["cells"] = [];
        const values: InteractiveStep["cells"] = [];
        for (let i = 0; i <= n; i++) {
            header.push({ text: String(i), state: "range" });
            values.push({
                text: dp[i] === 0 ? "·" : String(dp[i]),
                state: i === active ? "a" : dp[i] === 0 ? "idle" : "ok",
            });
        }
        return [...header, ...values];
    };

    steps.push({
        cells: table(-1),
        cols: n + 1,
        narration: `Seed the table: dp[0] = 1 and dp[1] = 1 — there is exactly one way to be on step 0 or step 1. Everything else is empty.`,
        panel: {
            label: "Table so far (dp)",
            rows: [dp.map((d) => (d === 0 ? "·" : d)).join("  ")],
        },
        stats: [
            { value: "2", label: "cells filled:" },
            { label: "Time O(n), space O(n)" },
        ],
    });

    for (let i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
        steps.push({
            cells: table(i),
            cols: n + 1,
            narration: `Fill dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]}. Every way to reach step ${i} arrives from step ${i - 1} or step ${i - 2}.`,
            tone: "good",
            panel: {
                label: "Table so far (dp)",
                rows: [dp.map((d) => (d === 0 ? "·" : d)).join("  ")],
            },
            stats: [
                { value: String(i + 1), label: "cells filled:" },
                { label: "Time O(n), space O(n)" },
            ],
        });
    }

    const finalCells: InteractiveStep["cells"] = [];
    for (let i = 0; i <= n; i++) {
        finalCells.push({ text: String(dp[i]), state: "ok" });
    }
    steps.push({
        cells: finalCells,
        cols: n + 1,
        narration:
            `Every cell is filled. dp[${n}] = ${dp[n]} — the same answer as the recursion, ` +
            `but computed in ${n} cells instead of ${callCount(n)} calls.`,
        tone: "good",
        stats: [
            { value: String(n + 1), label: "cells filled:" },
            { label: "Time O(n), space O(n)" },
        ],
        found: true,
    });
    return steps;
}

function clampSteps(n: number): number {
    return Math.max(1, Math.min(n, 12));
}

export const dpClimbStairs: VisualizerSpec = {
    algo: "dp",
    title: "Dynamic programming, step by step",
    fields: [
        {
            id: "n",
            label: "Stairs",
            kind: "number",
            size: "sm",
            default: "5",
            placeholder: "5",
        },
    ],
    presets: [
        { label: "5 stairs", fields: { n: "5" } },
        { label: "8 stairs", fields: { n: "8" } },
        { label: "12 stairs", fields: { n: "12" } },
    ],
    tiers: [
        {
            id: "recursion",
            label: "Naive recursion",
            blurb: "Expand the recursion f(n) = f(n-1) + f(n-2) and watch it ask for the same subproblem over and over.",
            code: `def ways(n):
    if n <= 1: return 1
    return ways(n - 1) + ways(n - 2)`,
            build: (f) => naiveRecursion(clampSteps(int(f.n) ?? 1)),
        },
        {
            id: "table",
            label: "Bottom-up DP",
            blurb: "Fill one row of the table left to right. Each cell reads the two cells before it, so every subproblem is solved exactly once.",
            code: `dp = [1] * (n + 1)
for i in range(2, n + 1):
    dp[i] = dp[i - 1] + dp[i - 2]
return dp[n]`,
            build: (f) => bottomUpTable(clampSteps(int(f.n) ?? 1)),
        },
    ],
    invalid: (f) => {
        const n = int(f.n);
        if (n === null) return "Enter a number of stairs to step through.";
        return n < 1 ? "Enter at least 1 stair to step through." : null;
    },
};
