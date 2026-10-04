// src/components/content/Diagram.tsx — mermaid, themed and lazily loaded
import { useEffect, useRef, useState } from "react";
import { MaximizeIcon } from "lucide-react";
import type { ReactNode } from "react";
import type mermaidApi from "mermaid";

type MermaidApi = typeof mermaidApi;

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
    mermaidPromise ??= import("mermaid").then((m) => m.default);
    return mermaidPromise;
}

/** Pull colors from the live CSS so diagrams match the active theme. */
function token(name: string, fallback: string): string {
    if (typeof getComputedStyle !== "function") return fallback;
    return (
        getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim() || fallback
    );
}

function themeVariables(dark: boolean) {
    return {
        background: token("--surface", dark ? "#171E33" : "#FFFFFF"),
        primaryColor: token("--c0", dark ? "#222B45" : "#E2E7F1"),
        primaryBorderColor: token("--focus", dark ? "#8492FF" : "#2B3FE0"),
        primaryTextColor: token("--ink", dark ? "#E7EBF6" : "#151D35"),
        secondaryColor: token("--c4", dark ? "#11304E" : "#CDE4FB"),
        tertiaryColor: token("--neutral-bg", dark ? "#1E2740" : "#F4F6FB"),
        lineColor: token("--muted", dark ? "#94A0BC" : "#56617C"),
        textColor: token("--ink", dark ? "#E7EBF6" : "#151D35"),
        mainBkg: token("--c0", dark ? "#222B45" : "#E2E7F1"),
        nodeBorder: token("--focus", dark ? "#8492FF" : "#2B3FE0"),
        clusterBkg: token("--neutral-bg", dark ? "#1E2740" : "#F4F6FB"),
        clusterBorder: token("--rule", dark ? "#293252" : "#D5DBE8"),
        edgeLabelBackground: token("--surface", dark ? "#171E33" : "#FFFFFF"),
        fontSize: "15px",
    };
}

let initializedFor: string | null = null;

async function getMermaid(dark: boolean): Promise<MermaidApi> {
    const mermaid = await loadMermaid();
    // Mermaid bakes theme colors into the SVG at render time, so it must be
    // re-initialized whenever the theme flips.
    const key = dark ? "dark" : "light";
    if (initializedFor !== key) {
        mermaid.initialize({
            startOnLoad: false,
            theme: "base",
            securityLevel: "strict",
            themeVariables: themeVariables(dark),
            flowchart: { htmlLabels: true, curve: "basis", useMaxWidth: true },
            sequence: { useMaxWidth: true, wrap: true },
            gantt: { useMaxWidth: true },
        });
        initializedFor = key;
    }
    return mermaid;
}

/**
 * Mermaid output is injected with dangerouslySetInnerHTML.
 *
 * The obvious alternative — parsing the SVG and rebuilding it as React
 * elements — is what this component used to do, and it broke the diagrams:
 * SVG attributes need camelCase (marker-end -> markerEnd), mermaid's output is
 * not always well-formed XML so DOMParser yields a parsererror, and its
 * <style> block collided across renders. dangerouslySetInnerHTML is React's
 * supported path for trusted markup: it treats the SVG as one opaque unit, so
 * reconciliation stays consistent and mermaid's own markup survives intact.
 *
 * Safe here because `source` is authored in this repo's content modules and
 * mermaid runs with securityLevel "strict"; no user input reaches it.
 */
export function Diagram({
    source,
    caption,
    bare = false,
    figureId,
    onReady,
}: {
    source: string;
    caption?: string;
    /** Drop the figure chrome when the diagram sits inside a titled card. */
    bare?: boolean;
    /** Stable id on the render box, so a parent can find the rendered SVG. */
    figureId?: string;
    /** Called once mermaid has produced SVG (or failed), for parent tooling. */
    onReady?: (root: HTMLElement | null) => void;
}) {
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onReady?.(svg || error ? boxRef.current : null);
    }, [svg, error, onReady]);
    useEffect(() => {
        let cancelled = false;
        setSvg(null);
        setError(null);

        const dark =
            document.documentElement.getAttribute("data-theme") === "dark";

        (async () => {
            try {
                const mermaid = await getMermaid(dark);
                if (cancelled) return;
                // Parse first so a syntax error renders inline rather than
                // replacing the page with mermaid's thrown Error object.
                await mermaid.parse(source);
                if (cancelled) return;
                const { svg: out } = await mermaid.render(
                    `mmd-${Math.random().toString(36).slice(2, 10)}`,
                    source,
                );
                if (cancelled) return;
                setSvg(out);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "invalid syntax");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [source]);

    let content: ReactNode;
    if (error) {
        content = (
            <div className="mx-4 mb-4 rounded-md bg-warn px-3 py-2 text-xs text-c3i">
                <p className="font-semibold">Diagram could not be rendered</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                    {error}
                </pre>
            </div>
        );
    } else if (svg) {
        content = (
            // Tall flowcharts would otherwise run for several screens and push
            // every following section off the page, so the diagram gets its own
            // scroll box with a height cap.
            <div
                id={figureId}
                ref={boxRef}
                className="diagram-scroll max-h-[28rem] overflow-auto px-4 py-5"
                // A scrollable box is unreachable by keyboard unless it is
                // focusable, so wide diagrams could not be panned without a mouse.
                tabIndex={0}
                role="group"
                aria-label="Diagram, scrollable"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
        );
    } else {
        content = (
            <div className="px-4 py-5">
                <div className="h-24 w-full animate-pulse rounded-md bg-neutral" />
            </div>
        );
    }

    if (bare) {
        return <div className="diagram-bare">{content}</div>;
    }

    return (
        <figure className="my-4 overflow-hidden rounded-card border border-rule bg-surface shadow-soft">
            {content}
            <figcaption className="flex items-center justify-center gap-2 border-t border-rule px-4 py-2.5 text-center text-xs text-muted">
                <MaximizeIcon className="size-3.5 shrink-0" />
                {caption ?? "Scroll the diagram to see the full flow"}
            </figcaption>
        </figure>
    );
}
