// src/content/dsa-heap.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-heap",
    title: "Heap",
    blocks: [
        {
            kind: "card",
            title: "🧠 Core Idea",
            id: "dsa-heap-core",
            html:
                `
        <p>A heap is a <strong>complete</strong> binary tree — every level full except possibly the
        last, which fills left to right. That shape is the entire trick: because the tree is
        complete, it maps onto a plain array with no pointers, so a "tree node" is an
        <code>int</code> at an index, and the whole structure is one contiguous block of memory
        that the CPU prefetcher loves.</p>
        <p><strong>The invariant that makes it a heap:</strong> every parent is
        &lt;= both of its children (min-heap) or &gt;= both (max-heap). One comparison per level is
        all you need to maintain, and it puts the extreme element at index 0 — which is the only
        element a priority queue ever needs.</p>
        <p>What a heap deliberately does <em>not</em> give you: ordering between siblings, ordering
        between subtrees, or any way to find an arbitrary element's position. Only the root is
        globally ranked.</p>
    `,
        },
        {
            kind: "card",
            title: "🔢 Index Arithmetic — the Whole Data Structure",
            html:
                `
        <p>There are no pointers. Three formulas are the entire "tree":</p>
        <ul>
            <li>parent of <code>i</code> is <code>Math.floor((i - 1) / 2)</code></li>
            <li>left child of <code>i</code> is <code>2 * i + 1</code></li>
            <li>right child of <code>i</code> is <code>2 * i + 2</code></li>
            <li>the last node with at least one child is <code>Math.floor(n / 2) - 1</code> — this is
                why <code>heapify</code> is O(n) and not O(n log n): only half the array has
                children.</li>
        </ul>
    `,
        },
        {
            kind: "diagram",
            caption: "A complete binary tree is an array with arithmetic instead of pointers",
            source:
                `
flowchart TD
    R["index 0<br/>root, always the minimum"] --> L["index 1<br/>left child"]
    R --> RGT["index 2<br/>right child"]
    L --> LL["index 3"]
    L --> LR["index 4"]
    RGT --> RL["index 5"]
    RGT --> RR["index 6"]
    RGT --> RP["index 7, leaf,<br/>the last slot filled"]
    NOTE["parent of i is floor of i minus 1 over 2<br/>left is 2i plus 1, right is 2i plus 2<br/>last internal node is floor of n over 2 minus 1"]
`,
        },
        {
            kind: "card",
            title: "🔁 Sift Up and Sift Down",
            html:
                `
        <p>Every mutation is one of two symmetric operations, and each walks a single root-to-leaf
        path. Sift-up repairs the hole created by an <code>append</code>; sift-down repairs the hole
        created by a <code>pop</code>. Because the tree height is <code>floor(log2 n)</code>, both are
        O(log n) — one comparison per level, never a re-scan.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "Sift-up walks the hole up to the root, sift-down walks it down to a leaf",
            source:
                `
flowchart TD
    UP0["Insert: place value at the next free index"] --> UPT{"Smaller than its parent?"}
    UPT -->|"yes"| UPSWAP["Swap with parent,<br/>move the hole one level up"]
    UPSWAP --> UPT
    UPT -->|"no"| UPDONE["Heap property holds again,<br/>at most log2 n swaps"]
    DOWN0["Pop: move the last element to the root,<br/>shrinking the array by one"] --> DT{"Larger than<br/>the smaller child?"}
    DT -->|"yes"| DSWAP["Swap with the smaller child,<br/>move the hole one level down"]
    DSWAP --> DT
    DT -->|"no"| DDONE["Every subtree below the hole<br/>is still a valid heap"]
`,
        },
        {
            kind: "card",
            title: "🎬 Worked Example — building a min-heap bottom-up",
            id: "dsa-heap-trace",
            html:
                `
        <p><code>heapify([4, 10, 3, 5, 1])</code>. Start at the last internal node (index 1) and work
        toward index 0. At each node, sift down while the node beats its smaller child.</p>
        <table class="complexity-table">
            <tr><th>Node</th><th>Action</th><th>Array after</th></tr>
            <tr><td>index 4</td><td>leaf, nothing to do</td><td><code>[4, 10, 3, 5, 1]</code></td></tr>
            <tr><td>index 3</td><td>leaf, nothing to do</td><td><code>[4, 10, 3, 5, 1]</code></td></tr>
            <tr><td>index 1, value 10</td><td>smaller child is 1 at index 4 &rarr; swap</td><td><code>[4, 1, 3, 5, 10]</code></td></tr>
            <tr><td>index 0, value 4</td><td>smaller child is 1 at index 1 &rarr; swap</td><td><code>[1, 4, 3, 5, 10]</code></td></tr>
            <tr><td>index 1, value 4</td><td>smaller child is 5 — 4 &lt; 5, stop</td><td><code>[1, 4, 3, 5, 10]</code></td></tr>
            <tr><td colspan="3"><strong>Verify:</strong> 1 &le; 4, 3 &nbsp;&middot;&nbsp; 4 &le; 5, 10 &nbsp;&middot;&nbsp; done in 4 comparisons.</td></tr>
        </table>
        <p><strong>Insert trace</strong> (each row is one <code>heappush</code>):</p>
        <table class="complexity-table">
            <tr><th>Pushed</th><th>Array after</th><th>Swaps</th></tr>
            <tr><td>3</td><td><code>[3]</code></td><td>0</td></tr>
            <tr><td>1</td><td><code>[1, 3]</code></td><td>1 — swaps past index 0</td></tr>
            <tr><td>7</td><td><code>[1, 3, 7]</code></td><td>0 — 7 &gt; 1</td></tr>
            <tr><td>2</td><td><code>[1, 2, 7, 3]</code></td><td>1 — beats parent 3 at index 1</td></tr>
            <tr><td>9</td><td><code>[1, 2, 7, 3, 9]</code></td><td>0 — 9 &gt; 2</td></tr>
            <tr><td>4</td><td><code>[1, 2, 4, 3, 9, 7]</code></td><td>1 — beats parent 7 at index 2</td></tr>
        </table>
        <p>Every insert stops as soon as the element is in the right place. Worst case is the
        opposite: pushing a monotonically decreasing sequence into a min-heap makes every push
        travel the full height, which is O(n log n) total instead of O(n) for heapify. That is the
        input that degrades the bound, and it is exactly what a naive "push everything" merge
        produces.</p>
    `,
        },
        {
            kind: "interactive",
            algo: "heap",
            html:
                `Watch a heap assemble itself, then hand back the k smallest values. The array is the heap — the indices are the structure.`,
        },
        {
            kind: "code",
            title: "💻 Implementation",
            language: "python",
            code:
                `import heapq

# Min-heap: heappush / heappop both cost O(log n)
heapq.heappush(heap, val)
smallest = heapq.heappop(heap)

# Max-heap (negate values)
heapq.heappush(max_heap, -val)

# O(n) build: heapify works bottom-up over the internal nodes only
heapq.heapify(arr)

# Two-heap median finder: keep the low half in a max-heap,
# the high half in a min-heap. They never differ in size by more than 1.
import heapq
low, high = [], []            # low is a max-heap via negation
for x in stream:
    if not low or x <= -low[0]:
        heapq.heappush(low, -x)
    else:
        heapq.heappush(high, x)
    if len(low) > len(high) + 1:
        heapq.heappush(high, -heapq.heappop(low))
    elif len(high) > len(low):
        heapq.heappush(low, -heapq.heappop(high))
median = (-low[0] + high[0]) / 2 if high else -low[0]`,
        },
        {
            kind: "collapsible",
            title: "🔍 Annotated from-scratch sift-down",
            html:
                `
        <pre><code class="language-javascript">function siftDown(a, start, end) {
    // start is the hole, end is exclusive: only a[start..end) is in play
    let root = start;
    while (true) {
        const child = 2 * root + 1;      // left child of root
        if (child &gt;= end) break;      // leaf — nothing left to repair
        // pick the LARGER of the two children, or we might sift down the wrong child
        const right = child + 1;
        let swap = right &lt; end &amp;&amp; a[right] &gt; a[child] ? right : child;
        if (a[root] &gt;= a[swap]) break; // invariant holds here and below
        [a[root], a[swap]] = [a[swap], a[root]];
        root = swap;                     // hole moves down one level
    }
}

function heapify(a) {
    // bottom-up: only floor(n/2) - 1 nodes have children, and each repair is O(log n),
    // so the sum is O(n) rather than n * O(log n)
    for (let i = Math.floor(a.length / 2) - 1; i &gt;= 0; i--) siftDown(a, i, a.length);
}

function heappop(a) {
    const top = a[0];
    const last = a.pop();               // shrink first, so children are correct bounds
    if (a.length) { a[0] = last; siftDown(a, 0, a.length); }
    return top;
}</code></pre>
        <p><strong>Two lines carry the bug risk.</strong> <code>child &gt;= end</code> is the
        off-by-one that turns a pop into an infinite loop or a read of
        <code>undefined</code>. Choosing the <em>larger</em> child — not the first child — is what
        keeps the sibling subtrees valid after the hole passes them.</p>
    `,
        },
        {
            kind: "table",
            title: "⏱️ Complexity, and When the Bound Degrades",
            headers: ["Operation", "Time", "Notes and worst case"],
            rows:
                                    [
                        [
                            "peek (read root)",
                            "O(1)",
                            "Never degrades — the root is always index 0",
                        ],
                        [
                            "push / insert",
                            "O(log n)",
                            "Degrades to full height when every new value is the new minimum; building from a sorted-descending input is O(n log n) instead of heapify's O(n)",
                        ],
                        [
                            "pop / extract root",
                            "O(log n)",
                            "Constant-time if the heap has 0 or 1 element; the O(1) case people forget to check",
                        ],
                        [
                            "build from an array",
                            "O(n)",
                            "Bottom-up; the sum of the subtree heights is a geometric series, not n &times; log n",
                        ],
                        [
                            "increase-key",
                            "O(log n)",
                            "Needs a position index or handle; a lazy version pushes a duplicate entry instead",
                        ],
                        [
                            "search for an arbitrary value",
                            "O(n)",
                            "No ordering between subtrees — the heap property gives you nothing here",
                        ],
                        [
                            "sorted iteration",
                            "O(n log n)",
                            "Drain into a list and sort; that is a heap losing to a sort, not a failure",
                        ],
                        [
                            "space",
                            "O(n)",
                            "One array, no node overhead, no pointers to chase",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "⚖️ Heap vs Sorted Array vs Balanced BST",
            html:
                `
        <p>All three answer "give me the smallest thing". They differ in what else you get for free,
        and that is the whole decision.</p>
    `,
        },
        {
            kind: "table",
            title: "Choose by the query pattern",
            headers: ["Query", "Sorted array", "Heap", "Balanced BST"],
            rows:
                                    [
                        [
                            "min / max",
                            "O(1)",
                            "O(1)",
                            "O(log n)",
                        ],
                        [
                            "pop min",
                            "O(n) — shifting the array",
                            "O(log n) &mdash; the winner for a priority queue",
                            "O(log n)",
                        ],
                        [
                            "insert anywhere in sorted order",
                            "O(n) — same shifting cost",
                            "O(log n)",
                            "O(log n)",
                        ],
                        [
                            "find exact value",
                            "O(log n) binary search",
                            "O(n) — no help at all",
                            "O(log n)",
                        ],
                        [
                            "range / prefix query",
                            "O(log n) by index",
                            "O(n)",
                            "O(log n + k)",
                        ],
                        [
                            "memory locality",
                            "perfect — one array",
                            "good — one array",
                            "poor — scattered nodes, pointer chasing",
                        ],
                        [
                            "memory overhead",
                            "none beyond the array",
                            "none beyond the array",
                            "node + 2 or 3 pointers per element",
                        ],
                        [
                            "when it wins",
                            "the full result set is needed sorted anyway",
                            "top-k, streaming, event queues, merge k runs",
                            "ordered iteration plus lookups — an order-statistic or range tree",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🔥 Real-World Usage",
            html:
                `
        <ul>
            <li><strong>Dijkstra's priority queue</strong> — the textbook consumer. Dijkstra pops the
            cheapest unsettled node; the heap is what turns an O(V&sup2;) scan into
            O((V + E) log V).</li>
            <li><strong>Top-K streaming</strong> — keep a max-heap of size K and replace the root
            when a larger value arrives: O(n log K) for n items, independent of n in memory. This is
            how you get "10 most retweeted tweets this hour" without sorting 4 million rows.</li>
            <li><strong>K-way merge</strong> — one root per sorted run, pop the smallest, push the
            next from that run. Merging K sorted files of total size N costs O(N log K) instead of
            N log N.</li>
            <li><strong>Median of a stream</strong> — two heaps, sizes balanced to within 1, so the
            median is a peek at two roots: O(1) per insert, O(1) per query.</li>
            <li><strong>Task schedulers</strong> — rate limiters, thread pools, and every work queue
            that must run the highest-priority item first. Retries with backoff are a heap: the next
            due timestamp is the min.</li>
            <li><strong>Memory pressure</strong> — the JVM, .NET and V8 all hand back their largest
            unreachable object first, which requires the cheapest possible "find the extreme".</li>
        </ul>
    `,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Why is heapify O(n) and not O(n log n)?",
                    a: "Only nodes 0 to floor(n/2) - 1 have children, and a sift-down on a node at depth d costs O(log n - d). Summing over all internal nodes is sum over levels of (nodes at that level) &times; (remaining depth), a geometric series that converges to 2n. So the naive-looking bottom-up loop is linear. The n pushes version really is O(n log n).",
                },
                {
                    q: "When is a sorted array actually the better answer?",
                    a: "Whenever you need the elements back in sorted order, or you need to look up a specific value. Popping the min from a sorted array is O(n) because everything shifts, but if you are going to pop all n of them anyway, that is O(n&sup2;) on paper and O(n log n) in practice with a heap — but then you still owe a sort. My interview answer: if k is small relative to n, heap; if the whole ordering is needed, sort once.",
                },
                {
                    q: "How do you implement decrease-key, and what is the cheaper alternative?",
                    a: "You store the index of each element in the heap alongside the element, so a key change is followed by a sift-up or sift-down from that index: O(log n). The alternative used in real systems is lazy deletion — push a new entry with the updated key and skip stale entries when they surface at the root, which makes each update O(log n) to push and defers the deletion. Simpler code, slightly more memory.",
                },
                {
                    q: "How would you find the top K of a million numbers in one pass?",
                    a: "Max-heap of size K. For each value, if the heap has fewer than K items push it; otherwise if the value beats the root, replace the root and sift down. O(n log K) time, O(K) memory, no second pass. Quickselect is O(n) expected time and also O(K) memory, so if K is large relative to n and I can afford a single in-place pass, quickselect is faster — but it mutates the input and needs the whole array in memory, which the streaming version does not.",
                },
                {
                    q: "How do you get a median of a stream in O(1) per operation?",
                    a: "Two heaps. A max-heap holds the lower half, a min-heap the upper half, kept within one element of each other in size. Insert into the heap whose root faces the value, then rebalance by moving one root if the sizes drift. The median is then just the max of the low heap, or the mean of the two roots when the count is even. Both operations are O(log n); there is no comparison sort of the stream.",
                },
                {
                    q: "When is a heap the wrong tool?",
                    a: "Three common cases. You need ordered iteration or range queries — use a balanced BST or a B-tree. You need exact lookup — a heap cannot do better than O(n). Or the operations are mostly inserts with no extremum queries, in which case a plain unsorted array plus an occasional bulk sort is faster because it has no per-element maintenance cost.",
                },
            ],
        },
    ],
});
