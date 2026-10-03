// src/lib/interactive/visualizers/heap.ts — the smallest k numbers, either by
// sorting the whole array or by building a min-heap and popping k times.
// Both tiers reorder a working copy, so each step draws its own row of cells.
import type { VisualizerSpec } from "../spec";
import { int, nums } from "../parse";
import type { InteractiveStep, StepCell } from "../types";

const SORT_COMPLEXITY = "Time O(n²), space O(1)";
const HEAP_COMPLEXITY = "Time O(n log k), space O(k)";

/** The working array as it stands right now. */
function row(
    a: number[],
    stateAt: (i: number) => StepCell["state"],
): StepCell[] {
    return a.map((v, i) => ({ text: String(v), state: stateAt(i) }));
}

function selectionSort(input: number[]): InteractiveStep[] {
    const a = input.slice();
    const steps: InteractiveStep[] = [];
    let comparisons = 0;

    for (let i = 0; i < a.length - 1; i++) {
        let smallest = i;
        for (let j = i + 1; j < a.length; j++) {
            comparisons++;
            const took = a[j] < a[smallest];
            const was = a[smallest];
            if (took) smallest = j;
            steps.push({
                cells: row(a, (idx) =>
                    idx === i
                        ? "range"
                        : idx === j
                          ? took
                              ? "a"
                              : "b"
                          : idx === smallest && idx !== j
                            ? "b"
                            : "idle",
                ),
                narration:
                    `Compare index ${i} (${was}) with index ${j} (${a[j]}): ` +
                    (took
                        ? `${a[j]} is smaller, so it becomes the candidate for the smallest slot.`
                        : `${was} stays smaller, so index ${i} keeps the lead.`),
                tone: took ? "good" : undefined,
                stats: [
                    { value: String(comparisons), label: "comparisons:" },
                    { label: SORT_COMPLEXITY },
                ],
            });
        }

        if (smallest === i) {
            steps.push({
                cells: row(a, (idx) =>
                    idx < i ? "ok" : idx === i ? "a" : "idle",
                ),
                narration: `Index ${i} already holds the smallest remaining value (${a[i]}), so nothing needs to move.`,
                stats: [
                    { value: String(comparisons), label: "comparisons:" },
                    { label: SORT_COMPLEXITY },
                ],
            });
        } else {
            const moved = a[smallest];
            steps.push({
                cells: row(a, (idx) =>
                    idx === i || idx === smallest
                        ? "a"
                        : idx < i
                          ? "ok"
                          : "idle",
                ),
                narration:
                    `Swap: ${moved} lands in index ${i} and ${a[i]} moves to index ${smallest}. ` +
                    `The sorted prefix grows by one.`,
                tone: "good",
                stats: [
                    { value: String(comparisons), label: "comparisons:" },
                    { label: SORT_COMPLEXITY },
                ],
            });
            [a[i], a[smallest]] = [a[smallest], a[i]];
        }
    }

    return steps;
}

function minHeap(input: number[], k: number): InteractiveStep[] {
    const a = input.slice();
    const n = a.length;
    const steps: InteractiveStep[] = [];
    let heapSize = 0;
    let comparisons = 0;

    // Build the heap by inserting one value at a time and sifting it up.
    for (let i = 0; i < n; i++) {
        heapSize = i + 1;
        steps.push({
            cells: row(a, (idx) =>
                idx === i ? "a" : idx < heapSize ? "range" : "idle",
            ),
            narration: `Insert ${a[i]} at index ${i}. A single value is always a valid heap.`,
            panel: heapPanel(a, heapSize),
            stats: [
                { value: String(heapSize), label: "in the heap:" },
                { label: HEAP_COMPLEXITY },
            ],
        });

        let child = i;
        while (child > 0) {
            const parent = (child - 1) >> 1;
            comparisons++;
            if (a[parent] <= a[child]) break;
            const above = a[parent];
            const below = a[child];
            steps.push({
                cells: row(a, (idx) =>
                    idx === parent
                        ? "b"
                        : idx === child
                          ? "a"
                          : idx < heapSize
                            ? "range"
                            : "idle",
                ),
                narration: `${below} is smaller than its parent ${above} at index ${parent}, so it has to rise.`,
                tone: "bad",
                panel: heapPanel(a, heapSize),
                stats: [
                    { value: String(comparisons), label: "comparisons:" },
                    { label: HEAP_COMPLEXITY },
                ],
            });
            [a[parent], a[child]] = [a[child], a[parent]];
            child = parent;
            steps.push({
                cells: row(a, (idx) =>
                    idx === child ? "a" : idx < heapSize ? "range" : "idle",
                ),
                narration: `Swapped: ${below} now sits at index ${child} and ${above} drops to index ${child + 1}. Every parent is smaller than its children again.`,
                tone: "good",
                panel: heapPanel(a, heapSize),
                stats: [
                    { value: String(heapSize), label: "in the heap:" },
                    { label: HEAP_COMPLEXITY },
                ],
            });
        }
    }

    // Pop the root k times — each pop is the next smallest value.
    for (let taken = 1; taken <= k && heapSize > 0; taken++) {
        const smallest = a[0];
        steps.push({
            cells: row(a, (idx) =>
                idx === 0 ? "ok" : idx < heapSize ? "range" : "ok",
            ),
            narration: `The root is ${smallest} — the smallest value still in the heap, so it is number ${taken} of the k you want.`,
            tone: "good",
            panel: heapPanel(a, heapSize),
            stats: [
                { value: String(taken), label: "taken:" },
                { value: String(heapSize), label: "still in the heap:" },
                { label: HEAP_COMPLEXITY },
            ],
            found: true,
        });
        if (taken === k) break;

        const last = heapSize - 1;
        const moved = a[last];
        a[0] = a[last];
        a[last] = smallest;
        heapSize--;

        steps.push({
            cells: row(a, (idx) => (idx < heapSize ? "range" : "ok")),
            narration: `Move ${moved} from index ${last} into the root and shrink the heap to ${heapSize} values.`,
            panel: heapPanel(a, heapSize),
            stats: [
                { value: String(taken), label: "taken:" },
                { value: String(heapSize), label: "still in the heap:" },
                { label: HEAP_COMPLEXITY },
            ],
        });

        let parent = 0;
        for (;;) {
            const left = 2 * parent + 1;
            const right = left + 1;
            if (left >= heapSize) break;
            comparisons++;
            let child = left;
            if (right < heapSize && a[right] < a[left]) child = right;
            if (a[parent] <= a[child]) break;
            const up = a[parent];
            const down = a[child];
            steps.push({
                cells: row(a, (idx) =>
                    idx === parent
                        ? "b"
                        : idx === child
                          ? "a"
                          : idx < heapSize
                            ? "range"
                            : "ok",
                ),
                narration: `${up} at the parent is bigger than its smaller child ${down} at index ${child}, so ${up} sinks.`,
                tone: "bad",
                panel: heapPanel(a, heapSize),
                stats: [
                    { value: String(comparisons), label: "comparisons:" },
                    { label: HEAP_COMPLEXITY },
                ],
            });
            [a[parent], a[child]] = [a[child], a[parent]];
            parent = child;
        }
    }

    return steps;
}

/** The live heap, with the slots it has already given up frozen as answers. */
function heapPanel(a: number[], heapSize: number) {
    return {
        label: "Min-heap (index → value)",
        rows: a.map((v, i) =>
            i < heapSize ? `${i} → ${v}` : `${i} → ${v} (taken)`,
        ),
        hits: a.flatMap((_v, i) => (i >= heapSize ? [i] : [])),
    };
}

const ANSWER_STAT = (k: number) => ({
    value: String(k),
    label: "values wanted:",
});

export const heapTopK: VisualizerSpec = {
    algo: "heap",
    title: "▶️ Heapify and top-k, step by step",
    fields: [
        {
            id: "nums",
            label: "Numbers",
            size: "md",
            default: "5, 3, 8, 1, 9, 2",
            placeholder: "5, 3, 8, 1, 9, 2",
        },
        {
            id: "k",
            label: "k",
            kind: "number",
            size: "sm",
            default: "3",
            placeholder: "3",
        },
    ],
    presets: [
        {
            label: "5, 3, 8, 1, 9, 2 · k = 3",
            fields: { nums: "5, 3, 8, 1, 9, 2", k: "3" },
        },
        {
            label: "9, 4, 7, 1, 2 · k = 3",
            fields: { nums: "9, 4, 7, 1, 2", k: "3" },
        },
        { label: "2, 2, 1, 1 · k = 2", fields: { nums: "2, 2, 1, 1", k: "2" } },
    ],
    tiers: [
        {
            id: "sort",
            label: "Sort and take k",
            blurb: "Selection-sort the whole array, then read off the first k. Simple to say out loud, and it sorts far more than you needed.",
            code: `for i in range(len(a)):
    m = i
    for j in range(i + 1, len(a)):
        if a[j] < a[m]:
            m = j
    a[i], a[m] = a[m], a[i]
return a[:k]`,
            build: (f) =>
                withAnswer(selectionSort(nums(f.nums)), nums(f.nums), int(f.k)),
        },
        {
            id: "heap",
            label: "Min-heap",
            blurb: "Build a min-heap by sifting each value up to its place, then pop the root k times. Each pop is the next smallest, for O(log n) work.",
            code: `heap = []
for x in a:
    heap.append(x)
    sift_up(heap, len(heap) - 1)
out = []
for _ in range(k):
    out.append(heap[0])
    heap[0] = heap.pop()
    sift_down(heap, 0)`,
            build: (f) =>
                withAnswer(
                    minHeap(nums(f.nums), Math.max(1, int(f.k) ?? 1)),
                    nums(f.nums),
                    int(f.k),
                ),
        },
    ],
    invalid: (f) => {
        const values = nums(f.nums);
        if (values.length < 2)
            return "Enter at least two numbers to step through.";
        const k = int(f.k);
        if (k === null)
            return "Enter how many of the smallest values you want.";
        if (k < 1) return "k has to be at least 1.";
        return null;
    },
};

/** Appends the closing step that states the answer and lights it up. */
function withAnswer(
    steps: InteractiveStep[],
    input: number[],
    kRaw: number | null,
): InteractiveStep[] {
    const k = Math.min(Math.max(kRaw ?? 1, 1), input.length);
    const sorted = input.slice().sort((x, y) => x - y);
    const answer = sorted.slice(0, k);
    const states = new Map<number, "ok">();
    answer.forEach((v) => {
        const index = input.findIndex((x, i) => x === v && !states.has(i));
        if (index >= 0) states.set(index, "ok");
    });

    steps.push({
        cells: row(input, (i) => states.get(i) ?? "idle"),
        narration:
            `The k = ${k} smallest value(s) are ${answer.join(", ")}. ` +
            `Everything above them in the order is at least as large, so there is nothing cheaper to find.`,
        tone: "good",
        panel: {
            label: "Answer",
            rows: answer.map((v, i) => `${i + 1}. ${v}`),
            hits: answer.map((_v, i) => i),
        },
        stats: [ANSWER_STAT(k), { label: HEAP_COMPLEXITY }],
        found: true,
    });
    return steps;
}
