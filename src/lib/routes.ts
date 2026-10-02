// src/lib/routes.ts — single source of truth for nav routing
import { NAV } from "./data";

/** Topics rendered by dedicated pages rather than the content registry. */
export const STANDALONE_ROUTES = new Set([
    "dashboard",
    "todos",
    "interview",
    "flashcards",
]);

export function isStandaloneRoute(id: string): boolean {
    return STANDALONE_ROUTES.has(id);
}

/** Route path for a topic id: top-level pages are /id, topics are /topic/id. */
export function hrefFor(id: string): string {
    return isStandaloneRoute(id) ? `/${id}` : `/topic/${id}`;
}

/** Inverse of {@link hrefFor}: returns the topic id for the current path. */
export function idFromPath(pathname: string): string {
    return pathname.replace(/^\/topic\//, "");
}

/** Flattened nav index, built once — used by search and breadcrumbs. */
export interface NavEntryMeta {
    id: string;
    label: string;
    group: string;
}

export const NAV_INDEX: NavEntryMeta[] = NAV.flatMap((g) =>
    g.children
        ? g.children.map((c) => ({ id: c.id, label: c.label, group: g.label }))
        : [{ id: g.id, label: g.label, group: "Overview" }],
);
