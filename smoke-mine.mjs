import { Window } from 'happy-dom';

const win = new Window({ url: 'http://localhost/' });
for (const k of ['window', 'document', 'localStorage', 'HTMLElement', 'Node', 'CustomEvent', 'Event']) {
    globalThis[k] = win[k];
}

const mods = {
    dsa: await import('./src/renderers/dsa.ts'),
    structures: await import('./src/renderers/dsa-structures.ts'),
    fundamentals: await import('./src/renderers/dsa-fundamentals.ts'),
    algorithms: await import('./src/renderers/dsa-algorithms.ts'),
    dashboard: await import('./src/renderers/dashboard.ts'),
    react: await import('./src/renderers/react.ts'),
    interview: await import('./src/renderers/interview.ts'),
    flashcards: await import('./src/renderers/flashcards.ts'),
};

const mk = () => { const d = document.createElement('div'); document.body.appendChild(d); return d; };
const click = el => el && el.dispatchEvent(new win.Event('click'));

const checks = [
    ['flashcards', 'renderFlashcards', ['class="card"', 'FLIP CARD', 'flashcard-front', 'complexity' === 'x' ? 'x' : 'Write your']],
    ['dashboard', 'renderDashboard', ['Your Engineering Journey', 'progress-fill', 'stat-value', 'Go to Dsa Sliding Window', 'Weak Areas']],
    ['interview', 'renderInterview', ['Interview Mode', 'interview-area', 'Reveal Hint']],
    ['react', 'renderReactHooks', ['Hooks Deep Dive', 'lifecycle', 'useDebounce']],
    ['dsa', 'renderSlidingWindow', ['Sliding Window', 'sw-viz', 'sw-controls']],
    ['dsa', 'renderStack', ['Push', 'stack-viz']],
    ['dsa', 'renderDP', ['Memo/Tabulation', 'pipeline-stage']],
    ['dsa', 'renderLinkedList', ['ll-viz']],
    ['dsa', 'renderTwoPointers', ['Two Pointers']],
    ['dsa', 'renderArrays', ['Prefix sum']],
    ['dsa', 'renderStrings', ['KMP']],
    ['dsa', 'renderHashMaps', ['Counter']],
    ['dsa', 'renderQueue', ['deque', 'dq.unshift']],
    ['dsa', 'renderBinaryTree', ['inorder(node']],
    ['dsa', 'renderBST', ['Lowest common ancestor']],
    ['dsa', 'renderHeap', ['heapq.heappush']],
    ['dsa', 'renderGraph', ['Dijkstra']],
    ['dsa', 'renderBacktracking', ['def backtrack']],
    ['dsa', 'renderGreedy', ['Huffman']],
    ['structures', 'renderStack', ['Monotonic stack', 'nearest greater element']],
    ['structures', 'renderLinkedList', ['Floyd', 'complexity-table']],
    ['structures', 'renderQueue', ['FIFO']],
    ['fundamentals', 'renderSlidingWindow', ['sw-viz', 'sw-controls']],
    ['fundamentals', 'renderTwoPointers', ['Two Pointers']],
    ['fundamentals', 'renderArrays', ['Sorting cost table', 'Omega']],
    ['algorithms', 'renderHeap', ['complete', 'heapify']],
    ['algorithms', 'renderGraph', ['Dijkstra', 'Union-Find']],
    ['algorithms', 'renderBacktracking', ['N-Queens']],
    ['dashboard', 'renderDashboard', []],
    ['react', 'renderReactFundamentals', ['React Fundamentals', 'Components']],
    ['react', 'renderReactState', ['Zustand']],
    ['react', 'renderReactPerformance', ['React.memo', 'useCallback']],
    ['react', 'renderReactRendering', ['Suspense']],
    ['react', 'renderReactArchitecture', ['Server Components']],
    ['react', 'renderReactInterview', ['What is the difference between useMemo']],
];

let failures = 0;
for (const [mod, fn, expects] of checks) {
    const container = mk();
    try {
        mods[mod][fn](container);
    } catch (e) {
        failures++;
        console.log(`THROW ${mod}.${fn}: ${e && e.message}`);
        continue;
    }
    const html = container.innerHTML;
    const missing = expects.filter(e => !html.includes(e));
    if (!html.length) { failures++; console.log(`EMPTY ${mod}.${fn}`); }
    if (missing.length) { failures++; console.log(`MISSING in ${mod}.${fn}: ${JSON.stringify(missing)}`); }
    else console.log(`ok ${mod}.${fn} (${html.length} chars)`);
}

// ── interactive paths ────────────────────────────────────────────────────
const fc = mk();
mods.flashcards.renderFlashcards(fc);
const fronts = () => [...fc.querySelectorAll('.flashcard-front')];
const navSpan = () => [...fc.querySelectorAll('.flashcard-nav span')].pop().textContent;
const flipBtn = () => [...fc.querySelectorAll('.btn-primary')].find(b => b.textContent === 'FLIP CARD');
const navBtn = label => [...fc.querySelectorAll('.btn-sm')].at(-1);
console.log('flashcards: initial front =', fronts()[0].querySelector('h3').textContent, '| nav =', navSpan());
click(flipBtn());
console.log('flashcards: back visible after flip =', !fc.querySelector('.flashcard-back').classList.contains('hidden'));
click([...fc.querySelectorAll('.btn')].find(b => b.textContent === 'React'));
console.log('flashcards: after React filter, front =', fronts().pop().querySelector('h3').textContent);
click(navBtn());
console.log('flashcards: after Next, latest nav =', navSpan());

const iv = mk();
mods.interview.renderInterview(iv);
click([...iv.querySelectorAll('.btn')].at(-1));
console.log('interview: box created =', !!iv.querySelector('.interview-box'), '| timer =', iv.querySelector('.interview-timer').textContent);
click([...iv.querySelectorAll('.btn')].find(b => b.textContent.includes('Reveal')));
console.log('interview: hint shown =', !iv.querySelector('#iq-hint').classList.contains('hidden'));
const ta = iv.querySelector('textarea');
const submit = () => [...iv.querySelectorAll('.btn-primary')].find(b => b.textContent === 'Submit Answer');
const result = () => iv.querySelector('#iq-result');
ta.value = 'short';
click(submit());
console.log('interview: short answer rejected =', result().classList.contains('hidden'));
ta.value = 'a'.repeat(40);
click(submit());
console.log('interview: long answer evaluated =', !result().classList.contains('hidden'), '|', result().querySelector('p').textContent.trim().slice(-30));

const st = mk();
mods.structures.renderStack(st);
await new Promise(r => setTimeout(r, 150));
const bars = () => st.querySelector('#stack-viz').innerHTML.split('width:50px').length - 1;
console.log('structures stack viz bars (initial) =', bars());
click(st.querySelectorAll('.btn')[0]);
console.log('after Push =', bars());
click(st.querySelectorAll('.btn')[1]);
console.log('after Pop  =', bars());

const sw = mk();
mods.fundamentals.renderSlidingWindow(sw);
await new Promise(r => setTimeout(r, 150));
const stepBtns = [...sw.querySelectorAll('#sw-controls button')];
console.log('fundamentals sw step buttons =', stepBtns.length, '| viz len =', sw.querySelector('#sw-viz').innerHTML.length);
console.log('  step0 tail:', sw.querySelector('#sw-viz').innerHTML.slice(-70));
click(stepBtns.at(-1));
console.log('  after Next:', sw.querySelector('#sw-viz').innerHTML.slice(-70));

const swd = mk();
mods.dsa.renderSlidingWindow(swd);
await new Promise(r => setTimeout(r, 150));
console.log('dsa sw step buttons =', [...swd.querySelectorAll('#sw-controls button')].length, '| viz len =', swd.querySelector('#sw-viz').innerHTML.length);

const ll = mk();
mods.dsa.renderLinkedList(ll);
await new Promise(r => setTimeout(r, 150));
console.log('dsa ll viz =', ll.querySelector('#ll-viz').innerHTML.replace(/<[^>]+>/g, '|').slice(0, 60));

const dash = mk();
mods.dashboard.renderDashboard(dash);
console.log('dashboard progress bars =', dash.querySelectorAll('.progress-bar').length, '| stat cards =', dash.querySelectorAll('.stat-card').length, '| weak =', dash.querySelectorAll('.weak-list li').length);
click([...dash.querySelectorAll('.btn')][0]);
console.log('dashboard quick action id present =', !!dash.querySelector('.btn-group'));

console.log(failures === 0 ? 'SMOKE OK' : `SMOKE FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);