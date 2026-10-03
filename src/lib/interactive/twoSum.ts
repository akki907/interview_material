// src/lib/interactive/twoSum.ts — pure step builders for Two Sum
import type { InteractiveStep, StepBuilder } from "./types";

function statRows(checked: number, time: string, space: string) {
    return [
        { label: time === "O(n)" ? "numbers visited" : "pairs checked", value: String(checked) },
        { label: "Time", value: time },
        { label: "Space", value: space },
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
            let verdict = `— too big. Move the left pointer forward.`;
            if (hit) {
                verdict = `— that equals the target, so the answer is [${i}, ${j}].`;
            } else if (sum < target) {
                verdict = `— too small. Move the right pointer forward.`;
            }
            steps.push({
                marks: hit ? { [i]: "ok", [j]: "ok" } : { [i]: "a", [j]: "b" },
                narration: `Try indices ${i} and ${j}: ${values[i]} + ${values[j]} = ${sum} ${verdict}`,
                stats: statRows(checked, "O(n²)", "O(1)"),
                found: hit,
            });
            if (hit) break outer;
        }
    }

    if (steps.every((s) => !s.found)) {
        steps.push({
            marks: {},
            narration: `Every pair has been checked and none of them add up to ${target}. No answer exists.`,
            stats: statRows(checked, "O(n²)", "O(1)"),
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

    for (let i = 0; i < values.length; i++) {
        const x = values[i];
        visited++;
        const need = target - x;
        const hitIdx = seen.get(need);
        const rows = [...seen].map(([v, idx]) => `${v} → ${idx}`);

        if (hitIdx !== undefined) {
            steps.push({
                marks: { [i]: "ok", [hitIdx]: "ok" },
                narration: `i = ${i}, x = ${x}. The complement ${target} − ${x} = ${need} is already in the map at index ${hitIdx}. Return [${hitIdx}, ${i}].`,
                panel: { label: "value → index", rows, hits: [] },
                stats: statRows(visited, "O(n)", "O(n)"),
                found: true,
            });
            return steps;
        }

        rows.push(`${x} → ${i}`);
        steps.push({
            marks: { [i]: "active" },
            narration:
                seen.size === 0
                    ? `i = ${i}, x = ${x}. We need ${need}. The map is empty, so there is no hit. Remember ${x} → ${i}.`
                    : `i = ${i}, x = ${x}. We need ${need}, which the map does not have yet. Remember ${x} → ${i}.`,
            panel: { label: "value → index", rows, hits: [rows.length - 1] },
            stats: statRows(visited, "O(n)", "O(n)"),
        });
        // Insert *after* the lookup — otherwise x could match itself.
        seen.set(x, i);
    }

    steps.push({
        marks: {},
        narration: `The array is exhausted and no pair adds up to ${target}. No answer exists.`,
        panel: { label: "value → index", rows: [...seen].map(([v, idx]) => `${v} → ${idx}`) },
        stats: statRows(visited, "O(n)", "O(n)"),
        found: false,
    });
    return steps;
};