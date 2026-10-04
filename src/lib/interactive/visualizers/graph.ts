// src/lib/interactive/visualizers/graph.ts — shortest path through a maze,
// walked with BFS (guaranteed shortest) and with DFS (dives, may be longer).
// A maze is not a 1-D array, so both tiers draw their own grid via `cells`.
//
// Cells are keyed by their "[row, col]" string so they can live in a Map
// without array-identity surprises.
import type { VisualizerSpec } from "../spec";
import { gridRows, isRectangular } from "../parse";
import type { CellState, InteractiveStep, StepCell } from "../types";

/** Down, right, up, left — the order a DFS stack ends up diving in. */
const DIRS: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
];

interface Maze {
    rows: string[];
    cols: number;
}

const CELL_COMPLEXITY = "Time O(rows × cols), space O(rows × cols)";

function at(maze: Maze, r: number, c: number): string {
    return maze.rows[r]?.[c] ?? "0";
}

function isOpen(maze: Maze, r: number, c: number): boolean {
    return at(maze, r, c) === "1";
}

function name(r: number, c: number): string {
    return `[${r}, ${c}]`;
}

function coords(cell: string): [number, number] {
    const [r, c] = cell.replace(/[[\]]/g, "").split(",").map(Number);
    return [r, c];
}

/** Row-major grid for one step: distance where known, maze character elsewhere. */
function mazeCells(
    maze: Maze,
    dist: Map<string, number>,
    stateOf: (r: number, c: number) => CellState,
): StepCell[] {
    const cells: StepCell[] = [];
    for (let r = 0; r < maze.rows.length; r++) {
        for (let c = 0; c < maze.cols; c++) {
            const key = name(r, c);
            cells.push({
                text: dist.has(key) ? String(dist.get(key)) : at(maze, r, c),
                state: stateOf(r, c),
            });
        }
    }
    return cells;
}

/** Current cell blue, everything still queued purple, everything else cleared. */
function walkState(
    current: string,
    pending: string[],
): (r: number, c: number) => CellState {
    return (r, c) => {
        const key = name(r, c);
        if (key === current) return "a";
        return pending.includes(key) ? "range" : "idle";
    };
}

/** Cells on the parent chain back from `end`. */
function pathState(
    parents: Map<string, string>,
    end: string,
): (r: number, c: number) => CellState {
    return (r, c) => (onPath(parents, end, name(r, c)) ? "ok" : "idle");
}

function onPath(
    parents: Map<string, string>,
    end: string,
    key: string,
): boolean {
    for (
        let node: string | undefined = end;
        node !== undefined;
        node = parents.get(node)
    ) {
        if (node === key) return true;
    }
    return false;
}

/** Shortest distance from the start, or null when the end is unreachable. */
function shortestDistance(maze: Maze): number | null {
    const dist = new Map<string, number>([[name(0, 0), 0]]);
    const queue: string[] = [name(0, 0)];
    for (let head = 0; head < queue.length; head++) {
        const current = queue[head];
        const [r, c] = coords(current);
        for (const [dr, dc] of DIRS) {
            const key = name(r + dr, c + dc);
            if (isOpen(maze, r + dr, c + dc) && !dist.has(key)) {
                dist.set(key, dist.get(current)! + 1);
                queue.push(key);
            }
        }
    }
    return dist.get(name(maze.rows.length - 1, maze.cols - 1)) ?? null;
}

function breadthFirst(maze: Maze): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const end = name(maze.rows.length - 1, maze.cols - 1);
    const dist = new Map<string, number>([[name(0, 0), 0]]);
    const parents = new Map<string, string>();
    const queue: string[] = [name(0, 0)];
    let found = false;

    while (queue.length > 0 && !found) {
        const current = queue.shift()!;
        const [r, c] = coords(current);
        const depth = dist.get(current)!;
        const fresh: string[] = [];

        for (const [dr, dc] of DIRS) {
            const key = name(r + dr, c + dc);
            if (isOpen(maze, r + dr, c + dc) && !dist.has(key)) {
                dist.set(key, depth + 1);
                parents.set(key, current);
                queue.push(key);
                fresh.push(key);
            }
        }

        found = current === end;
        steps.push({
            cells: mazeCells(maze, dist, walkState(current, queue)),
            cols: maze.cols,
            narration: found
                ? `The end ${current} comes out of the queue at distance ${depth}. BFS empties a whole wavefront before it touches the next, so nothing shorter can exist.`
                : fresh.length === 0
                  ? `${current} is a dead end at distance ${depth} — nothing opens behind it, so the search turns to the rest of the wavefront.`
                  : `${current} (distance ${depth}) opens ${fresh.join(" and ")} at distance ${depth + 1}. Every cell in the queue is the same distance from the start.`,
            tone: found ? "good" : fresh.length === 0 ? "bad" : undefined,
            panel: {
                label: "Frontier queue (cell → distance)",
                rows: queue.map((q) => `${q} → ${dist.get(q)}`),
            },
            stats: [
                { value: String(dist.size), label: "cells reached:" },
                { value: String(queue.length), label: "still queued:" },
                { label: CELL_COMPLEXITY },
            ],
            found,
        });
    }

    const best = shortestDistance(maze);
    steps.push(
        best === null
            ? {
                  cells: mazeCells(maze, dist, () => "idle"),
                  cols: maze.cols,
                  narration:
                      "The queue drained without reaching the far corner, so this maze has no path at all.",
                  tone: "bad",
                  stats: [
                      { value: String(dist.size), label: "cells reached:" },
                      { label: CELL_COMPLEXITY },
                  ],
                  found: false,
              }
            : {
                  cells: mazeCells(maze, dist, pathState(parents, end)),
                  cols: maze.cols,
                  narration: `The end is ${best} move(s) from the start, and that is the shortest possible route: BFS reaches every cell of distance d before it looks at distance d + 1.`,
                  tone: "good",
                  stats: [
                      { value: String(dist.size), label: "cells reached:" },
                      { value: String(best), label: "shortest distance:" },
                      { label: CELL_COMPLEXITY },
                  ],
                  found: true,
              },
    );
    return steps;
}

function depthFirst(maze: Maze): InteractiveStep[] {
    const steps: InteractiveStep[] = [];
    const end = name(maze.rows.length - 1, maze.cols - 1);
    const dist = new Map<string, number>();
    const parents = new Map<string, string>();
    const stack: string[] = [name(0, 0)];
    let pops = 0;
    let found = false;

    while (stack.length > 0 && !found) {
        const current = stack.pop()!;
        const [r, c] = coords(current);

        if (dist.has(current)) {
            pops++;
            steps.push({
                cells: mazeCells(maze, dist, walkState(current, stack)),
                cols: maze.cols,
                narration: `${current} is already on this path, so drop the duplicate and fall back to the deepest cell still on the stack.`,
                tone: "bad",
                panel: {
                    label: "DFS stack (next first)",
                    rows: [...stack]
                        .reverse()
                        .map((s) => `${s} → depth ${depthOf(parents, s)}`),
                },
                stats: [
                    { value: String(pops), label: "cells popped:" },
                    { value: String(stack.length), label: "stack depth:" },
                    { label: CELL_COMPLEXITY },
                ],
            });
            continue;
        }

        dist.set(
            current,
            parents.has(current) ? dist.get(parents.get(current)!)! + 1 : 0,
        );
        const fresh: string[] = [];
        for (const [dr, dc] of DIRS) {
            const key = name(r + dr, c + dc);
            if (isOpen(maze, r + dr, c + dc) && !dist.has(key)) {
                parents.set(key, current);
                stack.push(key);
                fresh.push(key);
            }
        }
        pops++;
        found = current === end;

        steps.push({
            cells: mazeCells(maze, dist, walkState(current, stack)),
            cols: maze.cols,
            narration: found
                ? `Diving into ${current} lands on the end, ${dist.get(current)} move(s) down. DFS commits to the first branch it opens, which is exactly how it can come in longer.`
                : fresh.length === 0
                  ? `${current} is a dead end at depth ${dist.get(current)}. Unwind — the stack falls back to the cell that pushed it.`
                  : `Dive into ${current} (depth ${dist.get(current)}) and push ${fresh.join(" and ")} to try next.`,
            tone: found ? "good" : fresh.length === 0 ? "bad" : undefined,
            panel: {
                label: "DFS stack (next first)",
                rows: [...stack]
                    .reverse()
                    .map((s) => `${s} → depth ${depthOf(parents, s)}`),
            },
            stats: [
                { value: String(pops), label: "cells popped:" },
                { value: String(stack.length), label: "stack depth:" },
                { label: CELL_COMPLEXITY },
            ],
            found,
        });
    }

    const best = shortestDistance(maze);
    if (!found || best === null) {
        steps.push({
            cells: mazeCells(maze, dist, () => "idle"),
            cols: maze.cols,
            narration:
                "The stack emptied without reaching the far corner, so this maze has no path at all.",
            tone: "bad",
            stats: [
                { value: String(pops), label: "cells popped:" },
                { label: CELL_COMPLEXITY },
            ],
            found: false,
        });
        return steps;
    }

    const used = dist.get(end)!;
    steps.push({
        cells: mazeCells(maze, dist, pathState(parents, end)),
        cols: maze.cols,
        narration:
            `DFS reached the end in ${used} move(s). ` +
            (used > best
                ? `The shortest route is only ${best} — that guarantee is BFS's, not DFS's.`
                : `That also happens to be the shortest route (${best}), but DFS never promises that.`),
        tone: "good",
        stats: [
            { value: String(used), label: "moves used:" },
            { value: String(best), label: "shortest distance:" },
            { label: CELL_COMPLEXITY },
        ],
        found: true,
    });
    return steps;
}

/** Distance down the parent chain, for stack rows that have not been visited. */
function depthOf(parents: Map<string, string>, node: string): number {
    let depth = -1;
    for (
        let cur: string | undefined = node;
        cur !== undefined;
        cur = parents.get(cur)
    ) {
        depth++;
    }
    return depth;
}

function mazeFrom(raw: string): Maze {
    const rows = gridRows(raw);
    return { rows, cols: rows[0]?.length ?? 0 };
}

const MAZE = "11110/10111/10111/10101/10011";

export const graphBfs: VisualizerSpec = {
    algo: "graph",
    title: "BFS and DFS, step by step",
    fields: [
        {
            id: "maze",
            label: "Maze (1 = open, 0 = wall, / = new row)",
            size: "md",
            default: MAZE,
            placeholder: MAZE,
        },
    ],
    presets: [
        { label: "5 × 5 spiral", fields: { maze: MAZE } },
        { label: "4 × 5 open", fields: { maze: "11111/11111/11111/11111" } },
        {
            label: "5 × 5 ring",
            fields: { maze: "11111/10001/10101/10001/11111" },
        },
    ],
    tiers: [
        {
            id: "bfs",
            label: "BFS queue",
            blurb: "Walk the maze one ring at a time: everything one move from the start, then two moves, then three. The first time you touch the end is the shortest route.",
            code: `q = deque([(0, 0)])
dist = {(0, 0): 0}
while q:
    cell = q.popleft()
    if cell == end: return dist[cell]
    for nb in open_neighbours(cell):
        if nb not in dist:
            dist[nb] = dist[cell] + 1
            q.append(nb)`,
            build: (f) => breadthFirst(mazeFrom(f.maze)),
        },
        {
            id: "dfs",
            label: "DFS recursion",
            blurb: "Follow the first opening you find all the way to a wall, then back up. Cheap on memory, and it makes no promise about length.",
            code: `stack = [(0, 0, None)]
while stack:
    cell, parent = stack.pop()
    if cell in dist: continue
    dist[cell] = 1 if parent is None else dist[parent] + 1
    if cell == end: return dist[cell]
    for nb in open_neighbours(cell):
        stack.append((nb, cell))`,
            build: (f) => depthFirst(mazeFrom(f.maze)),
        },
    ],
    invalid: (f) => {
        const rows = gridRows(f.maze);
        if (rows.length < 2)
            return "Enter a maze with at least two rows, separated by a slash.";
        if (!isRectangular(rows))
            return "Every maze row must be the same length — check for a missing cell.";
        if (rows[0][0] !== "1")
            return "The maze must start on an open cell (1) at the top left.";
        if (rows[rows.length - 1][rows[0].length - 1] !== "1")
            return "The maze must finish on an open cell (1) at the bottom right.";
        return null;
    },
};
