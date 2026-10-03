// src/lib/interactive/parse.ts — shared field parsing for visualizers
//
// Every visualizer declares its own fields as raw strings; these helpers turn
// them into numbers/arrays without each builder re-inventing the guards.

/** `MAX_VALUES` caps a numeric field so the cell row still fits on screen. */
export const MAX_VALUES = 12;

/** "2, 7, 11, 15" | "2 7 11 15" -> [2, 7, 11, 15] */
export function nums(raw: string | undefined): number[] {
    if (!raw) return [];
    return raw
        .split(/[ ,]+/)
        .filter((chunk) => chunk !== "")
        .map((chunk) => Number(chunk))
        .filter((n) => Number.isFinite(n))
        .slice(0, MAX_VALUES);
}

/** A single number, or null when the field is empty or not numeric. */
export function int(raw: string | undefined): number | null {
    if (raw === undefined || raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** "abc" -> ["a", "b", "c"], whitespace dropped, capped. */
export function chars(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.replace(/\s+/g, "").split("").slice(0, MAX_VALUES);
}

/**
 * "10110/01011" -> ["10110", "01011"]. Used by the grid-shaped problems
 * (mazes, DP inputs drawn as grids).
 */
export function gridRows(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(/[\n/]/)
        .map((r) => r.replace(/\s+/g, ""))
        .filter((r) => r.length > 0)
        .slice(0, MAX_VALUES);
}

/** True when every row in a grid is the same width. */
export function isRectangular(rows: string[]): boolean {
    return rows.length > 0 && rows.every((r) => r.length === rows[0].length);
}
