// src/lib/interactive/visualizers/binaryTree.ts — build a BST by insertion,
// then walk it in order. Two tiers that answer two different questions:
// "how does the tree get shaped?" and "what does the BST invariant buy me?"
import type { VisualizerSpec } from "../spec";
import { nums } from "../parse";
import type { CellState, InteractiveStep } from "../types";

interface Node {
    v: number;
    left: Node | null;
    right: Node | null;
}

const COMPLEXITY = "Time O(n log n), space O(h)";

/** Sideways tree rendering: right subtree, the node, then the left subtree. */
function treeLines(node: Node | null, depth = 0): string[] {
    if (!node) return [];
    return [
        ...treeLines(node.right, depth + 1),
        `${"  ".repeat(depth)}${node.v}`,
        ...treeLines(node.left, depth + 1),
    ];
}

/** Adds `v` to the tree in place and returns the (possibly new) root. */
function insertOne(root: Node | null, v: number): Node {
    const node: Node = { v, left: null, right: null };
    if (!root) return node;
    const top: Node = root;
    let cur: Node = top;
    for (;;) {
        const wentLeft = v < cur.v;
        const child = wentLeft ? cur.left : cur.right;
        if (child) {
            cur = child;
            continue;
        }
        if (wentLeft) cur.left = node;
        else cur.right = node;
        return top;
    }
}

/** `values` is never empty here — the spec's `invalid` rejects shorter input. */
function buildTree(values: number[]): Node {
    let root: Node = { v: values[0], left: null, right: null };
    for (const v of values.slice(1)) root = insertOne(root, v);
    return root;
}

/** The comparisons one insertion walks through, in the reader's words. */
function insertTrace(root: Node | null, v: number): string[] {
    const comparisons: string[] = [];
    let cur = root;
    while (cur) {
        const left = v < cur.v;
        comparisons.push(
            `${v} ${left ? "<" : ">="} ${cur.v}, go ${left ? "left" : "right"}`,
        );
        cur = left ? cur.left : cur.right;
    }
    return comparisons;
}

function everyMark(
    values: number[],
    state: CellState,
): Record<number, CellState> {
    const marks: Record<number, CellState> = {};
    values.forEach((_, i) => {
        marks[i] = state;
    });
    return marks;
}

function insertValues(values: number[]): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    let root: Node | null = null;

    values.forEach((v, i) => {
        const marks: Record<number, CellState> = {};
        for (let j = 0; j < i; j++) marks[j] = "range";
        marks[i] = "ok";
        const trace = insertTrace(root, v);
        root = insertOne(root, v);

        steps.push({
            marks,
            narration:
                i === 0
                    ? `Insert ${v}. It becomes the root — there is nothing to compare it against yet.`
                    : `Insert ${v}: ${trace.join("; ")}. It comes to rest as a leaf at the end of that path.`,
            panel: { label: "The tree so far", rows: treeLines(root) },
            stats: [
                { value: String(i + 1), label: "nodes:" },
                { label: COMPLEXITY },
            ],
        });
    });

    steps.push({
        marks: everyMark(values, "ok"),
        narration:
            `All ${values.length} values are in the tree. What insertion bought you is a shape: ` +
            `a search now walks one root-to-leaf path instead of scanning every value.`,
        tone: "good",
        panel: { label: "The finished tree", rows: treeLines(root) },
        stats: [
            { value: String(values.length), label: "nodes:" },
            { label: COMPLEXITY },
        ],
        found: true,
    });
    return steps;
}

function inOrderWalk(values: number[]): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const indexOfValue = new Map<number, number>();
    values.forEach((v, i) => {
        if (!indexOfValue.has(v)) indexOfValue.set(v, i);
    });

    const visited: number[] = [];
    const stack: Node[] = [];
    let cur: Node | null = buildTree(values);

    while (cur || stack.length > 0) {
        while (cur) {
            stack.push(cur);
            cur = cur.left;
        }
        const popped = stack.pop()!;
        cur = popped.right;
        visited.push(popped.v);

        const marks = everyMark(values, "idle");
        for (const v of visited) marks[indexOfValue.get(v)!] = "ok";
        marks[indexOfValue.get(popped.v)!] = "a";

        steps.push({
            marks,
            narration:
                visited.length === 1
                    ? `Push nodes down the left spine, then pop ${popped.v} — the smallest value in the tree.`
                    : `Pop ${popped.v} off the stack and visit it. Visited so far: ${visited.join(", ")}.`,
            panel: { label: "Visit order so far", rows: visited.map(String) },
            stats: [
                { value: String(visited.length), label: "visited:" },
                { value: String(stack.length), label: "stack depth:" },
                { label: "Time O(n), space O(h)" },
            ],
        });
    }

    steps.push({
        marks: everyMark(values, "ok"),
        narration:
            `In-order ends at ${visited.join(", ")} — sorted, with no comparison work at all. ` +
            `That is the whole point of the BST invariant: left smaller, right bigger.`,
        tone: "good",
        panel: { label: "Final visit order", rows: visited.map(String) },
        stats: [
            { value: String(values.length), label: "visited:" },
            { label: "Time O(n), space O(h)" },
        ],
        found: true,
    });
    return steps;
}

export const binaryTreeBst: VisualizerSpec = {
    algo: "binary-tree",
    title: "Binary search tree, step by step",
    fields: [
        {
            id: "values",
            label: "Values (inserted in this order)",
            size: "md",
            default: "8, 3, 10, 1, 6, 14, 4, 7, 13",
            placeholder: "8, 3, 10, 1, 6, 14",
        },
    ],
    presets: [
        {
            label: "8, 3, 10, 1, 6, 14",
            fields: { values: "8, 3, 10, 1, 6, 14" },
        },
        {
            label: "5, 3, 8, 1, 4, 7, 9",
            fields: { values: "5, 3, 8, 1, 4, 7, 9" },
        },
        { label: "1, 2, 3, 4, 5 (chain)", fields: { values: "1, 2, 3, 4, 5" } },
    ],
    tiers: [
        {
            id: "insert",
            label: "BST insert",
            blurb: "Insert the values one at a time. Each new value walks down from the root until it finds an empty slot.",
            code: `prev, went_left = None, False
while cur:
    prev, went_left = cur, v < cur.v
    cur = cur.left if went_left else cur.right
prev.left if went_left else prev.right = node`,
            build: (f) => insertValues(nums(f.values)),
        },
        {
            id: "inorder",
            label: "In-order walk",
            blurb: "Visit left, then the node, then right. Every value appears exactly once, in sorted order, with no comparisons.",
            code: `stack, cur = [], root
while cur or stack:
    while cur:
        stack.append(cur); cur = cur.left
    cur = stack.pop()
    visit(cur)
    cur = cur.right`,
            build: (f) => inOrderWalk(nums(f.values)),
        },
    ],
    invalid: (f) =>
        nums(f.values).length < 2
            ? "Enter at least two values to build a tree."
            : null,
};
