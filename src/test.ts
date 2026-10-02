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

    // Todos tests
    const initialTodos = Store.getTodos();
    assert(Array.isArray(initialTodos) && initialTodos.length > 0, 'getTodos returns default array');
    const newTodo = Store.addTodo({
        title: 'Mock Interview Prep',
        category: 'general',
        priority: 'high',
        completed: false,
    });
    assert(newTodo.title === 'Mock Interview Prep', 'addTodo sets title');
    assert(Store.getTodos().some(t => t.id === newTodo.id), 'new todo is persisted');
    
    const toggled = Store.toggleTodo(newTodo.id);
    assert(toggled === true, 'toggleTodo sets completed to true');
    assert(Store.getTodos().find(t => t.id === newTodo.id)?.completed === true, 'completed state persisted');

    Store.updateTodo(newTodo.id, { title: 'Updated Mock Interview Prep' });
    assert(Store.getTodos().find(t => t.id === newTodo.id)?.title === 'Updated Mock Interview Prep', 'updateTodo updates field');

    const deleted = Store.deleteTodo(newTodo.id);
    assert(deleted === true, 'deleteTodo returns true');
    assert(!Store.getTodos().some(t => t.id === newTodo.id), 'deleted todo removed from store');
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

// ─── Deep interactive test for Todos & Dashboard ─────────────
const todosContainer = document.createElement('div');
RENDERERS['todos'](todosContainer as unknown as HTMLElement);
assert(todosContainer.querySelector('.todos-view') !== null, 'todos view element rendered');
assert(todosContainer.querySelectorAll('.todo-item-card').length > 0, 'todo items rendered');
assert(todosContainer.querySelector('.todos-metrics-bar') !== null, 'todos metrics bar rendered');

const firstCheckBtn = todosContainer.querySelector('.todo-check-btn') as unknown as HTMLButtonElement;
assert(firstCheckBtn !== null, 'todo check button exists');
const initialChecked = firstCheckBtn.classList.contains('checked');
firstCheckBtn.click();
const updatedCheckBtn = todosContainer.querySelector('.todo-check-btn') as unknown as HTMLButtonElement;
assert(updatedCheckBtn.classList.contains('checked') !== initialChecked, 'checkbox toggled on click');

const dashContainer = document.createElement('div');
RENDERERS['dashboard'](dashContainer as unknown as HTMLElement);
assert(dashContainer.querySelector('.dashboard-todos-card') !== null, 'dashboard priority study goals card rendered');

console.log(`✓ All tests passed (${ids.length} renderers smoke-tested, deep interactive tests verified)`);

