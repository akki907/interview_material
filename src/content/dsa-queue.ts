// src/content/dsa-queue.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-queue",
    title: "Queue",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html: "FIFO. Use for BFS, level-order traversal, rate limiting.",
        },
        {
            kind: "card",
            title: "🧠 Core idea and the invariant",
            html:
                `
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
    `,
        },
        {
            kind: "card",
            title: "🔁 The circular buffer: why tail wraps",
            html:
                `
        <p>A ring buffer is a fixed array plus two indices. <code>head</code> marks the front element,
        <code>tail</code> marks the next free slot, and both are taken modulo the capacity so they wrap
        around instead of running off the end. Nothing is ever copied or renumbered, so every operation
        is a single array write and a single index update.</p>
        <p>Worked example: capacity 5, enqueue A, B, C, D, E, dequeue one, then enqueue F.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "After the wrap the buffer holds F B C D E and the FIFO order B C D E F is unchanged",
            source:
                `
flowchart LR
    P0["slot 0<br/>holds F, the oldest"] --> P1["slot 1<br/>holds B, the front, this is head"]
    P1 --> P2["slot 2<br/>holds C"] --> P3["slot 3<br/>holds D"] --> P4["slot 4<br/>holds E, the newest"]
    P4 -->|"tail goes from 5 to 5 mod 5 = 0, so it reuses slot 0"| P0
    H["head = 1<br/>the next dequeue reads slot 1"] --> P1
    T["tail = 1, the next enqueue writes slot 1<br/>head equals tail here, and the size counter says 5,<br/>which is how full is encoded"] --> P1
`,
        },
        {
            kind: "table",
            title: "🔍 Worked trace — capacity 5, tail = head + size mod 5",
            headers:
                                    [
                        "Step",
                        "Operation",
                        "Slot touched",
                        "head",
                        "tail",
                        "size",
                        "Buffer, slots 0 to 4",
                    ],
            rows:
                                    [
                        [
                            "0",
                            "initial",
                            "&mdash;",
                            "0",
                            "0",
                            "0",
                            "&ndash; &ndash; &ndash; &ndash; &ndash;",
                        ],
                        [
                            "1",
                            "enqueue A",
                            "write slot 0",
                            "0",
                            "1",
                            "1",
                            "A &ndash; &ndash; &ndash; &ndash; &ndash;",
                        ],
                        [
                            "2",
                            "enqueue B",
                            "write slot 1",
                            "0",
                            "2",
                            "2",
                            "A B &ndash; &ndash; &ndash;",
                        ],
                        [
                            "3",
                            "enqueue C",
                            "write slot 2",
                            "0",
                            "3",
                            "3",
                            "A B C &ndash; &ndash;",
                        ],
                        [
                            "4",
                            "enqueue D",
                            "write slot 3",
                            "0",
                            "4",
                            "4",
                            "A B C D &ndash;",
                        ],
                        [
                            "5",
                            "enqueue E",
                            "write slot 4, tail wraps to 0",
                            "0",
                            "0",
                            "5",
                            "A B C D E &nbsp;<b>full</b>",
                        ],
                        [
                            "6",
                            "dequeue, returns A",
                            "read slot 0",
                            "1",
                            "0",
                            "4",
                            "A B C D E, slot 0 is now free",
                        ],
                        [
                            "7",
                            "enqueue F",
                            "write slot 0, the wrap",
                            "1",
                            "1",
                            "5",
                            "F B C D E &nbsp;<b>full</b>, FIFO order B C D E F",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "💻 Implementation: annotated",
            html:
                `
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
    `,
        },
        {
            kind: "table",
            title: "📚 Deque operations side by side",
            headers:
                                    [
                        "Operation",
                        "JS array",
                        "Ring buffer of capacity n",
                        "Doubly linked list",
                    ],
            rows:
                                    [
                        [
                            "insert at back",
                            "O(1) amortized",
                            "O(1)",
                            "O(1)",
                        ],
                        [
                            "remove from back",
                            "O(1)",
                            "O(1)",
                            "O(1)",
                        ],
                        [
                            "insert at front",
                            "O(n), <code>unshift</code> reindexes",
                            "O(1)",
                            "O(1)",
                        ],
                        [
                            "remove from front",
                            "O(n), <code>shift</code> reindexes",
                            "O(1)",
                            "O(1)",
                        ],
                        [
                            "peek at either end",
                            "O(1)",
                            "O(1)",
                            "O(1)",
                        ],
                        [
                            "read at index i",
                            "O(1)",
                            "O(1)",
                            "O(n)",
                        ],
                        [
                            "insert at index i",
                            "O(n)",
                            "O(n) after locating",
                            "O(n) after locating",
                        ],
                        [
                            "Memory",
                            "up to 2&times; the length, to allow doubling",
                            "exactly n slots, contiguous, cache friendly",
                            "one allocation per node, poor locality",
                        ],
                        [
                            "Growth",
                            "automatic",
                            "fixed; \"full\" is a real state you must handle",
                            "automatic, node by node",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🌊 BFS, and why the queue is the proof",
            html:
                `
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
    `,
        },
        {
            kind: "card",
            title: "🔒 Thread-safe and bounded queues",
            html:
                `
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
    `,
        },
        {
            kind: "diagram",
            caption: "A condition variable is what turns a full or empty queue from data loss into waiting",
            source:
                `
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
`,
        },
        {
            kind: "table",
            title: "⏱️ Complexity, and where the bound degrades",
            headers: ["Operation / algorithm", "Time", "Space", "Worst case that hurts"],
            rows:
                                    [
                        [
                            "<code>enqueue</code> / <code>dequeue</code> on a ring buffer",
                            "O(1)",
                            "O(1) fixed",
                            "None — the buffer never reallocates, so no GC spike mid-traffic",
                        ],
                        [
                            "<code>enqueue</code> with doubling growth",
                            "O(1) amortized",
                            "O(n)",
                            "The one O(n) copy per doubling: a latency spike on the size just past a power of two",
                        ],
                        [
                            "<code>array.shift()</code> in JavaScript",
                            "O(n)",
                            "O(1)",
                            "Every dequeue renumbers the tail of the array; n dequeues is O(n<sup>2</sup>)",
                        ],
                        [
                            "BFS on a graph",
                            "O(V + E)",
                            "O(V) worst",
                            "A near-complete graph has a frontier of &Theta;(V); a long thin graph has a frontier of 1 — same code, wildly different memory",
                        ],
                        [
                            "Level-order tree traversal",
                            "O(n)",
                            "O(w), w is the widest level",
                            "A complete binary tree keeps w &asymp; n/2 nodes queued; a balanced n = 10<sup>6</sup> tree is fine, a linked-list-shaped tree is not",
                        ],
                        [
                            "Task queue with a bound",
                            "O(1) per op",
                            "O(bound)",
                            "A full queue must block, reject or drop — picking none of the three is the actual bug",
                        ],
                        [
                            "Priority queue (binary heap) in place of FIFO",
                            "O(log n)",
                            "O(n)",
                            "Strictly more expensive than a queue: only worth it when tasks carry different weights",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🚫 When NOT to use a queue",
            html:
                `
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
    `,
        },
        {
            kind: "code",
            title: "💻 Code Example",
            language: "javascript",
            code:
                `// Deque (double-ended queue)
const dq = [];
dq.push(1);  // enqueue
dq.shift();  // dequeue
dq.unshift(0); // prepend
dq.pop();    // remove last`,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls",
            html:
                `
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
    `,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Why does BFS need a queue while DFS uses a stack?",
                    a: "Because BFS claims an ordering property: a FIFO queue keeps the frontier sorted by distance from the source, so the first time a node is dequeued its shortest distance is known. A stack does not preserve that order — it visits in depth-first order, so you would have to expand every node at depth d before looking at depth d+1. Same graph, same data, exponentially more work.",
                },
                {
                    q: "Array-backed or linked-list-backed queue?",
                    a: "Array-backed if you can tolerate a fixed capacity or amortized growth: it is cache-friendly, allocation-free at steady state, and simple. Linked-list if elements must be enqueued and dequeued indefinitely without ever paying a resize, or if you need O(1) insertion at both ends without a size counter. In practice the ring buffer wins both — it is the array-backed version with the head pointer built in.",
                },
                {
                    q: "How do you tell an empty ring buffer from a full one?",
                    a: "Carry an explicit size counter; head equals tail then unambiguously means one or the other based on size. The alternative is to permanently sacrifice one slot so that full is head equals tail minus one and empty is head equals tail, at the cost of one slot and a harder-to-read full check. Both are fine — the mistake is having head and tail with no size and no comment about which state you are in.",
                },
                {
                    q: "How do you make a queue safe for multiple producers and consumers?",
                    a: "Protect every compound operation with a mutex: a check-then-act like \"if not full then write\" is two steps and both threads can pass the check. For an array-backed queue the buffer itself, plus head, tail and size, must all be under the same lock; locking only the counters is not enough. Then bound the queue, or producers will outrun consumers and grow it until the process dies.",
                },
                {
                    q: "Why is an unbounded queue dangerous in production?",
                    a: "It converts a temporary slowdown into a permanent failure. If arrivals exceed the service rate, the queue grows without limit; latency becomes unbounded, the process hits its memory ceiling and is OOM-killed, and in-flight work is lost even though every enqueue technically succeeded. A bound plus an explicit full policy — block, reject, drop or spill to disk — converts a silent outage into bounded, alertable behaviour.",
                },
                {
                    q: "When is a queue the wrong data structure?",
                    a: "When you need random access by index, when the answer is the most recent item rather than the oldest, when items must be ordered by key rather than arrival, or when the workload is small enough that node allocation dominates the runtime. A queue answers exactly one question well: what arrived next.",
                },
            ],
        },
        {
            kind: "card",
            title: "🏭 Real-world usage",
            html:
                `
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
    `,
        },
    ],
});
