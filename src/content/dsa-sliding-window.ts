// src/content/dsa-sliding-window.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-sliding-window",
    title: "Sliding Window",
    intro:
        "A sliding window replaces enumeration of every subarray with enumeration of only the ones " +
        "that can win — each index enters the window exactly once and leaves it exactly once.",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>A sliding window replaces enumeration of every subarray with enumeration of only the ones " +
                'that can win. The brute-force baseline for "longest substring without repeating characters" ' +
                "restarts a fresh set at every starting index: <b>O(n&sup2;)</b> time, and for " +
                "<code>k</code>-anagrams it is <b>O(n&middot;k)</b>. The optimization is a single pass that keeps " +
                "a window spanning <code>[left, right]</code>, and the O() delta comes from one fact — " +
                '<b>each index enters the window exactly once and leaves it exactly once</b>, so the "shrink" ' +
                "loop runs at most <code>n</code> times in total even though it is written nested inside the " +
                "expand loop.</p>" +
                "<p><b>The invariant that makes it correct:</b> after the shrink loop finishes, " +
                "<code>s[left..right]</code> is the <em>shortest</em> window ending at <code>right</code> that " +
                "satisfies the constraint. Any longer window ending earlier was already recorded, so no " +
                "candidate is ever skipped by moving <code>left</code> forward.</p>" +
                "<p>That invariant only survives if shrinking is <em>monotone</em>: once a start index becomes " +
                "invalid, every later start index that includes it is invalid too. If the constraint is not " +
                'monotone (negative numbers, "contains no &hellip; at all"), the window technique does not apply ' +
                "and you need prefix sums or a different data structure.</p>",
        },
        {
            kind: "card",
            title: "🔁 The expand / shrink state machine",
            html:
                "<p>Read the two states. <code>Expand</code> runs once per element; <code>Shrink</code> may run " +
                "zero, one, or many times per expansion — that asymmetry is exactly why the total work is O(n) " +
                "and not O(n&sup2;). The loop exits into <code>Record</code> only from a <em>valid</em> window, " +
                "which is what makes the recorded answer safe to compare against.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Expand always runs n times; Shrink runs at most n times across the whole scan",
            source: `stateDiagram-v2
    [*] --> Empty: left 0, right -1
    Empty --> Expand: for-loop advances right
    Expand --> Check: add s[right] to the window
    Check --> Record: constraint satisfied
    Check --> Shrink: constraint violated
    Shrink --> Check: drop s[left], left plus 1
    Shrink --> Empty: window became empty
    Record --> Expand`,
        },
        // The legacy page animated the window over [2,1,5,1,3,2] with a step
        // control. That interactivity is not expressible as content data; the
        // same trace is described by the "trace it for me" Q&A entry below.
        {
            kind: "callout",
            tone: "c4",
            title: "Animated trace (was interactive)",
            html:
                "<p>The legacy page stepped an animated window over <code>[2, 1, 5, 1, 3, 2]</code> with target " +
                "<code>7</code>, showing the sum at each <code>[left, right]</code> position. The step " +
                "controller itself is gone; the equivalent reasoning is walked through in the Q&A entry " +
                '"Longest substring without repeating characters — trace it for me" below.</p>',
        },
        {
            kind: "card",
            title: "⚡ Optimized Approach",
            html:
                "<p>Expand the right pointer to include the next element. When the window violates the " +
                "constraint, shrink from the left until it is valid again. Record the answer <em>after</em> " +
                "shrinking, never before — recording before the shrink is the single most common bug, and it " +
                "reports windows that do not satisfy the constraint.</p>",
        },
        {
            kind: "collapsible",
            title: "🔍 Annotated implementation — line by line",
            html:
                '<pre><code class="language-javascript">function lengthOfLongestSubstring(s) {\n' +
                "    const set = new Set();          // holds exactly s[left..right], nothing else\n" +
                "    let left = 0, max = 0;\n" +
                "    for (let right = 0; right < s.length; right++) {\n" +
                "        while (set.has(s[right])) {  // violated -&gt; shrink\n" +
                "            set.delete(s[left]);     // remove BEFORE incrementing left,\n" +
                "            left++;                  //   or you drop the wrong element\n" +
                "        }\n" +
                "        set.add(s[right]);\n" +
                "        max = Math.max(max, right - left + 1);  // record the SHORTEST valid window\n" +
                "    }\n" +
                "    return max;\n" +
                "}</code></pre>" +
                "<ul>" +
                "<li><b>The set is the window.</b> It contains <code>s[left..right]</code> and nothing more. " +
                "The moment it holds one more element, the constraint is violated — that equivalence is the " +
                "whole algorithm, and it is why the <code>while</code> condition tests the incoming element " +
                "rather than re-deriving the constraint.</li>" +
                "<li><b>Delete before increment.</b> Swap those two lines and you evict the wrong element; the " +
                "symptom is an infinite loop or a wrong answer on inputs containing three of the same " +
                "character in a row.</li>" +
                "<li><b><code>max</code> is updated inside the loop.</b> Windows that are only valid at some " +
                "intermediate <code>right</code> never come back, so there is no second pass.</li>" +
                "<li><b>Empty input.</b> <code>max</code> stays 0. Whether the answer should be 0 or 1 is the " +
                "only ambiguity worth asking the interviewer about.</li>" +
                "</ul>",
        },
        {
            kind: "table",
            title: "📏 Fixed-size vs variable-size window",
            headers: [
                "Aspect",
                "Fixed size (exactly <code>k</code>)",
                "Variable size (constraint-driven)",
            ],
            rows: [
                [
                    "Pointer movement",
                    "<code>right</code> always advances; <code>left = right - k + 1</code>, no shrink loop",
                    "Both pointers advance, and which one moves depends on the constraint",
                ],
                [
                    "Answer per step",
                    "always well defined — the window is valid by construction",
                    "only well defined <em>after</em> the shrink loop drains",
                ],
                [
                    "Monotonicity needed",
                    "none",
                    "<b>required</b> — shrinking a valid start only makes it worse",
                ],
                [
                    "Failure mode",
                    "off-by-one when the input is shorter than <code>k</code>",
                    "recording before shrinking, and unbounded <code>left</code> drift on non-monotone input",
                ],
                [
                    "Canonical problem",
                    "max sum of any <code>k</code> consecutive elements",
                    "longest substring without repeating characters",
                ],
            ],
        },
        {
            kind: "card",
            title: "🔢 The subarray-sum variant, and where the positivity assumption breaks it",
            html:
                '<p>The classic subarray variant ("smallest contiguous subarray summing to at least ' +
                '<code>target</code>") only works on <b>non-negative</b> numbers, because removing the left ' +
                "element must decrease the sum. Put a <code>-3</code> in the array and the greedy shrink stops " +
                "being safe.</p>" +
                '<pre><code class="language-javascript">// Non-negative input only: greedy shrink is sound.\n' +
                "function minSubarrayLen(nums, target) {\n" +
                "    let left = 0, sum = 0, best = Infinity;\n" +
                "    for (let right = 0; right < nums.length; right++) {\n" +
                "        sum += nums[right];\n" +
                "        while (sum >= target) {          // shrink as long as still valid\n" +
                "            best = Math.min(best, right - left + 1);\n" +
                "            sum -= nums[left++];\n" +
                "        }\n" +
                "    }\n" +
                "    return best === Infinity ? 0 : best;\n" +
                "}\n\n" +
                "// Arbitrary integers: prefix sums + a map of running totals.\n" +
                "// prefix[r] - prefix[l] &gt;= target  -&gt;  find the smallest prefix[l] &gt;= prefix[r] - target\n" +
                "function minSubarrayLenSigned(nums, target) {\n" +
                "    let prefix = 0, best = Infinity;\n" +
                "    const seen = new Map([[0, -1]]);      // running total -&gt; earliest index\n" +
                "    for (let r = 0; r &lt; nums.length; r++) {\n" +
                "        prefix += nums[r];\n" +
                "        if (seen.has(prefix - target)) {\n" +
                "            best = Math.min(best, r - seen.get(prefix - target));\n" +
                "        }\n" +
                "        if (!seen.has(prefix)) seen.set(prefix, r);  // earliest wins, always\n" +
                "    }\n" +
                "    return best === Infinity ? 0 : best;\n" +
                "}</code></pre>" +
                '<p style="margin-top:10px;">Both are O(n) time, but the space changes from O(1) to O(n), and ' +
                "the second version only works if the array is <em>contiguous and immutable</em> — it is really " +
                "a subarray-sum problem, not a window problem.</p>",
        },
        {
            kind: "diagram",
            caption:
                "The shrink loop is the inner branch; every element is added once and removed at most once",
            source: `flowchart TD
    START["Candidate window on the right"] --> ADD["Fold s[right] into the running state"]
    ADD --> CHECK{"Constraint holds?"}
    CHECK -->|"yes"| RECORD["Record answer, then advance right"]
    CHECK -->|"no"| DROP["Remove s[left] from the state, left plus 1"]
    DROP --> CHECK
    RECORD --> DONE{"right past the last index?"}
    DONE -->|"no"| ADD
    DONE -->|"yes"| END["Return the best recorded answer"]`,
        },
        {
            kind: "table",
            title: "⚖️ When the window shrinks hard",
            headers: ["Input shape", "Shrink behaviour", "Effect"],
            rows: [
                [
                    "All-distinct input",
                    "never shrinks",
                    "window grows to length <code>n</code>; space becomes O(n) instead of O(&alpha;)",
                ],
                [
                    'All-duplicate input (<code>"aaaa..."</code>)',
                    "shrinks on every single expansion",
                    "window stays at length 1; best possible constant factor",
                ],
                [
                    "Random over a small alphabet",
                    "short bursts of shrinking",
                    "the generic case; both pointers advance ~n times",
                ],
                [
                    "Monotone violation (signed input)",
                    "greedy shrink explores a dead end",
                    "wrong answer, not just slow — the bound is a lie",
                ],
            ],
        },
        {
            kind: "code",
            title: "💻 Code Example",
            language: "javascript",
            code: `// Longest Substring Without Repeating Characters
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
}`,
        },
        {
            kind: "table",
            title: "⏱️ Complexity",
            headers: ["Variant", "Time", "Space", "Why"],
            rows: [
                [
                    "Longest substring, no repeats",
                    "O(n)",
                    "O(min(n, &alpha;))",
                    "&alpha; = alphabet size; each index added and removed at most once",
                ],
                [
                    "Max sum of <code>k</code> consecutive (fixed)",
                    "O(n)",
                    "O(1)",
                    "no shrink loop; subtract the element leaving the window",
                ],
                [
                    "Smallest subarray &ge; target (non-negative)",
                    "O(n)",
                    "O(1)",
                    "shrink until invalid; both pointers monotone",
                ],
                [
                    "Smallest subarray &ge; target (signed)",
                    "O(n)",
                    "O(n)",
                    "prefix-sum map — the window trick is unsound here",
                ],
                [
                    "Permutation in window (anagrams)",
                    "O(n)",
                    "O(&alpha;)",
                    "same loop, but the state is a 26-slot counter instead of a Set",
                ],
                [
                    "Brute-force baseline it removes",
                    "<b>O(n&sup2;)</b> or O(n&middot;k)",
                    "O(&alpha;)",
                    "restarts the inner work at every start index",
                ],
            ],
        },
        {
            kind: "card",
            title: "🪤 Pitfalls",
            html:
                "<ul>" +
                "<li><b>Recording before the shrink.</b> You will report a window that violates the constraint. " +
                "Always put the <code>max</code> update after the <code>while</code> block.</li>" +
                "<li><b>Off-by-one on the shrink.</b> Deleting <code>s[left]</code> <em>after</em> " +
                "<code>left++</code> evicts the wrong element. Delete first.</li>" +
                "<li><b>Mutating the input while iterating.</b> Shrinking by <code>nums.splice(left, 1)</code> " +
                "inside a <code>for...of</code> skips elements. Track an index; do not edit the array.</li>" +
                "<li><b>Integer overflow.</b> <code>windowSum += nums[right]</code> in a fixed-size window is " +
                'safe, but a plain "sum until &ge; target" loop over large positives can exceed 32-bit range ' +
                "in languages without 64-bit ints — and in JS it silently loses precision above " +
                "2<sup>53</sup>.</li>" +
                "<li><b>Non-contiguous input.</b> A window over a linked list is fine in principle but there " +
                "is no random access, so <code>s[right]</code> costs O(distance). Convert to an array or a " +
                "deque first.</li>" +
                "<li><b>Forgetting the empty / single-element case.</b> Decide explicitly whether an answer " +
                "of length 0 is legal; the loop as written returns 0 for an empty string.</li>" +
                "</ul>",
        },
        {
            kind: "card",
            title: "🚫 Alternatives, and when NOT to slide",
            html:
                "<ul>" +
                "<li><b>Prefix sums + hash map.</b> Required once the constraint is non-monotone (signed " +
                'numbers) or the query is a range query rather than a "best window" search.</li>' +
                '<li><b>Binary search on the answer.</b> For monotone predicates such as "is there a window ' +
                'of length L satisfying X" — O(n log n), the right answer when the property is monotone in ' +
                "length but not in position.</li>" +
                "<li><b>Monotonic deque.</b> When the constraint is about a maximum over the window (sliding " +
                "window maximum) rather than a sum or a set membership.</li>" +
                "<li><b>Do not slide</b> when the constraint depends on <em>all</em> pairs inside the window " +
                '(e.g. "no two equal within distance 3" is fine, "no two equal anywhere" needs a global set ' +
                "and becomes two pointers instead), when the input is unsorted and needs random reordering, " +
                'or when the answer is "the best subarray by value" rather than "a window satisfying a ' +
                "predicate\" — that is Kadane's algorithm, a different technique with the same loop shape.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Walk me through the sliding window. Why is it O(n) and not O(n&sup2;)?",
                    a:
                        "<p>The honest answer is that both pointers move monotonically and neither ever goes " +
                        "backwards, so they make at most <code>n</code> moves each. The nested-looking " +
                        "<code>while</code> is paid for by the fact that every element it removes was " +
                        'previously added. State that as: <i>"the amortised cost of the inner loop is 1 per ' +
                        'outer iteration"</i>, and follow it with the invariant.</p>',
                    level: 2,
                    probing:
                        "Whether you can state the amortized argument rather than hand-waving the nested loop.",
                    followUp:
                        '"Prove it." — each element is added once and removed at most once.',
                },
                {
                    q: "When does the sliding window technique not apply?",
                    a:
                        "<p>When the constraint is not monotone under shrinking. If adding an element can make " +
                        'a window <em>valid</em> (signed numbers, negative contributions, "the window must ' +
                        'contain a negative"), then <code>left++</code> does not monotonically reduce the ' +
                        "violation and the shrink loop explores states that are not useful. Fall back to " +
                        "prefix sums with a map, which is O(n) time but O(n) space.</p>",
                    level: 3,
                    probing:
                        "Genuine grasp of monotonicity, not pattern-matching the problem statement.",
                    followUp:
                        '"Show me the prefix-sum version." — the running-total map.',
                },
                {
                    q: "Longest substring without repeating characters — trace it for me.",
                    a:
                        '<p>For <code>"abcabcbb"</code>: <code>right</code> reaches the second <code>a</code> ' +
                        "at index 3, the set holds <code>b,c,a</code>, <code>a</code> is present, so we delete " +
                        "<code>s[0]=a</code> and set <code>left=1</code>; the set is then <code>b,c</code> plus " +
                        "the new <code>a</code> — length 3. The answer stays 3 for the rest of the string, " +
                        'which is why it is <code>"abc"</code>.</p>',
                    level: 1,
                    probing:
                        "Whether you narrate the set contents concretely instead of describing in general terms.",
                    followUp:
                        '"Now the substring itself." — keep best (left, right), slice once at the end.',
                },
                {
                    q: "How do I get the substring itself, not just the length?",
                    a:
                        "<p>Keep the best <code>(left, right)</code> pair instead of the best length, and slice " +
                        "once at the end: <code>bestLen = right - left + 1; bestL = left; bestR = right;</code> " +
                        "then <code>s.slice(bestL, bestR + 1)</code>. Slicing on every improvement is " +
                        "O(n&sup2;) and is the mistake to avoid.</p>",
                    level: 2,
                    probing:
                        "Noticing the accidental quadratic from slicing inside the loop.",
                    followUp:
                        '"What about the streaming case?" — keep a deque, slice never.',
                },
                {
                    q: "Fixed-size window versus variable-size window — how do you tell from the problem statement?",
                    a:
                        '<p>A number in the statement means fixed: "any <code>k</code> consecutive elements". A ' +
                        'predicate means variable: "longest", "smallest", "at least". With a fixed window there ' +
                        "is no shrink loop and no invariant to prove — just add the right element and subtract " +
                        "the left one. With a variable window you must show that shrinking cannot make a " +
                        "previously-violating window valid again.</p>",
                    level: 2,
                    probing:
                        "Reading the constraint type out of the statement rather than memorizing templates.",
                    followUp:
                        '"And if both appear?" — the size is a lower bound, the predicate is the shrink condition.',
                },
                {
                    q: "What if the input is a stream and you cannot store it?",
                    a:
                        "<p>You can still slide, but you can only ever move <code>left</code> as far as the " +
                        "constraint allows before you must evict; keep a deque of the surviving elements and a " +
                        "running aggregate rather than the whole array. That is the standard streaming-window " +
                        "shape used in time-series alerting and rate limiting.</p>",
                    level: 4,
                    probing:
                        "Whether you adapt the invariant to a bounded-memory setting.",
                    followUp:
                        '"What aggregate?" — sum, count, or min/max; min/max needs a monotonic deque.',
                },
            ],
        },
        {
            kind: "card",
            title: "🔥 Real-World Usage",
            html:
                "Substring problems, log analysis (find the burst window in an error log), sensor data " +
                "windows (rolling average, min/max over the last N seconds), rate limiting (per-API-key " +
                "sliding window counters, which is why fixed-window limiters allow 2x the burst at a boundary " +
                "and sliding-window limiters do not), network packet inspection (reassembly buffers), and " +
                'every time-series "recent N events" query.',
        },
    ],
});
