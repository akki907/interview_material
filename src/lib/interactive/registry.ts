// src/lib/interactive/registry.ts — algorithm key -> step builder
//
// Content blocks only ever name a key (e.g. `algo: "two-sum"` plus a tier
// suffix). Adding a visualizer means adding one pure builder and one registry
// entry — no changes to the content model, the renderer, or the Stepper.
import { bruteForce, hashMap } from "./twoSum";
import type { StepBuilder } from "./types";

/**
 * Keys are `<algo>:<tier>`. Two Sum has three tiers; "try" is handled by the
 * component itself, since answering by hand is problem-specific.
 */
export const STEP_BUILDERS: Record<string, StepBuilder> = {
   "two-sum:brute": bruteForce,
   "two-sum:hash": hashMap,
};

export function getStepBuilder(key: string): StepBuilder | undefined {
   return STEP_BUILDERS[key];
}
