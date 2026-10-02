// src/renderers/dsa-algorithms.ts — Heaps, graphs, backtracking, DP, greedy
import { h } from '../utils';
import { card, collapsible, diagram, tableCard, qaCard } from '../components';

// ── Heap ──────────────────────────────────────────────────────────────

const HEAP_CODE = `import heapq

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
median = (-low[0] + high[0]) / 2 if high else -low[0]`;

export function renderHeap(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Heap'));

    section.appendChild(card('🧠 Core Idea', `
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
    `, { id: 'dsa-heap-core' }));

    section.appendChild(card('🔢 Index Arithmetic — the Whole Data Structure', `
        <p>There are no pointers. Three formulas are the entire "tree":</p>
        <ul>
            <li>parent of <code>i</code> is <code>Math.floor((i - 1) / 2)</code></li>
            <li>left child of <code>i</code> is <code>2 * i + 1</code></li>
            <li>right child of <code>i</code> is <code>2 * i + 2</code></li>
            <li>the last node with at least one child is <code>Math.floor(n / 2) - 1</code> — this is
                why <code>heapify</code> is O(n) and not O(n log n): only half the array has
                children.</li>
        </ul>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    R["index 0<br/>root, always the minimum"] --> L["index 1<br/>left child"]
    R --> RGT["index 2<br/>right child"]
    L --> LL["index 3"]
    L --> LR["index 4"]
    RGT --> RL["index 5"]
    RGT --> RR["index 6"]
    RGT --> RP["index 7, leaf,<br/>the last slot filled"]
    NOTE["parent of i is floor of i minus 1 over 2<br/>left is 2i plus 1, right is 2i plus 2<br/>last internal node is floor of n over 2 minus 1"]
`, 'A complete binary tree is an array with arithmetic instead of pointers'));

    section.appendChild(card('🔁 Sift Up and Sift Down', `
        <p>Every mutation is one of two symmetric operations, and each walks a single root-to-leaf
        path. Sift-up repairs the hole created by an <code>append</code>; sift-down repairs the hole
        created by a <code>pop</code>. Because the tree height is <code>floor(log2 n)</code>, both are
        O(log n) — one comparison per level, never a re-scan.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    UP0["Insert: place value at the next free index"] --> UPT{"Smaller than its parent?"}
    UPT -->|"yes"| UPSWAP["Swap with parent,<br/>move the hole one level up"]
    UPSWAP --> UPT
    UPT -->|"no"| UPDONE["Heap property holds again,<br/>at most log2 n swaps"]
    DOWN0["Pop: move the last element to the root,<br/>shrinking the array by one"] --> DT{"Larger than<br/>the smaller child?"}
    DT -->|"yes"| DSWAP["Swap with the smaller child,<br/>move the hole one level down"]
    DSWAP --> DT
    DT -->|"no"| DDONE["Every subtree below the hole<br/>is still a valid heap"]
`, 'Sift-up walks the hole up to the root, sift-down walks it down to a leaf'));

    section.appendChild(card('🎬 Worked Example — building a min-heap bottom-up', `
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
    `, { id: 'dsa-heap-trace' }));

    section.appendChild(card('💻 Implementation', `
        <pre><code class="language-python">${HEAP_CODE}</code></pre>
    `));
    section.appendChild(collapsible('🔍 Annotated from-scratch sift-down', `
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
    `));

    section.appendChild(tableCard('⏱️ Complexity, and When the Bound Degrades', ['Operation', 'Time', 'Notes and worst case'], [
        ['peek (read root)', 'O(1)', 'Never degrades — the root is always index 0'],
        ['push / insert', 'O(log n)', 'Degrades to full height when every new value is the new minimum; building from a sorted-descending input is O(n log n) instead of heapify\'s O(n)'],
        ['pop / extract root', 'O(log n)', 'Constant-time if the heap has 0 or 1 element; the O(1) case people forget to check'],
        ['build from an array', 'O(n)', 'Bottom-up; the sum of the subtree heights is a geometric series, not n &times; log n'],
        ['increase-key', 'O(log n)', 'Needs a position index or handle; a lazy version pushes a duplicate entry instead'],
        ['search for an arbitrary value', 'O(n)', 'No ordering between subtrees — the heap property gives you nothing here'],
        ['sorted iteration', 'O(n log n)', 'Drain into a list and sort; that is a heap losing to a sort, not a failure'],
        ['space', 'O(n)', 'One array, no node overhead, no pointers to chase'],
    ]));

    section.appendChild(card('⚖️ Heap vs Sorted Array vs Balanced BST', `
        <p>All three answer "give me the smallest thing". They differ in what else you get for free,
        and that is the whole decision.</p>
    `));
    section.appendChild(tableCard('Choose by the query pattern', ['Query', 'Sorted array', 'Heap', 'Balanced BST'], [
        ['min / max', 'O(1)', 'O(1)', 'O(log n)'],
        ['pop min', 'O(n) — shifting the array', 'O(log n) &mdash; the winner for a priority queue', 'O(log n)'],
        ['insert anywhere in sorted order', 'O(n) — same shifting cost', 'O(log n)', 'O(log n)'],
        ['find exact value', 'O(log n) binary search', 'O(n) — no help at all', 'O(log n)'],
        ['range / prefix query', 'O(log n) by index', 'O(n)', 'O(log n + k)'],
        ['memory locality', 'perfect — one array', 'good — one array', 'poor — scattered nodes, pointer chasing'],
        ['memory overhead', 'none beyond the array', 'none beyond the array', 'node + 2 or 3 pointers per element'],
        ['when it wins', 'the full result set is needed sorted anyway', 'top-k, streaming, event queues, merge k runs', 'ordered iteration plus lookups — an order-statistic or range tree'],
    ]));

    section.appendChild(card('🔥 Real-World Usage', `
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
    `));

    section.appendChild(qaCard([
        ['Why is heapify O(n) and not O(n log n)?',
            'Only nodes 0 to floor(n/2) - 1 have children, and a sift-down on a node at depth d costs O(log n - d). Summing over all internal nodes is sum over levels of (nodes at that level) &times; (remaining depth), a geometric series that converges to 2n. So the naive-looking bottom-up loop is linear. The n pushes version really is O(n log n).'],
        ['When is a sorted array actually the better answer?',
            'Whenever you need the elements back in sorted order, or you need to look up a specific value. Popping the min from a sorted array is O(n) because everything shifts, but if you are going to pop all n of them anyway, that is O(n&sup2;) on paper and O(n log n) in practice with a heap — but then you still owe a sort. My interview answer: if k is small relative to n, heap; if the whole ordering is needed, sort once.'],
        ['How do you implement decrease-key, and what is the cheaper alternative?',
            'You store the index of each element in the heap alongside the element, so a key change is followed by a sift-up or sift-down from that index: O(log n). The alternative used in real systems is lazy deletion — push a new entry with the updated key and skip stale entries when they surface at the root, which makes each update O(log n) to push and defers the deletion. Simpler code, slightly more memory.'],
        ['How would you find the top K of a million numbers in one pass?',
            'Max-heap of size K. For each value, if the heap has fewer than K items push it; otherwise if the value beats the root, replace the root and sift down. O(n log K) time, O(K) memory, no second pass. Quickselect is O(n) expected time and also O(K) memory, so if K is large relative to n and I can afford a single in-place pass, quickselect is faster — but it mutates the input and needs the whole array in memory, which the streaming version does not.'],
        ['How do you get a median of a stream in O(1) per operation?',
            'Two heaps. A max-heap holds the lower half, a min-heap the upper half, kept within one element of each other in size. Insert into the heap whose root faces the value, then rebalance by moving one root if the sizes drift. The median is then just the max of the low heap, or the mean of the two roots when the count is even. Both operations are O(log n); there is no comparison sort of the stream.'],
        ['When is a heap the wrong tool?',
            'Three common cases. You need ordered iteration or range queries — use a balanced BST or a B-tree. You need exact lookup — a heap cannot do better than O(n). Or the operations are mostly inserts with no extremum queries, in which case a plain unsorted array plus an occasional bulk sort is faster because it has no per-element maintenance cost.'],
    ]));

    container.appendChild(section);
}

// ── Graph ─────────────────────────────────────────────────────────────

const GRAPH_CODE = `from collections import deque

def bfs(graph, start):
    """Unweighted shortest path: returns {node: distance}."""
    dist = {start: 0}
    q = deque([start])                  # the queue IS the frontier
    while q:
        node = q.popleft()
        for nxt in graph[node]:
            if nxt not in dist:         # dist doubles as the visited set
                dist[nxt] = dist[node] + 1
                q.append(nxt)
    return dist

def dfs_iterative(graph, start):
    """Iterative DFS: stack replaces recursion, so a 1M-node path will not blow the call stack."""
    seen, stack = {start}, [start]
    while stack:
        node = stack.pop()
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)
                stack.append(nxt)       # mark on push, not on pop — else you push duplicates

def topological_sort(graph, indegree):
    """Kahn's algorithm: peel off nodes with indegree 0. Returns None if the graph has a cycle."""
    from collections import deque
    q = deque(n for n, d in indegree.items() if d == 0)
    order = []
    while q:
        node = q.popleft()
        order.append(node)
        for nxt in graph[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)
    return order if len(order) == len(indegree) else None   # short output means a cycle`;

export function renderGraph(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Graph'));

    section.appendChild(card('🧠 Core Idea', `
        <p>A graph is a set of vertices and edges. The two things that make graphs harder than trees
        are <strong>cycles</strong> (there is no root, so "visited" has to be explicit) and
        <strong>weights</strong> (a path's cost is no longer its length, so "shortest" needs a
        definition).</p>
        <p><strong>Brute-force baseline:</strong> representing the graph as an adjacency matrix and
        scanning row <em>i</em> to find the next frontier node costs O(V) per step, so a single
        source reaches every vertex in O(V&sup2;), and scanning all V rows per step costs O(V&sup2;),
        which is also what naive Dijkstra costs. Switching to an adjacency list makes "look at the
        neighbours" proportional to the degree, so traversal drops to O(V + E) — linear in the size
        of the graph itself. For a sparse graph with E = O(V) that is the difference between
        quadratic and linear.</p>
    `, { id: 'dsa-graph-core' }));

    section.appendChild(tableCard('📊 Adjacency List vs Adjacency Matrix', ['Dimension', 'Adjacency list', 'Adjacency matrix'], [
        ['Space', 'O(V + E) — one entry per edge', 'O(V&sup2;) regardless of E, which is pure waste for a sparse graph'],
        ['Is A connected to B?', 'O(degree of A) — walk A\'s neighbours', 'O(1) direct index'],
        ['List all neighbours of A', 'O(degree of A)', 'O(V) — you must scan the whole row'],
        ['Add an edge', 'O(1) append', 'O(1) set a bit'],
        ['Add a vertex', 'O(1)', 'O(V&sup2;) — reallocate the whole table'],
        ['Cache behaviour', 'excellent — the neighbour list is contiguous', 'a row is contiguous, but you read V of it to find k edges'],
        ['When it wins', 'traversal, BFS/DFS, Dijkstra, anything that walks edges — the default', 'dense graphs, or algorithms that ask the same reachability question many times: Floyd-Warshall, transitive closure, bitset-based neighbour sets'],
        ['Hidden constant', 'pointer chasing across many small arrays', '2 cache misses per row access, but perfectly predictable stride'],
    ]));

    section.appendChild(card('🌊 BFS vs DFS — What the Frontier Looks Like', `
        <p>Both traverse the same graph and both reach every reachable vertex. They differ in
        <em>what order</em>, and that single difference decides which problems they can solve.
        BFS keeps a queue, so it explores by <strong>distance</strong> — the first time it reaches a
        node is via a shortest path, which makes it the only correct choice for unweighted shortest
        path and for level-order or min-depth answers. DFS keeps a stack, so it commits to one branch
        as deep as it can go, which makes it the right tool for cycle detection, topological order,
        connected components, and anything where the answer is a <em>property of the whole
        traversal</em> rather than of any individual path.</p>
        <p>Practical note: in a graph with V vertices and E edges, both are O(V + E) — the choice is
        never about speed, only about which answer you get.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    S["Start at A"] --> Q{"Which frontier<br/>discipline?"}
    Q -->|"FIFO queue"| BFSD["BFS<br/>expands in distance order<br/>first arrival = shortest path"]
    Q -->|"LIFO stack"| DFSD["DFS<br/>dives down one branch<br/>recursion depth up to V"]
    BFSD --> B1["Level 0: A<br/>level 1: B, C<br/>level 2: D, E<br/>level 3: F"]
    BFSD --> BUSE["Unweighted shortest path, min depth,<br/>level order, fewest hops, bipartite check"]
    DFSD --> D1["Order: A, B, D, C, E, F"]
    DFSD --> DUSE["Cycle detection, topological sort,<br/>components, Euler/Hamiltonian search"]
`, 'Same graph, same O(V + E) cost — the frontier discipline is what selects the answer'));

    section.appendChild(card('🎬 Worked Trace — BFS and DFS on one graph', `
        <p>Graph with edges A&ndash;B, A&ndash;C, B&ndash;D, C&ndash;D, C&ndash;E, D&ndash;F, E&ndash;F.
        Start at A.</p>
        <table class="complexity-table">
            <tr><th>Step</th><th>BFS frontier (queue)</th><th>Newly discovered</th><th>Distance</th></tr>
            <tr><td>0</td><td><code>[A]</code></td><td>A</td><td>A = 0</td></tr>
            <tr><td>1</td><td><code>[B, C]</code></td><td>B, C</td><td>B = 1, C = 1</td></tr>
            <tr><td>2</td><td><code>[D, E]</code></td><td>D, E</td><td>D = 2, E = 2</td></tr>
            <tr><td>3</td><td><code>[F]</code></td><td>F</td><td>F = 3</td></tr>
            <tr><td colspan="4"><strong>DFS order (recursive, neighbours in adjacency order):</strong>
            A &rarr; B &rarr; D &rarr; C &rarr; E &rarr; F. Note D at depth 2 is expanded before C, and
            E&ndash;F is only reached from the far end of the tree — DFS distance from A is
            <em>not</em> the shortest distance.</td></tr>
        </table>
    `));

    section.appendChild(card('💻 Implementation', `
        <pre><code class="language-python">${GRAPH_CODE}</code></pre>
    `));

    section.appendChild(card('🧭 Which Shortest-Path Algorithm', `
        <p>Shortest path is not one algorithm, it is three, selected by the properties of the
        weights. Interviewers are testing whether you ask about negative edges before you write code.</p>
    `));
    section.appendChild(tableCard('Pick by weight and graph size', ['Algorithm', 'Weights', 'Time', 'Use when'], [
        ['BFS', 'all equal', 'O(V + E)', 'Unweighted: hops, grid moves, friend-of-a-friend distance, "fewest links"'],
        ['Dijkstra', 'non-negative', 'O((V + E) log V) with a heap, O(V&sup2;) with a plain array', 'Road networks, network routing (OSPF), shortest job schedule, any non-negative cost'],
        ['Bellman-Ford', 'may be negative', 'O(V &times; E)', 'You actually have a negative edge: currency arbitrage, gain/loss graphs, detecting a negative cycle'],
        ['Floyd-Warshall', 'any sign', 'O(V&sup3;)', 'V in the low hundreds and you want every pair, or you want to reconstruct paths, or you want transitive closure'],
        ['Topological DP', 'DAG only', 'O(V + E)', 'Compile order, course prerequisites, task dependencies with durations'],
        ['Union-Find', 'connectivity only, no paths', 'O(E &alpha;V))', 'Adding edges and asking whether two nodes are connected — Kruskal, redundant-connection removal, accounts/dsu-style grouping'],
    ]));

    section.appendChild(card('🎯 Dijkstra — the relaxation trace', `
        <p>Weighted graph: S&rarr;A = 1, S&rarr;B = 4, A&rarr;B = 2, A&rarr;C = 5, B&rarr;C = 1.
        Dijkstra always finalises the smallest tentative distance, and <em>finalising</em> a node is
        the irreversible step that is only sound because every edge weight is non-negative.</p>
        <table class="complexity-table">
            <tr><th>Popped</th><th>dist A</th><th>dist B</th><th>dist C</th><th>Relaxations performed</th></tr>
            <tr><td>init</td><td>&infin;</td><td>&infin;</td><td>&infin;</td><td>dist[S] = 0</td></tr>
            <tr><td>S (0)</td><td>1</td><td>4</td><td>&infin;</td><td>S&rarr;A gives 0 + 1 = 1; S&rarr;B gives 0 + 4 = 4</td></tr>
            <tr><td>A (1)</td><td>final</td><td>3</td><td>6</td><td>A&rarr;B gives 1 + 2 = 3, beats 4; A&rarr;C gives 1 + 5 = 6</td></tr>
            <tr><td>B (3)</td><td>final</td><td>final</td><td>4</td><td>B&rarr;C gives 3 + 1 = 4, beats 6</td></tr>
            <tr><td>C (4)</td><td>final</td><td>final</td><td>final</td><td>no outgoing edges needed</td></tr>
        </table>
        <p><strong>Why negative weights break it:</strong> if B&rarr;C were &minus;5 instead of +1,
        C would be settled at 6, then discovering the &minus;5 would imply a cheaper path
        <em>backwards</em> in the order you already committed. Bellman-Ford fixes this by relaxing
        every edge V &minus; 1 times and looking for a V-th possible improvement, which is also how it
        detects a negative cycle.</p>
    `, { id: 'dsa-graph-dijkstra' }));

    section.appendChild(card('🕸️ Cycle Detection, Union-Find, and Topological Sort', `
        <p>These three share one setup step: <strong>indegree</strong> for directed graphs, or a
        union-find partition for undirected ones. Getting that preprocessing right is most of the
        problem.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    Q{"What question are you<br/>actually asking?"}
    Q -->|"Is there a cycle?"| DFS["DFS with colours<br/>white, grey on stack, black done<br/>an edge into grey means a cycle"]
    Q -->|"Are these two nodes<br/>connected?"| UF["Union-Find with path compression<br/>and union by rank<br/>O alpha of V, effectively constant"]
    Q -->|"What order must<br/>things happen in?"| TOPO["Topological sort<br/>needs a DAG<br/>Kahn indegree peel, or DFS post-order"]
    Q -->|"Cheapest route<br/>between two nodes?"| DIJ["Dijkstra, non-negative weights<br/>Bellman-Ford if any edge is negative"]
    Q -->|"Every pair of<br/>distances?"| FW["Floyd-Warshall<br/>O of V cubed,<br/>V in the low hundreds"]
`, 'One graph, five questions — each maps to exactly one algorithm'));

    section.appendChild(card('⚠️ Pitfalls', `
        <ul>
            <li><strong>Marking visited on pop, not on push</strong>, in iterative DFS. A node with
            three undiscovered parents gets pushed three times and expanded three times: exponential
            blow-up on a dense-ish graph, and the classic cause of "my DFS is slow".</li>
            <li><strong>Recursion depth on DFS.</strong> The call stack is O(V) deep on a path graph;
            100,000 vertices overflows it. Use an explicit stack, or raise the limit knowingly.</li>
            <li><strong>Self-loops and parallel edges.</strong> A self-loop is a cycle in every sense.
            Parallel edges break naive cycle detection on an undirected graph, because the edge back
            to the parent is not a cycle — you must compare edge identity, not endpoints.</li>
            <li><strong>Reusing the parent array for the visited set in Dijkstra.</strong> Once a node
            is settled it must never be relaxed again; the code reads more cleanly if you skip
            settled nodes explicitly.</li>
            <li><strong>Assuming the graph is connected.</strong> BFS from one source reaches only its
            component; to cover the graph, loop over all unvisited vertices and restart.</li>
            <li><strong>Non-contiguous input.</strong> Adjacency lists must be built from edge tuples
            first, and for a graph larger than RAM you need an on-disk edge list (CSR format) —
            building an in-memory adjacency list is the step that will not fit.</li>
        </ul>
    `));

    section.appendChild(card('🔥 Real-World Usage', `
        <ul>
            <li><strong>Dependency and build systems</strong> — topological sort is the build order;
            cycle detection is what reports a circular dependency instead of looping forever.</li>
            <li><strong>Service maps and blast radius</strong> — union-find and BFS answer "which
            services does this deploy reach?" and "what breaks if this one dies?".</li>
            <li><strong>Linked data</strong> — social graphs, co-purchase recommendations, fraud rings:
            strongly connected components and BFS over a user's neighbourhood.</li>
            <li><strong>Networking</strong> — OSPF is Dijkstra over an adjacency list; traceroute is
            BFS on hop count; BGP path vectors are Bellman-Ford with negative-flavoured policies.</li>
            <li><strong>Route planning and logistics</strong> — Dijkstra over a road graph; BFS for
            "fewest transfers" in transit networks.</li>
            <li><strong>Databases</strong> — query planners represent joins as hypergraphs and pick
            join order with DP over subtrees, not graph search.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['Adjacency list or adjacency matrix — how do you decide?',
            'List by default. It is O(V + E) space, so it is the only option for a sparse graph, and every traversal algorithm reads a neighbour list contiguously. Matrix when the graph is genuinely dense (E close to V&sup2;) or when you ask the same reachability question over and over: Floyd-Warshall, transitive closure, or a bitset adjacency set where a row is one machine word per 64 neighbours.'],
        ['How do you detect a cycle, directed and undirected?',
            'Directed: DFS with three colours. White is unvisited, grey is on the current stack, black is finished. An edge pointing at a grey node closes a cycle. Undirected: colour the start, and during DFS skip only the exact edge you arrived on, not the parent vertex — otherwise a triangle is misreported as a cycle. If parallel edges exist you must compare edge identity.'],
        ['Why is Dijkstra wrong with negative weights, in one sentence?',
            'Because it finalises the minimum-distance vertex permanently, and a negative edge can later produce a cheaper path to a vertex that was already finalised. Example: S&rarr;A = 1, S&rarr;B = 4, A&rarr;C = 1, C&rarr;B = &minus;8. Dijkstra settles B at 4, but the true shortest B path is S&rarr;A&rarr;C&rarr;B = &minus;6. Bellman-Ford handles it by relaxing every edge V &minus; 1 times and checking whether a V-th relaxation is still possible, which doubles as negative-cycle detection.'],
        ['Dijkstra versus Bellman-Ford: what do you actually say in an interview?',
            'Both need me to know whether weights can be negative — so I ask that first, then say the time. Heap Dijkstra is O(E log V) and is the production answer for routing and road networks. Bellman-Ford is O(V &times; E) and buys negative-weight support and cycle detection. If the graph is a DAG, I skip both and run a topological-order DP, which is O(V + E) and handles negative weights for free.'],
        ['How do you build a shortest path in an unweighted graph with unequal edge costs?',
            'You do not use BFS — that would minimise hop count, not cost. Either make the costs uniform by expanding expensive edges into unit-cost dummy edges, or accept that the question is really "fewest hops". The distinction is worth stating explicitly in an interview because BFS returning the wrong answer to a cost question is a classic mistake.'],
        ['When is union-find better than BFS for connectivity?',
            'When edges arrive and queries are only "are these two in the same set?". Union-find is O(alpha(V)) per operation, effectively constant, with no adjacency storage at all, and it does not need the graph to be connected or traversable — so it wins on memory and on streaming input. BFS wins when you also need to enumerate members, distances, or paths.'],
    ]));

    container.appendChild(section);
}

// ── Backtracking ──────────────────────────────────────────────────────

const BACKTRACK_CODE = `def backtrack(path, choices):
    if is_valid_solution(path):
        result.append(path[:])     # COPY, not a reference to the live list
        return
    for c in choices:
        if not is_safe(path, c):    # constraint check BEFORE mutating
            continue
        path.append(c)              # 1. make the choice  (mutate)
        backtrack(path, ...)        # 2. recurse
        path.pop()                  # 3. undo the choice  (restore)

# ---- N-Queens, with the pruning that makes n=8 finish instantly -------
def solve_n_queens(n):
    queens = []                     # one column index per row

    def safe(col, row):
        for r, c in enumerate(queens):
            if c == col:            return False   # same column
            if r - c == row - col:  return False   # main diagonal
            if r + c == row + col:  return False   # anti diagonal
        return True

    def place(row):
        if row == n:
            return list(queens)     # a fresh list: later pops must not corrupt it
        for col in range(n):
            if safe(col, row):
                queens.append(col)
                place(row + 1)      # branch
                queens.pop()        # undo — restores the caller's state exactly
        return None
    return place(0)

# ---- Symmetry pruning: halve the search by fixing row 0 to a
#      column and only mirroring when the column is off-centre.
#      A solution with queen[0] == c reflects to one with queen[0] == n - 1 - c.
#      That single symmetry cut takes n-Queens from ~15M nodes to a few thousand.`;

export function renderBacktracking(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Backtracking'));

    section.appendChild(card('🧠 Core Idea', `
        <p>Backtracking is DFS over a <strong>decision tree</strong> that is too large to build up
        front. The tree only exists implicitly: you materialise one level by making a choice, you
        cut a whole subtree by rejecting an illegal choice, and you climb back by undoing your
        mutation. Unlike graph DFS, there is no <code>visited</code> set — the state is the path,
        and every branch is legitimately a fresh state.</p>
        <p><strong>Brute-force baseline:</strong> enumerating all subsets of an n-element set by
        checking all 2<sup>n</sup> subsets against an O(n) validity test is O(n&nbsp;&middot;&nbsp;2<sup>n</sup>).
        Backtracking gets the same worst case — some instance genuinely needs every subset — but
        the branching factor drops from n to the number of <em>legal</em> choices at each level, so
        the tree is pruned to the subtrees that can still reach a solution. That ratio, explored /
        total, is the only thing that separates a fast backtracker from a timeout.</p>
        <p>It is the algorithm for constraint satisfaction: choose, constrain, recurse, undo. The
        moment a problem has a "valid combination" or "all arrangements" in its statement, it is
        a backtracking problem until proven otherwise.</p>
    `, { id: 'dsa-backtrack-core' }));

    section.appendChild(card('🌳 The Four-Step Loop', `
        <p>Every backtracking function has the same skeleton, and the invariant is that
        <strong>state on entry to a call equals state on exit from that call</strong>. Break that and
        results silently depend on traversal order.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    CALL["Enter level k with<br/>path = partial solution"] --> BASE{"Is the path<br/>a full solution?"}
    BASE -->|"yes"| SAVE["Record a COPY of the path"]
    BASE -->|"no"| LOOP["For each candidate choice"]
    LOOP --> SAFE{"Is this choice<br/>consistent with all<br/>constraints so far?"}
    SAFE -->|"no"| SKIP["Skip — the entire subtree<br/>below this choice is unreachable"]
    SAFE -->|"yes"| PUSH["1. CHOOSE<br/>mutate the state"]
    PUSH --> REC["2. RECURSE<br/>one level deeper"]
    REC --> POP["3. UNDO<br/>restore the exact prior state"]
    POP --> LOOP
    POP --> RET["Return with state<br/>identical to on entry"]
`, 'Pruning at SAFE is what separates backtracking from a timeout'));

    section.appendChild(card('🎬 Worked Trace — subsets of {1, 2, 3}', `
        <p>Find every subset. The tree has one level per element; the constraint is simply that an
        element may be chosen at most once, enforced by iterating from <code>start</code> rather
        than from 0.</p>
        <table class="complexity-table">
            <tr><th>Depth</th><th>Path</th><th>Choices offered</th><th>Solutions emitted</th></tr>
            <tr><td>0</td><td><code>[]</code></td><td>1, 2, 3</td><td>&mdash;</td></tr>
            <tr><td>1</td><td><code>[1]</code></td><td>2, 3</td><td>&mdash;</td></tr>
            <tr><td>2</td><td><code>[1,2]</code></td><td>3</td><td><code>[1,2,3]</code></td></tr>
            <tr><td>2</td><td><code>[1,3]</code></td><td>none (start is past the end)</td><td><code>[1,3]</code></td></tr>
            <tr><td>1</td><td><code>[2]</code></td><td>3</td><td><code>[2,3]</code></td></tr>
            <tr><td>1</td><td><code>[3]</code></td><td>none</td><td><code>[3]</code></td></tr>
            <tr><td>0</td><td><code>[]</code></td><td>&mdash;</td><td><code>[]</code> the empty set</td></tr>
            <tr><td colspan="4"><strong>8 solutions, 15 nodes visited</strong> — 2<sup>3</sup> = 8 leaves,
            and 1 + 2 + 4 + 8 = 15 nodes. The empty set is a solution; forgetting to emit it is a
            common off-by-one.</td></tr>
        </table>
    `, { id: 'dsa-backtrack-trace' }));

    section.appendChild(card('💻 Implementation', `
        <pre><code class="language-python">${BACKTRACK_CODE}</code></pre>
    `));

    section.appendChild(card('🎯 N-Queens: how pruning does the real work', `
        <p>Naive N-Queens with no pruning visits roughly 15 million nodes at n = 8. Three cheap
        prunings cut that to a few thousand:</p>
        <table class="complexity-table">
            <tr><th>Pruning</th><th>What it removes</th><th>Effect at n = 8</th></tr>
            <tr><td>Row-by-row construction</td><td>Never place two queens in a row — the search space shrinks from 8<sup>8</sup> arrangements to one-per-row</td><td>15M &rarr; 2057 nodes</td></tr>
            <tr><td>Column + diagonal check on placement</td><td>Every subtree containing a conflict</td><td>2057 &rarr; 92 nodes</td></tr>
            <tr><td>Row-0 symmetry (mirror)</td><td>Half the tree: any solution with queen[0] = c mirrors to queen[0] = n &minus; 1 &minus; c, so only one half needs searching</td><td>92 &rarr; ~46 nodes</td></tr>
        </table>
        <p>The general lesson: <strong>prune as early as possible, and check the cheapest constraint
        first</strong>. Column conflicts are one integer compare; diagonals are O(n) per check. Testing
        the cheap constraint first and only then the expensive one is worth several times the node
        count.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart LR
    R0["Row 0<br/>try col 0"] --> R1["Row 1<br/>4 legal columns after the column and diagonal checks"]
    R1 --> R2["Row 2<br/>fewer still — both diagonals now constrain"]
    R2 --> R3["Row 3<br/>1 or 0 legal columns"]
    R3 -->|"0 legal"| PRUNE["Backtrack immediately<br/>this row never gets a queen"]
    R3 -->|"1 legal"| NEXT["Place and recurse"]
    R1 -.->|"undo on return"| R0
    R2 -.->|"undo on return"| R1
    R3 -.->|"undo on return"| R2
`, 'Each row\'s legal columns shrink, so the constraint check replaces brute force'));

    section.appendChild(card('🧠 Memoization — and Its Exact Precondition', `
        <p>Backtracking has exponential time because it re-derives the same state many times. Adding a
        memo over the state collapses it — but only when two facts hold:</p>
        <ul>
            <li><strong>The state is hashable</strong>: everything that determines the set of
            continuations is in the key. For N-Queens that is the bitmask of occupied columns; for
            word break it is the index; for a grid it is (row, col, blocked-set) — but only if the
            blocked set is in the key, not just (row, col).</li>
            <li><strong>You only need the value, not every path.</strong> "Can this be completed?"
            is memoizable. "List every path" is not, unless the paths themselves are the state —
            and then you have not reduced the problem, you have paid for a hash map to store an
            exponential set.</li>
        </ul>
        <p>The classical failure is memoizing on the path when the path has duplicates and only the
        <em>set</em> matters: N-Queens explodes faster with a full-path memo than without one. The
        fix is to memoize on the compressed state (bitmask of columns), not on the board array.</p>
    `));

    section.appendChild(card('⚠️ Pitfalls', `
        <ul>
            <li><strong>Storing a reference instead of a copy.</strong>
            <code>result.append(path)</code> records a live list that the loop then mutates and pops,
            so every "solution" ends up equal to the last one. Push <code>path[:]</code> or
            <code>list(path)</code>.</li>
            <li><strong>Mutating while iterating.</strong> If the loop iterates over the same list the
            recursion mutates, removing elements during the walk skips entries or raises
            <code>RuntimeError</code>. Snapshot first: <code>for c in list(board):</code>.</li>
            <li><strong>Missing the undo.</strong> Any mutation must have a matching restore on
            every exit path, including the early return on success. The robust pattern is to mutate
            before the recursive call and pop immediately after it, never inside an
            <code>if</code> that can be skipped.</li>
            <li><strong>Reusing a shared board across levels without a count.</strong> Placing and
            unplacing a cell must be exactly symmetric — set on entry, unset on exit, no exceptions
            in between, or a stale marker survives to corrupt a later branch.</li>
            <li><strong>Integer overflow in bitmask tricks.</strong> A 64-bit column mask silently
            truncates for n &gt; 64 boards, and <code>1 &lt;&lt; 63</code> is negative in JS while
            positive in Python. Above 64 columns, use Python (arbitrary precision) or a
            <code>bool[]</code> plus explicit bounds checks.</li>
            <li><strong>Non-contiguous input.</strong> Backtracking assumes the choices are a bounded,
            enumerable set at each level. If candidates come from an unsorted, deduplicated-needed
            source, sort and dedupe first — otherwise the same subset is explored once per ordering.</li>
            <li><strong>Off-by-one on the base case.</strong> <code>if len(path) == n</code> rather than
            <code>&gt;=</code>, and handle n = 0 explicitly: some formulations emit the empty solution,
            others must not, and the two conventions are indistinguishable until a test hits it.</li>
        </ul>
    `));

    section.appendChild(card('⏱️ Complexity, and What Actually Bounds It', ['Variant', 'Time', 'Notes'] as unknown as Node, [
        ['All subsets / combinations, no constraint', 'O(2<sup>n</sup>) leaves, O(2<sup>n</sup>) nodes total', 'Unavoidable: the output itself is 2<sup>n</sup> solutions'],
        ['Permutations', 'O(n &times; n!)', 'Swap-based generation avoids re-copying at each level'],
        ['Subsets with duplicates', 'O(2<sup>n</sup>) worst case', 'Skipping equal values at the same depth collapses duplicates; degrades on all-identical input without that skip'],
        ['N-Queens n = 8', 'O(n!) naive, ~46 nodes after symmetry', 'The bound does not improve — only the pruning constant does'],
        ['Memoized decision problem', 'O(states &times; choices)', 'Replaces exponential time with an exponential <em>state space</em> that is usually far smaller than the tree'],
        ['Enumerating paths (no memo)', 'exponential output, no improvement possible', 'If the caller needs every path, DP cannot help'],
        ['Space', 'O(depth) for the path, plus O(solutions) if you collect them', 'An unbounded result set is the real limit — 8-queens has 92, 12-queens has 14200, 14-queens has 365596'],
    ] as unknown as Parameters<typeof card>[2]));

    section.appendChild(card('🔥 Real-World Usage', `
        <ul>
            <li><strong>Constraint solvers</strong> — Sudoku, crosswords, and the general CSP solvers
            behind product configurators (choose finish, size, and rules; get only combinations that
            are manufacturable).</li>
            <li><strong>Scheduling</strong> — the traveller-salesperson variants and crew scheduling,
            where any exact solution is a heuristic search with pruning.</li>
            <li><strong>Regex engines</strong> — backtracking matchers walk the decision tree of
            alternations and quantifiers, and the classic exponential-blowup (ReDoS) is precisely an
            unpruned backtracker.</li>
            <li><strong>Compilers</strong> — peephole and register allocation search, and
            combinatorial AST expansion of macros.</li>
            <li><strong>Board and puzzle games</strong> — chess move generation, minesweeper, Wordle's
            consistent-hint solvers.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['How is backtracking different from plain DFS?',
            'Same traversal, different graph. DFS walks an existing graph with a visited set; backtracking walks a decision tree that only exists because you build it, so "visited" is meaningless and the state must be explicitly undone on the way out. If a problem is phrased as "find all arrangements that satisfy these constraints", it is backtracking; if it is "given this graph, reach X", it is DFS.'],
        ['N-Queens looks exponential. Is it polynomial?',
            'No, and saying otherwise is the mistake. It is O(n!) worst case even after pruning; the bitmask version has an exponential state space of about 2^n and is usually faster in practice. What makes n = 8 and n = 20 solvable is the symmetry and diagonal pruning shrinking the constant by four orders of magnitude, not an asymptotic improvement.'],
        ['When is memoization valid in backtracking, and when is it harmful?',
            'Valid when two visits to the same state have identical continuations and you need only the outcome — then it turns exponential time into O(states &times; choices). Harmful when you need every path, because you store an exponential set of paths instead of an exponential set of nodes; and it is actively a bug when the memo key includes more than the state that matters, such as the full board path rather than the column bitmask, which can make it slower than no memo at all.'],
        ['The classic "generate combinations" bug — what is it?',
            'Passing an index down and iterating from there, so each subset is generated exactly once and in sorted order. The buggy version iterates from 0 at every level, producing {1,2} and {2,1} and every other permutation of the same subset — 2^n times too much work. On an array with duplicates you additionally skip values equal to the previous one at the same depth, which is what keeps an all-duplicates input at n unique choices instead of 2^n.'],
        ['How do you prune effectively in a generic constraint problem?',
            'Three techniques in order of value: check the cheapest constraint first and return early; order the candidate list by how likely it is to succeed so a solution is found early if you only need one; and add forward checking — after each placement, remove candidates that are now impossible, which prunes the frontier before it is ever explored. Symmetry breaking (N-Queens row 0, sudoku digit order) is the fourth and is often the biggest single win.'],
        ['Why does a regex engine blow up exponentially?',
            'Because a backtracking matcher explores every way to satisfy a nested quantifier. A pattern like (a+)+b against a long run of a with no trailing b makes the engine try every possible split of the run before failing — the decision tree is O(2^n) on the length of the run. The fixes are all constraint-based: make the inner quantifier possessive, nest the ambiguity out of the pattern, or — the real one — switch to a non-backtracking automaton (DFA or Thompson NFA), which is linear and is what RE2 does instead of PCRE.'],
    ]));

    container.appendChild(section);
}