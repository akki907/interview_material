// src/lib/interactive/visualizers/slidingWindow.ts — longest substring without
// repeating characters, walked two ways: expand-from-each-start vs a real
// sliding window. This file is the template for the declarative visualizers:
// a spec (fields, presets, tiers) plus pure step builders.
import type { VisualizerSpec } from "../spec";
import { chars } from "../parse";
import type { CellState, InteractiveStep } from "../types";

/** Window cells purple; `active` (just consumed) blue, `bad` (repeat) amber. */
function windowMarks(
    from: number,
    to: number,
    active?: number,
    bad?: number,
): Record<number, CellState> {
    const marks: Record<number, CellState> = {};
    for (let i = from; i <= to; i++) {
        marks[i] = "range";
    }
    if (active !== undefined) marks[active] = "a";
    if (bad !== undefined) marks[bad] = "b";
    return marks;
}

function expandFromEachStart(s: string[]): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    let best = { len: 0, start: 0 };
    const tally = () => [
        { value: String(steps.length + 1), label: "windows tried:" },
        { label: `Longest so far: ${best.len}` },
        { label: "Time O(n³), space O(1)" },
    ];

    for (let i = 0; i < s.length; i++) {
        const seen = new Set<string>();
        for (let right = i; right < s.length; right++) {
            if (seen.has(s[right])) {
                steps.push({
                    marks: windowMarks(i, right - 1, undefined, right),
                    narration:
                        `Extending from index ${i}: '${s[right]}' at index ${right} repeats a character ` +
                        `already in the window, so stop. The window stays '${s.slice(i, right).join("")}'.`,
                    tone: "bad",
                    stats: tally(),
                });
                break;
            }
            seen.add(s[right]);
            const len = right - i + 1;
            if (len > best.len) best = { len, start: i };
            steps.push({
                marks: windowMarks(i, right, right),
                narration:
                    `Extending from index ${i}: '${s[right]}' joins the window, giving ` +
                    `'${s.slice(i, right + 1).join("")}' (length ${len}) — no repeats yet.`,
                stats: tally(),
            });
        }
    }

    const answer: Record<number, CellState> = {};
    for (let i = best.start; i < best.start + best.len; i++) answer[i] = "ok";
    steps.push({
        marks: answer,
        narration: `Every start has been tried. The longest substring without repeats is '${s.slice(best.start, best.start + best.len).join("")}' (length ${best.len}).`,
        tone: "good",
        stats: [{ label: "Time O(n³), space O(1)" }],
        found: true,
    });
    return steps;
}

function onePassWindow(s: string[]): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const lastSeen = new Map<string, number>();
    let left = 0;
    let best = { len: 0, start: 0 };
    let moves = 0;

    for (let right = 0; right < s.length; right++) {
        const c = s[right];
        const previous = lastSeen.get(c);
        const repeats = previous !== undefined && previous >= left;

        if (repeats) {
            const dropped = previous + 1 - left;
            moves += dropped;
            left = previous + 1;
        }

        const rows = [...lastSeen].map(([ch, i]) => `${ch} → ${i}`);
        steps.push({
            marks: windowMarks(left, right, right, repeats ? previous : undefined),
            narration: repeats
                ? `Look at '${c}' at index ${right}. It last appeared at index ${previous}, inside the window — jump the left edge to ${left} and drop ${previous + 1 - left + 1} character(s) at once.`
                : `Look at '${c}' at index ${right}. It is not in the window, so the window grows to '${s.slice(left, right + 1).join("")}' (length ${right + 1 - left}).`,
            tone: repeats ? "bad" : undefined,
            panel: {
                label: "Last index seen (character → index)",
                rows,
                hits: repeats ? [rows.findIndex((r) => r.startsWith(`${c} `))] : [],
            },
            stats: [
                { value: String(right + 1), label: "characters read:" },
                { value: String(left), label: "window start:" },
                { label: "Time O(n), space O(k)" },
            ],
        });

        lastSeen.set(c, right);
        const len = right - left + 1;
        if (len > best.len) best = { len, start: left };
    }

    const answer: Record<number, CellState> = {};
    for (let i = best.start; i < best.start + best.len; i++) answer[i] = "ok";
    steps.push({
        marks: answer,
        narration:
            `One pass is done. The longest substring without repeats is ` +
            `'${s.slice(best.start, best.start + best.len).join("")}' (length ${best.len}). ` +
            `Every character entered the window once and left it once.`,
        tone: "good",
        panel: {
            label: "Last index seen (character → index)",
            rows: [...lastSeen].map(([ch, i]) => `${ch} → ${i}`),
        },
        stats: [
            { value: String(s.length), label: "characters read:" },
            { value: String(moves), label: "left-edge moves:" },
            { label: "Time O(n), space O(k)" },
        ],
        found: true,
    });
    return steps;
}

export const slidingWindow: VisualizerSpec = {
    algo: "sliding-window",
    title: "▶️ Sliding window, step by step",
    fields: [
        {
            id: "text",
            label: "String",
            size: "md",
            default: "abcabcbb",
            placeholder: "abcabcbb",
        },
    ],
    presets: [
        { label: "abcabcbb", fields: { text: "abcabcbb" } },
        { label: "pwwkew", fields: { text: "pwwkew" } },
        { label: "bbbbb", fields: { text: "bbbbb" } },
    ],
    tiers: [
        {
            id: "brute",
            label: "Brute force",
            blurb:
                "Expand a window from every starting index and stop at the first repeat. Correct, but it re-reads the same characters over and over.",
            code:
                `for i in range(len(s)):
    seen = set()
    for j in range(i, len(s)):
        if s[j] in seen:
            break
        seen.add(s[j])
        best = max(best, j - i + 1)`,
            build: (f) => expandFromEachStart(chars(f.text)),
        },
        {
            id: "window",
            label: "Sliding window",
            blurb:
                "One pass. Remember where each character last appeared, and jump the left edge straight past the repeat.",
            code:
                `last = {}
left = 0
for right, ch in enumerate(s):
    if ch in last and last[ch] >= left:
        left = last[ch] + 1
    last[ch] = right
    best = max(best, right - left + 1)`,
            build: (f) => onePassWindow(chars(f.text)),
        },
    ],
    invalid: (f) =>
        chars(f.text).length < 2 ? "Enter at least two characters to step through." : null,
};