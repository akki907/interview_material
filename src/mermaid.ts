// src/mermaid.ts — Mermaid diagram helper
// Diagrams are authored as source strings and rendered lazily (after the
// page HTML is in the DOM) so the mermaid bundle is only fetched for pages
// that actually contain a diagram.
import { h } from './utils';
import type mermaidApi from 'mermaid';

type MermaidApi = typeof mermaidApi;

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
    mermaidPromise ??= import('mermaid').then(({ default: mermaid }) => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'strict',
            themeVariables: {
                background: '#FFFFFF',
                primaryColor: '#E2E7F1',
                primaryBorderColor: '#2B3FE0',
                primaryTextColor: '#151D35',
                secondaryColor: '#CDE4FB',
                tertiaryColor: '#F4F6FB',
                lineColor: '#56617C',
                textColor: '#151D35',
                mainBkg: '#E2E7F1',
                nodeBorder: '#2B3FE0',
                clusterBkg: '#F4F6FB',
                clusterBorder: '#D5DBE8',
                edgeLabelBackground: '#FFFFFF',
                fontSize: '15px',
            },
            flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
            sequence: { useMaxWidth: true, wrap: true },
            gantt: { useMaxWidth: true },
        });
        return mermaid;
    });
    return mermaidPromise;
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
    const mermaid = await loadMermaid();
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
