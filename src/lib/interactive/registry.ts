// src/lib/interactive/registry.ts — algorithm key -> step builder / spec
//
// Content blocks only ever name a key (e.g. `algo: "two-sum"`). Adding a
// visualizer means adding one spec and one entry here — no changes to the
// content model, the renderer, or the shared UI.
import { bruteForce, hashMap } from "./twoSum";
import type { StepBuilder } from "./types";
import type { VisualizerSpec } from "./spec";

/** Keys are `<algo>:<tier>`. Two Sum has three tiers; "try" is hand-written. */
export const STEP_BUILDERS: Record<string, StepBuilder> = {
    "two-sum:brute": bruteForce,
    "two-sum:hash": hashMap,
};

export function getStepBuilder(key: string): StepBuilder | undefined {
    return STEP_BUILDERS[key];
}

import { slidingWindow } from "./visualizers/slidingWindow";
import { twoPointers } from "./visualizers/twoPointers";
import { graphBfs } from "./visualizers/graph";
import { heapTopK } from "./visualizers/heap";
import { binaryTreeBst } from "./visualizers/binaryTree";
import { stackDelimiters } from "./visualizers/stack";
import { dpClimbStairs } from "./visualizers/dp";
import { arrayPartition } from "./visualizers/arrays";
import { backtrackingMaze } from "./visualizers/backtracking";
import { shardingRebalance } from "./visualizers/sharding";

/**
 * Every declarative visualizer. Two Sum is deliberately absent: it carries a
 * hand-written "Try it" pane, so `InteractiveBlockView` special-cases it.
 */
export const VISUALIZERS: Record<string, VisualizerSpec> = {
    "sliding-window": slidingWindow,
    "two-pointers": twoPointers,
    graph: graphBfs,
    heap: heapTopK,
    "binary-tree": binaryTreeBst,
    stack: stackDelimiters,
    dp: dpClimbStairs,
    arrays: arrayPartition,
    backtracking: backtrackingMaze,
    sharding: shardingRebalance,
};

export function getVisualizer(algo: string): VisualizerSpec | undefined {
    return VISUALIZERS[algo];
}