// src/content/dsa-hashmaps.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-hashmaps",
    title: "Hash Maps",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html: `
<p>A hash map turns a key into an array index in expected O(1). You pay with extra memory
and with the requirement that keys are hashable and that <code>hash</code> agrees with
<code>equals</code>. Interview problems use maps as <em>memory of what you have already
seen</em>: complements (two-sum), frequencies, first index of a character, grouping by a
signature.</p>
<p>Average O(1) is not a law of physics. It holds while the load factor stays below the
resize threshold and hashes spread. Adversarial keys or a terrible hash collapse a bucket
into a list (or a tree, in Java 8+), and a lookup becomes O(n).</p>`,
        },
        {
            kind: "card",
            title: "🔧 Lookup path",
            html: `
<p>Every get/set does this. The only interesting interview variants are "what if two keys
land in the same slot" and "when do we grow".</p>`,
        },
        {
            kind: "diagram",
            caption:
                "Collisions are expected; growth keeps the expected chain length constant",
            source: `
flowchart TD
    K["key"] --> H["hash(key)"]
    H --> I["index = hash mod capacity"]
    I --> B{"bucket empty or match?"}
    B -->|"match / empty"| Done["read or write the slot"]
    B -->|"collision"| C["walk the chain or probe the next slot"]
    C --> Done
    Done --> LF{"load factor above threshold?"}
    LF -->|"yes"| Grow["allocate 2x table, rehash every key"]
    LF -->|"no"| End["return"]
    Grow --> End
`,
        },
        {
            kind: "interactive",
            algo: "two-sum",
            title: "▶️ Two Sum, step by step",
            html: `<p>Find the two indices whose values add up to the target. Change the
numbers, load a preset, then run the brute-force loop and the one-pass hash map
side by side.</p>`,
        },
        {
            kind: "code",
            title: "💻 Code Example",
            language: "python",
            code: `from collections import Counter, defaultdict

def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i

freq = Counter(nums)
groups = defaultdict(list)
for w in words:
    groups["".join(sorted(w))].append(w)  # anagram groups
`,
        },
        {
            kind: "card",
            title: "🎯 Two-sum invariant",
            html: `
<p>After processing index <code>i</code>, <code>seen</code> maps every earlier value to its
index. If <code>target - nums[i]</code> is in <code>seen</code>, a pair exists. You never
need a second pass. The same idea is "subarray sum equals k" with prefix sums stored in a
map of counts.</p>`,
        },
        {
            kind: "diagram",
            caption:
                "One pass: store what you have seen, query the complement of the current value",
            source: `
flowchart LR
    A["nums: 2, 7, 11, 15  target 9"] --> S1["i=0 seen 2:0"]
    S1 --> S2["i=1 need 2 — hit. return 0, 1"]
`,
        },
        {
            kind: "table",
            title: "⏱️ Complexity",
            headers: ["Operation", "Average", "Worst", "Notes"],
            rows: [
                [
                    "get / set / delete",
                    "O(1)",
                    "O(n)",
                    "worst case is a single overloaded bucket",
                ],
                [
                    "iterate",
                    "O(capacity)",
                    "O(capacity)",
                    "Python 3.7+ dicts iterate in insertion order",
                ],
                ["two-sum", "O(n)", "O(n)", "space O(n) for <code>seen</code>"],
                [
                    "group anagrams",
                    "O(n · k log k)",
                    "same",
                    "k = max word length if you sort; O(n·k) with 26-count tuples",
                ],
            ],
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls",
            html: `
<ul style="padding-left:20px;line-height:1.9;">
<li>Using a mutable object as a key — Python raises; JS coerces objects to
<code>"[object Object]"</code> and silently collides.</li>
<li>Checking <code>if map[key]</code> in JS: misses <code>0</code> and empty string. Use
<code>has</code> / <code>in</code>.</li>
<li>Updating a dict while iterating it — RuntimeError in Python. Snapshot keys first.</li>
<li>Forgetting that <code>defaultdict</code> inserts on read. Membership tests should use
a plain dict or <code>key in d</code> before indexing.</li>
</ul>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Hash map vs hash set vs tree map?",
                    a: "<p><b>A:</b> Set is a map to a dummy value — membership only. Tree map (sorted dict, TreeMap) gives ordered keys in O(log n) and range queries. Use a hash map unless you need order or the keys are unhashable.</p>",
                },
                {
                    q: "How do you handle collisions?",
                    a: "<p><b>A:</b> Chaining (list/tree per bucket) or open addressing (probe). Python uses open addressing with randomized probing. State that load factor triggers a resize, and that <code>hash</code> must be consistent with equality.</p>",
                },
                {
                    q: "LRU cache in an interview?",
                    a: '<p><b>A:</b> Hash map from key to node plus a doubly linked list of recency. Get and put are O(1): hash lookup, then splice the node to the front. Capacity eviction pops the tail. That is the standard "hash map + list" combo.</p>',
                },
            ],
        },
    ],
});
