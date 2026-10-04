// src/lib/interactive/visualizers/backtracking.ts — shortest path through a
// maze, walked two ways: full DFS with an explicit backtrack, versus a greedy
// walk that refuses to back up. `#` is a wall, `.` is open, S is the start and
// E is the exit. Rows are separated by `/`.
import type { VisualizerSpec } from "../spec";
import { gridRows, isRectangular } from "../parse";
import type { CellState, InteractiveStep, StepCell } from "../types";

type Grid = string[];

/** Neighbour order: right, then down, then up, then left. */
const DIRS: Array<[number, number, string]> = [
    [0, 1, "right"],
    [1, 0, "down"],
    [-1, 0, "up"],
    [0, -1, "left"],
];

function find(g: Grid, ch: string): [number, number] {
    for (let r = 0; r < g.length; r++) {
        const c = g[r].indexOf(ch);
        if (c >= 0) return [r, c];
    }
    return [-1, -1];
}

function isOpen(g: Grid, r: number, c: number): boolean {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length) return false;
    return g[r][c] === "." || g[r][c] === "S" || g[r][c] === "E";
}

/** Row-major flat cell row, so the shared renderer can lay the maze out. */
function gridCells(g: Grid, marks: Record<number, CellState>): StepCell[] {
    const width = g[0].length;
    return g.flatMap((row, r) =>
        row
            .split("")
            .map((ch, c) => ({
                text: ch,
                state: marks[r * width + c] ?? "idle",
            })),
    );
}

function depthFirst(g: Grid): InteractiveStep[] {
    const width = g[0].length;
    const at = (r: number, c: number) => r * width + c;
    const start = find(g, "S");
    const goal = find(g, "E");

    const steps: InteractiveStep[] = [];
    const seen = new Set<number>([at(start[0], start[1])]);
    const path: Array<[number, number]> = [start];
    let moves = 0;
    let pops = 0;

    const marks = (): Record<number, CellState> => {
        const m: Record<number, CellState> = {};
        path.forEach(([r, c], i) => {
            m[at(r, c)] = i === path.length - 1 ? "a" : "range";
        });
        return m;
    };
    const panel = () => ({
        label: "Path stack (last cell = where the search stands)",
        rows: path.map(([r, c]) => `(${r}, ${c})`),
        hits: path.length > 0 ? [path.length - 1] : [],
    });
    const stats = () => [
        { value: String(moves), label: "moves:" },
        { value: String(path.length), label: "path length:" },
        { label: "Time O(V + E), space O(V)" },
    ];

    steps.push({
        cells: gridCells(g, marks()),
        cols: width,
        narration: `Stand on S at (${start[0]}, ${start[1]}). Every open cell is a candidate; every '#' is a wall you can never cross.`,
        panel: panel(),
        stats: stats(),
    });

    while (path.length > 0) {
        const [r, c] = path[path.length - 1];
        if (r === goal[0] && c === goal[1]) break;

        const next = DIRS.map(([dr, dc, name]) => ({
            r: r + dr,
            c: c + dc,
            name,
        })).find((d) => isOpen(g, d.r, d.c) && !seen.has(at(d.r, d.c)));

        if (next) {
            seen.add(at(next.r, next.c));
            path.push([next.r, next.c]);
            moves++;
            steps.push({
                cells: gridCells(g, marks()),
                cols: width,
                narration:
                    `From (${r}, ${c}) step ${next.name} to (${next.r}, ${next.c}). ` +
                    `The path holds ${path.length} cells now.`,
                panel: panel(),
                stats: stats(),
            });
        } else {
            path.pop();
            pops++;
            const m = marks();
            m[at(r, c)] = "b";
            steps.push({
                cells: gridCells(g, m),
                cols: width,
                narration:
                    `(${r}, ${c}) is a dead end: every neighbour is a wall or already on the path. ` +
                    `Backtrack — pop it off the stack and try something else from (${r}, ${c - 1 >= 0 ? path[path.length - 1][1] : 0}).`,
                tone: "bad",
                panel: panel(),
                stats: stats(),
            });
        }
    }

    const head = path[path.length - 1];
    const reached =
        head !== undefined && head[0] === goal[0] && head[1] === goal[1];
    if (reached) {
        const answer: Record<number, CellState> = {};
        path.forEach(([r, c]) => {
            answer[at(r, c)] = "ok";
        });
        steps.push({
            cells: gridCells(g, answer),
            cols: width,
            narration:
                `E reached: ${path.length} cells from S, using ${moves} moves and ${pops} backtracks. ` +
                `DFS returns a path, not necessarily the shortest one — BFS is the tier that guarantees length.`,
            tone: "good",
            panel: panel(),
            stats: [
                { value: String(path.length), label: "path length:" },
                { value: String(pops), label: "backtracks:" },
                { label: "Time O(V + E), space O(V)" },
            ],
            found: true,
        });
    } else {
        steps.push({
            cells: gridCells(g, {}),
            cols: width,
            narration: `The stack is empty: every reachable cell has been tried and E is not among them. No path exists.`,
            tone: "bad",
            panel: panel(),
            stats: [
                { value: String(moves), label: "moves:" },
                { label: "Time O(V + E), space O(V)" },
            ],
            found: false,
        });
    }
    return steps;
}

/** Right if you can, otherwise down — and never look back. */
function greedyWalk(g: Grid): InteractiveStep[] {
    const width = g[0].length;
    const at = (r: number, c: number) => r * width + c;
    const start = find(g, "S");
    const goal = find(g, "E");

    const steps: InteractiveStep[] = [];
    const path: Array<[number, number]> = [start];
    let moves = 0;

    const marks = (): Record<number, CellState> => {
        const m: Record<number, CellState> = {};
        path.forEach(([r, c], i) => {
            m[at(r, c)] = i === path.length - 1 ? "a" : "range";
        });
        return m;
    };
    const panel = () => ({
        label: "Cells walked (no stack — just the current cell)",
        rows: path.map(([r, c]) => `(${r}, ${c})`),
        hits: path.length > 0 ? [path.length - 1] : [],
    });
    const stats = () => [
        { value: String(moves), label: "moves:" },
        { value: String(path.length), label: "cells walked:" },
        { label: "Time O(V), space O(1)" },
    ];

    steps.push({
        cells: gridCells(g, marks()),
        cols: width,
        narration: `Start on S at (${start[0]}, ${start[1]}) with a rule: always go right if that cell is open, otherwise go down.`,
        panel: panel(),
        stats: stats(),
    });

    let r = start[0];
    let c = start[1];
    while (r !== goal[0] || c !== goal[1]) {
        const right = isOpen(g, r, c + 1);
        const down = isOpen(g, r + 1, c);
        if (!right && !down) break;
        const name = right
            ? "Right is open, so take it"
            : "Right is a wall, so drop down";
        if (right) c++;
        else r++;
        path.push([r, c]);
        moves++;
        steps.push({
            cells: gridCells(g, marks()),
            cols: width,
            narration: `${name}: now at (${r}, ${c}) after ${moves} move(s).`,
            panel: panel(),
            stats: stats(),
        });
    }

    if (r === goal[0] && c === goal[1]) {
        const answer: Record<number, CellState> = {};
        path.forEach(([pr, pc]) => {
            answer[at(pr, pc)] = "ok";
        });
        steps.push({
            cells: gridCells(g, answer),
            cols: width,
            narration:
                `E reached in ${path.length} cells with ${moves} moves and no memory at all — but only by luck. ` +
                `On another maze the same rule walks into a dead end and stops.`,
            tone: "good",
            panel: panel(),
            stats: [
                { value: String(path.length), label: "path length:" },
                { label: "Time O(V), space O(1)" },
            ],
            found: true,
        });
    } else {
        const m = marks();
        m[at(r, c)] = "b";
        steps.push({
            cells: gridCells(g, m),
            cols: width,
            narration:
                `Stuck at (${r}, ${c}): right and down are both walls, and the rule forbids going back. ` +
                `A path to E does exist — DFS finds it by backtracking. This is why a greedy walk needs a stack behind it.`,
            tone: "bad",
            panel: panel(),
            stats: [
                { value: String(moves), label: "moves:" },
                { label: "Time O(V), space O(1) — but not correct" },
            ],
            found: false,
        });
    }
    return steps;
}

function readMaze(raw: string | undefined): Grid {
    return gridRows(raw);
}

/** Validation sentence, or null when the maze is walkable enough to render. */
function mazeProblem(maze: string): string | null {
    const g = readMaze(maze);
    if (g.length < 3 || !isRectangular(g) || g[0].length < 3) {
        return "Enter a maze at least 3 by 3, with rows separated by /.";
    }
    if (find(g, "S")[0] < 0 || find(g, "E")[0] < 0) {
        return "The maze needs an S (start) and an E (exit).";
    }
    return null;
}

export const backtrackingMaze: VisualizerSpec = {
    algo: "backtracking",
    title: "Backtracking, step by step",
    fields: [
        {
            id: "maze",
            label: "Maze (rows separated by /)",
            size: "md",
            default:
                "#########/#S..#####/#.#######/#.......#/#######.#/#......E#/#########",
            placeholder:
                "#########/#S..#####/#.#######/#.......#/#######.#/#......E#/#########",
        },
    ],
    presets: [
        {
            label: "dead end at the top",
            fields: {
                maze: "#########/#S..#####/#.#######/#.......#/#######.#/#......E#/#########",
            },
        },
        {
            label: "greedy gets lucky",
            fields: {
                maze: "#########/#S....#.#/#####.#.#/#...#...#/#.#####.#/#......E#/#########",
            },
        },
        {
            label: "long detour",
            fields: {
                maze: "#########/#S#...#.#/#.#.#.#.#/#...#...#/#######.#/#......E#/#########",
            },
        },
    ],
    tiers: [
        {
            id: "dfs",
            label: "Backtracking (DFS)",
            blurb: "Keep a stack of the cells you are standing on. Move to any open neighbour; when you hit a dead end, pop the stack and back up.",
            code: `stack = [(sr, sc)]; seen = {stack[0]}
while stack:
    r, c = stack[-1]
    if (r, c) == goal:
        return stack
    for nb in neighbours(r, c):
        if open(nb) and nb not in seen:
            seen.add(nb); stack.append(nb); break
    else:
        stack.pop()          # dead end: backtrack`,
            build: (f) => depthFirst(readMaze(f.maze)),
        },
        {
            id: "greedy",
            label: "Right/down only",
            blurb: "A greedy walk that prefers right and falls back to down. It needs no memory — and that is exactly the problem.",
            code: `r, c = sr, sc
while (r, c) != goal:
    if open(r, c + 1):  c += 1
    elif open(r + 1, c): r += 1
    else:
        return None        # stuck, and we refuse to back up`,
            build: (f) => greedyWalk(readMaze(f.maze)),
        },
    ],
    invalid: (f) => mazeProblem(f.maze),
};
