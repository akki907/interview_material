// src/components/content/Diagram.tsx — mermaid, themed and lazily loaded
import { useEffect, useRef, useState } from 'react';
import type mermaidApi from 'mermaid';

type MermaidApi = typeof mermaidApi;

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
    mermaidPromise ??= import('mermaid').then(m => m.default);
    return mermaidPromise;
}

/** Pull colors from the live CSS so diagrams match the active theme. */
function token(name: string, fallback: string): string {
    if (typeof getComputedStyle !== 'function') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function themeVariables(dark: boolean) {
    return {
        background: token('--surface', dark ? '#171E33' : '#FFFFFF'),
        primaryColor: token('--c0', dark ? '#222B45' : '#E2E7F1'),
        primaryBorderColor: token('--focus', dark ? '#8492FF' : '#2B3FE0'),
        primaryTextColor: token('--ink', dark ? '#E7EBF6' : '#151D35'),
        secondaryColor: token('--c4', dark ? '#11304E' : '#CDE4FB'),
        tertiaryColor: token('--neutral-bg', dark ? '#1E2740' : '#F4F6FB'),
        lineColor: token('--muted', dark ? '#94A0BC' : '#56617C'),
        textColor: token('--ink', dark ? '#E7EBF6' : '#151D35'),
        mainBkg: token('--c0', dark ? '#222B45' : '#E2E7F1'),
        nodeBorder: token('--focus', dark ? '#8492FF' : '#2B3FE0'),
        clusterBkg: token('--neutral-bg', dark ? '#1E2740' : '#F4F6FB'),
        clusterBorder: token('--rule', dark ? '#293252' : '#D5DBE8'),
        edgeLabelBackground: token('--surface', dark ? '#171E33' : '#FFFFFF'),
        fontSize: '15px',
    };
}

let initializedFor: string | null = null;

let parser: DOMParser | null = null;

function parseNodes(html: string): Node[] {
    parser ??= new DOMParser();
    return Array.from(parser.parseFromString(html, 'text/html').body.childNodes);
}

async function getMermaid(dark: boolean): Promise<MermaidApi> {
    const mermaid = await loadMermaid();
    // Mermaid bakes theme colors into the SVG at render time, so it must be
    // re-initialized whenever the theme flips.
    const key = dark ? 'dark' : 'light';
    if (initializedFor !== key) {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'strict',
            themeVariables: themeVariables(dark),
            flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
            sequence: { useMaxWidth: true, wrap: true },
            gantt: { useMaxWidth: true },
        });
        initializedFor = key;
    }
    return mermaid;
}

export function Diagram({ source, caption }: { source: string; caption?: string }) {
    const hostRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(`mmd-${Math.random().toString(36).slice(2, 10)}`);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const host = hostRef.current;
        if (!host) return;

        const dark = document.documentElement.getAttribute('data-theme') === 'dark';

        (async () => {
            try {
                const mermaid = await getMermaid(dark);
                if (cancelled) return;
                // Parse first so a syntax error renders inline instead of
                // replacing the page with mermaid's thrown Error object.
                await mermaid.parse(source);
                if (cancelled) return;
                const { svg } = await mermaid.render(idRef.current, source);
                if (cancelled) return;
                // Parse the SVG rather than assigning innerHTML: same result,
                // without the raw HTML sink.
                host.replaceChildren(...parseNodes(svg));
                setError(null);
            } catch (err) {
                if (cancelled) return;
                host.replaceChildren();
                setError(err instanceof Error ? err.message : 'invalid syntax');
            }
        })();

        return () => {
            cancelled = true;
            host.replaceChildren();
        };
    }, [source]);

    return (
        <figure className="my-5 overflow-hidden rounded-card border border-rule bg-surface shadow-soft">
            <div ref={hostRef} className="flex justify-center overflow-x-auto px-4 py-5">
                {!error && !hostRef.current?.childElementCount && (
                    <div className="h-24 w-full animate-pulse rounded-md bg-neutral" />
                )}
            </div>
            {error && (
                <div className="mx-4 mb-4 rounded-md bg-warn px-3 py-2 text-xs text-c3i">
                    <p className="font-semibold">Diagram could not be rendered</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{error}</pre>
                </div>
            )}
            {caption && (
                <figcaption className="border-t border-rule px-4 py-2.5 text-center text-xs text-muted">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}