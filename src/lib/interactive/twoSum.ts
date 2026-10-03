// src/lib/interactive/twoSum.ts — pure step builders for Two Sum
import type { InteractiveStep, StepBuilder } from "./types";

const BRUTE_CODE =
    `for i in range(len(nums)):
    for j in range(i + 1, len(nums)):
        if nums[i] + nums[j] == target:
            return [i, j]`;

const HASH_CODE =
    `seen = {}
for i, x in enumerate(nums):
    need = target - x
    if need in seen:
        return [seen[need], i]
    seen[x] = i`;

export const CODE: Record<string, string> = {
    "two-sum:brute": BRUTE_CODE,
    "two-sum:hash": HASH_CODE,
};

interface StatMode {
    /** "pairs checked" | "numbers visited" */
    counter: string;
    /** per-element worst case, e.g. "6 pairs" | "4 lookups" */
    worst: (n: number) => string;
    complexity: string;
}

const BRUTE_STATS: StatMode = {
    counter: "pairs checked",
    worst: (n) => `${(n * (n - 1)) / 2} pairs`,
    complexity: "Time O(n²), space O(1)",
};

const HASH_STATS: StatMode = {
    counter: "numbers visited",
    worst: (n) => `${n} lookups`,
    complexity: "Time O(n), space O(n)",
};

function statRows(count: number, n: number, mode: StatMode) {
    return [
        { value: String(count), label: `${mode.counter}:` },
        { label: `Worst case for ${n} numbers: ${mode.worst(n)}` },
        { label: mode.complexity },
    ];
}

/** The O(n²) double loop: the thing the hash map replaces. */
export const bruteForce: StepBuilder = ({ values, target }) => {
    const steps: InteractiveStep[] = [];
    let checked = 0;

    outer: for (let i = 0; i < values.length; i++) {
        for (let j = i + 1; j < values.length; j++) {
            checked++;
            const sum = values[i] + values[j];
            const hit = sum === target;
            steps.push({
                marks: hit ? { [i]: "ok", [j]: "ok" } : { [i]: "a", [j]: "b" },
                narration:
                    `Add the numbers at index ${i} and ${j}: ` +
                    `${values[i]} + ${values[j]} = ${sum}. ` +
                    (hit
                        ? `That equals ${target}. Answer: [${i}, ${j}].`
                        : `Not ${target}. Try the next pair.`),
                tone: hit ? "good" : undefined,
                stats: statRows(checked, values.length, BRUTE_STATS),
                found: hit,
            });
            if (hit) break outer;
        }
    }

    if (steps.every((s) => !s.found)) {
        steps.push({
            marks: {},
            narration: `Not ${target}. That was the last pair, so no answer exists.`,
            tone: "bad",
            stats: statRows(checked, values.length, BRUTE_STATS),
            found: false,
        });
    }

    return steps;
};

/**
 * The one-pass map. The current value is inserted *after* the lookup, so a
 * duplicate like [3, 3] can never pair an index with itself.
 */
export const hashMap: StepBuilder = ({ values, target }) => {
    const steps: InteractiveStep[] = [];
    const seen = new Map<number, number>();
    let visited = 0;
    const label = "Map of numbers seen so far (value → index)";

    for (let i = 0; i < values.length; i++) {
        const x = values[i];
        visited++;
        const need = target - x;
        const hitIdx = seen.get(need);
        const rows = [...seen].map(([v, idx]) => `${v} → ${idx}`);

        if (hitIdx !== undefined) {
            steps.push({
                marks: { [i]: "ok", [hitIdx]: "ok" },
                narration:
                    `Look at ${x}. The partner it needs is ${target} − ${x} = ${need}. ` +
                    `${need} is already in the map at index ${hitIdx}. Answer: [${hitIdx}, ${i}].`,
                tone: "good",
                panel: {
                    label,
                    rows,
                    // Light up the chip that answered the query.
                    hits: [rows.findIndex((r) => r.startsWith(`${need} `))],
                },
                stats: statRows(visited, values.length, HASH_STATS),
                found: true,
            });
            return steps;
        }

        rows.push(`${x} → ${i}`);
        steps.push({
            marks: { [i]: "a" },
            narration:
                `Look at ${x}. The partner it needs is ${target} − ${x} = ${need}. ` +
                (seen.size === 0
                    ? `${need} is not in the map yet, because the map is empty. `
                    : `${need} is not in the map yet. `) +
                `Save ${x} → index ${i} and move on.`,
            panel: { label, rows, hits: [rows.length - 1] },
            stats: statRows(visited, values.length, HASH_STATS),
        });
        // Insert *after* the lookup — otherwise x could match itself.
        seen.set(x, i);
    }

    steps.push({
        marks: {},
        narration: `The array has ended and ${need0(values, target)} was never found: no answer exists.`,
        tone: "bad",
        panel: {
            label,
            rows: [...seen].map(([v, idx]) => `${v} → ${idx}`),
        },
        stats: statRows(visited, values.length, HASH_STATS),
        found: false,
    });
    return steps;
};

/** The complement of the last number examined — what the run ended looking for. */
function need0(values: number[], target: number): number {
    return target - values[values.length - 1];
}