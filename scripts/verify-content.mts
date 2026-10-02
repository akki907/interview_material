/**
 * Content-integrity check.
 *
 * Compares what the legacy renderers contain against what the new React
 * content modules contain, per topic, so a migration cannot silently drop
 * prose, a diagram, or a Q&A pair.
 *
 * Block *kinds* legitimately change during migration (a card holding a table
 * becomes a `table` block), so this compares aggregate measures that are
 * invariant to that reshuffling:
 *
 *   - diagrams      exact count of mermaid sources
 *   - prose         total characters of authored prose (catches dropped text)
 *   - qa pairs      total question/answer pairs
 *
 *   npx tsx scripts/verify-content.mts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEGACY_DIR = path.join(ROOT, "src/renderers");
const CONTENT_DIR = path.join(ROOT, "src/content");

/** Prose under this fraction of the legacy volume counts as a loss. */
const PROSE_FLOOR = 0.6;

const FN_TO_ID: Record<string, string> = {
    renderSlidingWindow: "dsa-sliding-window",
    renderTwoPointers: "dsa-two-pointers",
    renderArrays: "dsa-arrays",
    renderStrings: "dsa-strings",
    renderHashMaps: "dsa-hashmaps",
    renderStack: "dsa-stack",
    renderQueue: "dsa-queue",
    renderLinkedList: "dsa-linked-list",
    renderBinaryTree: "dsa-binary-tree",
    renderBST: "dsa-bst",
    renderHeap: "dsa-heap",
    renderGraph: "dsa-graph",
    renderBacktracking: "dsa-backtracking",
    renderDP: "dsa-dp",
    renderGreedy: "dsa-greedy",
    renderReactFundamentals: "react-fundamentals",
    renderReactHooks: "react-hooks",
    renderReactState: "react-state",
    renderReactPerformance: "react-performance",
    renderReactRendering: "react-rendering",
    renderReactArchitecture: "react-architecture",
    renderReactInterview: "react-interview",
    renderPyFundamentals: "py-fundamentals",
    renderPyFunctions: "py-functions",
    renderPyOOP: "py-oop",
    renderPyIterators: "py-iterators",
    renderPyDecorators: "py-decorators",
    renderPyAsyncio: "py-asyncio",
    renderPyConcurrency: "py-concurrency",
    renderPyGIL: "py-gil",
    renderPyFastAPI: "py-fastapi",
    renderPyInterview: "py-interview",
    renderAILLM: "ai-llm",
    renderAIEmbeddings: "ai-embeddings",
    renderAIVectorDB: "ai-vector-db",
    renderAIRAG: "ai-rag",
    renderAIAdvancedRAG: "ai-advanced-rag",
    renderAIRAGEval: "ai-rag-eval",
    renderAIAgents: "ai-agents",
    renderAIToolCalling: "ai-tool-calling",
    renderAIAgentMemory: "ai-agent-memory",
    renderAIMultiAgent: "ai-multi-agent",
    renderAIOrchestration: "ai-orchestration",
    renderAISystemDesign: "ai-system-design",
    renderSDScalability: "sd-scalability",
    renderSDLoadBalancing: "sd-load-balancing",
    renderSDCaching: "sd-caching",
    renderSDDatabases: "sd-databases",
    renderSDReplication: "sd-replication",
    renderSDSharding: "sd-sharding",
    renderSDQueues: "sd-queues",
    renderSDEventDriven: "sd-event-driven",
    renderSDMicroservices: "sd-microservices",
    renderSDAPI: "sd-api",
    renderSDDistributed: "sd-distributed",
    renderSDRealWorld: "sd-realworld",
};

interface Metrics {
    diagrams: number;
    prose: number;
    qaPairs: number;
}

/** Split a renderer file into one text chunk per exported render function. */
function splitFns(src: string): Array<[string, string]> {
    const marks = [...src.matchAll(/^export function (render\w+)/gm)];
    const out: Array<[string, string]> = [];
    for (let i = 0; i < marks.length; i++) {
        const start = marks[i].index!;
        const end = i + 1 < marks.length ? marks[i + 1].index! : src.length;
        out.push([marks[i][1], src.slice(start, end)]);
    }
    return out;
}

/** Count top-level elements of an array literal, respecting nesting/quotes. */
function countArrayItems(arg: string): number {
    let depth = 0;
    let items = 0;
    let sawContent = false;
    let quote: string | null = null;
    let escaped = false;

    for (const ch of arg) {
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === "\\") escaped = true;
            else if (ch === quote) quote = null;
            sawContent = true;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === "`") {
            quote = ch;
            sawContent = true;
            continue;
        }
        if (ch === "[" || ch === "(" || ch === "{") depth++;
        else if (ch === "]" || ch === ")" || ch === "}") {
            depth--;
            if (depth === 0) return items + (sawContent ? 1 : 0);
        } else if (ch === "," && depth === 1) items++;
    }
    return items + (sawContent ? 1 : 0);
}

/** Pull the balanced argument text that follows `open` at index `from`. */
function balancedArg(src: string, open: number): string {
    const openCh = src[open];
    const closeCh = openCh === "[" ? "]" : openCh === "(" ? ")" : "}";
    let depth = 0;
    let quote: string | null = null;
    let escaped = false;

    for (let i = open; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === "\\") escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === "`") {
            quote = ch;
            continue;
        }
        if (ch === openCh) depth++;
        else if (ch === closeCh) {
            depth--;
            if (depth === 0) return src.slice(open + 1, i);
        }
    }
    return src.slice(open + 1);
}

/** Block kinds may be single- or double-quoted depending on the author. */
const kindCount = (src: string, kind: string) =>
    (src.match(new RegExp(`kind:\\s*['"]${kind}['"]`, "g")) || []).length;

/**
 * Authored prose as total characters inside string literals. The threshold is
 * low on purpose: migrated modules build long HTML by concatenating many short
 * fragments, so counting only "long" strings would badly under-report them.
 */
function proseChars(src: string): number {
    let total = 0;
    for (const m of src.matchAll(/`([^`]*)`/g)) total += m[1].length;
    for (const m of src.matchAll(/'([^'\n]{16,})'/g)) total += m[1].length;
    for (const m of src.matchAll(/"([^"\n]{16,})"/g)) total += m[1].length;
    return total;
}

/** Legacy diagrams are `diagram(...)` calls; migrated ones are `kind: "diagram"`. */
const countDiagrams = (src: string) =>
    (src.match(/\bdiagram\(/g) || []).length + kindCount(src, "diagram");

function legacyMetrics(body: string): Metrics {
    let qaPairs = 0;
    for (const m of body.matchAll(/qaCard\(/g)) {
        const open = body.indexOf("[", m.index! + m[0].length - 1);
        if (open !== -1) qaPairs += countArrayItems(balancedArg(body, open));
    }
    // Every template literal in the legacy function is authored prose.
    return { diagrams: countDiagrams(body), prose: proseChars(body), qaPairs };
}

function newMetrics(src: string): Metrics {
    let qaPairs = 0;
    for (const m of src.matchAll(/kind:\s*['"]qa['"]/g)) {
        const itemsAt = src.indexOf("items:", m.index!);
        if (itemsAt === -1) continue;
        const open = src.indexOf("[", itemsAt);
        if (open === -1) continue;
        qaPairs += countArrayItems(balancedArg(src, open));
    }
    return { diagrams: countDiagrams(src), prose: proseChars(src), qaPairs };
}

const legacy = new Map<string, Metrics>();
for (const file of fs.readdirSync(LEGACY_DIR)) {
    if (!file.endsWith(".ts")) continue;
    const src = fs.readFileSync(path.join(LEGACY_DIR, file), "utf8");
    for (const [fn, body] of splitFns(src)) {
        const id = FN_TO_ID[fn];
        if (id) legacy.set(id, legacyMetrics(body));
    }
}

const next = new Map<string, Metrics>();
for (const file of fs.readdirSync(CONTENT_DIR)) {
    if (!file.endsWith(".ts") || file === "registry.ts" || file === "index.ts")
        continue;
    next.set(
        path.basename(file, ".ts"),
        newMetrics(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8")),
    );
}

let missing = 0;
let diagramLoss = 0;
let proseLoss = 0;
let ok = 0;
const rows: string[] = [];
const pad = (s: string, n: number) => s.padEnd(n);

for (const [id, l] of [...legacy.entries()].sort()) {
    const n = next.get(id);
    if (!n) {
        rows.push(
            `${pad(id, 22)} MISSING  (legacy: ${l.diagrams} diagrams, ${l.prose} chars prose, ${l.qaPairs} qa)`,
        );
        missing++;
        continue;
    }
    const issues: string[] = [];
    if (n.diagrams < l.diagrams) {
        issues.push(`diagrams ${n.diagrams}/${l.diagrams}`);
        diagramLoss += l.diagrams - n.diagrams;
    }
    if (n.prose < l.prose * PROSE_FLOOR) {
        issues.push(`prose ${n.prose}/${l.prose}`);
        proseLoss += l.prose - n.prose;
    }
    if (n.qaPairs < l.qaPairs) issues.push(`qa ${n.qaPairs}/${l.qaPairs}`);
    if (issues.length) rows.push(`${pad(id, 22)} ${issues.join(", ")}`);
    else ok++;
}

console.log("topic                     status");
console.log("─".repeat(72));
for (const r of rows) console.log(r);
console.log("─".repeat(72));
console.log(
    `complete: ${ok}   with-gaps: ${rows.length - missing}   missing: ${missing}`,
);
console.log(`lost diagrams: ${diagramLoss}   lost prose chars: ${proseLoss}`);

const pass = missing === 0 && diagramLoss === 0 && proseLoss === 0;
console.log(
    pass
        ? "\nPASS: no lost diagrams, prose, or Q&A pairs."
        : "\nFAIL: content gaps remain.",
);
process.exit(pass ? 0 : 1);
