// src/lib/types.ts — Shared application types

export type Progress = Record<string, number>;
export type CheckedMap = Record<string, boolean>;

export type TodoCategory =
    | "dsa"
    | "react"
    | "python"
    | "ai"
    | "systemDesign"
    | "general";
export type TodoPriority = "high" | "medium" | "low";

export interface TodoItem {
    id: string;
    title: string;
    category: TodoCategory;
    priority: TodoPriority;
    completed: boolean;
    createdAt: number;
    dueDate?: string;
    linkedTopicId?: string;
    notes?: string;
}

export interface NavEntry {
    id: string;
    label: string;
    children?: NavEntry[];
}

export interface Flashcard {
    /** Stable across content edits; the review schedule is keyed by it. */
    id: string;
    cat: string;
    front: string;
    back: string;
}

/** How well the learner recalled a card. Maps onto SM-2 quality. */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

/** Scheduling state for one card. Absent means the card has never been seen. */
export interface ReviewState {
    /** SM-2 ease factor; rises for easy recalls, falls for failures. */
    ease: number;
    /** Days until the next review, measured from the last one. */
    intervalDays: number;
    /** Epoch ms at which the card next becomes due. */
    due: number;
    /** Consecutive successful recalls; reset to 0 by a lapse. */
    reps: number;
    lapses: number;
    lastReviewed: number | null;
}

export interface InterviewQuestion {
    topic: string;
    question: string;
    hint: string;
}

export interface Stats {
    problemsSolved: number;
    topicsCompleted: number;
    streak: number;
    learningHours: number;
}

// ── Content model ─────────────────────────────────────────────────
// Topic bodies are authored as trusted HTML strings (see RichText) composed
// from these small blocks, so pages stay declarative without hand-writing
// markup as JSX.

export type Tone =
    | "info"
    | "good"
    | "warn"
    | "c0"
    | "c1"
    | "c2"
    | "c3"
    | "c4"
    | "c5";

export interface CalloutBlock {
    kind: "callout";
    tone?: Tone;
    title?: string;
    html: string;
}

export interface DiagramBlock {
    kind: "diagram";
    /** Raw mermaid source. */
    source: string;
    caption?: string;
}

export interface CardBlock {
    kind: "card";
    title: string;
    html?: string;
    /** Bookmark scope; defaults to the title. */
    id?: string;
    /** Extra content rendered after the html body. */
    after?: React.ReactNode;
}

export interface QAItem {
    q: string;
    a: string;
    /** 1 (easy) to 5 (hard), rendered as star pips. */
    level?: 1 | 2 | 3 | 4 | 5;
    /** What the interviewer is actually probing for. */
    probing?: string;
    /** Likely follow-up and how to handle it. */
    followUp?: string;
}

export interface QABlock {
    kind: "qa";
    title?: string;
    items: QAItem[];
}

export interface CollapsibleBlock {
    kind: "collapsible";
    title: string;
    html: string;
    open?: boolean;
}

/**
 * Synthetic block produced by the renderer, not authored in content modules.
 *
 * Several content modules were migrated from a nested layout to this flat block
 * list, leaving behind a title-only `card` immediately before the block it used
 * to wrap. Drawn on its own such a card renders as an empty shell. The renderer
 * folds it into the following block(s) so the title becomes that card's header.
 */
export interface TitledGroupBlock {
    kind: "titled-group";
    title?: string;
    items: ContentBlock[];
}

export interface TableBlock {
    kind: "table";
    title?: string;
    headers: string[];
    rows: string[][];
}

export interface ChipsBlock {
    kind: "chips";
    items: Array<
        [label: string, value: string, tone?: "good" | "warn" | "info"]
    >;
}

export interface DefListBlock {
    kind: "deflist";
    pairs: Array<[term: string, definition: string]>;
}

export interface TabsBlock {
    kind: "tabs";
    tabs: Array<{ label: string; html: string }>;
}

export interface CodeBlock {
    kind: "code";
    title?: string;
    language: string;
    code: string;
    /** Optional explanation rendered under the snippet. */
    notes?: string;
}

export interface PipelineBlock {
    kind: "pipeline";
    stages: Array<{ name: string; desc: string }>;
}

export interface InteractiveBlock {
    kind: "interactive";
    /** Registry key: "two-sum" or any key in lib/interactive/registry.ts. */
    algo: string;
    title?: string;
    /** Optional intro paragraph above the controls. */
    html?: string;
    defaults?: {
        /** Field values keyed by field id, overriding the spec defaults. */
        fields?: Record<string, string>;
    };
}

export type ContentBlock =
    | CalloutBlock
    | DiagramBlock
    | CardBlock
    | QABlock
    | CollapsibleBlock
    | TitledGroupBlock
    | TableBlock
    | ChipsBlock
    | DefListBlock
    | TabsBlock
    | CodeBlock
    | PipelineBlock
    | InteractiveBlock;

export interface TopicContent {
    /** Nav id, e.g. "dsa-sliding-window". */
    id: string;
    title: string;
    /** Optional lede under the page title. */
    intro?: string;
    blocks: ContentBlock[];
}
