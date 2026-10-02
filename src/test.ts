/**
 * Interview OS — unit & smoke tests
 * Run: pnpm test
 */
import { Window } from 'happy-dom';
import { escHtml } from './utils';
import { Store } from './store';
import { RENDERERS } from './renderers/index';

// ─── localStorage mock for Store tests ───────────────────────
function withMockStorage(run: () => void) {
    const data = new Map<string, string>();
    const mock = {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => { data.set(k, v); },
        removeItem: (k: string) => { data.delete(k); },
        clear: () => { data.clear(); },
        get length() { return data.size; },
        key: (_i: number) => null,
    };
    const prev = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true });
    try {
        run();
    } finally {
        Object.defineProperty(globalThis, 'localStorage', { value: prev, writable: true });
    }
}

function assert(cond: unknown, msg: string) {
    if (!cond) throw new Error(msg);
}

// ─── utils ───────────────────────────────────────────────────
assert(escHtml('<script>') === '&lt;script&gt;', 'escHtml escapes angle brackets');
assert(escHtml('a & b') === 'a &amp; b', 'escHtml escapes ampersand');

// ─── Store ────────────────────────────────────────────────────
withMockStorage(() => {
    Store.toggleBookmark('topic-a');
    assert(Store.isBookmarked('topic-a'), 'bookmark toggled on');
    Store.toggleBookmark('topic-a');
    assert(!Store.isBookmarked('topic-a'), 'bookmark toggled off');
    Store.saveProgress({ dsa: 80 });
    assert(Store.getProgress().dsa === 80, 'progress persists');
    assert(Store.toggleCheck('topic-a') === true, 'check toggled on');
    assert(Store.isChecked('topic-a'), 'check reads back');
    assert(Store.toggleCheck('topic-a') === false, 'check toggled off');
});

// ─── Renderer smoke tests ────────────────────────────────────
const window = new Window();
const document = window.document;
Object.assign(globalThis, {
    window,
    document,
    HTMLElement: window.HTMLElement,
    CustomEvent: window.CustomEvent,
    localStorage: window.localStorage,  // Add localStorage from happy-dom
});

document.body.innerHTML = `
    <div id="toast-container"></div>
    <div id="content"></div>
    <nav id="sidebar-nav"></nav>
`;

const ids = Object.keys(RENDERERS);

for (const id of ids) {
    const container = document.createElement('div');
    RENDERERS[id](container as unknown as HTMLElement);
    assert(
        container.childNodes.length > 0,
        `renderer "${id}" should append content`,
    );
}

console.log(`✓ All tests passed (${ids.length} renderers smoke-tested)`);
