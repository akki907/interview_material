// src/content/dsa-strings.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-strings",
    title: "Strings",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html:
                `
<p>A string is a sequence. Almost every interview string problem is one of four machines:
two pointers on a line, a sliding window with a frequency map, a single reverse or
partition pass, or a dedicated matcher (KMP / Z / Rabin–Karp / Trie). Brute force
restarts a nested scan at every index — O(n·m). The optimized version makes each index
enter and leave a structure a constant number of times.</p>
<p><b>Encoding matters.</b> In Python 3 a <code>str</code> is Unicode code points; in JS a
string is UTF-16 code units, so a single emoji is length 2 unless you iterate with
<code>for...of</code>. Interviews usually pretend ASCII, then ask about Unicode as a
follow-up. Never mutate a string in place in these languages — build a list of pieces and
<code>join</code>.</p>`,
        },
        {
            kind: "card",
            title: "Which scan?",
            html:
                `
<p>If the answer is a contiguous substring, you want a window. If it is a pair of
positions (palindrome, reverse words, container with most water), you want two pointers.
If you are matching a pattern that can fail in the middle, you want a failure function,
not a restart from <code>i+1</code>.</p>`,
        },
        {
            kind: "diagram",
            caption: "Pick the machine from the shape of the answer, not from the first loop you think of",
            source:
                `
flowchart TD
    Q["What is the answer shaped like?"] --> Sub["Contiguous substring / subarray"]
    Q --> Pair["Two indices, maybe from both ends"]
    Q --> Pat["Find pattern P in text T"]
    Q --> Group["Anagrams, grouping, frequency"]
    Sub --> Win["Sliding window plus a map or set"]
    Pair --> TP["Two pointers, often after a sort or reverse"]
    Pat --> KMP["KMP / Z / Rabin-Karp / Trie"]
    Group --> Hash["Hash map of counts or sorted signature"]
`,
        },
        {
            kind: "table",
            title: "Common Patterns",
            headers: ["Pattern", "Canonical problem", "Time", "Trap"],
            rows:
                                    [
                        [
                            "Two pointers",
                            "valid palindrome, reverse words",
                            "O(n)",
                            "skipping non-alphanumerics off-by-one",
                        ],
                        [
                            "Sliding window",
                            "longest substring without repeat",
                            "O(n)",
                            "recording before the shrink loop",
                        ],
                        [
                            "Frequency map",
                            "valid anagram, min window substring",
                            "O(n)",
                            "comparing maps the slow way instead of a deficit counter",
                        ],
                        [
                            "Expand around center",
                            "longest palindromic substring",
                            "O(n²)",
                            "forgetting even-length centers",
                        ],
                        [
                            "KMP prefix table",
                            "find first occurrence of P in T",
                            "O(n + m)",
                            "building LPS incorrectly on a mismatch",
                        ],
                        [
                            "Trie",
                            "prefix search, word break",
                            "O(total chars)",
                            "using a map of maps when a 26-array is enough",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "Palindrome as two pointers",
            html:
                `
<p>Left and right walk inward. The invariant: everything outside <code>[L, R]</code> is
already known to match. When they cross, the string is a palindrome. For "longest
palindromic substring" you instead expand outward from each center — n odd centers and
n-1 even centers.</p>`,
        },
        {
            kind: "diagram",
            caption: "Expand-around-center: try every midpoint, keep the longest [L, R] that still matches",
            source:
                `
flowchart LR
    L["L"] --> A["a"]
    A --> B["b"]
    B --> C["c"]
    C --> B2["c"]
    B2 --> A2["b"]
    A2 --> R["R on a"]
    L -.-> R
`,
        },
        {
            kind: "code",
            title: "Examples",
            language: "python",
            code:
                `def is_palindrome(s: str) -> bool:
    i, j = 0, len(s) - 1
    while i &lt; j:
        while i &lt; j and not s[i].isalnum():
            i += 1
        while i &lt; j and not s[j].isalnum():
            j -= 1
        if s[i].lower() != s[j].lower():
            return False
        i += 1
        j -= 1
    return True

# Anagram: same counts
from collections import Counter
def is_anagram(a, b):
    return Counter(a) == Counter(b)

# Build, do not concatenate in a loop
def reverse_words(s: str) -> str:
    return " ".join(reversed(s.split()))`,
        },
        {
            kind: "card",
            title: "Pitfalls",
            html:
                `
<ul style="padding-left:20px;line-height:1.9;">
<li><code>s += ch</code> in a loop is O(n²) in the abstract machine (JS/Python often
optimize, interviews still want <code>join</code>).</li>
<li>JS <code>s[i]</code> is a code unit; <code>[...s]</code> is code points. Surrogate
pairs break naive palindrome checks.</li>
<li>KMP LPS: on mismatch, jump to <code>lps[j-1]</code>, do not reset <code>j</code> to 0
unconditionally — that is back to O(n·m).</li>
<li>Case and whitespace: ask whether <code>"A man, a plan"</code> counts. Then skip
non-alphanumerics explicitly.</li>
</ul>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "KMP in one sentence?",
                    a: "<p><b>A:</b> Precompute, for each prefix of P, the longest proper prefix that is also a suffix. On mismatch you already know how far to slide, so each text index is inspected a constant number of times: O(n + m).</p>",
                },
                {
                    q: "When is a Trie better than a hash set of words?",
                    a: "<p><b>A:</b> Prefix queries, autocomplete, and \"does any word start with this\". Membership of full strings is often faster with a hash set. Tries win on shared prefixes and on walking character by character against a board (word search).</p>",
                },
                {
                    q: "Rabin–Karp vs KMP?",
                    a: "<p><b>A:</b> Rabin–Karp hashes rolling windows — great for multiple patterns (one pass, a set of hashes). Worst case degrades on collisions. KMP is linear and deterministic for one pattern. Say both; pick KMP unless they mention many patterns.</p>",
                },
            ],
        },
    ],
});
