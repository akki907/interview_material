// src/components/content/htmlToReact.tsx
//
// Parses trusted, author-authored HTML strings into real React elements.
//
// The earlier implementation rendered an empty <div> and injected parsed nodes
// into it from an effect. That mutates DOM React believes it owns, so the next
// reconciliation throws
//   NotFoundError: Failed to execute 'removeChild' on 'Node'
// and unmounts the whole tree — which surfaced as a blank page on every route
// change. Converting to elements instead means React owns every node and
// reconciliation is always consistent.
import { createElement, type ReactNode } from "react";

/** HTML attribute names that differ from their React prop names. */
const ATTR_ALIASES: Record<string, string> = {
    class: "className",
    for: "htmlFor",
    colspan: "colSpan",
    rowspan: "rowSpan",
    tabindex: "tabIndex",
    maxlength: "maxLength",
    readonly: "readOnly",
    srcset: "srcSet",
    colspan_: "colSpan",
};

/** Convert a `style="a: b; c: d"` attribute string into React's style object. */
function parseStyle(value: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const decl of value.split(";")) {
        const idx = decl.indexOf(":");
        if (idx === -1) continue;
        const prop = decl.slice(0, idx).trim();
        const val = decl.slice(idx + 1).trim();
        if (!prop || !val) continue;
        // React expects camelCase style keys.
        const camel = prop.startsWith("--")
            ? prop
            : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        out[camel] = val;
    }
    return out;
}

/** Elements whose content must never be rendered as children. */
const OMIT_CONTENT = new Set(["script", "style", "noscript", "template"]);

/** Elements whose children must be elements only — whitespace between them is
 *  hoisted out by React and both warns and corrupts the table structure. */
const STRICT_CHILD_TAGS = new Set([
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "colgroup",
    "select",
    "ul",
    "ol",
]);

function isText(node: Node): boolean {
    return node.nodeType === 3;
}

function isBlankText(node: Node): boolean {
    return isText(node) && !(node.nodeValue ?? "").trim();
}

/**
 * Convert a DOM subtree into React nodes. Keys are derived from the path so
 * siblings stay stable across re-renders of the same input.
 */
function convert(node: Node, path: string): ReactNode {
    if (isText(node)) return node.nodeValue;

    if (node.nodeType !== 1) return null; // comments, doctypes

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    const props: Record<string, unknown> = { key: path };
    for (const attr of Array.from(el.attributes)) {
        // React wants a style object, not the CSS text the HTML carries.
        if (attr.name === "style") {
            props.style = parseStyle(attr.value);
            continue;
        }
        props[ATTR_ALIASES[attr.name] ?? attr.name] = attr.value;
    }

    if (OMIT_CONTENT.has(tag)) return createElement(tag, props);

    const children = Array.from(el.childNodes)
        // Drop indentation whitespace inside table/list containers: React
        // hoists text out of <table>, which both warns and breaks the rows.
        .filter((child) => !(STRICT_CHILD_TAGS.has(tag) && isBlankText(child)))
        .map((child, i) => convert(child, `${path}-${i}`));

    // Void elements must not receive children or React warns.
    const VOID = new Set([
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    ]);
    if (VOID.has(tag)) return createElement(tag, props);

    return createElement(tag, props, ...children);
}

let parser: DOMParser | null = null;

function getParser(): DOMParser {
    parser ??= new DOMParser();
    return parser;
}

/** Parse an HTML string into React nodes. `keyPrefix` keeps keys unique per block. */
export function htmlToReact(html: string, keyPrefix = "h"): ReactNode[] {
    if (!html) return [];
    const doc = getParser().parseFromString(html, "text/html");
    return Array.from(doc.body.childNodes).map((child, i) =>
        convert(child, `${keyPrefix}-${i}`),
    );
}

/** Parse an SVG string (mermaid output) into React nodes. */
export function svgToReact(svg: string, keyPrefix = "s"): ReactNode[] {
    if (!svg) return [];
    const doc = getParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    if (!root) return [];
    return [convert(root, keyPrefix)];
}
