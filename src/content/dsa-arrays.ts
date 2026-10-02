// src/content/dsa-arrays.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-arrays",
    title: "Arrays",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                `
<p>An array is <b>contiguous memory plus a base address</b>. That single design choice buys
<code>a[i] = base + i &times; elementSize</code> — constant-time indexing, no pointer
chasing, and cache-friendly sequential scans. It also imposes the cost everyone forgets:
the region must be <em>one uninterrupted run</em>, so growing it can mean moving every
element.</p>
<p><b>The invariant that makes array algorithms work:</b> elements at indices
<code>i &lt; j</code> occupy ascending addresses, so a scan is sequential in memory as well
as in index order. Every prefix-sum, binary-search, and Dutch-flag argument is a statement
about that layout — which is exactly why none of them generalise to a linked list, where the
same indices may be in different cache lines.</p>
<p>Brute-force baselines to beat: "find a subarray with sum S" by enumerating all
O(n&sup2;) subarrays and summing each, and "check every range" by rescanning each range.
Prefix sums remove the inner rescan and give <b>O(n) build / O(1) query</b>, turning the
delta from O(n) per query into O(1) per query.</p>
    `,
        },
        {
            kind: "card",
            title: "🧱 Index → address, and why that matters",
            html:
                `
<p>One cache line holds several elements, which is why <code>a[i]</code> is O(1) but a
random access pattern across a large array is O(n) in <em>cache misses</em> — the pointer
arithmetic is free, the memory fetch is not.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "Array index arithmetic: the address is computed from the base, never stored",
            source:
                `
flowchart LR
    BASE["base address<br/>e.g. 0x7f3a"] --> I0["index 0<br/>address base + 0<br/>value 10"]
    I0 --> I1["index 1<br/>address base + 8<br/>value 20"]
    I1 --> I2["index 2<br/>address base + 16<br/>value 30"]
    I2 --> I3["index 3<br/>address base + 24<br/>value 40"]
    I3 --> I4["index 4<br/>address base + 32<br/>value 50"]
    I1 -.->|"stride is fixed,<br/>computed not stored"| I3
    BASE --> NOTE["No per-element pointer<br/>unlike a linked list"]
`,
        },
        {
            kind: "card",
            title: "📏 Growing the array, and what amortized O(1) really means",
            html:
                `
<p><code>push</code> is <b>not</b> O(1). Most engines keep spare capacity and, when it runs
out, allocate a larger block and copy. What you get is <i>amortized</i> O(1) per append:
the total cost of <code>n</code> appends is O(n), even though individual appends cost
O(n).</p>
<pre><code class="language-javascript">// Doubling: copies happen at n = 1, 2, 4, 8, ...
// total elements copied over n appends = 1 + 2 + 4 + ... + n/2 &lt; n
// so amortized cost per append = copies / n &lt; 1, i.e. O(1)

// 1.5x growth (CPython lists, JS Array push): copies total ~2n, memory overhead ~33%
// Fixed-chunk growth (Java ArrayList, C++ deque): no copy at all,
// but a[i] is then two loads instead of one

// The trap: reserving up front is O(1) per append and no copies at all,
// but it commits memory you may never touch.</code></pre>
<p><b>Worst case, stated honestly:</b> a single <code>push</code> can cost O(n) — the
reallocation. If you are in an interactive loop that must never block (a UI thread, a real-time
audio callback, a game frame budget), pre-size the buffer. If you are batch-processing, do not.</p>
    `,
        },
        {
            kind: "card",
            title: "🪄 In-place vs copy: the trade you must say out loud",
            html:
                `
<table class="complexity-table">
<tr><th>Approach</th><th>Space</th><th>Cost of the trade</th><th>When it is right</th></tr>
<tr><td>In-place (swap / partition)</td><td>O(1)</td><td>destroys the original ordering; callers that still need the input break</td><td>you own the array and nobody else holds a reference</td></tr>
<tr><td>Copy then transform</td><td>O(n)</td><td>allocation, GC pressure, cache misses on a fresh buffer</td><td>the input is shared, immutable by contract, or reused</td></tr>
<tr><td>Return a new array</td><td>O(n)</td><td>same as copy, but the caller must remember to use the result</td><td>functional code, testable, no aliasing bugs</td></tr>
<tr><td>Mark-and-sweep, no compaction</td><td>O(1) per removal, O(n) never</td><td>the array keeps its length; repeated remove becomes O(n) scans</td><td>removals are rare; compact only when nulls exceed half</td></tr>
</table>
<p style="margin-top:10px;">JavaScript makes this a real hazard rather than a style choice:
<code>const b = a.slice()</code> copies, <code>const b = a</code> aliases, and
<code>function f(a) { a.sort(); }</code> sorts the caller's array. Slicing a large array is
also a genuine cost, not a formality — for a 10M-element array it is tens of megabytes of fresh
allocation.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "In-place is an optimisation you buy by giving up the input; copying is the default that never surprises anyone",
            source:
                `
flowchart TD
    PICK["Do I need the original order afterwards?"] --> NO["No, and I own the buffer"]
    PICK --> YES["Yes, or another holder has a reference"]
    NO --> INV["In-place two-pointer partition<br/>space O(1)<br/>safe to loop once"]
    YES --> ALLOC["Allocate the output<br/>space O(n)<br/>single pass, no aliasing"]
    INV --> NOTE["Mark the boundary:<br/>everything left of slow is final,<br/>everything right of fast is untouched"]
`,
        },
        {
            kind: "card",
            title: "⚡ Common Patterns",
            html: "Prefix sum (range queries), Kadane's algorithm (max subarray), Dutch National Flag (sort 0/1/2), in-place dedupe with a slow cursor, cycle-rotate in three reversals, and the difference array for range updates in O(1) per update.",
        },
        {
            kind: "code",
            title: "💻 Code Example",
            language: "javascript",
            code:
                `// Prefix Sum
const prefix = [0];
for (let i = 0; i < nums.length; i++) {
    prefix.push(prefix[i] + nums[i]);
}
// Range sum [l, r] = prefix[r+1] - prefix[l]`,
        },
        {
            kind: "collapsible",
            title: "🔍 Annotated implementation — prefix sums and Kadane",
            html:
                `
<pre><code class="language-javascript">// Prefix sums: O(n) build, O(1) per range query.
// The [0] sentinel is what removes the off-by-one: prefix[i] is the sum
// of nums[0..i-1], so every range query is a plain subtraction.
function buildPrefix(nums) {
    const prefix = [0];
    for (let i = 0; i &lt; nums.length; i++) prefix.push(prefix[i] + nums[i]);
    return prefix;
}
function rangeSum(prefix, l, r) {      // inclusive [l, r]
    return prefix[r + 1] - prefix[l];
}

// Kadane: max contiguous subarray sum in O(n) time and O(1) space.
// The invariant: 'bestEndingHere' is the largest sum of a subarray
// that ENDS at the current index. Negative running sums are discarded,
// because a negative prefix can never help a future extension.
function maxSubarray(nums) {
    let bestEndingHere = nums[0], best = nums[0];
    for (let i = 1; i &lt; nums.length; i++) {
        bestEndingHere = Math.max(nums[i], bestEndingHere + nums[i]);
        best = Math.max(best, bestEndingHere);
    }
    return best;
}

// Dutch National Flag: sort 0/1/2 in one pass, O(1) space.
function sort012(nums) {
    let lo = 0, i = 0, hi = nums.length - 1;
    while (i &lt;= hi) {
        if (nums[i] === 0)      [nums[lo++], nums[i++]] = [nums[i], nums[lo]];
        else if (nums[i] === 2) [nums[i], nums[hi--]] = [nums[hi], nums[i]];
        else i++;
    }
}</code></pre>
    `,
        },
        {
            kind: "card",
            title: "📊 Sorting cost table",
            html:
                `
<p>Any comparison-based sort pays at least Omega(n log n) — that is not an implementation
detail, it is a decision-tree lower bound: n! orderings must be told apart, and a binary
decision tree of depth d has at most 2<sup>d</sup> leaves. Beating that bound means dropping
the comparison model.</p>
    `,
        },
        {
            kind: "table",
            headers: ["Algorithm", "Average / worst time", "Space", "Stable?", "Use when"],
            rows:
                                    [
                        [
                            "Insertion sort",
                            "O(n&sup2;) / O(n&sup2;)",
                            "O(1)",
                            "yes",
                            "n &le; 32, or nearly-sorted input — it runs in O(n) on nearly-sorted data",
                        ],
                        [
                            "Merge sort",
                            "O(n log n) guaranteed",
                            "O(n) for the merge buffer",
                            "yes",
                            "linked lists, external sorts, stability required",
                        ],
                        [
                            "Quicksort",
                            "O(n log n) average",
                            "O(log n) stack",
                            "no",
                            "general purpose in-memory sort; in-place, cache friendly",
                        ],
                        [
                            "<b>Quicksort, worst case</b>",
                            "<b>O(n&sup2;)</b>",
                            "O(log n)",
                            "no",
                            "triggered by already-sorted input with a naive partition — use median-of-three or introsort",
                        ],
                        [
                            "Heapsort",
                            "O(n log n) guaranteed",
                            "O(1)",
                            "no",
                            "guaranteed bound with no extra memory; constant factor is poor",
                        ],
                        [
                            "Counting sort",
                            "O(n + k)",
                            "O(k)",
                            "yes",
                            "k = value range comparable to n (age buckets, byte values)",
                        ],
                        [
                            "Radix sort (LSD)",
                            "O(d &middot; (n + k))",
                            "O(n + k)",
                            "yes",
                            "fixed-width keys — sorting 10<sup>8</sup> 32-bit ints in about one pass per digit",
                        ],
                        [
                            "Timsort (Python <code>sorted</code>, Java <code>Arrays.sort</code> for objects)",
                            "O(n log n), O(n) on already-sorted input",
                            "O(n)",
                            "yes",
                            "real-world data is rarely unsorted; detects existing runs and merges them",
                        ],
                    ],
        },
        {
            kind: "table",
            title: "⏱️ Complexity",
            headers: ["Operation", "Cost", "Notes"],
            rows:
                                    [
                        [
                            "Index read / write",
                            "O(1)",
                            "computed address; the only truly O(1) random-access primitive",
                        ],
                        [
                            "<code>push</code> / append",
                            "O(1) <b>amortized</b>",
                            "worst single append is O(n) — the reallocation and copy",
                        ],
                        [
                            "Prepend / <code>unshift</code>",
                            "O(n)",
                            "every element shifts by one address; there is no front pointer to steal space from",
                        ],
                        [
                            "<code>splice(i, k)</code>",
                            "O(n)",
                            "you are compacting memory; a deque or a linked list would be O(k) for the ends only",
                        ],
                        [
                            "Build prefix sums",
                            "O(n)",
                            "one pass, replaces O(n) work per range query",
                        ],
                        [
                            "Range sum query (with prefix sums)",
                            "<b>O(1)</b>",
                            "the payoff: O(n) → O(1) per query",
                        ],
                        [
                            "Kadane max subarray",
                            "O(n) time, O(1) space",
                            "beats the O(n&sup2;) brute force over all subarrays",
                        ],
                        [
                            "Sort (comparison-based)",
                            "O(n log n)",
                            "Omega(n log n) lower bound applies",
                        ],
                        [
                            "Concatenation (copy semantics)",
                            "O(n + m)",
                            "in a dynamic-array language this allocates and copies both sides",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🪤 Pitfalls",
            html:
                `
<ul>
<li><b>Off-by-one on prefix sums.</b> Decide whether <code>prefix[i]</code> includes index
<code>i</code> or stops before it, and write the query as <code>prefix[r+1] - prefix[l]</code>
for inclusive ranges. Mixing the two conventions is the single most common array bug.</li>
<li><b>Mutating while iterating.</b> <code>for (const x of a) a.push(x)</code> loops
forever; splicing inside a <code>for</code> loop skips elements. Snapshot the length or use
an index loop you control.</li>
<li><b>Integer overflow in the accumulator.</b> Prefix sums and Kadane both add
unboundedly. In C/Java use <code>long</code>; in JS values above 2<sup>53</sup> silently lose
precision — the classic <code>NaN</code> surprise comes from <code>Infinity - Infinity</code>
rather than from the array itself, but it bites the same algorithms.</li>
<li><b>Assuming contiguity for a non-array.</b> In Python a "list of arrays" is fine, but a
list of tuples-of-lists is a different structure: <code>l[i][j]</code> is two loads. Do not
quote an O(1)-indexing argument for a container that is not flat.</li>
<li><b><code>shift()</code> and friends in a loop.</b> JavaScript's
<code>Array.prototype.shift</code> is O(n), so a shift-in-a-loop is O(n&sup2;). That is the
most common accidental quadratic in JS array code.</li>
<li><b>Copying instead of aliasing (or the reverse).</b> <code>[...a]</code> and
<code>a.slice()</code> copy; <code>a</code> and <code>arr.map(x =&gt; x)</code> are cheap;
<code>a.concat(b)</code> allocates. Know which one you wrote before claiming O(1).</li>
</ul>
    `,
        },
        {
            kind: "card",
            title: "🚫 Alternatives, and when NOT to use an array",
            html:
                `
<ul>
<li><b>Dynamic array (what most languages give you)</b> — contiguous plus amortized growth.
Default choice unless you need a different trade.</li>
<li><b>Deque</b> — same random access, O(1) at both ends; a fixed-chunk dynamic array
under the hood. The right answer for queue-like workloads.</li>
<li><b>Linked list</b> — O(1) insert/delete <em>given a node</em>, O(n) index. Never use it to
"avoid the cost of resizing"; the per-node cache misses cost far more than a memcpy.</li>
<li><b>Ring buffer / circular array</b> — when you need a fixed-size sliding view over a
stream, and also bounds memory (the classic trade: you lose history to keep the size).</li>
<li><b>Do not use a raw array</b> when you need lookup by key (use a hash map), ordered
predecessor/successor (use a balanced tree or a BIT), or sparse indices (use a map — a
sparse array of size 10<sup>9</sup> is a memory leak with an index on it).</li>
</ul>
    `,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Why is array indexing O(1) but a linked list O(n)?",
                    a: "<p>Because the array computes the address arithmetically — <code>base + i &times; size</code> — and stores no per-element pointer, while a linked list node stores the address of the next node and there is no arithmetic that reaches element <code>i</code>. The linked list can do O(1) insertion only <em>given the node</em>; finding the node is still a walk.</p>",
                },
                {
                    q: "Is <code>push</code> O(1)? Defend your answer.",
                    a: "<p>Amortized O(1), worst case O(n). Growth is geometric, so the copies over n appends total under n, giving O(n) total for n appends. The single append that trips the capacity costs O(n) to allocate and copy. In a latency-sensitive loop I pre-size; in a batch job I never would.</p>",
                },
                {
                    q: "When is prefix sum better than a sliding window?",
                    a: "<p>When the input contains negatives or the constraint is not monotone under shrinking — prefix sums survive arbitrary signs because they never shrink anything. It also wins whenever you have many queries over the same array: build once, then each query is O(1) instead of O(n).</p>",
                },
                {
                    q: "Why can quicksort hit O(n&sup2;)?",
                    a: "<p>The pivot choice. Always-first or always-last on already-sorted input gives depth n, i.e. O(n&sup2;). Median-of-three, a randomised pivot, or introsort (quicksort that switches to heapsort once recursion gets too deep) all remove the cliff. That is why a library sort accepting unsorted input is never naive.</p>",
                },
                {
                    q: "Why is <code>unshift</code> O(n) while <code>push</code> is amortized O(1)?",
                    a: "<p>Contiguity. Appending writes into spare capacity at the end; prepending would require shifting every element to keep the run unbroken. Some engines fake it by keeping a head offset, which is really a deque with a moving boundary — and it has the same eventual compaction cost.</p>",
                },
                {
                    q: "In-place or copy — how do you decide in a system design answer?",
                    a: "<p>Ask whether anyone else holds the array. If the caller does, or if you need the input afterwards, copy: the O(n) space is cheaper than an aliasing bug that is genuinely hard to trace. If you own the buffer and the ordering is irrelevant, go in-place and save the allocation.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🔥 Real-World Usage",
            html: "Every dense numeric workload: image and audio buffers (contiguous samples are what make SIMD and cache prefetching possible), database pages, network packet reassembly, the backing store for lists, stacks and deques, and difference arrays for interval scheduling and range-update problems.",
        },
    ],
});
