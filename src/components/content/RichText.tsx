// src/components/content/RichText.tsx
//
// Topic bodies are authored as HTML strings in this repo's content modules.
// They are rendered by parsing into a detached document and moving the nodes
// in — never through dangerouslySetInnerHTML — so nothing can execute and
// user-supplied values stay inert unless explicitly escaped upstream.
import { useEffect, useRef } from "react";

let parser: DOMParser | null = null;

function parse(html: string): Node[] {
    parser ??= new DOMParser();
    return Array.from(
        parser.parseFromString(html, "text/html").body.childNodes,
    );
}

export function RichText({
    html,
    className,
}: {
    html: string;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.replaceChildren(...parse(html));
    }, [html]);

    return <div ref={ref} className={className ?? "rich"} />;
}
