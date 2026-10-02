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
    cat: string;
    front: string;
    back: string;
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

export type ContentBlock =
    | CalloutBlock
    | DiagramBlock
    | CardBlock
    | QABlock
    | CollapsibleBlock
    | TableBlock
    | ChipsBlock
    | DefListBlock
    | TabsBlock
    | CodeBlock
    | PipelineBlock;

export interface TopicContent {
    /** Nav id, e.g. "dsa-sliding-window". */
    id: string;
    title: string;
    /** Optional lede under the page title. */
    intro?: string;
    blocks: ContentBlock[];
}
