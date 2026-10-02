// src/renderers/dsa-fundamentals.ts — DSA fundamentals topic renderers
import { h, escHtml } from '../utils';
import { card, collapsible, stepControls, diagram, tableCard, qaCard } from '../components';

const SLIDING_WINDOW_CODE = `// Longest Substring Without Repeating Characters
function lengthOfLongestSubstring(s) {
    const set = new Set();
    let left = 0, max = 0;
    for (let right = 0; right < s.length; right++) {
        while (set.has(s[right])) {
            set.delete(s[left]);
            left++;
        }
        set.add(s[right]);
        max = Math.max(max, right - left + 1);
    }
    return max;
}`;


// ── Sliding window ───────────────────────────────────────────────────
export function renderSlidingWindow(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Sliding Window'));

    section.appendChild(card('🧠 Mental Model', `
<p>A sliding window replaces enumeration of every subarray with enumeration of only the ones
that can win. The brute-force baseline for "longest substring without repeating characters"
restarts a fresh set at every starting index: <b>O(n&sup2;)</b> time, and for
<code>k</code>-anagrams it is <b>O(n&middot;k)</b>. The optimization is a single pass that keeps a
window spanning <code>[left, right]</code>, and the O() delta comes from one fact —
<b>each index enters the window exactly once and leaves it exactly once</b>, so the
"shrink" loop runs at most <code>n</code> times in total even though it is written nested
inside the expand loop.</p>
<p><b>The invariant that makes it correct:</b> after the shrink loop finishes,
<code>s[left..right]</code> is the <em>shortest</em> window ending at <code>right</code> that
satisfies the constraint. Any longer window ending earlier was already recorded, so no
candidate is ever skipped by moving <code>left</code> forward.</p>
<p>That invariant only survives if shrinking is <em>monotone</em>: once a start index becomes
invalid, every later start index that includes it is invalid too. If the constraint is not
monotone (negative numbers, "contains no &hellip; at all"), the window technique does not apply
and you need prefix sums or a different data structure.</p>
    `));

    const machineCard = card('🔁 The expand / shrink state machine', `
<p>Read the two states. <code>Expand</code> runs once per element; <code>Shrink</code> may run
zero, one, or many times per expansion — that asymmetry is exactly why the total work is
O(n) and not O(n&sup2;). The loop exits into <code>Record</code> only from a <em>valid</em>
window, which is what makes the recorded answer safe to compare against.</p>
    `);
    machineCard.appendChild(diagram(`
stateDiagram-v2
    [*] --> Empty: left 0, right -1
    Empty --> Expand: for-loop advances right
    Expand --> Check: add s[right] to the window
    Check --> Record: constraint satisfied
    Check --> Shrink: constraint violated
    Shrink --> Check: drop s[left], left plus 1
    Shrink --> Empty: window became empty
    Record --> Expand
`, 'Expand always runs n times; Shrink runs at most n times across the whole scan'));
    section.appendChild(machineCard);

    section.appendChild(card('🎬 Visualization', '<div id="sw-viz" class="viz-area" style="position:relative;"></div>'));

    const controls = h('div', { id: 'sw-controls' });
    section.appendChild(controls);

    section.appendChild(card('⚡ Optimized Approach', `
<p>Expand the right pointer to include the next element. When the window violates the
constraint, shrink from the left until it is valid again. Record the answer <em>after</em>
shrinking, never before — recording before the shrink is the single most common bug, and it
reports windows that do not satisfy the constraint.</p>
    `, { id: 'sw-opt' }));

    section.appendChild(collapsible('🔍 Annotated implementation — line by line', `
<pre><code class="language-javascript">${escHtml(`function lengthOfLongestSubstring(s) {
    const set = new Set();          // holds exactly s[left..right], nothing else
    let left = 0, max = 0;
    for (let right = 0; right < s.length; right++) {
        while (set.has(s[right])) {  // violated -> shrink
            set.delete(s[left]);     // remove BEFORE incrementing left,
            left++;                  //   or you drop the wrong element
        }
        set.add(s[right]);
        max = Math.max(max, right - left + 1);  // record the SHORTEST valid window
    }
    return max;
}`)}</code></pre>
<ul>
<li><b>The set is the window.</b> It contains <code>s[left..right]</code> and nothing more.
The moment it holds one more element, the constraint is violated — that equivalence is the
whole algorithm, and it is why the <code>while</code> condition tests the incoming element
rather than re-deriving the constraint.</li>
<li><b>Delete before increment.</b> Swap those two lines and you evict the wrong element; the
symptom is an infinite loop or a wrong answer on inputs containing three of the same
character in a row.</li>
<li><b><code>max</code> is updated inside the loop.</b> Windows that are only valid at some
intermediate <code>right</code> never come back, so there is no second pass.</li>
<li><b>Empty input.</b> <code>max</code> stays 0. Whether the answer should be 0 or 1 is the
only ambiguity worth asking the interviewer about.</li>
</ul>
    `));

    section.appendChild(card('📏 Fixed-size vs variable-size window', `
<table class="complexity-table">
<tr><th>Aspect</th><th>Fixed size (exactly <code>k</code>)</th><th>Variable size (constraint-driven)</th></tr>
<tr><td>Pointer movement</td><td><code>right</code> always advances; <code>left = right - k + 1</code>, no shrink loop</td><td>Both pointers advance, and which one moves depends on the constraint</td></tr>
<tr><td>Answer per step</td><td>always well defined — the window is valid by construction</td><td>only well defined <em>after</em> the shrink loop drains</td></tr>
<tr><td>Monotonicity needed</td><td>none</td><td><b>required</b> — shrinking a valid start only makes it worse</td></tr>
<tr><td>Failure mode</td><td>off-by-one when the input is shorter than <code>k</code></td><td>recording before shrinking, and unbounded <code>left</code> drift on non-monotone input</td></tr>
<tr><td>Canonical problem</td><td>max sum of any <code>k</code> consecutive elements</td><td>longest substring without repeating characters</td></tr>
</table>
<p style="margin-top:10px;">Rule of thumb: if the problem states the size, it is fixed. If it
states a <em>condition</em>, it is variable and you must prove monotonicity before you write the
shrink loop.</p>
    `));

    const variantCard = card('🔢 The subarray-sum variant, and where the positivity assumption breaks it', `
<p>The classic subarray variant ("smallest contiguous subarray summing to at least
<code>target</code>") only works on <b>non-negative</b> numbers, because removing the left
element must decrease the sum. Put a <code>-3</code> in the array and the greedy shrink stops
being safe.</p>
<pre><code class="language-javascript">// Non-negative input only: greedy shrink is sound.
function minSubarrayLen(nums, target) {
    let left = 0, sum = 0, best = Infinity;
    for (let right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {          // shrink as long as still valid
            best = Math.min(best, right - left + 1);
            sum -= nums[left++];
        }
    }
    return best === Infinity ? 0 : best;
}

// Arbitrary integers: prefix sums + a map of running totals.
// prefix[r] - prefix[l] >= target  ->  find the smallest prefix[l] >= prefix[r] - target
function minSubarrayLenSigned(nums, target) {
    let prefix = 0, best = Infinity;
    const seen = new Map([[0, -1]]);      // running total -> earliest index
    for (let r = 0; r < nums.length; r++) {
        prefix += nums[r];
        if (seen.has(prefix - target)) {
            best = Math.min(best, r - seen.get(prefix - target));
        }
        if (!seen.has(prefix)) seen.set(prefix, r);  // earliest wins, always
    }
    return best === Infinity ? 0 : best;
}</code></pre>
<p style="margin-top:10px;">Both are O(n) time, but the space changes from O(1) to O(n), and
the second version only works if the array is <em>contiguous and immutable</em> — it is really a
subarray-sum problem, not a window problem.</p>
    `);
    const sizeCard = card('⚖️ When the window shrinks hard', `
<p>Some inputs force the shrink loop to run once per expansion, some average well under one.
Know which, because it changes your constants and sometimes your complexity claim.</p>
<table class="complexity-table">
<tr><th>Input shape</th><th>Shrink behaviour</th><th>Effect</th></tr>
<tr><td>All-distinct input</td><td>never shrinks</td><td>window grows to length <code>n</code>; space becomes O(n) instead of O(&alpha;)</td></tr>
<tr><td>All-duplicate input (<code>"aaaa..."</code>)</td><td>shrinks on every single expansion</td><td>window stays at length 1; best possible constant factor</td></tr>
<tr><td>Random over a small alphabet</td><td>short bursts of shrinking</td><td>the generic case; both pointers advance ~n times</td></tr>
<tr><td>Monotone violation (signed input)</td><td>greedy shrink explores a dead end</td><td>wrong answer, not just slow — the bound is a lie</td></tr>
</table>
    `);
    variantCard.appendChild(diagram(`
flowchart TD
    START["Candidate window on the right"] --> ADD["Fold s[right] into the running state"]
    ADD --> CHECK{"Constraint holds?"}
    CHECK -->|"yes"| RECORD["Record answer, then advance right"]
    CHECK -->|"no"| DROP["Remove s[left] from the state, left plus 1"]
    DROP --> CHECK
    RECORD --> DONE{"right past the last index?"}
    DONE -->|"no"| ADD
    DONE -->|"yes"| END["Return the best recorded answer"]
`, 'The shrink loop is the inner branch; every element is added once and removed at most once'));
    section.appendChild(variantCard);
    section.appendChild(sizeCard);

    section.appendChild(card('💻 Code Example', `<pre><code class="language-javascript">${SLIDING_WINDOW_CODE}</code></pre>`));

    section.appendChild(tableCard('⏱️ Complexity', ['Variant', 'Time', 'Space', 'Why'], [
        ['Longest substring, no repeats', 'O(n)', 'O(min(n, &alpha;))', '&alpha; = alphabet size; each index added and removed at most once'],
        ['Max sum of <code>k</code> consecutive (fixed)', 'O(n)', 'O(1)', 'no shrink loop; subtract the element leaving the window'],
        ['Smallest subarray &ge; target (non-negative)', 'O(n)', 'O(1)', 'shrink until invalid; both pointers monotone'],
        ['Smallest subarray &ge; target (signed)', 'O(n)', 'O(n)', 'prefix-sum map — the window trick is unsound here'],
        ['Permutation in window (anagrams)', 'O(n)', 'O(&alpha;)', 'same loop, but the state is a 26-slot counter instead of a Set'],
        ['Brute-force baseline it removes', '<b>O(n&sup2;)</b> or O(n&middot;k)', 'O(&alpha;)', 'restarts the inner work at every start index'],
    ]));

    section.appendChild(card('🪤 Pitfalls', `
<ul>
<li><b>Recording before the shrink.</b> You will report a window that violates the
constraint. Always put the <code>max</code> update after the <code>while</code> block.</li>
<li><b>Off-by-one on the shrink.</b> Deleting <code>s[left]</code> <em>after</em>
<code>left++</code> evicts the wrong element. Delete first.</li>
<li><b>Mutating the input while iterating.</b> Shrinking by
<code>nums.splice(left, 1)</code> inside a <code>for...of</code> skips elements. Track an
index; do not edit the array.</li>
<li><b>Integer overflow.</b> <code>windowSum += nums[right]</code> in a fixed-size window is
safe, but a plain "sum until &ge; target" loop over large positives can exceed 32-bit range in
languages without 64-bit ints — and in JS it silently loses precision above
2<sup>53</sup>.</li>
<li><b>Non-contiguous input.</b> A window over a linked list is fine in principle but there is
no random access, so <code>s[right]</code> costs O(distance). Convert to an array or a deque
first.</li>
<li><b>Forgetting the empty / single-element case.</b> Decide explicitly whether an answer of
length 0 is legal; the loop as written returns 0 for an empty string.</li>
</ul>
    `));

    section.appendChild(card('🚫 Alternatives, and when NOT to slide', `
<ul>
<li><b>Prefix sums + hash map.</b> Required once the constraint is non-monotone (signed
numbers) or the query is a range query rather than a "best window" search.</li>
<li><b>Binary search on the answer.</b> For monotone predicates such as "is there a window of
length L satisfying X" — O(n log n), the right answer when the property is monotone in length
but not in position.</li>
<li><b>Monotonic deque.</b> When the constraint is about a maximum over the window (sliding
window maximum) rather than a sum or a set membership.</li>
<li><b>Do not slide</b> when the constraint depends on <em>all</em> pairs inside the window
(e.g. "no two equal within distance 3" is fine, "no two equal anywhere" needs a global set and
becomes two pointers instead), when the input is unsorted and needs random reordering, or when
the answer is "the best subarray by value" rather than "a window satisfying a predicate" —
that is Kadane's algorithm, a different technique with the same loop shape.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['Walk me through the sliding window. Why is it O(n) and not O(n&sup2;)?',
            '<p>The honest answer is that both pointers move monotonically and neither ever goes '
            + 'backwards, so they make at most <code>n</code> moves each. The nested-looking '
            + '<code>while</code> is paid for by the fact that every element it removes was '
            + 'previously added. State that as: <i>"the amortised cost of the inner loop is 1 per '
            + 'outer iteration"</i>, and follow it with the invariant.</p>'],
        ['When does the sliding window technique not apply?',
            '<p>When the constraint is not monotone under shrinking. If adding an element can make '
            + 'a window <em>valid</em> (signed numbers, negative contributions, "the window must '
            + 'contain a negative"), then <code>left++</code> does not monotonically reduce the '
            + 'violation and the shrink loop explores states that are not useful. Fall back to '
            + 'prefix sums with a map, which is O(n) time but O(n) space.</p>'],
        ['Longest substring without repeating characters — trace it for me.',
            '<p>For <code>"abcabcbb"</code>: <code>right</code> reaches the second <code>a</code> at '
            + 'index 3, the set holds <code>b,c,a</code>, <code>a</code> is present, so we delete '
            + '<code>s[0]=a</code> and set <code>left=1</code>; the set is then <code>b,c</code> plus '
            + 'the new <code>a</code> — length 3. The answer stays 3 for the rest of the string, '
            + 'which is why it is <code>"abc"</code>.</p>'],
        ['How do I get the substring itself, not just the length?',
            '<p>Keep the best <code>(left, right)</code> pair instead of the best length, and slice '
            + 'once at the end: <code>bestLen = right - left + 1; bestL = left; bestR = right;</code> '
            + 'then <code>s.slice(bestL, bestR + 1)</code>. Slicing on every improvement is O(n&sup2;) '
            + 'and is the mistake to avoid.</p>'],
        ['Fixed-size window versus variable-size window — how do you tell from the problem statement?',
            '<p>A number in the statement means fixed: "any <code>k</code> consecutive elements". A '
            + 'predicate means variable: "longest", "smallest", "at least". With a fixed window there '
            + 'is no shrink loop and no invariant to prove — just add the right element and subtract '
            + 'the left one. With a variable window you must show that shrinking cannot make a '
            + 'previously-violating window valid again.</p>'],
        ['What if the input is a stream and you cannot store it?',
            '<p>You can still slide, but you can only ever move <code>left</code> as far as the '
            + 'constraint allows before you must evict; keep a deque of the surviving elements and a '
            + 'running aggregate rather than the whole array. That is the standard streaming-window '
            + 'shape used in time-series alerting and rate limiting.</p>'],
    ]));

    section.appendChild(card('🔥 Real-World Usage', 'Substring problems, log analysis (find the burst window in an error log), sensor data windows (rolling average, min/max over the last N seconds), rate limiting (per-API-key sliding window counters, which is why fixed-window limiters allow 2x the burst at a boundary and sliding-window limiters do not), network packet inspection (reassembly buffers), and every time-series "recent N events" query.'));

    container.appendChild(section);

    // Animate sliding window
    setTimeout(() => {
        const viz = document.getElementById('sw-viz');
        if (!viz) return;
        const arr = [2, 1, 5, 1, 3, 2];
        let left = 0, right = 0, target = 7;
        let step = 0;
        const totalSteps = arr.length + 3;

        function drawStep(): void {
            let html = '<div style="display:flex;align-items:center;gap:4px;margin-bottom:12px;">';
            arr.forEach((v, i) => {
                const inWindow = i >= left && i <= right;
                const style = `width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-weight:700;background:${inWindow ? 'var(--accent)' : 'var(--bg-tertiary)'};color:${inWindow ? 'white' : 'var(--text-muted)'};border:2px solid ${inWindow ? 'var(--accent-light)' : 'var(--border)'};`;
                html += `<div style="${style}">${v}</div>`;
            });
            html += '</div>';
            html += `<div style="font-size:0.8rem;color:var(--text-muted);">Step ${step + 1}: Window [${left}, ${right}] = ${arr.slice(left, right + 1).join(', ')} | Sum = ${arr.slice(left, right + 1).reduce((a, b) => a + b, 0)}</div>`;
            viz!.innerHTML = html;
        }

        const { wrap } = stepControls(totalSteps, (cur) => {
            step = cur - 1;
            const sum = arr.slice(left, right + 1).reduce((a, b) => a + b, 0);
            if (sum <= target && right < arr.length - 1) {
                right++;
            } else if (left < right) {
                left++;
            }
            if (right >= arr.length) { right = arr.length - 1; left++; }
            if (left > right) { right = left; }
            step = Math.min(step, totalSteps - 1);
            drawStep();
        });
        controls.appendChild(wrap);
        drawStep();
    }, 100);
}


// ── Two pointers ──────────────────────────────────────────────────────
export function renderTwoPointers(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Two Pointers'));

    section.appendChild(card('🧠 Mental Model', `
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
    `));

    const decisionCard = card('🧭 Which flavour of two pointers does this problem want?', `
<p>Follow the branches from the input's properties. The first question is whether the input is
already ordered; the second is whether you are allowed to move both ends.</p>
    `);
    decisionCard.appendChild(diagram(`
flowchart TD
    START["You need two indices<br/>instead of a nested loop"] --> SORTED{"Is the input sorted<br/>or can you sort it cheaply?"}
    SORTED -->|"no"| HASH["Use a hash map, not pointers<br/>O(n) time, O(n) space,<br/>no ordering requirement"]
    SORTED -->|"yes"| ENDS{"Do the two indices<br/>touch opposite ends?"}
    ENDS -->|"yes"| CONV["Converging pointers<br/>two sum, palindrome,<br/>container with most water"]
    ENDS -->|"no, they chase each other"| SAME["Same-direction pointers<br/>partition, dedupe,<br/>remove duplicates"]
    CONV --> OVERLAP{"Do the pointers<br/>ever cross?"}
    OVERLAP -->|"yes"| WIN["Window pointers<br/>they frame a subarray,<br/>the window technique"]
`, 'Ordering buys you the pruning; ends-versus-same-direction picks the loop shape'));
    section.appendChild(decisionCard);

    section.appendChild(card('💻 Code Example', `<pre><code class="language-python">def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target: return [left + 1, right + 1]
        elif s < target: left += 1
        else: right -= 1
    return [-1, -1]</code></pre>`));

    section.appendChild(collapsible('🔍 Annotated implementation — the pruning argument', `
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
    `));

    section.appendChild(card('📐 The three flavours, side by side', `
<table class="complexity-table">
<tr><th>Flavour</th><th>Loop shape</th><th>Classic problem</th><th>Pointer invariant</th></tr>
<tr><td>Converging</td><td><code>left++</code> <em>and</em> <code>right--</code></td><td>two sum, palindrome check, sort-and-search, container with most water</td><td>any solution is inside <code>[left, right]</code></td></tr>
<tr><td>Same direction</td><td>both move forward, one faster</td><td>partition, dedupe in place, move zeroes, linked-list cycle, majority vote (Boyer-Moore)</td><td><code>[0, slow)</code> and <code>[fast, n)</code> are already-final vs unclassified</td></tr>
<tr><td>Window overlap</td><td>one leads, the other follows</td><td>every sliding-window problem, and prefix-sum range queries</td><td>the region between them is the current candidate</td></tr>
</table>
    `));

    const sortedCard = card('🔑 Why it needs sorted input — and what breaks without it', `
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
    `);
    const fallbackCard = card('⚖️ Same problem, three implementations', `
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
    `);
    sortedCard.appendChild(diagram(`
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
`, 'The same loop shape, three different guarantees — only the sorted version is worst-case O(n)'));
    section.appendChild(sortedCard);
    section.appendChild(fallbackCard);

    section.appendChild(tableCard('⏱️ Complexity', ['Approach', 'Time', 'Space', 'Requires sorted?', 'Worst case'], [
        ['Converging pointers', 'O(n)', 'O(1)', '<b>yes</b>', 'O(n) guaranteed — no hashing, no randomness'],
        ['Same-direction partition', 'O(n)', 'O(1) in place', 'no', 'O(n) guaranteed'],
        ['Window pointers', 'O(n)', 'O(&alpha;)', 'no', 'O(n) guaranteed'],
        ['Sort first, then converge', 'O(n log n)', 'O(n) for the copy', 'sort it yourself', 'O(n log n) — the sort dominates'],
        ['Hash-map complement lookup', 'O(n) average', 'O(n)', 'no', '<b>O(n&sup2;)</b> if every probe collides'],
        ['Brute force (the baseline removed)', '<b>O(n&sup2;)</b>', 'O(1)', 'no', 'O(n&sup2;)'],
    ]));

    section.appendChild(card('🪤 Pitfalls', `
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
    `));

    section.appendChild(card('🚫 Alternatives, and when NOT to use two pointers', `
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
    `));

    section.appendChild(qaCard([
        ['Why do two pointers need sorted input?',
            '<p>Because the only reason a pointer can be discarded is a monotonicity proof: if '
            + '<code>nums[l] + nums[r]</code> is below target, then so is '
            + '<code>nums[l] + nums[j]</code> for every <code>j &lt;= r</code>, which is true only '
            + 'for sorted data. Without ordering, moving a pointer discards pairs that were never '
            + 'examined — that is why <code>[5, 1, 3]</code> for target 4 returns nothing even '
            + 'though <code>1 + 3</code> exists.</p>'],
        ['When would you choose the hash-map version over sorting first?',
            '<p>Three cases: the input is unsorted and sorting would dominate (O(n log n) plus a '
            + 'copy); you need every valid pair or the actual indices, which pruning discards; or '
            + 'the values are large but sparse, so an array offset table would be wasteful. The '
            + 'trade is worst-case guarantee for space — the map version is only average O(n) '
            + 'because the probe is O(1) only if the hash distributes.</p>'],
        ['Explain the same-direction variant (partition) in one sentence.',
            '<p><code>slow</code> marks the end of the "already correct" region and <code>fast</code> '
            + 'scans the unclassified region; when they disagree, swap into place and advance '
            + '<code>slow</code>. Everything before <code>slow</code> is finalised, which is the '
            + 'invariant, and it is why the algorithm is in-place and O(1) in space.</p>'],
        ['Container with most water — why is it O(n) and not O(n&sup2;)?',
            '<p>Because moving the shorter wall can only help. If <code>left</code> is shorter, '
            + 'any pair using it and a right index left of <code>right</code> has an area no '
            + 'larger than the one already tested — so <code>right</code> is discarded, not '
            + '<code>left</code>. Same pruning structure as two sum, different quantity being '
            + 'monotone.</p>'],
        ['Two pointers versus sliding window — how do you tell them apart in a whiteboard?',
            '<p>Ask whether the two indices <em>bound</em> a region. If they do, it is a window '
            + 'and you will usually need a nested shrink loop plus a state structure (sum, set, '
            + 'counter). If they are just two independent cursors with no meaningful region between '
            + 'them, it is plain two pointers and the loop is flat. Most interviewers accept '
            + 'sliding window as "two pointers that happen to frame something".</p>'],
        ['Does the two-pointer technique work on a linked list?',
            '<p>Only for the same-direction and window flavours, using a slow/fast pair — that is '
            + 'exactly how cycle detection and the middle node are solved. Converging from both '
            + 'ends is not available without a deque, because there is no O(1) backward walk. '
            + 'Converting to an array first is the standard workaround, at O(n) space.</p>'],
    ]));

    section.appendChild(card('🔥 Real-World Usage', 'Merge-scan over sorted event streams (joining two sorted logs without materialising either), the k-way merge in a priority queue, in-place compaction of sparse buffers, deduplicating sorted input for free, Boyer–Moore majority vote on sensor readings, cycle detection in linked structures, and the "meeting room" style interval scan.'));

    container.appendChild(section);
}

// ── Arrays ───────────────────────────────────────────────────────────
export function renderArrays(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Arrays'));

    section.appendChild(card('🧠 Mental Model', `
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
    `));

    const layoutCard = card('🧱 Index → address, and why that matters', `
<p>One cache line holds several elements, which is why <code>a[i]</code> is O(1) but a
random access pattern across a large array is O(n) in <em>cache misses</em> — the pointer
arithmetic is free, the memory fetch is not.</p>
    `);
    layoutCard.appendChild(diagram(`
flowchart LR
    BASE["base address<br/>e.g. 0x7f3a"] --> I0["index 0<br/>address base + 0<br/>value 10"]
    I0 --> I1["index 1<br/>address base + 8<br/>value 20"]
    I1 --> I2["index 2<br/>address base + 16<br/>value 30"]
    I2 --> I3["index 3<br/>address base + 24<br/>value 40"]
    I3 --> I4["index 4<br/>address base + 32<br/>value 50"]
    I1 -.->|"stride is fixed,<br/>computed not stored"| I3
    BASE --> NOTE["No per-element pointer<br/>unlike a linked list"]
`, 'Array index arithmetic: the address is computed from the base, never stored'));
    section.appendChild(layoutCard);

    section.appendChild(card('📏 Growing the array, and what amortized O(1) really means', `
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
    `));

    const inplaceCard = card('🪄 In-place vs copy: the trade you must say out loud', `
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
    `);
    inplaceCard.appendChild(diagram(`
flowchart TD
    PICK["Do I need the original order afterwards?"] --> NO["No, and I own the buffer"]
    PICK --> YES["Yes, or another holder has a reference"]
    NO --> INV["In-place two-pointer partition<br/>space O(1)<br/>safe to loop once"]
    YES --> ALLOC["Allocate the output<br/>space O(n)<br/>single pass, no aliasing"]
    INV --> NOTE["Mark the boundary:<br/>everything left of slow is final,<br/>everything right of fast is untouched"]
`, 'In-place is an optimisation you buy by giving up the input; copying is the default that never surprises anyone'));
    section.appendChild(inplaceCard);

    section.appendChild(card('⚡ Common Patterns', "Prefix sum (range queries), Kadane's algorithm (max subarray), Dutch National Flag (sort 0/1/2), in-place dedupe with a slow cursor, cycle-rotate in three reversals, and the difference array for range updates in O(1) per update."));

    section.appendChild(card('💻 Code Example', `<pre><code class="language-javascript">// Prefix Sum
const prefix = [0];
for (let i = 0; i < nums.length; i++) {
    prefix.push(prefix[i] + nums[i]);
}
// Range sum [l, r] = prefix[r+1] - prefix[l]</code></pre>`));

    section.appendChild(collapsible('🔍 Annotated implementation — prefix sums and Kadane', `
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
    `));

    const sortCard = card('📊 Sorting cost table', `
<p>Any comparison-based sort pays at least Omega(n log n) — that is not an implementation
detail, it is a decision-tree lower bound: n! orderings must be told apart, and a binary
decision tree of depth d has at most 2<sup>d</sup> leaves. Beating that bound means dropping
the comparison model.</p>
    `);
    sortCard.appendChild(tableCard('', ['Algorithm', 'Average / worst time', 'Space', 'Stable?', 'Use when'], [
        ['Insertion sort', 'O(n&sup2;) / O(n&sup2;)', 'O(1)', 'yes', 'n &le; 32, or nearly-sorted input — it runs in O(n) on nearly-sorted data'],
        ['Merge sort', 'O(n log n) guaranteed', 'O(n) for the merge buffer', 'yes', 'linked lists, external sorts, stability required'],
        ['Quicksort', 'O(n log n) average', 'O(log n) stack', 'no', 'general purpose in-memory sort; in-place, cache friendly'],
        ['<b>Quicksort, worst case</b>', '<b>O(n&sup2;)</b>', 'O(log n)', 'no', 'triggered by already-sorted input with a naive partition — use median-of-three or introsort'],
        ['Heapsort', 'O(n log n) guaranteed', 'O(1)', 'no', 'guaranteed bound with no extra memory; constant factor is poor'],
        ['Counting sort', 'O(n + k)', 'O(k)', 'yes', 'k = value range comparable to n (age buckets, byte values)'],
        ['Radix sort (LSD)', 'O(d &middot; (n + k))', 'O(n + k)', 'yes', 'fixed-width keys — sorting 10<sup>8</sup> 32-bit ints in about one pass per digit'],
        ['Timsort (Python <code>sorted</code>, Java <code>Arrays.sort</code> for objects)', 'O(n log n), O(n) on already-sorted input', 'O(n)', 'yes', 'real-world data is rarely unsorted; detects existing runs and merges them'],
    ]));
    section.appendChild(sortCard);

    section.appendChild(tableCard('⏱️ Complexity', ['Operation', 'Cost', 'Notes'], [
        ['Index read / write', 'O(1)', 'computed address; the only truly O(1) random-access primitive'],
        ['<code>push</code> / append', 'O(1) <b>amortized</b>', 'worst single append is O(n) — the reallocation and copy'],
        ['Prepend / <code>unshift</code>', 'O(n)', 'every element shifts by one address; there is no front pointer to steal space from'],
        ['<code>splice(i, k)</code>', 'O(n)', 'you are compacting memory; a deque or a linked list would be O(k) for the ends only'],
        ['Build prefix sums', 'O(n)', 'one pass, replaces O(n) work per range query'],
        ['Range sum query (with prefix sums)', '<b>O(1)</b>', 'the payoff: O(n) → O(1) per query'],
        ['Kadane max subarray', 'O(n) time, O(1) space', 'beats the O(n&sup2;) brute force over all subarrays'],
        ['Sort (comparison-based)', 'O(n log n)', 'Omega(n log n) lower bound applies'],
        ['Concatenation (copy semantics)', 'O(n + m)', 'in a dynamic-array language this allocates and copies both sides'],
    ]));

    section.appendChild(card('🪤 Pitfalls', `
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
    `));

    section.appendChild(card('🚫 Alternatives, and when NOT to use an array', `
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
    `));

    section.appendChild(qaCard([
        ['Why is array indexing O(1) but a linked list O(n)?',
            '<p>Because the array computes the address arithmetically — '
            + '<code>base + i &times; size</code> — and stores no per-element pointer, while a '
            + 'linked list node stores the address of the next node and there is no arithmetic '
            + 'that reaches element <code>i</code>. The linked list can do O(1) insertion only '
            + '<em>given the node</em>; finding the node is still a walk.</p>'],
        ['Is <code>push</code> O(1)? Defend your answer.',
            '<p>Amortized O(1), worst case O(n). Growth is geometric, so the copies over n '
            + 'appends total under n, giving O(n) total for n appends. The single append that '
            + 'trips the capacity costs O(n) to allocate and copy. In a latency-sensitive loop I '
            + 'pre-size; in a batch job I never would.</p>'],
        ['When is prefix sum better than a sliding window?',
            '<p>When the input contains negatives or the constraint is not monotone under '
            + 'shrinking — prefix sums survive arbitrary signs because they never shrink anything. '
            + 'It also wins whenever you have many queries over the same array: build once, then '
            + 'each query is O(1) instead of O(n).</p>'],
        ['Why can quicksort hit O(n&sup2;)?',
            '<p>The pivot choice. Always-first or always-last on already-sorted input gives depth '
            + 'n, i.e. O(n&sup2;). Median-of-three, a randomised pivot, or introsort (quicksort that '
            + 'switches to heapsort once recursion gets too deep) all remove the cliff. That is why '
            + 'a library sort accepting unsorted input is never naive.</p>'],
        ['Why is <code>unshift</code> O(n) while <code>push</code> is amortized O(1)?',
            '<p>Contiguity. Appending writes into spare capacity at the end; prepending would '
            + 'require shifting every element to keep the run unbroken. Some engines fake it by '
            + 'keeping a head offset, which is really a deque with a moving boundary — and it has '
            + 'the same eventual compaction cost.</p>'],
        ['In-place or copy — how do you decide in a system design answer?',
            '<p>Ask whether anyone else holds the array. If the caller does, or if you need the '
            + 'input afterwards, copy: the O(n) space is cheaper than an aliasing bug that is '
            + 'genuinely hard to trace. If you own the buffer and the ordering is irrelevant, go '
            + 'in-place and save the allocation.</p>'],
    ]));

    section.appendChild(card('🔥 Real-World Usage', 'Every dense numeric workload: image and audio buffers (contiguous samples are what make SIMD and cache prefetching possible), database pages, network packet reassembly, the backing store for lists, stacks and deques, and difference arrays for interval scheduling and range-update problems.'));

    container.appendChild(section);
}