// src/content/dsa-linked-list.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-linked-list",
    title: "Linked List",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html: "Nodes with pointers. Fast/slow pointer for cycle detection. Reverse in-place.",
        },
        {
            kind: "card",
            title: "Common Patterns",
            html: "Cycle detection (Floyd's algorithm), reverse linked list, merge two sorted lists, skip N from end.",
        },
        {
            kind: "card",
            title: "Core idea and the invariant",
            html: `
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
    `,
        },
        {
            kind: "card",
            title: "Pointer rewiring: reversal, step by step",
            html: `
        <p>Reversal looks impossible at first — overwriting <code>next</code> destroys the only way to
        reach the rest of the list. The fix is to remember where you were going <em>before</em> you
        change anything. Three pointers, one pass, no allocation, no recursion.</p>
        <p><strong>The invariant that makes it correct:</strong>
        <b><code>prev</code> is always the reversed prefix of the original list, <code>cur</code> is
        the first node of the untouched suffix, and <code>nxt</code> is the saved link from
        <code>cur</code> to that suffix.</b> At the loop's head, the list is exactly the two disjoint
        chains <code>prev</code> and <code>cur</code> &rarr; ... — no node is reachable twice and none
        is lost.</p>
    `,
        },
        {
            kind: "diagram",
            caption:
                "Each step rewires exactly one next pointer; the untouched suffix is kept alive by nxt alone",
            source: `
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
`,
        },
        {
            kind: "table",
            title: "Worked trace — reverse 1 to 2 to 3 to 4",
            headers: [
                "Step",
                "prev",
                "cur",
                "nxt saved",
                "Action",
                "State afterwards",
            ],
            rows: [
                [
                    "0",
                    "&mdash;",
                    "1",
                    "&mdash;",
                    "take the head as cur",
                    "1 &rarr; 2 &rarr; 3 &rarr; 4 &rarr; null",
                ],
                [
                    "1",
                    "null",
                    "1",
                    "2",
                    "1.next = null, then prev = 1, cur = 2",
                    "prev: 1 &nbsp;|&nbsp; untouched: 2 &rarr; 3 &rarr; 4",
                ],
                [
                    "2",
                    "1",
                    "2",
                    "3",
                    "2.next = 1, then prev = 2, cur = 3",
                    "prev: 2 &rarr; 1 &nbsp;|&nbsp; untouched: 3 &rarr; 4",
                ],
                [
                    "3",
                    "2",
                    "3",
                    "4",
                    "3.next = 2, then prev = 3, cur = 4",
                    "prev: 3 &rarr; 2 &rarr; 1 &nbsp;|&nbsp; untouched: 4",
                ],
                [
                    "4",
                    "3",
                    "4",
                    "null",
                    "4.next = 3, then prev = 4, cur = null",
                    "prev: 4 &rarr; 3 &rarr; 2 &rarr; 1, cur is null so stop",
                ],
                [
                    "done",
                    "4",
                    "null",
                    "&mdash;",
                    "return prev",
                    "head is now 4 &rarr; 3 &rarr; 2 &rarr; 1 &rarr; null",
                ],
            ],
        },
        {
            kind: "card",
            title: "The dummy-node trick: deleting without case analysis",
            html: `
        <p>Deleting a node needs three cases — it is the head, it is the tail, it is in the middle — and
        the head case cannot even be handled by the person holding the node, because the head lives in a
        variable the function does not own. Every special case is a chance to be wrong.</p>
        <p>The dummy node removes the case analysis entirely: allocate one node, point its
        <code>next</code> at the current head, and make <code>cur</code> start there. The head is now
        an <em>interior</em> node, so "is it the head?" never arises — and the same loop deletes the
        first, a middle, and the last node without a single branch. The cost is one allocation you
        must also free, which is why the free list is the other classic use of dummy nodes.</p>
    `,
        },
        {
            kind: "diagram",
            caption:
                "Deleting the head, the tail and a middle node all reduce to cur.next = cur.next.next",
            source: `
flowchart TD
    START["Allocate a dummy whose next is the current head"] --> CUR["cur points at the dummy, not at a real node"]
    CUR --> CHECK{"cur.next is null?"}
    CHECK -->|"yes"| DONE["Return dummy.next<br/>the head is already correct, and deletion of the first node needed no special case"]
    CHECK -->|"no"| CMP{"cur.next.value is the target?"}
    CMP -->|"yes"| LINK["Bypass it: cur.next = target.next<br/>this single line is the deletion"]
    CMP -->|"no"| ADV["cur = cur.next"]
    ADV --> CHECK
    LINK --> CHECK
`,
        },
        {
            kind: "card",
            title: "Implementation: annotated",
            html: `
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
    `,
        },
        {
            kind: "table",
            title: "Complexity, and where the bound degrades",
            headers: [
                "Operation",
                "Array (dynamic)",
                "Singly linked list",
                "Doubly linked list",
            ],
            rows: [
                ["access element i", "O(1)", "O(n)", "O(n)"],
                [
                    "insert / delete at head",
                    "O(n), <code>unshift</code> and <code>splice</code> reindex",
                    "O(1)",
                    "O(1)",
                ],
                [
                    "insert / delete at tail",
                    "O(1) with a cached tail pointer",
                    "O(1) with a tail pointer, O(n) without",
                    "O(1) with a tail pointer",
                ],
                [
                    "insert after a node you hold",
                    "O(n), shifting",
                    "O(1)",
                    "O(1)",
                ],
                [
                    "delete a node you hold",
                    "O(n) to find it first",
                    "O(n), need the predecessor",
                    "<b>O(1)</b>, prev is right there",
                ],
                [
                    "reverse",
                    "O(n)",
                    "O(n) time, O(1) space",
                    "O(n) time, O(1) space",
                ],
                [
                    "cycle detection, Floyd",
                    "n/a",
                    "O(n) time, O(1) space",
                    "O(n) time, O(1) space",
                ],
                [
                    "cache behaviour",
                    "contiguous, one cache line per 8 to 16 elements",
                    "one cache miss per node, plus a dependent load per next",
                    "two pointers to maintain, 2&times; the misses",
                ],
                [
                    "Memory per element",
                    "4 to 8 bytes",
                    "value 8 + next 8 + header overhead",
                    "value 8 + next 8 + prev 8 + overhead",
                ],
            ],
        },
        {
            kind: "card",
            title: "Alternatives, and the skip list",
            html: `
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
    `,
        },
        {
            kind: "card",
            title: "Pitfalls",
            html: `
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
    `,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "When would you use a linked list instead of an array?",
                    a: "When you hold a reference to a node and want O(1) insertion or deletion there — an LRU cache list, a free list, a job queue with stable handles. Also when nodes arrive and leave at a rate you cannot predict and preallocation is wasteful, or when other components hold stable addresses. In pure algorithmic code, the array almost always wins because of cache locality and constant-factor overhead.",
                },
                {
                    q: "Explain Floyd cycle detection and why the 2x pointer is needed.",
                    a: "Put one pointer on the list and advance it one node per iteration, and a second that advances two. If the list has no cycle the fast pointer reaches the end in n/2 steps and the loop terminates. If it does have a cycle of length k, both pointers are inside the cycle after at most n steps, and the fast one gains exactly one node per iteration on the slow one, so they must meet within k iterations. It is O(1) space; the alternative, a hash set of seen nodes, is O(n) space and allocates.",
                },
                {
                    q: "What is the dummy node for, and when would you skip it?",
                    a: "It removes the head special case. Because the dummy stands in front of the head, the first real node becomes an interior node, so cur.next = cur.next.next deletes the head, a middle node and the tail with the same line of code. Skip it in APIs that must return a new head to the caller anyway, or when you already have the predecessor — the dummy is then pure allocation cost.",
                },
                {
                    q: "Why is merging two sorted lists the same difficulty as reversing one?",
                    a: "Both are one-pass pointer surgery with an invariant that the untouched remainder stays reachable. Reversal maintains a reversed prefix and an untouched suffix; merge maintains one output list and two untouched suffixes, picking from whichever head is smaller. Both are O(n) with O(1) extra space once you have the heads, and both are ruined by not saving the next pointer before overwriting it.",
                },
                {
                    q: "How do you find the kth node from the end in one pass?",
                    a: "Advance a fast pointer k steps, then walk both one node at a time until fast is null. The slow pointer is now at length minus k. This is better than two passes plus index arithmetic: it is a single pass, O(1) space, and it avoids the integer overflow trap of (length minus k) when the list is shorter than k. Return null rather than throwing if k exceeds the length — decide the contract first.",
                },
                {
                    q: "How do you make a linked list thread-safe?",
                    a: "The honest answer is usually not a lock. A lock around every mutation serialises everything and gives up the point of concurrent structures. A lock-free singly linked list uses a CAS loop that only publishes a new head once the new node points at the current head, and readers accept that they may see a slightly stale snapshot. If you also need size, range queries and safe iteration, take ConcurrentLinkedQueue or ConcurrentSkipListMap rather than writing your own.",
                },
            ],
        },
        {
            kind: "card",
            title: "Real-world usage",
            html: `
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
    `,
        },
        // The legacy page rendered an animated A -> B -> C -> D node strip in an
        // empty container. There was no text content and no control to drive it,
        // so nothing is carried over; the pointer-rewiring diagram above shows
        // the same chain.
    ],
});
