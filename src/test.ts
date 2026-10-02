/**
 * Interview OS — content model tests
 *
 * The legacy suite smoke-tested 60 imperative renderers; that layer is gone.
 * These tests cover the React content model instead: that every navigable topic
 * actually has content, that blocks are well-formed, and that the nav and
 * content registries have not drifted apart.
 *
 *   pnpm test
 */
import { NAV, TOPIC_IDS } from "./lib/data";
import { getContent } from "./content/registry";
import type { ContentBlock } from "./lib/types";
// Side-effecting import: registers every topic with the registry.
import "./content";

/** Topics rendered by dedicated pages rather than the content registry. */
const STANDALONE_ROUTES = new Set([
    "dashboard",
    "todos",
    "interview",
    "flashcards",
]);

/**
 * Mermaid's diagram headers. Kept as a list because mermaid supports many
 * diagram families (mindmap, quadrantChart, gitGraph, ...) and a diagram that
 * uses an unlisted one would fail to render at runtime.
 */
const MERMAID_HEADERS =
    /^\s*(graph|flowchart|stateDiagram|sequenceDiagram|classDiagram|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|mindmap|timeline|block-beta|architecture-beta|packet-beta|kanban|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|sankey-beta|xychart-beta|radar-beta|treemap-beta)\b/im;

let passed = 0;
function check(cond: unknown, msg: string): void {
    if (cond) {
        passed++;
        return;
    }
    console.error("  ✗ " + msg);
    process.exitCode = 1;
}

// ── nav integrity ───────────────────────────────────────────────
check(NAV.length > 0, "NAV is non-empty");

const childIds = NAV.flatMap((g) => (g.children ?? []).map((c) => c.id));
const topLevelIds = NAV.filter((g) => !g.children).map((g) => g.id);
const allIds = [...topLevelIds, ...childIds];

check(
    new Set(allIds).size === allIds.length,
    "nav ids are unique (found a duplicate id)",
);
check(
    TOPIC_IDS.length === allIds.length,
    `TOPIC_IDS (${TOPIC_IDS.length}) matches nav ids (${allIds.length})`,
);

// ── content coverage ────────────────────────────────────────────
const missing = TOPIC_IDS.filter(
    (id) => !STANDALONE_ROUTES.has(id) && !getContent(id),
);
check(
    missing.length === 0,
    `every content topic has content (missing: ${missing.join(", ") || "none"})`,
);

// ── block well-formedness ───────────────────────────────────────
const VALID_KINDS = new Set([
    "card",
    "diagram",
    "callout",
    "qa",
    "collapsible",
    "table",
    "chips",
    "deflist",
    "tabs",
    "code",
    "pipeline",
]);

let totalBlocks = 0;
let totalDiagrams = 0;
let totalQa = 0;

for (const id of TOPIC_IDS) {
    if (STANDALONE_ROUTES.has(id)) continue;
    const content = getContent(id);
    if (!content) continue;

    check(content.id === id, `${id}: registerContent id matches its filename`);
    check(
        typeof content.title === "string" && content.title.length > 0,
        `${id}: has a non-empty title`,
    );
    check(
        Array.isArray(content.blocks) && content.blocks.length > 0,
        `${id}: has at least one block`,
    );

    for (const block of content.blocks as ContentBlock[]) {
        totalBlocks++;
        check(
            VALID_KINDS.has(block.kind),
            `${id}: unknown block kind "${(block as { kind: string }).kind}"`,
        );

        switch (block.kind) {
            case "diagram":
                totalDiagrams++;
                check(
                    typeof block.source === "string" &&
                        block.source.trim().length > 0,
                    `${id}: diagram has mermaid source`,
                );
                check(
                    MERMAID_HEADERS.test(block.source),
                    `${id}: diagram source has a recognised mermaid header`,
                );
                break;
            case "qa":
                totalQa += block.items.length;
                check(block.items.length > 0, `${id}: qa block has items`);
                for (const item of block.items) {
                    check(
                        !!item.q && !!item.a,
                        `${id}: qa item has a question and answer`,
                    );
                }
                break;
            case "table":
                check(block.headers.length > 0, `${id}: table has headers`);
                check(block.rows.length > 0, `${id}: table has rows`);
                break;
            case "tabs":
                check(block.tabs.length > 0, `${id}: tabs block has tabs`);
                break;
            case "pipeline":
                check(block.stages.length > 0, `${id}: pipeline has stages`);
                break;
        }
    }
}

// ── coarse sanity on totals ─────────────────────────────────────
check(totalBlocks > 400, `substantial content present (${totalBlocks} blocks)`);
check(totalDiagrams >= 100, `diagrams preserved (${totalDiagrams})`);
check(totalQa >= 50, `Q&A banks preserved (${totalQa} pairs)`);

if (process.exitCode) {
    console.error("\n✗ content model tests FAILED");
} else {
    console.log(
        `✓ content model verified — ${TOPIC_IDS.length} topics, ` +
            `${totalBlocks} blocks, ${totalDiagrams} diagrams, ${totalQa} Q&A pairs ` +
            `(${passed} assertions)`,
    );
}
