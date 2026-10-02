// src/mermaid.ts — Mermaid diagram helper
// Diagrams are authored as source strings and rendered lazily (after the
// page HTML is in the DOM) so the mermaid bundle is only fetched for pages
// that actually contain a diagram.
import { h } from './utils';
import type mermaidApi from 'mermaid';

type MermaidApi = typeof mermaidApi;

let mermaidPromise: Promise<MermaidApi> | null = null;
let activeTheme: 'light' | 'dark' = 'light';

/** Theme variables read from the rendered CSS so diagrams always match the app. */
function readToken(name: string, fallback: string): string {
    if (typeof getComputedStyle !== 'function' || typeof document === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
}

function themeVariables(): Record<string, string> {
    const dark = activeTheme === 'dark';
    return {
        background: readToken('--surface', dark ? '#171E33' : '#FFFFFF'),
        primaryColor: readToken('--c0', dark ? '#222B45' : '#E2E7F1'),
        primaryBorderColor: readToken('--focus', dark ? '#8492FF' : '#2B3FE0'),
        primaryTextColor: readToken('--ink', dark ? '#E7EBF6' : '#151D35'),
        secondaryColor: readToken('--c4', dark ? '#11304E' : '#CDE4FB'),
        tertiaryColor: readToken('--neutral-bg', dark ? '#1E2740' : '#F4F6FB'),
        lineColor: readToken('--muted', dark ? '#94A0BC' : '#56617C'),
        textColor: readToken('--ink', dark ? '#E7EBF6' : '#151D35'),
        mainBkg: readToken('--c0', dark ? '#222B45' : '#E2E7F1'),
        nodeBorder: readToken('--focus', dark ? '#8492FF' : '#2B3FE0'),
        clusterBkg: readToken('--neutral-bg', dark ? '#1E2740' : '#F4F6FB'),
        clusterBorder: readToken('--rule', dark ? '#293252' : '#D5DBE8'),
        edgeLabelBackground: readToken('--surface', dark ? '#171E33' : '#FFFFFF'),
        fontSize: '15px',
    };
}

async function getMermaid(): Promise<MermaidApi> {
    mermaidPromise ??= import('mermaid').then(m => m.default);
    const mermaid = await mermaidPromise;
    mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'strict',
        themeVariables: themeVariables(),
        flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
        sequence: { useMaxWidth: true, wrap: true },
        gantt: { useMaxWidth: true },
    });
    return mermaid;
}

/**
 * Build a diagram block. `source` is raw mermaid syntax (kept in a data
 * attribute so it survives re-rendering); `caption` renders as a figcaption.
 */
export function diagram(source: string, caption = ''): HTMLElement {
    const fig = h('figure', { className: 'mermaid-figure' });
    const node = h('div', { className: 'mermaid' });
    node.setAttribute('data-src', source);
    node.textContent = source;
    fig.appendChild(node);
    if (caption) fig.appendChild(h('figcaption', { textContent: caption }));
    return fig;
}

function markInvalid(node: HTMLElement, source: string, err: unknown) {
    node.removeAttribute('data-processed');
    node.classList.add('mermaid-invalid');
    node.textContent = '';
    const reason = err instanceof Error ? err.message : 'invalid syntax';
    const msg = h('div', { className: 'mermaid-invalid-msg', textContent: 'Diagram could not be rendered: ' + reason });
    const pre = h('pre', { className: 'mermaid-invalid-src' });
    pre.textContent = source;
    node.appendChild(msg);
    node.appendChild(pre);
    node.setAttribute('data-processed', 'true');
}

/** Render every unprocessed `.mermaid` node under `root`. Never throws. */
export async function renderMermaid(root: ParentNode | null | undefined): Promise<void> {
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])'));
    if (!nodes.length) return;
    const mermaid = await getMermaid();
    for (const node of nodes) {
        const source = node.getAttribute('data-src') || node.textContent || '';
        try {
            await mermaid.parse(source);
        } catch (err) {
            markInvalid(node, source, err);
            continue;
        }
        try {
            await mermaid.run({ nodes: [node] });
        } catch (err) {
            markInvalid(node, source, err);
        }
    }
}

/**
 * Re-render every diagram on the page against the new theme. Mermaid bakes
 * colors into the emitted SVG, so a theme change requires a full redraw:
 * we restore each node to its source text and clear the processed flag.
 */
export async function rerenderMermaidForTheme(root: ParentNode | null | undefined): Promise<void> {
    if (!root) return;
    activeTheme = root.ownerDocument?.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.mermaid[data-processed]'));
    for (const node of nodes) {
        const source = node.getAttribute('data-src');
        if (!source) continue;
        node.removeAttribute('data-processed');
        node.removeAttribute('aria-roledescription');
        // Clear the previously injected SVG before mermaid re-runs on the node.
        node.querySelectorAll('svg').forEach(svg => svg.remove());
        node.classList.remove('mermaid-invalid');
        node.textContent = source;
    }
    await renderMermaid(root);
}
