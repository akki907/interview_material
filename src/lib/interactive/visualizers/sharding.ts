// src/lib/interactive/visualizers/sharding.ts — what happens to your keys when
// a node joins the cluster: modulo rehashing (everything moves) versus
// consistent hashing on a ring (only one arc's keys move).
import type { VisualizerSpec } from "../spec";
import { MAX_VALUES, int } from "../parse";
import type { CellState, InteractiveStep } from "../types";

/**
 * parse.ts parses numbers; there is no string-list helper, so this mirrors
 * `nums`: split on commas/spaces, drop empties, cap the length.
 */
function keyList(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(/[ ,]+/)
        .filter((chunk) => chunk !== "")
        .slice(0, MAX_VALUES);
}

/** djb2 folded into a 0-99 position, so every run places keys identically. */
function slot(label: string): number {
    let h = 5381;
    for (let i = 0; i < label.length; i++) {
        h = ((h * 33) ^ label.charCodeAt(i)) >>> 0;
    }
    return h % 100;
}

/** Each node claims several slots so shares average out across keys. */
const VIRTUAL_NODES = 3;

interface RingSlot {
    node: number;
    pos: number;
}

function ringSlots(nodeCount: number, vnodes = VIRTUAL_NODES): RingSlot[] {
    const slots: RingSlot[] = [];
    for (let node = 0; node < nodeCount; node++) {
        for (let v = 0; v < vnodes; v++) {
            slots.push({ node, pos: slot(`node-${node + 1}/${v}`) });
        }
    }
    return slots.sort((a, b) => a.pos - b.pos || a.node - b.node);
}

/** The first node at or after `point`, wrapping past the end of the ring. */
function ownerAt(
    slots: RingSlot[],
    point: number,
): { node: number; pos: number } {
    return slots.find((s) => s.pos >= point) ?? slots[0];
}

const nodeName = (i: number) => `node-${i + 1}`;

function keyMarks(
    keys: string[],
    placed: boolean[],
    current: number | null,
    moved: Set<number>,
): Record<number, CellState> {
    const marks: Record<number, CellState> = {};
    keys.forEach((_, i) => {
        marks[i] = moved.has(i) ? "b" : placed[i] ? "ok" : "idle";
    });
    if (current !== null) marks[current] = "a";
    return marks;
}

function moduloRehash(keys: string[], nodeCount: number): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const points = keys.map((k) => slot(k));
    const before = points.map((p) => p % nodeCount);
    const after = points.map((p) => p % (nodeCount + 1));
    const placed = keys.map(() => false);
    const ownerPanel = (owners: number[]) => ({
        label: "Key → node",
        rows: keys.map((k, i) => `${k} → ${nodeName(owners[i])}`),
        hits: keys.map((_, i) => i).filter((i) => owners[i] === owners[0]),
    });
    const stats = [
        { value: String(nodeCount), label: "nodes:" },
        { value: String(keys.length), label: "keys:" },
        { label: "Time O(K) per key — and all K keys are recomputed" },
    ];

    steps.push({
        marks: keyMarks(keys, placed, null, new Set()),
        narration: `The cluster has ${nodeCount} nodes. Placement is one line of arithmetic: node = hash(key) % ${nodeCount}.`,
        panel: ownerPanel(before),
        stats,
    });

    before.forEach((node, i) => {
        placed[i] = true;
        steps.push({
            marks: keyMarks(keys, placed, i, new Set()),
            narration:
                `Place ${keys[i]}: it hashes to ${points[i]}, and ${points[i]} % ${nodeCount} = ${node}, ` +
                `so it lives on ${nodeName(node)}.`,
            panel: ownerPanel(before),
            stats,
        });
    });

    steps.push({
        marks: keyMarks(keys, placed, null, new Set()),
        narration:
            `Now ${nodeName(nodeCount)} joins and the count becomes ${nodeCount + 1}. ` +
            `The modulus changed, so every key has to be recomputed from scratch — nothing is reused.`,
        panel: ownerPanel(before),
        stats: [
            { value: String(nodeCount + 1), label: "nodes:" },
            { value: String(keys.length), label: "keys:" },
            { label: "Time O(K) per key — and all K keys are recomputed" },
        ],
    });

    const moved = new Set<number>();
    keys.forEach((_, i) => {
        if (before[i] === after[i]) return;
        moved.add(i);
        steps.push({
            marks: keyMarks(keys, placed, i, moved),
            narration:
                `${keys[i]} hashed to ${points[i]}: ${points[i]} % ${nodeCount} = ${before[i]} put it on ` +
                `${nodeName(before[i])}, and ${points[i]} % ${nodeCount + 1} = ${after[i]} puts it on ` +
                `${nodeName(after[i])}. It moves.`,
            panel: ownerPanel(after),
            stats: [
                { value: String(moved.size), label: "keys moved so far:" },
                { label: "Time O(K) per key — and all K keys are recomputed" },
            ],
        });
    });

    steps.push({
        marks: keyMarks(keys, placed, null, moved),
        narration:
            `One node out of ${nodeCount} joined, and ${moved.size} of ${keys.length} keys moved ` +
            `(${Math.round((moved.size / keys.length) * 100)}%). That is the rehash storm every topology change ` +
            `pays in modulo sharding.`,
        tone: "good",
        panel: ownerPanel(after),
        stats: [
            { value: String(moved.size), label: "keys moved:" },
            { value: String(keys.length), label: "keys total:" },
            { label: "Time O(K) per rehash" },
        ],
        found: true,
    });
    return steps;
}

function consistentRing(keys: string[], nodeCount: number): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const points = keys.map((k) => slot(k));
    const slots = ringSlots(nodeCount);
    const grown = ringSlots(nodeCount + 1);
    const placed = keys.map(() => false);
    const ownerPanel = (ring: RingSlot[]) => ({
        label: "Key → node (ring point → clockwise owner)",
        rows: keys.map(
            (k, i) => `${k} → ${nodeName(ownerAt(ring, points[i]).node)}`,
        ),
        hits: keys.map((_, i) => i),
    });
    const ringPanel = (ring: RingSlot[]) => ({
        label: "Ring slots (position → node)",
        rows: ring.map((s) => `${s.pos} → ${nodeName(s.node)}`),
    });

    steps.push({
        marks: keyMarks(keys, placed, null, new Set()),
        narration:
            `Every node claims ${VIRTUAL_NODES} positions on a 0-99 ring, and each key walks clockwise ` +
            `to the first node it meets. A node only ever owns its own arc.`,
        panel: ringPanel(slots),
        stats: [
            { value: String(slots.length), label: "ring slots:" },
            { value: String(keys.length), label: "keys:" },
            { label: "Time O(K log N) to place everything" },
        ],
    });

    for (let n = 0; n < nodeCount; n++) {
        const owned = slots.filter((s) => s.node === n);
        steps.push({
            marks: keyMarks(keys, placed, null, new Set()),
            narration:
                `${nodeName(n)} claims ring positions ${owned.map((s) => s.pos).join(", ")}. ` +
                `Virtual nodes exist so that one node does not get a wildly uneven slice.`,
            panel: ringPanel(slots),
            stats: [
                { value: String(slots.length), label: "ring slots:" },
                { label: "Time O(K log N) to place everything" },
            ],
        });
    }

    keys.forEach((_, i) => {
        placed[i] = true;
        const owner = ownerAt(slots, points[i]);
        steps.push({
            marks: keyMarks(keys, placed, i, new Set()),
            narration:
                `${keys[i]} hashes to ${points[i]}; walking clockwise, the first node it meets is ` +
                `${nodeName(owner.node)} at ${owner.pos}, so it belongs there.`,
            panel: ownerPanel(slots),
            stats: [
                { value: String(i + 1), label: "keys placed:" },
                { label: "Time O(K log N) to place everything" },
            ],
        });
    });

    const newcomer = grown.filter(
        (s) => !slots.some((o) => o.pos === s.pos && o.node === s.node),
    );
    steps.push({
        marks: keyMarks(keys, placed, null, new Set()),
        narration:
            `${nodeName(nodeCount)} joins at ring position${newcomer.length > 1 ? "s" : ""} ` +
            `${newcomer.map((s) => s.pos).join(", ")}. Only the keys whose clockwise walk now meets it first ` +
            `can possibly move.`,
        panel: ringPanel(grown),
        stats: [
            { value: String(grown.length), label: "ring slots:" },
            { label: "Only one arc is affected" },
        ],
    });

    const moved = new Set<number>();
    keys.forEach((_, i) => {
        const was = ownerAt(slots, points[i]).node;
        const now = ownerAt(grown, points[i]).node;
        if (was === now) return;
        moved.add(i);
        steps.push({
            marks: keyMarks(keys, placed, i, moved),
            narration:
                `${keys[i]} sits at ${points[i]} and used to land on ${nodeName(was)}; ` +
                `${nodeName(now)} is now the first node clockwise, so it moves.`,
            panel: ownerPanel(grown),
            stats: [
                { value: String(moved.size), label: "keys moved so far:" },
                { label: "Only one arc is affected" },
            ],
        });
    });

    const stayed = keys.length - moved.size;
    steps.push({
        marks: keyMarks(keys, placed, null, moved),
        narration:
            moved.size === 0
                ? `Not one of the ${keys.length} keys moved: every key's clockwise owner is unchanged, because no key happened to sit in the new node's arc.`
                : `${stayed} of ${keys.length} keys never moved — only the ${moved.size} inside the new node's arc did. The ring confines the change to that arc, so adding capacity costs O(K/N) moves instead of O(K).`,
        tone: "good",
        panel: ownerPanel(grown),
        stats: [
            { value: String(moved.size), label: "keys moved:" },
            { value: String(keys.length), label: "keys total:" },
            { label: "Moves ≈ K / N" },
        ],
        found: true,
    });
    return steps;
}

function keyProblem(fields: Record<string, string>): string | null {
    if (keyList(fields.keys).length < 2) {
        return "Enter at least two keys to rebalance.";
    }
    const nodes = int(fields.nodes);
    if (nodes === null || nodes < 1) {
        return "Enter how many nodes the cluster has.";
    }
    return null;
}

export const shardingRebalance: VisualizerSpec = {
    algo: "sharding",
    title: "Shard rebalance, step by step",
    fields: [
        {
            id: "keys",
            label: "Keys (comma separated)",
            size: "md",
            default:
                "customer-1, customer-2, customer-3, customer-4, customer-5, customer-6, customer-7, customer-8, customer-9, customer-10",
            placeholder: "customer-1, customer-2, customer-3",
        },
        {
            id: "nodes",
            label: "Nodes",
            kind: "number",
            size: "sm",
            default: "4",
            placeholder: "4",
        },
    ],
    presets: [
        {
            label: "10 keys, 4 nodes",
            fields: {
                keys: "customer-1, customer-2, customer-3, customer-4, customer-5, customer-6, customer-7, customer-8, customer-9, customer-10",
                nodes: "4",
            },
        },
        {
            label: "10 orders, 4 nodes",
            fields: {
                keys: "order-1, order-2, order-3, order-4, order-5, order-6, order-7, order-8, order-9, order-10",
                nodes: "4",
            },
        },
        {
            label: "6 keys, 3 nodes",
            fields: {
                keys: "shard-1, shard-2, shard-3, shard-4, shard-5, shard-6",
                nodes: "3",
            },
        },
    ],
    tiers: [
        {
            id: "modulo",
            label: "Modulo rehash",
            blurb: "node = hash(key) % N. One line of arithmetic, but adding a node changes N, so every key lands somewhere else.",
            code: `def node_for(key, n):
    return crc32(key.encode()) % n

# n changed from 3 to 4:
# every key is recomputed and most of them move`,
            build: (f) => moduloRehash(keyList(f.keys), int(f.nodes) ?? 1),
        },
        {
            id: "ring",
            label: "Consistent hashing",
            blurb: "Nodes claim arcs of a ring and each key walks clockwise to the first one it meets, so a new node only takes over its own arc.",
            code: `ring = sorted(pos for node in nodes for pos in virtual_nodes(node))

def node_for(key, ring):
    point = hash128(key) % 100
    return first_node_at_or_after(ring, point)`,
            build: (f) => consistentRing(keyList(f.keys), int(f.nodes) ?? 1),
        },
    ],
    invalid: keyProblem,
};
