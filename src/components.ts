// src/components.ts — Reusable UI components
import { Store } from './store';
import { h, toast, escHtml } from './utils';
export { diagram } from './mermaid';

/** Extra card options: `id` scopes the bookmark, `bookmark: false` hides it. */
interface CardExtra {
    id?: string;
    bookmark?: boolean;
}

/** One stage of a `pipelineStages` diagram. */
export interface PipelineStage {
    name: string;
    desc: string;
}

// ── content helpers ───────────────────────────────────────────────────
// Table card built from a header row plus body rows (cells are raw HTML).
export function tableCard(title: string, headers: string[], rows: string[][]): HTMLElement {
    const head = headers.map(x => `<th>${x}</th>`).join('');
    const body = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    return card(title, `<table class="complexity-table"><tr>${head}</tr>${body}</table>`);
}

// Card of collapsible question / answer pairs; the first one starts open.
// Answers are raw HTML, so one answer can hold a list or a small table.
export function qaCard(pairs: Array<[string, string]>): HTMLElement {
    const wrap = h('div');
    pairs.forEach(([q, a], i) => {
        const body = /<[a-z]/i.test(a) ? a : `<p>${a}</p>`;
        wrap.appendChild(collapsible(`Q${i + 1}. ${q}`, body, i === 0));
    });
    return card('🎤 Interview Q&A', wrap);
}

export function progressBar(label: string, pct: number, cls: string): HTMLElement {
    const wrap = h('div');
    wrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:0.85rem;">${label}</span>
            <span style="font-size:0.8rem;color:var(--text-muted);">${pct}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
    `;
    return wrap;
}

export function card(title: string, body: string | Node, extra: CardExtra = {}): HTMLElement {
    const c = h('div', { className: 'card' });
    if (title) {
        const hdr = h('div', { className: 'card-header' });
        hdr.appendChild(h('h3', {}, title));
        if (extra.bookmark !== false) {
            const bm = h('span', { className: 'bookmark-btn' });
            bm.innerHTML = '☆';
            bm.addEventListener('click', () => {
                const id = extra.id || title;
                const on = Store.toggleBookmark(id);
                bm.innerHTML = on ? '★' : '☆';
                bm.classList.toggle('bookmarked', on);
                toast(on ? 'Bookmarked' : 'Unbookmarked', 'info');
            });
            const bookmarkId = extra.id || title;
            if (Store.isBookmarked(bookmarkId)) { bm.innerHTML = '★'; bm.classList.add('bookmarked'); }
            hdr.appendChild(bm);
        }
        c.appendChild(hdr);
    }
    if (body) c.appendChild(typeof body === 'string' ? h('div', { innerHTML: body }) : body);
    return c;
}

export function collapsible(title: string, bodyHtml: string, startOpen = false): HTMLElement {
    const c = h('div', { className: 'collapsible' + (startOpen ? ' open' : '') });
    const hdr = h('div', { className: 'collapsible-header', onClick: () => toggleCollapsible(c) });
    hdr.appendChild(h('h4', {}, title));
    hdr.appendChild(h('span', { className: 'collapsible-arrow' }, '▶'));
    c.appendChild(hdr);
    const body = h('div', { className: 'collapsible-body' });
    body.appendChild(h('div', { className: 'collapsible-body-inner', innerHTML: bodyHtml }));
    c.appendChild(body);
    return c;
}

export function toggleCollapsible(c: HTMLElement): void { c.classList.toggle('open'); }

export function tabs(tabsArr: string[], contentsArr: string[]): HTMLElement {
    const wrap = h('div');
    const tabRow = h('div', { className: 'tabs' });
    tabsArr.forEach((t, i) => {
        const btn = h('button', { className: 'tab' + (i === 0 ? ' active' : ''), textContent: t });
        btn.addEventListener('click', () => {
            tabRow.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            wrap.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            wrap.querySelectorAll('.tab-content')[i]!.classList.add('active');
        });
        tabRow.appendChild(btn);
    });
    wrap.appendChild(tabRow);
    tabsArr.forEach((_, i) => {
        const tc = h('div', { className: 'tab-content' + (i === 0 ? ' active' : '') });
        tc.innerHTML = contentsArr[i];
        wrap.appendChild(tc);
    });
    return wrap;
}

export function stepControls(total: number, onStep: (step: number) => void): { wrap: HTMLElement; update: () => void } {
    const wrap = h('div', { className: 'step-controls' });
    wrap.appendChild(h('button', { className: 'step-btn', textContent: '⏮', disabled: true, id: 'step-first' }));
    wrap.appendChild(h('button', { className: 'step-btn', textContent: '◀', disabled: true, id: 'step-prev' }));
    const info = h('span', { className: 'step-info', textContent: 'Step 1 / ' + total });
    wrap.appendChild(info);
    wrap.appendChild(h('button', { className: 'step-btn', textContent: '▶', id: 'step-next' }));
    wrap.appendChild(h('button', { className: 'step-btn', textContent: '⏭', id: 'step-last' }));

    let current = 1;
    const update = () => {
        info.textContent = 'Step ' + current + ' / ' + total;
        wrap.querySelector<HTMLButtonElement>('#step-first')!.disabled = current === 1;
        wrap.querySelector<HTMLButtonElement>('#step-prev')!.disabled = current === 1;
        wrap.querySelector<HTMLButtonElement>('#step-next')!.disabled = current === total;
        wrap.querySelector<HTMLButtonElement>('#step-last')!.disabled = current === total;
        if (onStep) onStep(current);
    };
    wrap.querySelector<HTMLButtonElement>('#step-first')!.addEventListener('click', () => { current = 1; update(); });
    wrap.querySelector<HTMLButtonElement>('#step-prev')!.addEventListener('click', () => { current = Math.max(1, current - 1); update(); });
    wrap.querySelector<HTMLButtonElement>('#step-next')!.addEventListener('click', () => { current = Math.min(total, current + 1); update(); });
    wrap.querySelector<HTMLButtonElement>('#step-last')!.addEventListener('click', () => { current = total; update(); });

    return { wrap, update };
}

export function codeRunner(lang: string, code: string, onRun?: (code: string) => string): HTMLElement {
    const wrap = h('div', { className: 'playground' });
    wrap.innerHTML = `
        <div class="playground-header">
            <span class="playground-lang">${lang}</span>
        </div>
        <div class="code-wrap">
            <textarea>${escHtml(code)}</textarea>
            <button class="copy-btn btn btn-sm" style="position:absolute;top:8px;right:8px;">Copy</button>
        </div>
        <div class="playground-footer">
            <button class="btn btn-primary" id="run-btn">▶ Run</button>
        </div>
        <div class="playground-output" id="pg-output">Ready...</div>
    `;
    wrap.querySelector<HTMLButtonElement>('#run-btn')!.addEventListener('click', () => {
        const ta = wrap.querySelector('textarea')!;
        const out = wrap.querySelector('#pg-output')!;
        out.textContent = 'Executing...';
        setTimeout(() => {
            if (onRun) {
                try { const result = onRun(ta.value); out.textContent = result; }
                catch (e) { out.textContent = 'Error: ' + (e instanceof Error ? e.message : String(e)); }
            } else {
                out.textContent = '(Simulated execution — no backend available)';
            }
        }, 600);
    });
    wrap.querySelector('.copy-btn')!.addEventListener('click', () => {
        navigator.clipboard.writeText(wrap.querySelector('textarea')!.value);
        toast('Copied!', 'success');
    });
    return wrap;
}

export function pipelineStages(stages: PipelineStage[], onStageClick: (index: number, stage: PipelineStage) => void): HTMLElement {
    const wrap = h('div', { className: 'pipeline' });
    stages.forEach((s, i) => {
        const stage = h('div', { className: 'pipeline-stage', onClick: () => onStageClick(i, s) });
        stage.innerHTML = `<span class="stage-num">${i + 1}</span><div><div class="stage-label">${s.name}</div><div class="stage-desc">${s.desc}</div></div>`;
        wrap.appendChild(stage);
        if (i < stages.length - 1) {
            const conn = h('div', { className: 'pipeline-connector animated' });
            wrap.appendChild(conn);
        }
    });
    return wrap;
}

export function lifecycleSteps(steps: string[]): HTMLElement {
    const wrap = h('div', { className: 'lifecycle-dots' });
    steps.forEach((s, i) => {
        const step = h('div', { className: 'lifecycle-step', textContent: s });
        wrap.appendChild(step);
        if (i < steps.length - 1) {
            wrap.appendChild(h('span', { className: 'lifecycle-arrow' }, '→'));
        }
    });
    return wrap;
}

export function topicToolbar(topicId: string): HTMLElement {
    const wrap = h('div', { className: 'topic-toolbar' });
    const btn = h('button', { className: 'btn btn-sm' });

    const updateBtn = () => {
        const done = Store.isChecked(topicId);
        btn.textContent = done ? '✓ Completed' : 'Mark complete';
        btn.classList.toggle('btn-primary', done);
    };

    btn.addEventListener('click', () => {
        Store.toggleCheck(topicId);
        updateBtn();
        document.dispatchEvent(new CustomEvent('topic-check-changed', { detail: { topicId } }));
        toast(Store.isChecked(topicId) ? 'Topic marked complete' : 'Topic marked incomplete', 'info');
    });

    updateBtn();
    wrap.appendChild(btn);
    return wrap;
}
