// src/lib/interactive/visualizers/stack.ts — balanced brackets, walked with a
// stack and then with the naive counter it exists to replace. The counter tier
// deliberately fails on "([)]": that failure is the lesson.
import type { VisualizerSpec } from "../spec";
import { chars } from "../parse";
import type { CellState, InteractiveStep } from "../types";

const OPENERS = new Set(["(", "[", "{"]);
const MATCH: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

const COMPLEXITY = "Time O(n), space O(n)";

/** Marks every character up to `to` idle, so a step never shows stale colour. */
function cleared(charsSoFar: number): Record<number, CellState> {
    const marks: Record<number, CellState> = {};
    for (let i = 0; i < charsSoFar; i++) marks[i] = "idle";
    return marks;
}

/** The truth, used by the counter tier to explain where counting fails. */
function verifyAll(s: string[]): { ok: boolean; reason: string } {
    const stack: string[] = [];
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (OPENERS.has(c)) {
            stack.push(c);
            continue;
        }
        if (!MATCH[c])
            return {
                ok: false,
                reason: `'${c}' at index ${i} is not a delimiter at all`,
            };
        const top = stack.pop();
        if (top !== MATCH[c]) {
            return {
                ok: false,
                reason: `'${c}' at index ${i} does not match the '${top ?? "nothing"}' it closed`,
            };
        }
    }
    if (stack.length > 0) {
        return {
            ok: false,
            reason: `'${stack[stack.length - 1]}' is pushed and never closed`,
        };
    }
    return { ok: true, reason: "every delimiter is closed in the right order" };
}

function withStack(s: string[]): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const stack: string[] = [];
    let mismatched = false;

    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        const marks = cleared(i);

        if (OPENERS.has(c)) {
            stack.push(c);
            marks[i] = "a";
            steps.push({
                marks,
                narration: `Read '${c}' at index ${i}. It opens something, so push it — the stack holds ${stack.join(" ")}.`,
                panel: {
                    label: "Stack (bottom → top)",
                    rows: stack,
                    hits: [stack.length - 1],
                },
                stats: [
                    { value: String(i + 1), label: "characters read:" },
                    { value: String(stack.length), label: "stack depth:" },
                    { label: COMPLEXITY },
                ],
            });
            continue;
        }

        const top = stack.pop();
        const matched = top === MATCH[c];
        marks[i] = matched ? "ok" : "b";
        if (matched && top) {
            const openerIndex = s.lastIndexOf(top, i);
            marks[openerIndex] = "ok";
        } else if (top) {
            marks[s.lastIndexOf(top, i)] = "b";
        }

        steps.push({
            marks,
            narration: matched
                ? `Read '${c}' at index ${i}. Pop '${top}' — it is the one this closes, so the pair is gone. Stack left: ${stack.length === 0 ? "empty" : stack.join(" ")}.`
                : `Read '${c}' at index ${i}. The top of the stack is '${top ?? "nothing"}', which this does not close. Mismatch — the string is not balanced.`,
            tone: matched ? undefined : "bad",
            panel: {
                label: "Stack (bottom → top)",
                rows: stack.length === 0 ? ["empty"] : stack,
            },
            stats: [
                { value: String(i + 1), label: "characters read:" },
                { value: String(stack.length), label: "stack depth:" },
                { label: COMPLEXITY },
            ],
        });

        if (!matched) {
            mismatched = true;
            break;
        }
    }

    if (!mismatched && stack.length === 0) {
        steps.push({
            marks: closedMarks(s),
            narration: `The stack is empty and no mismatch ever fired: ${s.join("")} is balanced.`,
            tone: "good",
            panel: { label: "Stack (bottom → top)", rows: ["empty"] },
            stats: [
                { value: String(s.length), label: "characters read:" },
                { label: COMPLEXITY },
            ],
            found: true,
        });
    } else if (!mismatched && stack.length > 0) {
        steps.push({
            marks: cleared(s.length),
            narration: `Ran out of characters with '${stack.join("")}' still on the stack — those were opened and never closed, so the string is not balanced.`,
            tone: "bad",
            panel: { label: "Left on the stack", rows: stack },
            stats: [
                { value: String(s.length), label: "characters read:" },
                { label: COMPLEXITY },
            ],
            found: false,
        });
    }

    return steps;
}

function closedMarks(s: string[]): Record<number, CellState> {
    const marks: Record<number, CellState> = {};
    s.forEach((_, i) => {
        marks[i] = "ok";
    });
    return marks;
}

/** Counts only — no ordering information at all. */
function byCounting(s: string[]): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    let openers = 0;
    let closers = 0;

    s.forEach((c, i) => {
        const marks = cleared(i);
        const isOpener = OPENERS.has(c);
        if (isOpener) openers++;
        else closers++;
        marks[i] = isOpener ? "a" : "b";
        steps.push({
            marks,
            narration:
                `Read '${c}' at index ${i}: ${isOpener ? "an opener" : "a closer"}. ` +
                `Counters now read ${openers} open, ${closers} close — and that is all this method knows.`,
            panel: {
                label: "Running counters",
                rows: [`openers: ${openers}`, `closers: ${closers}`],
            },
            stats: [
                { value: String(i + 1), label: "characters read:" },
                { label: "Time O(n), space O(1)" },
            ],
        });
    });

    const truth = verifyAll(s);
    const countsMatch = openers === closers;
    if (countsMatch) {
        steps.push({
            marks: closedMarks(s),
            narration: truth.ok
                ? `The counters match (${openers} and ${closers}), so this method says balanced — and here it is right: ${truth.reason}.`
                : `The counters match (${openers} and ${closers}), so this method says balanced — and it is wrong: ${truth.reason}. Counting cannot see order.`,
            tone: truth.ok ? "good" : "bad",
            panel: {
                label: "Running counters",
                rows: [`openers: ${openers}`, `closers: ${closers}`],
            },
            stats: [
                { value: String(s.length), label: "characters read:" },
                { label: "Time O(n), space O(1)" },
            ],
            found: truth.ok,
        });
    } else {
        steps.push({
            marks: closedMarks(s),
            narration: `The counters disagree (${openers} open, ${closers} close), so the string is not balanced — ${truth.reason}.`,
            tone: "bad",
            panel: {
                label: "Running counters",
                rows: [`openers: ${openers}`, `closers: ${closers}`],
            },
            stats: [
                { value: String(s.length), label: "characters read:" },
                { label: "Time O(n), space O(1)" },
            ],
            found: false,
        });
    }

    return steps;
}

export const stackDelimiters: VisualizerSpec = {
    algo: "stack",
    title: "▶️ Matching delimiters, step by step",
    fields: [
        {
            id: "text",
            label: "String",
            size: "md",
            default: "([]{})",
            placeholder: "([]{})",
        },
    ],
    presets: [
        { label: "([]{})", fields: { text: "([]{})" } },
        { label: "([)] (the trap)", fields: { text: "([)]" } },
        { label: "{[()]}", fields: { text: "{[()]}" } },
    ],
    tiers: [
        {
            id: "stack",
            label: "With a stack",
            blurb: "Push every opener, pop on every closer, and check that the popped delimiter is the one being closed. The mismatch is caught the instant it happens.",
            code: `stack = []
for i, ch in enumerate(s):
    if ch in "([{":
        stack.append(ch)
    elif not stack or stack.pop() != MATCH[ch]:
        return False
return not stack`,
            build: (f) => withStack(chars(f.text)),
        },
        {
            id: "count",
            label: "Without a stack",
            blurb: 'Count openers against closers. It is O(1) space and it is wrong: on "([)]" the counts match even though the nesting does not.',
            code: `open = sum(ch in "([{" for ch in s)
close = len(s) - open
return open == close   # right count, no idea about order`,
            build: (f) => byCounting(chars(f.text)),
        },
    ],
    invalid: (f) =>
        chars(f.text).length < 2
            ? "Enter at least two characters to step through."
            : null,
};
