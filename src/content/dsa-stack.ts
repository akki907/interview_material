// src/content/dsa-stack.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-stack",
    title: "Stack",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html: "LIFO. Monotonic stack for next greater/smaller element. Parenthesis matching.",
        },
        {
            kind: "card",
            title: "Core idea and the invariant",
            html: `
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
    `,
        },
        {
            kind: "diagram",
            caption:
                "The call stack is an ordinary LIFO stack of activation records — push on call, pop on return",
            source: `
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
`,
        },
        // The legacy page drew a push/pop stack with live Push and Pop buttons.
        // That interactivity is not expressible as content data; the same
        // behaviour is described by the call-stack diagram above and the
        // monotonic-stack worked trace below.
        {
            kind: "card",
            title: "Monotonic stack: the nearest greater element",
            html: `
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
    `,
        },
        {
            kind: "diagram",
            caption:
                "Each pop finalises exactly one answer; each index is pushed once and popped at most once",
            source: `
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
`,
        },
        {
            kind: "table",
            title: "Worked trace — next greater element of [2, 1, 4, 6, 3, 5]",
            headers: [
                "i",
                "x",
                "while-loop activity",
                "Stack after, bottom to top",
                "Answer so far",
            ],
            rows: [
                [
                    "0",
                    "2",
                    "stack is empty, no pops",
                    "[2]",
                    "[&minus;, &minus;, &minus;, &minus;, &minus;, &minus;]",
                ],
                [
                    "1",
                    "1",
                    "pop 2, answer[0] = 4 &nbsp;&middot;&nbsp; stop: top is empty",
                    "[1]",
                    "[4, &minus;, &minus;, &minus;, &minus;, &minus;]",
                ],
                [
                    "2",
                    "4",
                    "no pops: top value 1 is not smaller than 4",
                    "[1, 4]",
                    "[4, &minus;, &minus;, &minus;, &minus;, &minus;]",
                ],
                [
                    "3",
                    "6",
                    "no pops: top value 4 is not smaller than 6",
                    "[1, 4, 6]",
                    "[4, &minus;, &minus;, &minus;, &minus;, &minus;]",
                ],
                [
                    "4",
                    "3",
                    "pop 6, answer[3] = 5 &nbsp;&middot;&nbsp; pop 4, answer[2] = 6",
                    "[1, 3]",
                    "[4, &minus;, 6, 5, &minus;, &minus;]",
                ],
                [
                    "5",
                    "5",
                    "no pops: top value 3 is not smaller than 5",
                    "[1, 3, 5]",
                    "[4, &minus;, 6, 5, &minus;, &minus;]",
                ],
            ],
        },
        {
            kind: "interactive",
            algo: "stack",
            html:
                `Push, pop, and catch the mismatch the moment it happens — then try the count-only shortcut on a string that fools it.`,
        },
        {
            kind: "code",
            title: "Implementation: annotated",
            language: "javascript",
            code: `// Next greater element to the right. One pass, O(n) time, O(n) space.
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
// SMALLER element. Flip only the comparison in the while, never the structure.`,
        },
        {
            kind: "code",
            title: "Code Example",
            language: "javascript",
            code: `// Monotonic Increasing Stack
const stack = [];
for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length-1]] > nums[i]) {
        stack.pop();
    }
    stack.push(i);
}`,
        },
        {
            kind: "table",
            title: "Complexity, and where the bound degrades",
            headers: [
                "Operation / algorithm",
                "Time",
                "Space",
                "Worst case that hurts",
            ],
            rows: [
                [
                    "<code>push</code> / <code>pop</code> on a pre-sized array",
                    "O(1)",
                    "O(1)",
                    "None — the backing store never moves",
                ],
                [
                    "<code>push</code> on a growing array",
                    "O(1) amortized",
                    "O(n)",
                    "The doubling copy: one O(n) resize per n pushes, so still O(n) total",
                ],
                [
                    "<code>peek</code> / <code>isEmpty</code>",
                    "O(1)",
                    "O(1)",
                    "None",
                ],
                [
                    "<code>Array.prototype.shift</code> on a JS array",
                    "O(n)",
                    "O(1)",
                    "Every removal reindexes; use a head pointer or a deque instead",
                ],
                [
                    "Bracket matching",
                    "O(n)",
                    "O(n)",
                    "All brackets open: the stack grows to n — memory, not time",
                ],
                [
                    "Next greater element, monotonic stack",
                    "O(n) amortized",
                    "O(n)",
                    "All values equal: each element is popped exactly once, still O(n); a strictly increasing array leaves all n on the stack",
                ],
                [
                    "Iterative DFS with a stack",
                    "O(n) nodes",
                    "O(h)",
                    "A skewed tree with h = n: the stack holds n siblings — this is recursion with extra steps",
                ],
                [
                    "Recursive DFS",
                    "O(n)",
                    "O(h) call stack",
                    "Skewed tree, n &gt; ~10<sup>4</sup> frames: stack overflow",
                ],
            ],
        },
        {
            kind: "card",
            title: "When a queue beats a stack",
            html: `
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
    `,
        },
        {
            kind: "card",
            title: "Pitfalls",
            html: `
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
    `,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "When would you use a stack over a queue?",
                    a: 'When the answer is "the most recent one". Bracket validation, expression evaluation, undo history, DFS traversal, and any monotonic-stack problem where the tie-break is the latest element. The moment the tie-break is "the oldest" or "the smallest key", switch to a deque or a heap — using a stack there is not slower, it is wrong.',
                },
                {
                    q: "Why does the monotonic stack beat the brute-force scan, concretely?",
                    a: "Brute force re-derives the same information n times: for each index it walks right until it finds something greater. The monotonic stack keeps the indices still waiting, in decreasing order, so when a new value arrives it answers every waiting index it beats in one pass. Each index is pushed once and popped once, giving O(n) total instead of O(n^2), at the cost of O(n) extra space — this is the classic time-for-space trade.",
                },
                {
                    q: "Every function call in JS pushes onto a stack. Why does deep recursion crash?",
                    a: "Because those frames are real memory with a hard limit — a few megabytes of contiguous stack per thread, not heap memory. V8 typically overflows between 10k and 100k frames depending on frame size; Python raises RecursionError at 1000 by default; the JVM throws StackOverflowError. That is why a balanced tree is safe at any realistic n (depth log2 n ≈ 20) and a degenerate linked list is not: convert the recursion to an explicit stack, which moves the limit from a hardware-enforced cap to your own heap budget.",
                },
                {
                    q: "Is pushing onto a JavaScript array O(1)?",
                    a: "Amortized O(1), not worst-case O(1). The array grows by doubling, so the n-th push can trigger an O(n) copy. The amortized cost stays O(1) because the copy only happens after n pushes since the last resize, and total copying across the life of the array is O(n). For a hot loop where you want a genuine worst-case O(1), pre-allocate with new Array(capacity) and track the top index yourself.",
                },
                {
                    q: "How would you implement a browser-style back button?",
                    a: "Two stacks: history and forward. Navigating pushes the current page onto history and clears forward. Back pops history onto forward and renders the popped page. The forward button is exactly the reverse operation. One subtlety worth stating in an interview: the forward stack must be cleared on every new navigation, and you store URLs, not page objects, or you pin entire DOM trees in memory.",
                },
                {
                    q: 'What breaks if you use a stack for a "find the shortest path by hop count" problem?',
                    a: 'Order. A stack-based DFS emits nodes in depth-first order, so you would have to expand every node at depth d before you ever look at depth d+1 — the algorithm still returns the right answer eventually but visits exponentially more of the graph, and you lose the "first time you dequeue it, you have the shortest path" proof. BFS with a queue turns unweighted shortest path from exponential into O(V + E).',
                },
            ],
        },
        {
            kind: "card",
            title: "Real-world usage",
            html: `
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
    `,
        },
    ],
});
