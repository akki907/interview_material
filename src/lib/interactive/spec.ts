// src/lib/interactive/spec.ts — the declarative shape of a visualizer
//
// A spec is pure data plus pure step builders: fields the user can edit,
// presets to load them from, and one or more algorithm tiers. The shared
// `Interactive` component renders any spec without knowing what it draws, so
// adding a visualizer means adding one file and one registry entry.
import type { InteractiveStep } from "./types";

export interface FieldSpec {
    id: string;
    label: string;
    placeholder?: string;
    /** "number" gets a numeric keypad and is parsed with `int()`. */
    kind?: "text" | "number";
    /** Field width class: narrow for scalars, flexible for arrays. */
    size?: "sm" | "md";
    /** Used when the content block supplies no default. */
    default?: string;
}

export interface TierSpec {
    id: string;
    label: string;
    /** One line explaining what this tier does, shown above the stepper. */
    blurb: string;
    /** Snippet shown under the controls. */
    code?: string;
    /** Pure: raw field strings in, steps out. */
    build: (fields: Record<string, string>) => InteractiveStep[];
}

export interface PresetSpec {
    label: string;
    fields: Record<string, string>;
}

export interface VisualizerSpec {
    algo: string;
    title: string;
    fields: FieldSpec[];
    presets?: PresetSpec[];
    tiers: TierSpec[];
    /** Returns a validation message, or null when the inputs are usable. */
    invalid?: (fields: Record<string, string>) => string | null;
}