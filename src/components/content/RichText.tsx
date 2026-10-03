// src/components/content/RichText.tsx
//
// Renders trusted, author-authored HTML strings from src/content/*.
//
// This used to render an empty <div> and inject parsed nodes into it from an
// effect. React believed that div had no children, so the next reconciliation
// tried to remove nodes it did not own and threw
//   NotFoundError: Failed to execute 'removeChild' on 'Node'
// which unmounted the whole app on every route change. Content is now converted
// to React elements up front so React owns every node.
import { useMemo } from "react";
import { htmlToReact } from "./htmlToReact";

export function RichText({
    html,
    className,
}: {
    html: string;
    className?: string;
}) {
    // Parsing is pure and keyed by the input, so it must not rerun per render.
    const nodes = useMemo(() => htmlToReact(html, "rt"), [html]);
    return <div className={className ?? "rich"}>{nodes}</div>;
}
