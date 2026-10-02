// src/content/dsa-two-pointers.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-two-pointers",
    title: "Two Pointers",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                `
<p>Two indices moving in a coordinated way over the same collection. The technique exists to
kill a nested loop: the brute-force baseline for "find two values summing to
<code>t</code>" is O(n&sup2;) with one map probe per pair, and the two-pointer form is
<b>O(n)</b> with zero probes — not by looking at fewer values, but by using the
<em>ordering</em> of the data to prove that an entire half of the search space is dead after
each step.</p>
<p><b>The invariant that makes it correct:</b> the pair still under consideration always
contains a solution, if one exists. When the sum is too small, every pair that uses the
current <code>left</code> with a <em>smaller</em> right value is also too small, so
<code>left</code> is safe to discard permanently. Symmetrically for a sum that is too large.
That is the entire proof, and it depends on sorted order.</p>
    `,
        },
        {
            kind: "card",
            title: "🧭 Which flavour of two pointers does this problem want?",
            html:
                `
<p>Follow the branches from the input's properties. The first question is whether the input is
already ordered; the second is whether you are allowed to move both ends.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "Ordering buys you the pruning; ends-versus-same-direction picks the loop shape",
            source:
                `
flowchart TD
    START["You need two indices<br/>instead of a nested loop"] --> SORTED{"Is the input sorted<br/>or can you sort it cheaply?"}
    SORTED -->|"no"| HASH["Use a hash map, not pointers<br/>O(n) time, O(n) space,<br/>no ordering requirement"]
    SORTED -->|"yes"| ENDS{"Do the two indices<br/>touch opposite ends?"}
    ENDS -->|"yes"| CONV["Converging pointers<br/>two sum, palindrome,<br/>container with most water"]
    ENDS -->|"no, they chase each other"| SAME["Same-direction pointers<br/>partition, dedupe,<br/>remove duplicates"]
    CONV --> OVERLAP{"Do the pointers<br/>ever cross?"}
    OVERLAP -->|"yes"| WIN["Window pointers<br/>they frame a subarray,<br/>the window technique"]
`,
        },
        {
            kind: "code",
            title: "💻 Code Example",
            language: "python",
            code:
                `def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target: return [left + 1, right + 1]
        elif s < target: left += 1
        else: right -= 1
    return [-1, -1]`,
        },
        {
            kind: "collapsible",
            title: "🔍 Annotated implementation — the pruning argument",
            html:
                `
<pre><code class="language-javascript">function twoSumSorted(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left &lt; right) {              // strictly less than: never pair an index with itself
        const sum = nums[left] + nums[right];
        if (sum === target) return [left, right];
        if (sum &lt; target) left++;        // nums[left] is useless with every right' &lt;= current right
        else right--;                      // nums[right] is useless with every left' &gt;= current left
    }
    return [];
}</code></pre>
<ul>
<li><b><code>left &lt; right</code>, not <code>&lt;=</code>.</b> With <code>&lt;=</code> on the
input <code>[3, 5]</code>, target 6, you would "find" <code>[0, 0]</code> — the same element
used twice.</li>
<li><b>Why <code>left++</code> is safe.</b> <code>nums</code> is sorted, so for any
<code>j &lt;= right</code>, <code>nums[left] + nums[j] &lt;= sum &lt; target</code>. Every one of
those pairs is now proven dead. That is the pruning step, and it is where the O(n&sup2;) dies.</li>
<li><b>Duplicates.</b> After a move you can skip runs of equal values
(<code>while (left &lt; right &amp;&amp; nums[left] === nums[left + 1]) left++;</code>) — the first
such index already covered every pairing of that value.</li>
<li><b>Duplicate targets.</b> If you skip duplicate runs, you must still check
<code>nums[left] === nums[right]</code> before skipping, or you will miss
<code>[1,1,2]</code> for target 2.</li>
</ul>
    `,
        },
        {
            kind: "table",
            title: "📐 The three flavours, side by side",
            headers: ["Flavour", "Loop shape", "Classic problem", "Pointer invariant"],
            rows:
                                    [
                        [
                            "Converging",
                            "<code>left++</code> <em>and</em> <code>right--</code>",
                            "two sum, palindrome check, sort-and-search, container with most water",
                            "any solution is inside <code>[left, right]</code>",
                        ],
                        [
                            "Same direction",
                            "both move forward, one faster",
                            "partition, dedupe in place, move zeroes, linked-list cycle, majority vote (Boyer-Moore)",
                            "<code>[0, slow)</code> and <code>[fast, n)</code> are already-final vs unclassified",
                        ],
                        [
                            "Window overlap",
                            "one leads, the other follows",
                            "every sliding-window problem, and prefix-sum range queries",
                            "the region between them is the current candidate",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🔑 Why it needs sorted input — and what breaks without it",
            html:
                `
<p>The pruning step is a <em>monotonicity</em> argument: "if <code>nums[left] + nums[right]</code>
is too small, then pairing <code>nums[left]</code> with anything smaller is also too small."
That only holds when the array is sorted. On unsorted input the same loop silently returns
"no pair found" for pairs that exist — <code>[3, 5, 1]</code>, target 4, exits immediately with
<code>left=1, right=2</code> after comparing 3+1=4... but <code>[5, 1, 3]</code>, target 4, compares
5+3=8, moves <code>right</code> to 1, then <code>left &lt; right</code> is false, and it returns
empty despite <code>1 + 3</code> being right there.</p>
<p>Two ways out, and the choice is the interview point:</p>
<ul>
<li><b>Sort first.</b> O(n log n) time plus O(n) space for the copy — usually a net loss
unless you need the sorted order anyway or can sort in place.</li>
<li><b>Drop the pointers, use a hash map.</b> One pass, O(n) time and O(n) space. It is still
O(n) overall, but the <em>average-O(1)</em> lookup is a hash-table property, not an ordering
one — so the moment your keys are adversarial (see the hash-map page) or you are working in a
setting without a good hash, the map version degrades to O(n) per probe and the whole thing
becomes O(n&sup2;). Two pointers have no such failure mode: they are <b>worst-case O(n)</b>
because they touch each element a fixed number of times.</li>
</ul>
    `,
        },
        {
            kind: "diagram",
            caption: "The same loop shape, three different guarantees — only the sorted version is worst-case O(n)",
            source:
                `
flowchart LR
    subgraph SORTED["Sorted input, converges from both ends"]
        A1["left at the smallest value"] --> A2["sum too small?"]
        A2 -->|"yes, discard left"| A3["left plus 1, still inside the live range"]
        A2 -->|"no, sum too large"| A4["right minus 1"]
        A3 --> A1
        A4 --> A1
    end
    subgraph UNSORTED["Unsorted input, pointers lose their pruning"]
        B1["left at index 0"] --> B2["sum too small?"]
        B2 -->|"left plus 1 anyway"| B3["The discarded pair was never proven dead"]
        B3 --> B4["Returns not found, although a pair existed"]
    end
    subgraph MAP["The honest fallback"]
        C1["One pass over the array"] --> C2["Look up target minus the current value"]
        C2 --> C3["Average O(1) probe<br/>worst case degrades to O(n) per probe"]
    end
`,
        },
        {
            kind: "card",
            title: "⚖️ Same problem, three implementations",
            html:
                `
<pre><code class="language-javascript">// A. Sorted + converging pointers — worst-case O(n), no extra space
function twoSumSorted(nums, target) {
    let l = 0, r = nums.length - 1;
    while (l &lt; r) {
        const s = nums[l] + nums[r];
        if (s === target) return [l, r];
        if (s &lt; target) l++; else r--;
    }
    return null;
}

// B. Unsorted + hash map — average O(n), but the O(1) is a hash-table promise
function twoSumHash(nums, target) {
    const seen = new Map();                  // value -> index of its LAST occurrence
    for (let i = 0; i &lt; nums.length; i++) {
        if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
        seen.set(nums[i], i);
    }
    return null;
}

// C. Brute force — O(n^2), the baseline the other two remove
function twoSumBrute(nums, target) {
    for (let i = 0; i &lt; nums.length; i++)
        for (let j = i + 1; j &lt; nums.length; j++)
            if (nums[i] + nums[j] === target) return [i, j];
    return null;
}</code></pre>
<p style="margin-top:10px;"><b>The off-by-one that decides correctness in B:</b> you must
check the complement <em>before</em> inserting the current element. Insert first and
<code>[3, 5]</code> for target 6 returns <code>[1, 1]</code> — the element paired with itself.
Storing the <em>last</em> index for a duplicate value also matters when you want the smallest
first index back.</p>
    `,
        },
        {
            kind: "table",
            title: "⏱️ Complexity",
            headers: ["Approach", "Time", "Space", "Requires sorted?", "Worst case"],
            rows:
                                    [
                        [
                            "Converging pointers",
                            "O(n)",
                            "O(1)",
                            "<b>yes</b>",
                            "O(n) guaranteed — no hashing, no randomness",
                        ],
                        [
                            "Same-direction partition",
                            "O(n)",
                            "O(1) in place",
                            "no",
                            "O(n) guaranteed",
                        ],
                        [
                            "Window pointers",
                            "O(n)",
                            "O(&alpha;)",
                            "no",
                            "O(n) guaranteed",
                        ],
                        [
                            "Sort first, then converge",
                            "O(n log n)",
                            "O(n) for the copy",
                            "sort it yourself",
                            "O(n log n) — the sort dominates",
                        ],
                        [
                            "Hash-map complement lookup",
                            "O(n) average",
                            "O(n)",
                            "no",
                            "<b>O(n&sup2;)</b> if every probe collides",
                        ],
                        [
                            "Brute force (the baseline removed)",
                            "<b>O(n&sup2;)</b>",
                            "O(1)",
                            "no",
                            "O(n&sup2;)",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🪤 Pitfalls",
            html:
                `
<ul>
<li><b><code>left &lt;= right</code>.</b> Lets an index pair with itself; on
<code>[3, 5]</code> target 6 you get <code>[0, 0]</code> or <code>[1, 1]</code>.</li>
<li><b>Moving both pointers.</b> If the sum is too small, move <code>left++</code> <em>and</em>
<code>right--</code> and you can step over the solution entirely.</li>
<li><b>Returning 1-based indices by accident.</b> The Python sample returns
<code>[left + 1, right + 1]</code> to match LeetCode; a plain function should return 0-based.
Say which convention you are using out loud.</li>
<li><b>Mutating the array while walking it.</b> Dedupe-in-place moves elements across the
cursor; a <code>for...of</code> iterator reads the modified array and skips entries. Use an
index loop, and never re-sort inside the loop.</li>
<li><b>Overflow on the sum.</b> <code>nums[l] + nums[r]</code> can exceed 32-bit range even
when each operand is fine. In Python it is free; in C/Java cast to <code>long</code>; in JS
compare with <code>&gt;=</code>/<code>&lt;=</code> rather than relying on exact arithmetic
above 2<sup>53</sup>.</li>
<li><b>Non-contiguous input.</b> Two pointers need cheap random access.
<code>list[l]</code> on a linked list is O(l), which turns an O(n) algorithm into
O(n&sup2;). Use a deque's <code>popleft</code>/<code>pop</code> instead.</li>
<li><b>Forgetting <code>while</code> versus <code>if</code>.</b> After
<code>left++</code> the window may <em>still</em> be invalid; a single <code>if</code> returns a
wrong answer on inputs like <code>[1,1,1,2]</code>.</li>
</ul>
    `,
        },
        {
            kind: "card",
            title: "🚫 Alternatives, and when NOT to use two pointers",
            html:
                `
<ul>
<li><b>Binary search.</b> O(n log n) when the array is sorted and the target is a
non-symmetric predicate that cannot be pruned from both ends.</li>
<li><b>Hash map.</b> Strictly better when the input is unsorted, when you need the indices
rather than the existence of a pair, or when the constraint is not monotone.</li>
<li><b>Set + counting.</b> For "is there a duplicate in this range", a sliding window over a
frequency map beats two pointers.</li>
<li><b>Do not use two pointers</b> when you must return <em>all</em> pairs (the pruning
deliberately discards them), when the array is unsorted and you may not reorder it, when the
predicate is not monotone in either index, or when the data has no random access. In all four
cases the O(1)-per-index guarantee is gone and you are writing an O(n&sup2;) loop with extra
steps.</li>
</ul>
    `,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Why do two pointers need sorted input?",
                    a: "<p>Because the only reason a pointer can be discarded is a monotonicity proof: if <code>nums[l] + nums[r]</code> is below target, then so is <code>nums[l] + nums[j]</code> for every <code>j &lt;= r</code>, which is true only for sorted data. Without ordering, moving a pointer discards pairs that were never examined — that is why <code>[5, 1, 3]</code> for target 4 returns nothing even though <code>1 + 3</code> exists.</p>",
                },
                {
                    q: "When would you choose the hash-map version over sorting first?",
                    a: "<p>Three cases: the input is unsorted and sorting would dominate (O(n log n) plus a copy); you need every valid pair or the actual indices, which pruning discards; or the values are large but sparse, so an array offset table would be wasteful. The trade is worst-case guarantee for space — the map version is only average O(n) because the probe is O(1) only if the hash distributes.</p>",
                },
                {
                    q: "Explain the same-direction variant (partition) in one sentence.",
                    a: "<p><code>slow</code> marks the end of the \"already correct\" region and <code>fast</code> scans the unclassified region; when they disagree, swap into place and advance <code>slow</code>. Everything before <code>slow</code> is finalised, which is the invariant, and it is why the algorithm is in-place and O(1) in space.</p>",
                },
                {
                    q: "Container with most water — why is it O(n) and not O(n&sup2;)?",
                    a: "<p>Because moving the shorter wall can only help. If <code>left</code> is shorter, any pair using it and a right index left of <code>right</code> has an area no larger than the one already tested — so <code>right</code> is discarded, not <code>left</code>. Same pruning structure as two sum, different quantity being monotone.</p>",
                },
                {
                    q: "Two pointers versus sliding window — how do you tell them apart in a whiteboard?",
                    a: "<p>Ask whether the two indices <em>bound</em> a region. If they do, it is a window and you will usually need a nested shrink loop plus a state structure (sum, set, counter). If they are just two independent cursors with no meaningful region between them, it is plain two pointers and the loop is flat. Most interviewers accept sliding window as \"two pointers that happen to frame something\".</p>",
                },
                {
                    q: "Does the two-pointer technique work on a linked list?",
                    a: "<p>Only for the same-direction and window flavours, using a slow/fast pair — that is exactly how cycle detection and the middle node are solved. Converging from both ends is not available without a deque, because there is no O(1) backward walk. Converting to an array first is the standard workaround, at O(n) space.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🔥 Real-World Usage",
            html: "Merge-scan over sorted event streams (joining two sorted logs without materialising either), the k-way merge in a priority queue, in-place compaction of sparse buffers, deduplicating sorted input for free, Boyer–Moore majority vote on sensor readings, cycle detection in linked structures, and the \"meeting room\" style interval scan.",
        },
    ],
});
