// src/renderers/dsa-structures.ts — Stack, Queue, Linked List, Binary Tree, BST
import { h } from '../utils';
import { card, diagram, tableCard, qaCard } from '../components';

// ── Stack ─────────────────────────────────────────────────────────────
let stackData = [10, 20, 30, 40, 50];
function renderStackViz(): void {
    const viz = document.getElementById('stack-viz');
    if (!viz) return;
    let html = '<div style="display:flex;gap:8px;align-items:flex-end;height:120px;">';
    stackData.forEach((v, i) => {
        const isTop = i === stackData.length - 1;
        html += `<div style="width:50px;height:${v * 1.2}px;background:${isTop ? 'var(--accent)' : 'var(--bg-tertiary)'};border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;color:white;border:2px solid ${isTop ? 'var(--accent-light)' : 'var(--border)'};">${v}</div>`;
    });
    html += '</div>';
    viz.innerHTML = html;
}

export function renderStack(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Stack'));
    section.appendChild(card('🧠 Mental Model', 'LIFO. Monotonic stack for next greater/smaller element. Parenthesis matching.'));

    const coreCard = card('🧠 Core idea and the invariant', `
        <p>A stack is an adapter over an array or a linked list that only exposes
        <code>push</code> and <code>pop</code> at one end, the <b>top</b>. Restricting the interface
        is the whole point: you cannot reach into the middle, so you cannot create an ordering
        invariant and then violate it two lines later.</p>
        <p><strong>The invariant that makes the technique correct:</strong>
        <b>the top of the stack is always the most recently pushed element that has not yet been
        popped, so the only legal order in which elements come back out is the reverse of the order
        they went in.</b></p>
        <p>Every stack algorithm in an interview is a statement about <em>which end</em> you are
        allowed to look at. Bracket matching works because a closing bracket can only possibly
        cancel the <em>most recent</em> unmatched opening bracket. A greedy problem works with a
        stack when the tie-breaker you need is "the last one I saw wins" — otherwise you wanted a
        queue.</p>
        <p><strong>The brute-force baseline and the optimization that removes it.</strong> The naive
        bracket check re-scans the whole prefix at every closing bracket, O(n<sup>2</sup>). The stack
        keeps exactly the unmatched openings — the ones a naive scan keeps recomputing — so each
        character is pushed and popped at most once: <b>O(n<sup>2</sup>) &rarr; O(n)</b>. That is the
        standard move: <em>do not re-derive a fact that a single remembered value already carries.</em></p>
        <p><strong>Two different stacks share one word.</strong> The <em>call stack</em> is the runtime's
        stack of activation records, and it is what makes recursion work; the <em>data stack</em> is
        the collection you push values onto. They are the same data structure with a very different
        lifetime — the call stack is reclaimed by the hardware when a frame returns, so its size is a
        hard limit, while a data stack grows until memory runs out.</p>
    `);
    coreCard.appendChild(diagram(`
sequenceDiagram
    autonumber
    participant M as main
    participant H as handler
    participant G as getInput
    M->>M: push frame for main, holds locals and the return address
    M->>H: call handler, arguments copied onto the stack
    H->>H: push frame for handler
    H->>G: call getInput
    G->>G: push frame for getInput, the stack grows
    G-->>H: return a value, pop frame, stack pointer restored
    H->>H: work, then reach a return statement
    H-->>M: return, pop frame
    M->>M: pop the last frame, the process exits
`, 'The call stack is an ordinary LIFO stack of activation records — push on call, pop on return'));
    section.appendChild(coreCard);

    const vizCard = card('🎬 Push/Pop Animation', '<div id="stack-viz" class="viz-area"></div>');
    section.appendChild(vizCard);

    const btnGroup = h('div', { className: 'btn-group' });
    const pushBtn = h('button', { className: 'btn', textContent: 'Push' });
    pushBtn.addEventListener('click', () => {
        stackData.push(Math.floor(Math.random() * 100) + 1);
        renderStackViz();
    });
    const popBtn = h('button', { className: 'btn', textContent: 'Pop' });
    popBtn.addEventListener('click', () => {
        if (stackData.length > 0) stackData.pop();
        renderStackViz();
    });
    btnGroup.appendChild(pushBtn);
    btnGroup.appendChild(popBtn);
    section.appendChild(btnGroup);

    const monoCard = card('🔁 Monotonic stack: the nearest greater element', `
        <p><b>The problem.</b> For every index <code>i</code>, find the first index to its right whose
        value is strictly greater. Example: <code>nums = [2, 1, 4, 6, 3, 5]</code> &rarr; answers are
        <code>[4, 4, 6, 5, 5, -1]</code> (values, not indices; <code>-1</code> means "none exists").</p>
        <p><b>The brute-force baseline.</b> For each <code>i</code>, walk forward until you find a
        bigger value: on the worst-case input, a strictly decreasing array, every walk runs to the end
        and scans the suffix again. That is n + (n&minus;1) + … + 1 = <b>O(n<sup>2</sup>)</b> comparisons.</p>
        <p><b>The optimization.</b> Do not restart a search at every position. Carry forward the indices
        that are <em>still waiting</em> for an answer, in a stack whose values are strictly decreasing
        from bottom to top. When the current value beats the top of the stack, that top has found its
        answer — and because the stack is decreasing, every element it hides below is also smaller, so
        you keep popping until one is not. Each index is pushed once and popped at most once:
        <b>O(n<sup>2</sup>) &rarr; O(n)</b>, with O(n) worst-case space.</p>
        <p><b>Why decreasing, and why that order is forced.</b> If a newer candidate is smaller than an
        older one, the older one is useless: whenever the older one could have found its greater
        element, the newer, smaller one would have found it first. Keeping only the newest small
        elements is not a heuristic, it is the only set of candidates that can still win.</p>
        <p><b>What is on the stack when the loop ends.</b> Indices whose answer is <code>-1</code>: they
        ran off the end of the array without ever meeting something greater. That is why the array is
        pre-filled with <code>-1</code> and you never need a final flush loop.</p>
    `);
    monoCard.appendChild(diagram(`
flowchart TD
    START["answer filled with -1, stack empty<br/>stack holds indices whose values decrease bottom to top"] --> NEXT["take the next value x at index i"]
    NEXT --> TOP{"Stack not empty?"}
    TOP -->|"yes"| BEAT{"Value at the stack top<br/>is smaller than x?"}
    BEAT -->|"yes"| POP["Pop that index j and set answer j to x<br/>i is the first greater element to the right of j"]
    POP --> TOP
    BEAT -->|"no"| PUSH["Push i, x becomes the new candidate<br/>answer for anything to its right"]
    TOP -->|"no"| PUSH
    PUSH --> MORE{"More elements?"}
    MORE -->|"yes"| NEXT
    MORE -->|"no"| OUT["Indices still on the stack never found<br/>a greater value, their answers stay -1"]
`, 'Each pop finalises exactly one answer; each index is pushed once and popped at most once'));
    section.appendChild(monoCard);

    section.appendChild(tableCard('🔍 Worked trace — next greater element of [2, 1, 4, 6, 3, 5]', ['i', 'x', 'while-loop activity', 'Stack after, bottom to top', 'Answer so far'], [
        ['0', '2', 'stack is empty, no pops', '[2]', '[&minus;, &minus;, &minus;, &minus;, &minus;, &minus;]'],
        ['1', '1', 'pop 2, answer[0] = 4 &nbsp;&middot;&nbsp; stop: top is empty', '[1]', '[4, &minus;, &minus;, &minus;, &minus;, &minus;]'],
        ['2', '4', 'no pops: top value 1 is not smaller than 4', '[1, 4]', '[4, &minus;, &minus;, &minus;, &minus;, &minus;]'],
        ['3', '6', 'no pops: top value 4 is not smaller than 6', '[1, 4, 6]', '[4, &minus;, &minus;, &minus;, &minus;, &minus;]'],
        ['4', '3', 'pop 6, answer[3] = 5 &nbsp;&middot;&nbsp; pop 4, answer[2] = 6', '[1, 3]', '[4, &minus;, 6, 5, &minus;, &minus;]'],
        ['5', '5', 'no pops: top value 3 is not smaller than 5', '[1, 3, 5]', '[4, &minus;, 6, 5, &minus;, &minus;]'],
    ]));

    section.appendChild(card('💻 Implementation: annotated', `
<pre><code class="language-javascript">// Next greater element to the right. One pass, O(n) time, O(n) space.
// Baseline: for each i, scan i+1..n-1 -&gt; O(n^2) on a decreasing array.
// This version: keep the indices that are still waiting, in an order that
//              lets a single sweep finalise all of them -&gt; O(n).

function nextGreater(nums) {
    const answer = new Array(nums.length).fill(-1);  // -1 means "no greater element exists"
    const stack = [];                                // holds INDICES, values strictly decreasing

    for (let i = 0; i &lt; nums.length; i++) {
        // The invariant: every index on the stack is still waiting, and no value
        // to the left of it in the stack is greater than it. So once nums[i]
        // beats the top, i is that top's FIRST greater element — not just one.
        while (stack.length &gt; 0 && nums[stack[stack.length - 1]] &lt; nums[i]) {
            answer[stack.pop()] = nums[i];
        }
        stack.push(i);   // i joins the queue of candidates for later elements
    }
    // Anything left on the stack found nothing: its -1 is already correct.
    return answer;
}

// The same shape, mirrored (values strictly increasing), gives the next
// SMALLER element. Flip only the comparison in the while, never the structure.</code></pre>`));

    section.appendChild(card('💻 Code Example', `<pre><code class="language-javascript">// Monotonic Increasing Stack
const stack = [];
for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length-1]] > nums[i]) {
        stack.pop();
    }
    stack.push(i);
}</code></pre>`));

    section.appendChild(tableCard('⏱️ Complexity, and where the bound degrades', ['Operation / algorithm', 'Time', 'Space', 'Worst case that hurts'], [
        ['<code>push</code> / <code>pop</code> on a pre-sized array', 'O(1)', 'O(1)', 'None — the backing store never moves'],
        ['<code>push</code> on a growing array', 'O(1) amortized', 'O(n)', 'The doubling copy: one O(n) resize per n pushes, so still O(n) total'],
        ['<code>peek</code> / <code>isEmpty</code>', 'O(1)', 'O(1)', 'None'],
        ['<code>Array.prototype.shift</code> on a JS array', 'O(n)', 'O(1)', 'Every removal reindexes; use a head pointer or a deque instead'],
        ['Bracket matching', 'O(n)', 'O(n)', 'All brackets open: the stack grows to n — memory, not time'],
        ['Next greater element, monotonic stack', 'O(n) amortized', 'O(n)', 'All values equal: each element is popped exactly once, still O(n); a strictly increasing array leaves all n on the stack'],
        ['Iterative DFS with a stack', 'O(n) nodes', 'O(h)', 'A skewed tree with h = n: the stack holds n siblings — this is recursion with extra steps'],
        ['Recursive DFS', 'O(n)', 'O(h) call stack', 'Skewed tree, n &gt; ~10<sup>4</sup> frames: stack overflow'],
    ]));

    section.appendChild(card('🚦 When a queue beats a stack', `
        <p>A stack gives you "the most recent thing". If the question you are answering is "the
        <em>first</em> thing that arrived" or "the one with the smallest key so far, where ties go
        to the oldest", LIFO is the wrong structure and you are paying an O(n) penalty to get FIFO.
        Reach for a deque or a priority queue instead.</p>
        <ul>
            <li><b>Sliding-window minimum.</b> A stack keeps the newest value on top, but a sliding
            window must evict the value that is <em>about to leave</em>, which is the oldest one at the
            bottom. A monotonic <b>deque</b> holds the survivors in index order at the back and the
            imminent-expiry value at the front: O(n) instead of O(n &times; window) with a naive
            min-scan.</li>
            <li><b>BFS and any level-by-level work.</b> If work must be done roughly in the order it
            was discovered — shortest path in hops, printing a tree level by level, round-robin
            schedulers, fair request draining — a stack gives you depth-first order, which is the
            opposite fairness property.</li>
            <li><b>Producer–consumer.</b> A worker pool fed by a stack runs depth-first: one unlucky
            task's deep subtree starves the rest. FIFO gives every task the same start time.</li>
            <li><b>Undo with a redo stack.</b> <code>undoStack</code> plus <code>redoStack</code> — a
            stack whose elements happen to move in pairs. Push each inverse operation, not the state
            snapshot, or memory grows with edits instead of edit depth.</li>
            <li><b>When the answer depends on rank, not order.</b> "Next shortest task first" is not
            FIFO and not LIFO; it is a <b>min-heap</b>, O(log n) per operation. Reaching for a stack
            and then sorting the whole contents is how you turn O(n log n) into something worse.</li>
        </ul>
        <div class="callout warn"><strong>Rule of thumb:</strong> if you ever find yourself calling
        <code>pop()</code> and then <code>unshift()</code>, or reversing an array to get FIFO order,
        you wanted a queue. <code>array.unshift</code> is O(n) and will quietly turn an intended O(n)
        pass into O(n<sup>2</sup>) — the classic cause of a timeout that "should have been linear".</div>
    `));

    section.appendChild(card('⚠️ Pitfalls', `
        <ul>
            <li><b>Popping an empty stack.</b> In JS that yields <code>undefined</code> and then a
            <code>TypeError</code> one line later, far from the cause. Guard with
            <code>if (stack.length === 0) throw ...</code> or return a sentinel, and decide in
            advance whether the empty case is legal.</li>
            <li><b>Mutating the stack while iterating it.</b> In JS, <code>for (const x of stack)</code>
            reads by index while <code>pop()</code> shrinks the array — every element is skipped.
            Iterate backwards, or snapshot with <code>stack.slice()</code>.</li>
            <li><b>Assuming recursion depth is unlimited.</b> Each nested call is a stack frame.
            Chrome and Node overflow around 10<sup>4</sup>–10<sup>5</sup> frames, Python's default
            limit is 1000, the JVM throws <code>StackOverflowError</code>. A balanced tree is
            log<sub>2</sub>(n) deep and safe; a skewed tree with n = 10<sup>5</sup> is not.</li>
            <li><b>Integer overflow in index arithmetic.</b> If you write the monotonic stack with a
            fixed-size C-style array of length n, n &minus; 1 for "empty" is a landmine when n = 0
            (you get index &minus;1). Use a signed index or a sentinel value you never push.</li>
            <li><b>Confusing the data stack with the call stack.</b> Recursion depth is call-stack
            bounded, not heap bounded; the two limits fail at completely different sizes, and a fix
            that adds heap memory does nothing for the call stack.</li>
            <li><b>Using a stack where input is not contiguous.</b> Stack problems assume a sequence
            you can walk left to right. On a linked structure or a stream you cannot rewind, the
            "push" and "pop" are no longer at the same place and you need a queue or an explicit
            index.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['When would you use a stack over a queue?',
            'When the answer is "the most recent one". Bracket validation, expression evaluation, undo history, DFS traversal, and any monotonic-stack problem where the tie-break is the latest element. The moment the tie-break is "the oldest" or "the smallest key", switch to a deque or a heap — using a stack there is not slower, it is wrong.'],
        ['Why does the monotonic stack beat the brute-force scan, concretely?',
            'Brute force re-derives the same information n times: for each index it walks right until it finds something greater. The monotonic stack keeps the indices still waiting, in decreasing order, so when a new value arrives it answers every waiting index it beats in one pass. Each index is pushed once and popped once, giving O(n) total instead of O(n^2), at the cost of O(n) extra space — this is the classic time-for-space trade.'],
        ['Every function call in JS pushes onto a stack. Why does deep recursion crash?',
            'Because those frames are real memory with a hard limit — a few megabytes of contiguous stack per thread, not heap memory. V8 typically overflows between 10k and 100k frames depending on frame size; Python raises RecursionError at 1000 by default; the JVM throws StackOverflowError. That is why a balanced tree is safe at any realistic n (depth log2 n ≈ 20) and a degenerate linked list is not: convert the recursion to an explicit stack, which moves the limit from a hardware-enforced cap to your own heap budget.'],
        ['Is pushing onto a JavaScript array O(1)?',
            'Amortized O(1), not worst-case O(1). The array grows by doubling, so the n-th push can trigger an O(n) copy. The amortized cost stays O(1) because the copy only happens after n pushes since the last resize, and total copying across the life of the array is O(n). For a hot loop where you want a genuine worst-case O(1), pre-allocate with new Array(capacity) and track the top index yourself.'],
        ['How would you implement a browser-style back button?',
            'Two stacks: history and forward. Navigating pushes the current page onto history and clears forward. Back pops history onto forward and renders the popped page. The forward button is exactly the reverse operation. One subtlety worth stating in an interview: the forward stack must be cleared on every new navigation, and you store URLs, not page objects, or you pin entire DOM trees in memory.'],
        ['What breaks if you use a stack for a "find the shortest path by hop count" problem?',
            'Order. A stack-based DFS emits nodes in depth-first order, so you would have to expand every node at depth d before you ever look at depth d+1 — the algorithm still returns the right answer eventually but visits exponentially more of the graph, and you lose the "first time you dequeue it, you have the shortest path" proof. BFS with a queue turns unweighted shortest path from exponential into O(V + E).'],
    ]));

    section.appendChild(card('🏭 Real-world usage', `
        <ul>
            <li><b>Every programming language runtime.</b> Call frames, the mechanism behind recursion
            and behind local variable scoping, are a stack. Stack overflow is a stack problem, not a
            memory-leak problem.</li>
            <li><b>Compilers and parsers.</b> Shunting-yard converts infix to postfix using a stack of
            operators; the postfix evaluator uses a stack of operands; bytecode VMs (JVM, CPython,
            V8) are stack machines.</li>
            <li><b>Browser and app navigation.</b> Back/forward history, and every mobile
            navigation library's view stack.</li>
            <li><b>Undo/redo.</b> Editing operations push their inverse; a redo stack mirrors it.</li>
            <li><b>Algorithms.</b> Next greater/smaller element, largest rectangle in a histogram,
            trapped rain water, daily temperatures, min-stack with O(1) getMin, and DFS graph
            traversal expressed iteratively.</li>
            <li><b>Infrastructure.</b> ELB health-check retry stacks, circuit-breaker call stacks
            (invoke the most recent caller first), and AWS Lambda handler chains.</li>
        </ul>
    `));

    container.appendChild(section);

    setTimeout(renderStackViz, 100);
}
// ── Queue ─────────────────────────────────────────────────────────────
export function renderQueue(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Queue'));
    section.appendChild(card('🧠 Mental Model', 'FIFO. Use for BFS, level-order traversal, rate limiting.'));

    section.appendChild(card('🧠 Core idea and the invariant', `
        <p>A queue keeps the <b>first element in</b> as the <b>first element out</b>: <code>enqueue</code>
        at the tail (back), <code>dequeue</code> from the head (front). Everything else follows from the
        fact that the ends are different — a stack is a queue with the two ends fused together.</p>
        <p><strong>The invariant that makes the technique correct:</strong>
        <b>elements leave in exactly the order they arrived</b>, so the head is always the oldest live
        element and the tail is always the newest. Every FIFO algorithm is really a fairness claim:
        "nobody waits longer than the elements that arrived after them."</p>
        <p><strong>The brute-force baseline and the optimization that removes it.</strong> The naive
        implementation is a plain array with <code>push</code> and <code>shift</code>. That looks like
        a queue and is a trap: <code>shift</code> renumbers every remaining element, so each dequeue
        costs O(n) and n dequeues cost <b>O(n<sup>2</sup>)</b>. The fix is one of two, both O(1) per
        operation — keep an integer <code>head</code> and never renumber, or use a fixed circular
        buffer where the tail wraps back to slot 0 instead of running off the end.</p>
        <p>A <b>deque</b> (double-ended queue) relaxes the discipline to allow O(1) insertion and
        removal at <em>both</em> ends. That single change is what unlocks sliding-window minimum and
        maximum, monotonic queues, work-stealing schedulers, and O(1) undo/redo.</p>
    `));

    const ringCard = card('🔁 The circular buffer: why tail wraps', `
        <p>A ring buffer is a fixed array plus two indices. <code>head</code> marks the front element,
        <code>tail</code> marks the next free slot, and both are taken modulo the capacity so they wrap
        around instead of running off the end. Nothing is ever copied or renumbered, so every operation
        is a single array write and a single index update.</p>
        <p>Worked example: capacity 5, enqueue A, B, C, D, E, dequeue one, then enqueue F.</p>
    `);
    ringCard.appendChild(diagram(`
flowchart LR
    P0["slot 0<br/>holds F, the oldest"] --> P1["slot 1<br/>holds B, the front, this is head"]
    P1 --> P2["slot 2<br/>holds C"] --> P3["slot 3<br/>holds D"] --> P4["slot 4<br/>holds E, the newest"]
    P4 -->|"tail goes from 5 to 5 mod 5 = 0, so it reuses slot 0"| P0
    H["head = 1<br/>the next dequeue reads slot 1"] --> P1
    T["tail = 1, the next enqueue writes slot 1<br/>head equals tail here, and the size counter says 5,<br/>which is how full is encoded"] --> P1
`, 'After the wrap the buffer holds F B C D E and the FIFO order B C D E F is unchanged'));
    section.appendChild(ringCard);

    section.appendChild(tableCard('🔍 Worked trace — capacity 5, tail = head + size mod 5', ['Step', 'Operation', 'Slot touched', 'head', 'tail', 'size', 'Buffer, slots 0 to 4'], [
        ['0', 'initial', '&mdash;', '0', '0', '0', '&ndash; &ndash; &ndash; &ndash; &ndash;'],
        ['1', 'enqueue A', 'write slot 0', '0', '1', '1', 'A &ndash; &ndash; &ndash; &ndash; &ndash;'],
        ['2', 'enqueue B', 'write slot 1', '0', '2', '2', 'A B &ndash; &ndash; &ndash;'],
        ['3', 'enqueue C', 'write slot 2', '0', '3', '3', 'A B C &ndash; &ndash;'],
        ['4', 'enqueue D', 'write slot 3', '0', '4', '4', 'A B C D &ndash;'],
        ['5', 'enqueue E', 'write slot 4, tail wraps to 0', '0', '0', '5', 'A B C D E &nbsp;<b>full</b>'],
        ['6', 'dequeue, returns A', 'read slot 0', '1', '0', '4', 'A B C D E, slot 0 is now free'],
        ['7', 'enqueue F', 'write slot 0, the wrap', '1', '1', '5', 'F B C D E &nbsp;<b>full</b>, FIFO order B C D E F'],
    ]));

    section.appendChild(card('💻 Implementation: annotated', `
<pre><code class="language-javascript">// Fixed-capacity ring buffer. Every operation is O(1) with no reallocation.
class RingQueue {
    constructor(capacity) {
        // Power of two so the wrap is a bitwise AND, not a modulo divide.
        this.cap = 1 &lt;&lt; (32 - Math.clz32(capacity - 1));
        this.buf = new Array(this.cap);
        this.head = 0;   // slot of the oldest element
        this.size = 0;   // the only thing that distinguishes empty from full
    }
    get isEmpty() { return this.size === 0; }
    get isFull()  { return this.size === this.cap; }

    enqueue(x) {
        if (this.isFull) throw new RangeError('queue is full');   // backpressure decision lives here
        this.buf[(this.head + this.size) &amp; (this.cap - 1)] = x;   // tail = head + size, wrapped
        this.size++;
    }
    dequeue() {
        if (this.isEmpty) throw new RangeError('queue is empty');
        const x = this.buf[this.head];
        this.buf[this.head] = undefined;   // drop the reference, or the array leaks
        this.head = (this.head + 1) &amp; (this.cap - 1);
        this.size--;
        return x;
    }
    peek() { return this.isEmpty ? undefined : this.buf[this.head]; }
    toArray() {                                     // snapshot in FIFO order
        const out = new Array(this.size);
        for (let i = 0; i &lt; this.size; i++) out[i] = this.buf[(this.head + i) &amp; (this.cap - 1)];
        return out;
    }
}</code></pre>
        <p><b>The full-vs-empty ambiguity, stated properly.</b> If you keep only <code>head</code> and
        <code>tail</code> modulo capacity, then <code>head === tail</code> describes both an empty
        buffer and a completely full one. You have two honest fixes: carry an explicit
        <code>size</code>, as above, which costs 8 bytes and one branch; or permanently sacrifice slot 0
        so that "full" means <code>tail === head &minus; 1</code> and you get one slot back. Interviewers
        like the first; tight embedded systems often use the second.</p>
    `));

    section.appendChild(tableCard('📚 Deque operations side by side', ['Operation', 'JS array', 'Ring buffer of capacity n', 'Doubly linked list'], [
        ['insert at back', 'O(1) amortized', 'O(1)', 'O(1)'],
        ['remove from back', 'O(1)', 'O(1)', 'O(1)'],
        ['insert at front', 'O(n), <code>unshift</code> reindexes', 'O(1)', 'O(1)'],
        ['remove from front', 'O(n), <code>shift</code> reindexes', 'O(1)', 'O(1)'],
        ['peek at either end', 'O(1)', 'O(1)', 'O(1)'],
        ['read at index i', 'O(1)', 'O(1)', 'O(n)'],
        ['insert at index i', 'O(n)', 'O(n) after locating', 'O(n) after locating'],
        ['Memory', 'up to 2&times; the length, to allow doubling', 'exactly n slots, contiguous, cache friendly', 'one allocation per node, poor locality'],
        ['Growth', 'automatic', 'fixed; "full" is a real state you must handle', 'automatic, node by node'],
    ]));

    section.appendChild(card('🌊 BFS, and why the queue is the proof', `
        <p>BFS is not "a traversal that happens to use a queue". The queue <em>is</em> the correctness
        argument. Nodes are enqueued in non-decreasing distance order, so when a node is dequeued its
        distance is final: every shorter path would have reached it earlier and enqueued it earlier.</p>
        <p>Concretely, this is why the marking must happen at <b>enqueue</b> time, not at dequeue time.
        Mark on dequeue and each node is enqueued once per incoming edge, so BFS degrades from
        O(V + E) toward O(V &times; E) — the classic "why is my BFS slow" bug.</p>
        <ul>
            <li><b>Level-order tree traversal.</b> Snapshot the queue length at the start of each loop:
            that many nodes is exactly one level. Without the snapshot, the nodes you just enqueued are
            swept into the same level and the boundaries disappear.</li>
            <li><b>Unweighted shortest path.</b> Dequeue-order gives non-decreasing hop count, so the
            first time you reach a node you already have the optimal answer and can stop expanding it.</li>
            <li><b>0-1 BFS.</b> Deque instead of queue: push weight-0 edges to the front and weight-1
            edges to the back, which keeps the frontier sorted by distance in O(V + E) with no heap.</li>
            <li><b>Dijkstra's first iteration.</b> A priority queue is the general version; when every
            edge has the same weight, the priority is just arrival order and a plain queue suffices.</li>
        </ul>
    `));

    const threadCard = card('🔒 Thread-safe and bounded queues', `
        <p>A plain queue is not thread-safe: <code>size++</code> is read-modify-write, so two threads can
        both read 4 and both write 5, silently losing an element. And an <em>unbounded</em> queue is a
        memory leak with extra steps — if producers outrun consumers, the queue grows until the process
        is OOM-killed. Real queues fix both problems with the same two devices: a <b>lock</b> for
        safety, and a <b>bound</b> for backpressure.</p>
        <p><b>What to do when the queue is full — a decision you must state, not gloss over:</b></p>
        <ul>
            <li><b>Block</b> the producer. Pro: nothing is lost. Con: latency propagates back to the
            caller, so a bounded blocking queue is how a slow dependency becomes a timeout.</li>
            <li><b>Reject</b> with an error. Pro: the caller can retry or shed. Con: you must have a
            retry budget, or you turn a slow system into an outage.</li>
            <li><b>Drop the oldest</b> or <b>drop the newest</b>. Pro: never blocks. Con: silent data
            loss — only acceptable for telemetry, never for payments.</li>
            <li><b>Spill to disk</b> (Kafka, an on-disk queue). Pro: survives a long outage. Con: the
            p99 latency becomes disk latency.</li>
        </ul>
        <p><b>One lock, or two?</b> A single mutex around both ends is correct but has the convoy effect:
        a slow consumer blocks producers too. The classic two-lock design gives each end its own lock
        plus a compare-and-swap loop, so a producer and a consumer are essentially never blocked by
        each other. Single-producer/single-consumer applications go further and need no locks at all —
        just a ring buffer with an atomic <code>head</code> and <code>tail</code>, plus
        <b>cache-line padding</b> between them, because false sharing on a 64-byte line costs more than
        the atomic operation does.</p>
        <p><b>Beyond FIFO order, with multiple producers.</b> A queue guarantees order per producer,
        not globally: two producers interleave in whatever order they won the lock. If you need a
        total order, the ordering key must be in the payload and the consumer must sort or the broker
        must partition — the queue alone will not give it to you.</p>
    `);
    threadCard.appendChild(diagram(`
sequenceDiagram
    autonumber
    participant P as Producer thread
    participant Q as Ring buffer guarded by a mutex
    participant C as Consumer thread
    P->>Q: lock, write at tail, advance tail mod n, signal notEmpty, unlock
    C->>Q: lock, buffer empty? wait on notEmpty until signalled, unlock
    Q-->>C: notEmpty signalled
    C->>Q: lock, read at head, advance head mod n, signal notFull, unlock
    P->>Q: lock, buffer full? wait on notFull until signalled, unlock
    Q-->>P: notFull signalled
    P->>Q: write proceeds, backpressure released
`, 'A condition variable is what turns a full or empty queue from data loss into waiting'));
    section.appendChild(threadCard);

    section.appendChild(tableCard('⏱️ Complexity, and where the bound degrades', ['Operation / algorithm', 'Time', 'Space', 'Worst case that hurts'], [
        ['<code>enqueue</code> / <code>dequeue</code> on a ring buffer', 'O(1)', 'O(1) fixed', 'None — the buffer never reallocates, so no GC spike mid-traffic'],
        ['<code>enqueue</code> with doubling growth', 'O(1) amortized', 'O(n)', 'The one O(n) copy per doubling: a latency spike on the size just past a power of two'],
        ['<code>array.shift()</code> in JavaScript', 'O(n)', 'O(1)', 'Every dequeue renumbers the tail of the array; n dequeues is O(n<sup>2</sup>)'],
        ['BFS on a graph', 'O(V + E)', 'O(V) worst', 'A near-complete graph has a frontier of &Theta;(V); a long thin graph has a frontier of 1 — same code, wildly different memory'],
        ['Level-order tree traversal', 'O(n)', 'O(w), w is the widest level', 'A complete binary tree keeps w &asymp; n/2 nodes queued; a balanced n = 10<sup>6</sup> tree is fine, a linked-list-shaped tree is not'],
        ['Task queue with a bound', 'O(1) per op', 'O(bound)', 'A full queue must block, reject or drop — picking none of the three is the actual bug'],
        ['Priority queue (binary heap) in place of FIFO', 'O(log n)', 'O(n)', 'Strictly more expensive than a queue: only worth it when tasks carry different weights'],
    ]));

    section.appendChild(card('🚫 When NOT to use a queue', `
        <ul>
            <li><b>You need random access by key or by position.</b> "Give me the 500th pending item"
            is O(n) in every queue and O(1) in an array. Queues answer <em>one</em> question well.</li>
            <li><b>The answer is "most recent".</b> That is a stack, or an array you read backwards.</li>
            <li><b>The answer is "the smallest key".</b> FIFO gives no ordering by key at all; use a
            heap or, if you need both ends, a monotonic deque.</li>
            <li><b>The data set is small and known.</b> For 20 items, a linked-list queue spends more
            time allocating nodes than the whole algorithm takes. This is why <code>queue.Queue</code>
            is built on a <code>deque</code> internally, and on a lock-free deque in CPython 3.7+.</li>
            <li><b>You need an ordering the arrival order cannot give.</b> With multiple producers a
            queue gives per-producer order only; a total order requires a key in the payload and a
            consumer-side merge.</li>
            <li><b>Latency-sensitive and per-item independent.</b> A queue forces strict serialisation
            at the head — one slow item blocks everyone behind it. Work-stealing deques give each worker
            its own queue for exactly this reason.</li>
        </ul>
    `));

    section.appendChild(card('💻 Code Example', `<pre><code class="language-javascript">// Deque (double-ended queue)
const dq = [];
dq.push(1);  // enqueue
dq.shift();  // dequeue
dq.unshift(0); // prepend
dq.pop();    // remove last</code></pre>`));

    section.appendChild(card('⚠️ Pitfalls', `
        <ul>
            <li><b><code>shift()</code> is O(n).</b> The single most common queue bug in JavaScript. It
            reindexes every remaining element, so a dequeue-heavy loop silently becomes quadratic.
            Use a head pointer, a ring buffer, or manual compaction.</li>
            <li><b>Off-by-one on the wrap.</b> <code>(head + 1) % n</code> versus
            <code>(head + 1) &amp; (n - 1)</code>: the bitmask version is only correct when
            <code>n</code> is a power of two. Using it anyway is a bug that works for n = 8 and fails
            for n = 100.</li>
            <li><b>Confusing empty with full.</b> <code>head === tail</code> means both unless you keep
            a <code>size</code> or give up a slot. Pick one deliberately and comment it.</li>
            <li><b>Not clearing the dequeued slot.</b> In a JS ring buffer the array keeps a strong
            reference to the removed value, so a long-lived queue pins every object it ever held.</li>
            <li><b>Unbounded queues.</b> A queue with no limit is not a buffer, it is a deferred OOM.
            Size it from Little's Law — concurrency = arrival rate &times; service time — and decide
            what full means.</li>
            <li><b>Locking both ends with one mutex.</b> Correct, but producers and consumers block
            each other; use per-end locks or an SPSC lock-free ring.</li>
            <li><b>False sharing on head and tail.</b> Two adjacent atomics updated by different cores
            ping-pong one cache line and cost far more than the atomic itself. Pad them to separate
            64-byte lines.</li>
            <li><b>Integer overflow of the counters.</b> With 64-bit indices head and tail cannot
            practically overflow; with 32-bit counters at a billion ops per second they wrap in about
            35 minutes. Unsigned arithmetic makes the wrap harmless, but only if you compare with
            subtraction rather than <code>&lt;</code> and <code>&gt;</code>.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['Why does BFS need a queue while DFS uses a stack?',
            'Because BFS claims an ordering property: a FIFO queue keeps the frontier sorted by distance from the source, so the first time a node is dequeued its shortest distance is known. A stack does not preserve that order — it visits in depth-first order, so you would have to expand every node at depth d before looking at depth d+1. Same graph, same data, exponentially more work.'],
        ['Array-backed or linked-list-backed queue?',
            'Array-backed if you can tolerate a fixed capacity or amortized growth: it is cache-friendly, allocation-free at steady state, and simple. Linked-list if elements must be enqueued and dequeued indefinitely without ever paying a resize, or if you need O(1) insertion at both ends without a size counter. In practice the ring buffer wins both — it is the array-backed version with the head pointer built in.'],
        ['How do you tell an empty ring buffer from a full one?',
            'Carry an explicit size counter; head equals tail then unambiguously means one or the other based on size. The alternative is to permanently sacrifice one slot so that full is head equals tail minus one and empty is head equals tail, at the cost of one slot and a harder-to-read full check. Both are fine — the mistake is having head and tail with no size and no comment about which state you are in.'],
        ['How do you make a queue safe for multiple producers and consumers?',
            'Protect every compound operation with a mutex: a check-then-act like "if not full then write" is two steps and both threads can pass the check. For an array-backed queue the buffer itself, plus head, tail and size, must all be under the same lock; locking only the counters is not enough. Then bound the queue, or producers will outrun consumers and grow it until the process dies.'],
        ['Why is an unbounded queue dangerous in production?',
            'It converts a temporary slowdown into a permanent failure. If arrivals exceed the service rate, the queue grows without limit; latency becomes unbounded, the process hits its memory ceiling and is OOM-killed, and in-flight work is lost even though every enqueue technically succeeded. A bound plus an explicit full policy — block, reject, drop or spill to disk — converts a silent outage into bounded, alertable behaviour.'],
        ['When is a queue the wrong data structure?',
            'When you need random access by index, when the answer is the most recent item rather than the oldest, when items must be ordered by key rather than arrival, or when the workload is small enough that node allocation dominates the runtime. A queue answers exactly one question well: what arrived next.'],
    ]));

    section.appendChild(card('🏭 Real-world usage', `
        <ul>
            <li><b>BFS everywhere.</b> Shortest path in hops, level-order rendering of trees, peer
            discovery on a network, build and dependency ordering, "nearest store with stock", and
            connected components in graph analytics.</li>
            <li><b>Message brokers and task queues.</b> Kafka partitions, SQS, RabbitMQ, Celery,
            Sidekiq, and every internal job runner — all ring buffers or log-structured queues with
            explicit bounds and dead-letter handling.</li>
            <li><b>Thread pools and work-stealing schedulers.</b> Go's scheduler, Tokio's work-stealing
            deques, and Java's <code>ForkJoinPool</code>: each worker owns a deque it pushes and pops at
            the same end and steals from the other end when idle.</li>
            <li><b>Print and file spoolers.</b> The oldest job goes first, so one slow job cannot
            starve newer ones indefinitely.</li>
            <li><b>Connection pools and rate limiters.</b> Token buckets and leaky buckets are queues of
            permits or timestamps; the API gateway rate limiter is the same idea.</li>
            <li><b>Caches and GC.</b> Java's <code>LinkedHashMap</code> in access order is backed by a
            doubly linked list that doubles as the eviction queue; mark-and-sweep GC mark queues are
            worklists for the same reason.</li>
            <li><b>Keyboard and mouse input buffers.</b> The OS preserves the order your keystrokes
            happened in — a stack would type them backwards.</li>
        </ul>
    `));

    container.appendChild(section);
}
// ── Linked List ───────────────────────────────────────────────────────
export function renderLinkedList(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Linked List'));
    section.appendChild(card('🧠 Mental Model', 'Nodes with pointers. Fast/slow pointer for cycle detection. Reverse in-place.'));
    section.appendChild(card('⚡ Common Patterns', 'Cycle detection (Floyd\'s algorithm), reverse linked list, merge two sorted lists, skip N from end.'));

    section.appendChild(card('🧠 Core idea and the invariant', `
        <p>A singly linked list is a chain of nodes, each holding a value and a pointer to the next
        node. The list is not a separate object with storage — the list <em>is</em> the head pointer,
        and the chain ends when a <code>next</code> is null. That is why lists are the natural shape
        for LRU caches, free lists, and job chains: you splice nodes in and out without moving anyone
        else.</p>
        <p><strong>The invariant that makes pointer surgery correct:</strong>
        <b>no traversal ever holds a stale pointer to a node whose <code>next</code> has already
        changed</b> — so before you overwrite <code>node.next</code> you have saved the old value, and
        before you lose the head you have captured it. Every one-line linked-list bug is a violation of
        that sentence.</p>
        <p><strong>The brute-force baseline and the optimization that removes it.</strong> In an array,
        inserting at position i costs O(n) because everything after i must shift. In a linked list it
        costs O(1) once you are already holding the pointer before i — you write one field. The price
        is paid elsewhere: <b>finding</b> position i is still O(n), and <b>random access by index</b>
        is O(n) instead of O(1). Trade O(1) mutation for O(n) lookup, never both.</p>
        <p><b>Singly vs doubly.</b> A doubly linked list gives each node a <code>prev</code> pointer, so
        deletion needs no predecessor (O(1) given the node) and backward traversal is possible, at the
        cost of one extra pointer per node — which is why every node now needs a cache line miss
        instead of one. Java's <code>LinkedList</code> is doubly linked; a hash-map bucket chain is
        usually singly linked.</p>
    `));

    const rewireCard = card('🔁 Pointer rewiring: reversal, step by step', `
        <p>Reversal looks impossible at first — overwriting <code>next</code> destroys the only way to
        reach the rest of the list. The fix is to remember where you were going <em>before</em> you
        change anything. Three pointers, one pass, no allocation, no recursion.</p>
        <p><strong>The invariant that makes it correct:</strong>
        <b><code>prev</code> is always the reversed prefix of the original list, <code>cur</code> is
        the first node of the untouched suffix, and <code>nxt</code> is the saved link from
        <code>cur</code> to that suffix.</b> At the loop's head, the list is exactly the two disjoint
        chains <code>prev</code> and <code>cur</code> &rarr; ... — no node is reachable twice and none
        is lost.</p>
    `);
    rewireCard.appendChild(diagram(`
flowchart LR
    subgraph BEFORE["Before the write, cur points at 4"]
        direction LR
        B2["2<br/>next: 3"] --> B3["3<br/>next: 4"] --> B4["4<br/>next: null"]
    end
    subgraph AFTER["After 4.next = 3, and 4 becomes the new head of the reversed chain"]
        direction LR
        A4["4<br/>next: 3"] --> A3["3<br/>next: 2"] --> A2["2<br/>next: 1"] --> A1["1<br/>next: null"]
    end
    BEFORE -->|"save nxt = cur.next first,<br/>then cur.next = prev"| AFTER
`, 'Each step rewires exactly one next pointer; the untouched suffix is kept alive by nxt alone'));
    section.appendChild(rewireCard);

    section.appendChild(tableCard('🔍 Worked trace — reverse 1 to 2 to 3 to 4', ['Step', 'prev', 'cur', 'nxt saved', 'Action', 'State afterwards'], [
        ['0', '&mdash;', '1', '&mdash;', 'take the head as cur', '1 &rarr; 2 &rarr; 3 &rarr; 4 &rarr; null'],
        ['1', 'null', '1', '2', '1.next = null, then prev = 1, cur = 2', 'prev: 1 &nbsp;|&nbsp; untouched: 2 &rarr; 3 &rarr; 4'],
        ['2', '1', '2', '3', '2.next = 1, then prev = 2, cur = 3', 'prev: 2 &rarr; 1 &nbsp;|&nbsp; untouched: 3 &rarr; 4'],
        ['3', '2', '3', '4', '3.next = 2, then prev = 3, cur = 4', 'prev: 3 &rarr; 2 &rarr; 1 &nbsp;|&nbsp; untouched: 4'],
        ['4', '3', '4', 'null', '4.next = 3, then prev = 4, cur = null', 'prev: 4 &rarr; 3 &rarr; 2 &rarr; 1, cur is null so stop'],
        ['done', '4', 'null', '&mdash;', 'return prev', 'head is now 4 &rarr; 3 &rarr; 2 &rarr; 1 &rarr; null'],
    ]));

    const dummyCard = card('🎭 The dummy-node trick: deleting without case analysis', `
        <p>Deleting a node needs three cases — it is the head, it is the tail, it is in the middle — and
        the head case cannot even be handled by the person holding the node, because the head lives in a
        variable the function does not own. Every special case is a chance to be wrong.</p>
        <p>The dummy node removes the case analysis entirely: allocate one node, point its
        <code>next</code> at the current head, and make <code>cur</code> start there. The head is now
        an <em>interior</em> node, so "is it the head?" never arises — and the same loop deletes the
        first, a middle, and the last node without a single branch. The cost is one allocation you
        must also free, which is why the free list is the other classic use of dummy nodes.</p>
    `);
    dummyCard.appendChild(diagram(`
flowchart TD
    START["Allocate a dummy whose next is the current head"] --> CUR["cur points at the dummy, not at a real node"]
    CUR --> CHECK{"cur.next is null?"}
    CHECK -->|"yes"| DONE["Return dummy.next<br/>the head is already correct, and deletion of the first node needed no special case"]
    CHECK -->|"no"| CMP{"cur.next.value is the target?"}
    CMP -->|"yes"| LINK["Bypass it: cur.next = target.next<br/>this single line is the deletion"]
    CMP -->|"no"| ADV["cur = cur.next"]
    ADV --> CHECK
    LINK --> CHECK
`, 'Deleting the head, the tail and a middle node all reduce to cur.next = cur.next.next'));
    section.appendChild(dummyCard);

    section.appendChild(card('💻 Implementation: annotated', `
<pre><code class="language-javascript">class ListNode {
    constructor(val, next = null) { this.val = val; this.next = next; }
}

// Reverse in place. One pass, O(n) time, O(1) extra space.
// The bug everyone writes once: overwriting cur.next before saving it,
// which detaches the entire remainder of the list.
function reverse(head) {
    let prev = null;
    let cur = head;
    while (cur !== null) {
        const nxt = cur.next;   // 1. SAVE the link to the untouched suffix first
        cur.next = prev;        // 2. now it is safe to rewire the current node
        prev = cur;             // 3. the reversed prefix grows by one
        cur = nxt;              // 4. advance along the saved chain
    }
    return prev;                // prev is the new head; cur is null
}

// Delete by value using a dummy node, so head, middle and tail need no
// separate branches. O(n) time, O(1) extra space.
function deleteValue(head, target) {
    const dummy = new ListNode(0, head);
    let cur = dummy;
    while (cur.next !== null) {
        if (cur.next.val === target) {
            cur.next = cur.next.next;   // unlink; cur itself is never deleted
            break;
        }
        cur = cur.next;
    }
    return dummy.next;                   // the dummy makes the head case fall out for free
}

// Floyd's cycle detection: one pointer at 2x, one at 1x. No extra space,
// no set, and O(1) regardless of list size.
// If there is a cycle, they must meet; if not, fast reaches null first.
function hasCycle(head) {
    let slow = head, fast = head;
    while (fast !== null &amp;&amp; fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }
    return false;
}</code></pre>
        <p><b>Why Floyd works, in one sentence.</b> Inside a cycle of length k, the fast pointer gains
        exactly one position per iteration on the slow pointer, so after at most k iterations they
        coincide; if there is no cycle the fast pointer reaches null in n/2 steps and the loop exits.
        The two conditions <code>fast !== null</code> and <code>fast.next !== null</code> are both
        required — checking only the first dereferences null.</p>
        <p><b>The bonus the interviewer is fishing for:</b> after the first meeting, reset one pointer
        to the head and step both at 1&times;. Their next meeting point is the <em>entry</em> node of
        the cycle. Distance argument: the fast pointer travelled <code>d + m</code> steps to re-enter
        after the meeting, and the meeting happened after multiple of k, so both pointers are now
        exactly <code>d</code> steps from the entry.</p>
    `));

    section.appendChild(tableCard('⏱️ Complexity, and where the bound degrades', ['Operation', 'Array (dynamic)', 'Singly linked list', 'Doubly linked list'], [
        ['access element i', 'O(1)', 'O(n)', 'O(n)'],
        ['insert / delete at head', 'O(n), <code>unshift</code> and <code>splice</code> reindex', 'O(1)', 'O(1)'],
        ['insert / delete at tail', 'O(1) with a cached tail pointer', 'O(1) with a tail pointer, O(n) without', 'O(1) with a tail pointer'],
        ['insert after a node you hold', 'O(n), shifting', 'O(1)', 'O(1)'],
        ['delete a node you hold', 'O(n) to find it first', 'O(n), need the predecessor', '<b>O(1)</b>, prev is right there'],
        ['reverse', 'O(n)', 'O(n) time, O(1) space', 'O(n) time, O(1) space'],
        ['cycle detection, Floyd', 'n/a', 'O(n) time, O(1) space', 'O(n) time, O(1) space'],
        ['cache behaviour', 'contiguous, one cache line per 8 to 16 elements', 'one cache miss per node, plus a dependent load per next', 'two pointers to maintain, 2&times; the misses'],
        ['Memory per element', '4 to 8 bytes', 'value 8 + next 8 + header overhead', 'value 8 + next 8 + prev 8 + overhead'],
    ]));

    section.appendChild(card('🔀 Alternatives, and the skip list', `
        <p><b>When not to use a linked list:</b> almost always, in application code. An array wins on
        locality, on memory overhead, on the garbage collector, and on every operation except
        O(1) insertion at a known position. Use a list when (a) you hold the predecessor and splice
        constantly — LRU cache lists, free lists, intrusive kernel structures, or an index's
        <code>INSEAD</code> chain; (b) you need stable addresses for nodes other code holds pointers
        to; (c) nodes arrive and leave at a genuinely unbounded rate and you cannot preallocate.</p>
        <p><b>The skip list, briefly.</b> A skip list is a linked list with extra "express" lists
        above it at geometrically decreasing densities, the same idea as a multi-level index. Searching
        starts at the top level and drops down, touching roughly log<sub>2</sub>(n) nodes — the same
        asymptotic guarantee as a balanced BST, but the levels are built by flipping a coin per node,
        so there is <b>no rebalancing, no parent pointers, and no rotation</b>. Inserts and deletes are
        O(log n) expected, with much better concurrency behaviour than a tree because they mostly
        touch local pointers. Redis sorted sets, LevelDB and RocksDB indexes, and the skip list behind
        <code>ConcurrentSkipListMap</code> in Java all use this. Cost: extra pointers per node
        (roughly 2 pointers per element amortised) and pointer-chasing rather than array indexing.</p>
        <div class="callout"><strong>Interview framing:</strong> if the follow-up is "make it
        thread-safe", the answer is usually not a lock. Use a lock-free Harris/Michael list, or
        <code>ConcurrentLinkedQueue</code>, which needs CAS on the head and tail and tolerates
        intermediate states where the list appears empty or contains a duplicate for a nanosecond.
        Readers must not assume consistency.</div>
    `));

    section.appendChild(card('⚠️ Pitfalls', `
        <ul>
            <li><b>Losing the rest of the list.</b> <code>cur.next = prev</code> before
            <code>const nxt = cur.next</code> detaches everything you have not visited yet. This is the
            single most common linked-list bug.</li>
            <li><b>Returning the wrong pointer after reversal.</b> <code>head</code> is null at the end;
            the new head is <code>prev</code>.</li>
            <li><b>Deleting the node you hold in a singly linked list.</b> You have the node, but not its
            predecessor, so you cannot relink. You need <code>prev = head</code> stepped forward, a
            dummy node, or a doubly linked list.</li>
            <li><b>Mutating the list while iterating it.</b> <code>for (let n = head; n; n = n.next)</code>
            with a deletion inside will either skip the next node or throw on
            <code>n.next.next</code> if you remove the current one. Collect first, then mutate.</li>
            <li><b>Integer overflow in index arithmetic.</b> <code>(mid + n) / 2</code> overflows a
            32-bit int for large arrays — use <code>low + (high - low) / 2</code>. The same class of
            bug appears in "remove Nth from end", where a single pass beats two pointers precisely
            because it needs no index arithmetic at all.</li>
            <li><b>Leaking the head.</b> In C or Rust, the head is an owning pointer and must be freed
            exactly once; in GC languages, dropping the list reference is enough but a self-referential
            cycle keeps the whole chain alive until the cycle collector runs.</li>
            <li><b>Assuming nodes are contiguous.</b> Any reasoning based on "the next element is
            adjacent in memory" — prefetching, SIMD, O(1) indexing — is wrong for a linked list and
            correct for an array. Check <em>where</em> the structure came from before you optimise for
            cache locality.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['When would you use a linked list instead of an array?',
            'When you hold a reference to a node and want O(1) insertion or deletion there — an LRU cache list, a free list, a job queue with stable handles. Also when nodes arrive and leave at a rate you cannot predict and preallocation is wasteful, or when other components hold stable addresses. In pure algorithmic code, the array almost always wins because of cache locality and constant-factor overhead.'],
        ['Explain Floyd cycle detection and why the 2x pointer is needed.',
            'Put one pointer on the list and advance it one node per iteration, and a second that advances two. If the list has no cycle the fast pointer reaches the end in n/2 steps and the loop terminates. If it does have a cycle of length k, both pointers are inside the cycle after at most n steps, and the fast one gains exactly one node per iteration on the slow one, so they must meet within k iterations. It is O(1) space; the alternative, a hash set of seen nodes, is O(n) space and allocates.'],
        ['What is the dummy node for, and when would you skip it?',
            'It removes the head special case. Because the dummy stands in front of the head, the first real node becomes an interior node, so cur.next = cur.next.next deletes the head, a middle node and the tail with the same line of code. Skip it in APIs that must return a new head to the caller anyway, or when you already have the predecessor — the dummy is then pure allocation cost.'],
        ['Why is merging two sorted lists the same difficulty as reversing one?',
            'Both are one-pass pointer surgery with an invariant that the untouched remainder stays reachable. Reversal maintains a reversed prefix and an untouched suffix; merge maintains one output list and two untouched suffixes, picking from whichever head is smaller. Both are O(n) with O(1) extra space once you have the heads, and both are ruined by not saving the next pointer before overwriting it.'],
        ['How do you find the kth node from the end in one pass?',
            'Advance a fast pointer k steps, then walk both one node at a time until fast is null. The slow pointer is now at length minus k. This is better than two passes plus index arithmetic: it is a single pass, O(1) space, and it avoids the integer overflow trap of (length minus k) when the list is shorter than k. Return null rather than throwing if k exceeds the length — decide the contract first.'],
        ['How do you make a linked list thread-safe?',
            'The honest answer is usually not a lock. A lock around every mutation serialises everything and gives up the point of concurrent structures. A lock-free singly linked list uses a CAS loop that only publishes a new head once the new node points at the current head, and readers accept that they may see a slightly stale snapshot. If you also need size, range queries and safe iteration, take ConcurrentLinkedQueue or ConcurrentSkipListMap rather than writing your own.'],
    ]));

    section.appendChild(card('🏭 Real-world usage', `
        <ul>
            <li><b>LRU caches.</b> A hash map plus a doubly linked list: O(1) lookup, O(1) move-to-front,
            O(1) eviction. This is the canonical production linked list.</li>
            <li><b>Free lists and allocators.</b> Freed blocks are spliced back into a free list, so
            allocation and deallocation are pointer writes rather than allocator calls.</li>
            <li><b>Filesystem directories.</b> FAT and ext use linked lists of directory entries; ext4
            uses an htree index instead, which is the same idea as a skip list.</li>
            <li><b>Databases and kernels.</b> InnoDB's <code>INSEAD</code> chain, TCP's transmit queue,
            kernel wait queues, and every intrusive structure in the Linux kernel use an embedded
            list: the node carries its own link fields, so no allocation is needed to enqueue.</li>
            <li><b>Hash table buckets.</b> Collision chains are usually singly linked lists, chained in
            Java until the treeify threshold turns a bucket into a red-black tree.</li>
            <li><b>Music playlists and undo histories.</b> Play-next and recently-played are doubly
            linked so both ends are O(1).</li>
            <li><b>Ordered indexes.</b> B+tree leaf pages are linked lists so a range scan can walk
            from one leaf to the next without returning to the root.</li>
        </ul>
    `));

    section.appendChild(card('🎬 Animation', '<div id="ll-viz" class="viz-area" style="position:relative;"></div>'));

    container.appendChild(section);

    setTimeout(() => {
        const viz = document.getElementById('ll-viz');
        if (!viz) return;
        const nodes = ['A', 'B', 'C', 'D'];
        viz.innerHTML = nodes.map((n, _i) =>
            `<span style="display:inline-flex;align-items:center;padding:8px 16px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;margin:4px;font-weight:600;">${n}</span><span style="color:var(--accent);margin:0 4px;">→</span>`
        ).join('');
    }, 100);
}