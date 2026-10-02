// src/renderers/react.ts
import { h } from '../utils';
import { card, lifecycleSteps, collapsible } from '../components';

export function renderReactFundamentals(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Fundamentals'));
    section.appendChild(card('🧠 Mental Model', 'Components describe UI as a function of state. JSX → React elements → DOM.'));
    section.appendChild(card('📋 Core Concepts', `
<ul style="padding-left:20px;line-height:2;">
<li><strong>Components</strong> — Functions returning JSX</li>
<li><strong>JSX</strong> — Syntactic sugar for React.createElement</li>
<li><strong>Props</strong> — Immutable data passed to children</li>
<li><strong>State</strong> — Mutable data via useState/setter</li>
<li><strong>Events</strong> — onClick, onChange with synthetic events</li>
<li><strong>Keys</strong> — Stable identities for list reconciliation</li>
</ul>
    `));
    section.appendChild(card('💻 Example', `<pre><code class="language-javascript">function Counter() {
    const [count, setCount] = useState(0);
    return (
        <button onClick={() => setCount(c => c + 1)}>
            Count: {count}
        </button>
    );
}</code></pre>`));
    container.appendChild(section);
}

export function renderReactHooks(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Hooks Deep Dive'));
    section.appendChild(card('🧠 useState', 'State hook. Returns [value, setter]. Batches updates for performance.'));
    section.appendChild(card('🎬 useEffect Lifecycle', lifecycleSteps(['Render', 'Commit', 'useEffect', 'External System', 'State Update', 'Render'])));
    section.appendChild(card('⚠️ Common Pitfalls', `
<ul style="padding-left:20px;line-height:2;">
<li>Missing dependency → stale closures</li>
<li>Missing dependency array → infinite loops</li>
<li>Async in useEffect without cleanup → race conditions</li>
<li>State in useEffect → cascading renders</li>
</ul>
    `));
    section.appendChild(card('💻 Custom Hook Example', `<pre><code class="language-javascript">function useDebounce(val, delay) {
    const [debounced, setDebounced] = useState(val);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(val), delay);
        return () => clearTimeout(t);
    }, [val, delay]);
    return debounced;
}</code></pre>`));
    container.appendChild(section);
}

export function renderReactState(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'State Management'));
    section.appendChild(card('🧠 Mental Model', 'Lift state up, context for global, libraries for complex: Zustand, Redux, Jotai.'));
    section.appendChild(card('⚡ Patterns', 'Lifting state, derived state, optimistic updates, pagination state.'));
    container.appendChild(section);
}

export function renderReactPerformance(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Performance'));
    section.appendChild(card('🎬 Before/After', '<div class="two-col"><div class="card"><h4>❌ Before</h4><p>Unnecessary re-renders on every state change. No memoization. Large list re-renders all items.</p></div><div class="card"><h4>✅ After</h4><p>React.memo, useMemo, useCallback. Virtualized lists. Code splitting with lazy().</p></div></div>'));
    section.appendChild(card('💻 Memo Example', `<pre><code class="language-javascript">const Expensive = React.memo(({ data }) => {
    // Only re-renders when data changes
});

const memoizedCb = useCallback(() => {
    doSomething(dep);
}, [dep]);</code></pre>`));
    container.appendChild(section);
}

export function renderReactRendering(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Rendering'));
    section.appendChild(card('🧠 Mental Model', 'Render → Diff → Commit. React tracks dependencies to skip unnecessary work.'));
    section.appendChild(card('⚡ Key Concepts', 'Batching, transitions (startTransition), concurrent features, Suspense.'));
    container.appendChild(section);
}

export function renderReactArchitecture(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Architecture'));
    section.appendChild(card('🧠 Mental Model', 'Container/Presentational, Custom Hooks for logic, Component composition.'));
    section.appendChild(card('⚡ Patterns', 'Render props, HOCs, compound components, hooks composition.'));
    container.appendChild(section);
}

export function renderReactInterview(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Interview Questions'));
    const questions = [
        { q: 'What is the difference useMemo and useCallback?', a: 'useMemo caches a value, useCallback caches a function. Both skip recomputation when deps are unchanged.' },
        { q: 'What are React Server Components?', a: 'Components that run on the server, sending only the rendered UI. Zero bundle size for the client.' },
        { q: 'How does React reconciliation work?', a: 'Compares virtual DOM trees, diffs by component type and key, updates only changed DOM nodes.' },
    ];
    questions.forEach(qq => {
        section.appendChild(collapsible(qq.q, `<p>${qq.a}</p>`, false));
    });
    container.appendChild(section);
}
