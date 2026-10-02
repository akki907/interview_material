// src/renderers/dsa.ts — DSA topic renderers
import { h, toast } from '../utils';
import { card, pipelineStages, diagram, qaCard } from '../components';


export function renderStrings(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Strings'));

    section.appendChild(card('🧠 Mental Model', `
<p>A string is a sequence. Almost every interview string problem is one of four machines:
two pointers on a line, a sliding window with a frequency map, a single reverse or
partition pass, or a dedicated matcher (KMP / Z / Rabin–Karp / Trie). Brute force
restarts a nested scan at every index — O(n·m). The optimized version makes each index
enter and leave a structure a constant number of times.</p>
<p><b>Encoding matters.</b> In Python 3 a <code>str</code> is Unicode code points; in JS a
string is UTF-16 code units, so a single emoji is length 2 unless you iterate with
<code>for...of</code>. Interviews usually pretend ASCII, then ask about Unicode as a
follow-up. Never mutate a string in place in these languages — build a list of pieces and
<code>join</code>.</p>`));

    const scanCard = card('🔁 Which scan?', `
<p>If the answer is a contiguous substring, you want a window. If it is a pair of
positions (palindrome, reverse words, container with most water), you want two pointers.
If you are matching a pattern that can fail in the middle, you want a failure function,
not a restart from <code>i+1</code>.</p>`);
    scanCard.appendChild(diagram(`
flowchart TD
    Q["What is the answer shaped like?"] --> Sub["Contiguous substring / subarray"]
    Q --> Pair["Two indices, maybe from both ends"]
    Q --> Pat["Find pattern P in text T"]
    Q --> Group["Anagrams, grouping, frequency"]
    Sub --> Win["Sliding window plus a map or set"]
    Pair --> TP["Two pointers, often after a sort or reverse"]
    Pat --> KMP["KMP / Z / Rabin-Karp / Trie"]
    Group --> Hash["Hash map of counts or sorted signature"]
`, 'Pick the machine from the shape of the answer, not from the first loop you think of'));
    section.appendChild(scanCard);

    section.appendChild(card('⚡ Common Patterns', `
<table class="complexity-table">
<tr><th>Pattern</th><th>Canonical problem</th><th>Time</th><th>Trap</th></tr>
<tr><td>Two pointers</td><td>valid palindrome, reverse words</td><td>O(n)</td><td>skipping non-alphanumerics off-by-one</td></tr>
<tr><td>Sliding window</td><td>longest substring without repeat</td><td>O(n)</td><td>recording before the shrink loop</td></tr>
<tr><td>Frequency map</td><td>valid anagram, min window substring</td><td>O(n)</td><td>comparing maps the slow way instead of a deficit counter</td></tr>
<tr><td>Expand around center</td><td>longest palindromic substring</td><td>O(n²)</td><td>forgetting even-length centers</td></tr>
<tr><td>KMP prefix table</td><td>find first occurrence of P in T</td><td>O(n + m)</td><td>building LPS incorrectly on a mismatch</td></tr>
<tr><td>Trie</td><td>prefix search, word break</td><td>O(total chars)</td><td>using a map of maps when a 26-array is enough</td></tr>
</table>`));

    const palCard = card('🪞 Palindrome as two pointers', `
<p>Left and right walk inward. The invariant: everything outside <code>[L, R]</code> is
already known to match. When they cross, the string is a palindrome. For "longest
palindromic substring" you instead expand outward from each center — n odd centers and
n-1 even centers.</p>`);
    palCard.appendChild(diagram(`
flowchart LR
    L["L"] --> A["a"]
    A --> B["b"]
    B --> C["c"]
    C --> B2["c"]
    B2 --> A2["b"]
    A2 --> R["R on a"]
    L -.-> R
`, 'Expand-around-center: try every midpoint, keep the longest [L, R] that still matches'));
    section.appendChild(palCard);

    section.appendChild(card('💻 Examples', `<pre><code class="language-python">def is_palindrome(s: str) -> bool:
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
    return " ".join(reversed(s.split()))</code></pre>`));

    section.appendChild(card('⚠️ Pitfalls', `
<ul style="padding-left:20px;line-height:1.9;">
<li><code>s += ch</code> in a loop is O(n²) in the abstract machine (JS/Python often
optimize, interviews still want <code>join</code>).</li>
<li>JS <code>s[i]</code> is a code unit; <code>[...s]</code> is code points. Surrogate
pairs break naive palindrome checks.</li>
<li>KMP LPS: on mismatch, jump to <code>lps[j-1]</code>, do not reset <code>j</code> to 0
unconditionally — that is back to O(n·m).</li>
<li>Case and whitespace: ask whether <code>"A man, a plan"</code> counts. Then skip
non-alphanumerics explicitly.</li>
</ul>`));

    section.appendChild(qaCard([
        ['KMP in one sentence?',
            '<p><b>A:</b> Precompute, for each prefix of P, the longest proper prefix that is also a suffix. On mismatch you already know how far to slide, so each text index is inspected a constant number of times: O(n + m).</p>'],
        ['When is a Trie better than a hash set of words?',
            '<p><b>A:</b> Prefix queries, autocomplete, and "does any word start with this". Membership of full strings is often faster with a hash set. Tries win on shared prefixes and on walking character by character against a board (word search).</p>'],
        ['Rabin–Karp vs KMP?',
            '<p><b>A:</b> Rabin–Karp hashes rolling windows — great for multiple patterns (one pass, a set of hashes). Worst case degrades on collisions. KMP is linear and deterministic for one pattern. Say both; pick KMP unless they mention many patterns.</p>'],
    ]));

    container.appendChild(section);
}

export function renderHashMaps(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Hash Maps'));

    section.appendChild(card('🧠 Mental Model', `
<p>A hash map turns a key into an array index in expected O(1). You pay with extra memory
and with the requirement that keys are hashable and that <code>hash</code> agrees with
<code>equals</code>. Interview problems use maps as <em>memory of what you have already
seen</em>: complements (two-sum), frequencies, first index of a character, grouping by a
signature.</p>
<p>Average O(1) is not a law of physics. It holds while the load factor stays below the
resize threshold and hashes spread. Adversarial keys or a terrible hash collapse a bucket
into a list (or a tree, in Java 8+), and a lookup becomes O(n).</p>`));

    const hashCard = card('🔧 Lookup path', `
<p>Every get/set does this. The only interesting interview variants are "what if two keys
land in the same slot" and "when do we grow".</p>`);
    hashCard.appendChild(diagram(`
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
`, 'Collisions are expected; growth keeps the expected chain length constant'));
    section.appendChild(hashCard);

    section.appendChild(card('💻 Code Example', `<pre><code class="language-python">from collections import Counter, defaultdict

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
</code></pre>`));

    const twoSumCard = card('🎯 Two-sum invariant', `
<p>After processing index <code>i</code>, <code>seen</code> maps every earlier value to its
index. If <code>target - nums[i]</code> is in <code>seen</code>, a pair exists. You never
need a second pass. The same idea is "subarray sum equals k" with prefix sums stored in a
map of counts.</p>`);
    twoSumCard.appendChild(diagram(`
flowchart LR
    A["nums: 2, 7, 11, 15  target 9"] --> S1["i=0 seen 2:0"]
    S1 --> S2["i=1 need 2 — hit. return 0, 1"]
`, 'One pass: store what you have seen, query the complement of the current value'));
    section.appendChild(twoSumCard);

    section.appendChild(card('⏱️ Complexity', `
<table class="complexity-table">
<tr><th>Operation</th><th>Average</th><th>Worst</th><th>Notes</th></tr>
<tr><td>get / set / delete</td><td>O(1)</td><td>O(n)</td><td>worst case is a single overloaded bucket</td></tr>
<tr><td>iterate</td><td>O(capacity)</td><td>O(capacity)</td><td>Python 3.7+ dicts iterate in insertion order</td></tr>
<tr><td>two-sum</td><td>O(n)</td><td>O(n)</td><td>space O(n) for <code>seen</code></td></tr>
<tr><td>group anagrams</td><td>O(n · k log k)</td><td>same</td><td>k = max word length if you sort; O(n·k) with 26-count tuples</td></tr>
</table>`));

    section.appendChild(card('⚠️ Pitfalls', `
<ul style="padding-left:20px;line-height:1.9;">
<li>Using a mutable object as a key — Python raises; JS coerces objects to
<code>"[object Object]"</code> and silently collides.</li>
<li>Checking <code>if map[key]</code> in JS: misses <code>0</code> and empty string. Use
<code>has</code> / <code>in</code>.</li>
<li>Updating a dict while iterating it — RuntimeError in Python. Snapshot keys first.</li>
<li>Forgetting that <code>defaultdict</code> inserts on read. Membership tests should use
a plain dict or <code>key in d</code> before indexing.</li>
</ul>`));

    section.appendChild(qaCard([
        ['Hash map vs hash set vs tree map?',
            '<p><b>A:</b> Set is a map to a dummy value — membership only. Tree map (sorted dict, TreeMap) gives ordered keys in O(log n) and range queries. Use a hash map unless you need order or the keys are unhashable.</p>'],
        ['How do you handle collisions?',
            '<p><b>A:</b> Chaining (list/tree per bucket) or open addressing (probe). Python uses open addressing with randomized probing. State that load factor triggers a resize, and that <code>hash</code> must be consistent with equality.</p>'],
        ['LRU cache in an interview?',
            '<p><b>A:</b> Hash map from key to node plus a doubly linked list of recency. Get and put are O(1): hash lookup, then splice the node to the front. Capacity eviction pops the tail. That is the standard "hash map + list" combo.</p>'],
    ]));

    container.appendChild(section);
}


export function renderBinaryTree(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Binary Tree'));

    section.appendChild(card('🧠 Mental Model', `
<p>A binary tree is a recursive structure: a node, a left child, a right child. Almost every
problem is "do something to this node, recurse, combine". DFS uses the call stack (or an
explicit stack). BFS uses a queue and processes level by level. If the problem mentions
<em>level</em>, <em>closest</em>, or <em>minimum depth</em>, start with BFS. If it mentions
<em>path</em>, <em>ancestor</em>, or <em>height</em>, start with DFS.</p>
<p><b>Null is a valid tree.</b> The base case is almost always <code>if not node: return
...</code>. Off-by-one on height comes from returning 0 vs -1 for a missing child — pick one
and be consistent (LeetCode height is usually 0 for a leaf's missing child, so a leaf has
height 0 or 1 depending on the problem statement; read it).</p>`));

    const travCard = card('🌲 Traversal order is a position choice', `
<p>Preorder: process, then left, then right (copy a tree, serialize). Inorder: left, process,
right (BST sorted order). Postorder: left, right, process (delete, compute height, evaluate
an expression tree). Level order: queue.</p>`);
    travCard.appendChild(diagram(`
flowchart TD
    A["A"] --> B["B"]
    A --> C["C"]
    B --> D["D"]
    B --> E["E"]
    C --> F["F"]
`, 'Preorder A B D E C F — Inorder D B E A F C — Postorder D E B F C A — BFS A B C D E F'));
    section.appendChild(travCard);

    const dfsBfsCard = card('🔁 DFS recursion vs BFS queue', '');
    dfsBfsCard.appendChild(diagram(`
flowchart TD
    D1["DFS: visit node"] --> D2["recurse left"]
    D2 --> D3["recurse right"]
    D3 --> D4["combine results"]
    Q1["BFS: queue starts with root"] --> Q2["pop front"]
    Q2 --> Q3["push non-null children"]
    Q3 --> Q4["repeat until queue empty"]
`, 'DFS depth is the call stack; BFS width is the queue — both are O(n) time, O(h) vs O(w) space'));
    section.appendChild(dfsBfsCard);

    section.appendChild(card('💻 Code Example', `<pre><code class="language-python">def inorder(node, out):
    if not node:
        return
    inorder(node.left, out)
    out.append(node.val)
    inorder(node.right, out)

from collections import deque
def level_order(root):
    if not root:
        return []
    q, levels = deque([root]), []
    while q:
        level = []
        for _ in range(len(q)):
            n = q.popleft()
            level.append(n.val)
            if n.left: q.append(n.left)
            if n.right: q.append(n.right)
        levels.append(level)
    return levels

def height(node):
    if not node:
        return -1
    return 1 + max(height(node.left), height(node.right))</code></pre>`));

    section.appendChild(card('⚠️ Pitfalls', `
<ul style="padding-left:20px;line-height:1.9;">
<li>Recursing into <code>node.left</code> without a null check — crash. Check, then recurse.</li>
<li>Using a list as a queue with <code>pop(0)</code> — O(n) per pop. Use
<code>deque</code>.</li>
<li>Confusing height and depth. Depth is distance from root; height is distance to a leaf.</li>
<li>Returning early in DFS when you still need to search the other subtree (LCA without
covering both sides).</li>
</ul>`));

    section.appendChild(qaCard([
        ['Recursive vs iterative DFS?',
            '<p><b>A:</b> Same tree walk. Recursion is clearer; the call stack is O(h) and a skewed tree is O(n) and may overflow. Iterative DFS with an explicit stack is the safe production version. Interviews accept either if you mention the skew case.</p>'],
        ['How do you serialize a binary tree?',
            '<p><b>A:</b> Preorder with explicit null markers, or level order with nulls. Deserialize by consuming the same stream. BST serialization can omit nulls if you also store inorder, but a plain binary tree cannot.</p>'],
        ['Diameter of a tree?',
            '<p><b>A:</b> Longest path between any two nodes. At each node, diameter through it is height(left) + height(right) + maybe 2. Compute height in postorder and track a global max so you do not recompute: O(n).</p>'],
    ]));

    container.appendChild(section);
}

export function renderBST(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'BST'));

    section.appendChild(card('🧠 Mental Model', `
<p>A binary search tree adds one invariant: every value in the left subtree is
<code>&lt; node.val</code>, every value in the right is <code>&gt; node.val</code> (or
<code>≤</code> if duplicates are allowed — pin that down). Inorder traversal then emits
sorted order. Search, insert, and min/max are O(h). If the tree is balanced, h = log n;
if you insert sorted data into an unbalanced BST, h = n and you have a linked list.</p>
<p>Self-balancing trees (AVL, red-black, Treap) restore h = O(log n) after each write.
Interviews rarely make you rotate by hand; they do ask you to <em>name</em> the degradation
and to validate / recover the invariant.</p>`));

    const invCard = card('📐 The search path', `
<p>At each node you throw away half the tree <em>if</em> the invariant holds. Validation
cannot only compare a node to its two children — a grandchild on the left can still be
larger than the root. Thread a running <code>(low, high)</code> window down the recursion.</p>`);
    invCard.appendChild(diagram(`
flowchart TD
    R["8"] --> L["3"]
    R --> RG["10"]
    L --> LL["1"]
    L --> LR["6"]
    LR --> A["4"]
    LR --> B["7"]
    RG --> C["14"]
    C --> D["13"]
    S["search 7: 8 to 3 to 6 to 7"]
`, 'Left subtree of 8 is entirely less than 8 — including 7, which is not a direct child'));
    section.appendChild(invCard);

    const valCard = card('✅ Validate with a range, not a local compare', '');
    valCard.appendChild(diagram(`
flowchart TD
    N["node, low, high"] --> C{"low less than val less than high?"}
    C -->|"no"| F["not a BST"]
    C -->|"yes"| L["left: same low, high becomes val"]
    C -->|"yes"| R["right: low becomes val, same high"]
    L --> N2["recurse"]
    R --> N2
`, 'Each child inherits a tighter window; local child checks miss BST violations'));
    section.appendChild(valCard);

    section.appendChild(card('⚡ Common Patterns', `
<table class="complexity-table">
<tr><th>Problem</th><th>Idea</th><th>Time</th></tr>
<tr><td>Search / insert</td><td>walk left or right from the root</td><td>O(h)</td></tr>
<tr><td>Delete</td><td>0 children: drop; 1 child: splice; 2 children: replace with inorder successor</td><td>O(h)</td></tr>
<tr><td>kth smallest</td><td>inorder until you have visited k nodes</td><td>O(h + k)</td></tr>
<tr><td>Lowest common ancestor</td><td>walk down until the nodes split left/right of you</td><td>O(h)</td></tr>
<tr><td>Validate</td><td>range recursion, or inorder must be strictly increasing</td><td>O(n)</td></tr>
<tr><td>Convert sorted array to BST</td><td>midpoint as root, recurse on halves — balanced by construction</td><td>O(n)</td></tr>
</table>`));

    section.appendChild(card('💻 Example', `<pre><code class="language-python">def is_valid_bst(node, low=float("-inf"), high=float("inf")):
    if not node:
        return True
    if not (low &lt; node.val &lt; high):
        return False
    return (is_valid_bst(node.left, low, node.val) and
            is_valid_bst(node.right, node.val, high))

def lca(root, p, q):
    node = root
    while node:
        if p.val &lt; node.val and q.val &lt; node.val:
            node = node.left
        elif p.val &gt; node.val and q.val &gt; node.val:
            node = node.right
        else:
            return node</code></pre>`));

    section.appendChild(qaCard([
        ['BST vs heap?',
            '<p><b>A:</b> BST totally orders the keys (inorder is sorted) and supports successor/predecessor. A heap only orders parent vs children; the minimum is at the root in O(1), but finding an arbitrary key is O(n). Use a heap for priority; a BST (or TreeMap) for sorted sets.</p>'],
        ['Why can insert be O(n)?',
            '<p><b>A:</b> Sorted inserts always go right (or always left). The tree becomes a chain. That is why production maps are red-black or hash tables, not naive BSTs.</p>'],
        ['Inorder successor of a node?',
            '<p><b>A:</b> If it has a right child, the minimum of that subtree. Else walk parents until you come from a left child. In a parent-pointer-free tree, keep the last node you turned left from while searching.</p>'],
    ]));

    container.appendChild(section);
}

export function renderDP(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Dynamic Programming'));

    section.appendChild(card('🧠 Mental Model', `
<p>DP is recursion plus memory, on a DAG of subproblems. You only reach for it when
(1) the problem has <b>optimal substructure</b> — an optimal answer is composed of
optimal answers to smaller instances — and (2) those instances <b>overlap</b>, so a naive
recursion recomputes the same state exponentially often.</p>
<p>The work is naming the state. A state is the tuple of variables that makes the
subproblem well defined. The transition is how a state is built from strictly smaller
states. The base case is the state you can answer without looking anything up. Memoization
fills the DAG top-down; tabulation fills it bottom-up in an order that respects edges.</p>`));

    section.appendChild(card('🎬 DP Pipeline', pipelineStages([
        { name: 'Problem', desc: 'Define what we are solving' },
        { name: 'State', desc: 'What variables define subproblems' },
        { name: 'Transition', desc: 'How to build from smaller subproblems' },
        { name: 'Base Case', desc: 'Trivial case(s)' },
        { name: 'Memo/Tabulation', desc: 'Store and reuse results' },
    ], (i, s) => {
        toast(`Stage ${i + 1}: ${s.name} — ${s.desc}`, 'info');
    })));

    const dagCard = card('🕸️ Overlapping subproblems are a DAG, not a tree', `
<p>Fibonacci without memo is a binary tree of depth n — Θ(φⁿ) calls. With memo it is n
nodes and n edges. That picture is the whole pitch: identify the nodes, then decide
whether to DFS them (memo) or iterate in topological order (table).</p>`);
    dagCard.appendChild(diagram(`
flowchart TD
    F5["F(5)"] --> F4["F(4)"]
    F5 --> F3a["F(3)"]
    F4 --> F3b["F(3)"]
    F4 --> F2a["F(2)"]
    F3a --> F2b["F(2)"]
    F3a --> F1a["F(1)"]
    NOTE["Without memo F(3) and F(2) are computed many times<br/>With memo each oval is filled once"]
`, 'The recursive tree collapses into a DAG the moment you cache by state'));
    section.appendChild(dagCard);

    section.appendChild(card('⚡ Common Patterns', `
<table class="complexity-table">
<tr><th>Pattern</th><th>State (typical)</th><th>Transition sketch</th></tr>
<tr><td>1D reach</td><td><code>dp[i]</code> = best using first i items</td><td>house robber, climb stairs, max subarray</td></tr>
<tr><td>0/1 knapsack</td><td><code>dp[i][w]</code> take or skip item i</td><td><code>max(skip, take + dp[i-1][w-weight])</code></td></tr>
<tr><td>Unbounded knapsack</td><td>same, but item may repeat</td><td>coin change, rod cutting</td></tr>
<tr><td>LCS / edit distance</td><td><code>dp[i][j]</code> prefixes of two strings</td><td>match → diagonal; else min/max of left/up</td></tr>
<tr><td>LIS</td><td>patience sorting / <code>dp[i]</code> ending at i</td><td>O(n²) naive, O(n log n) with tails array</td></tr>
<tr><td>Interval DP</td><td><code>dp[l][r]</code> on a subarray</td><td>burst balloons, matrix chain</td></tr>
<tr><td>Bitmask DP</td><td><code>dp[mask][i]</code></td><td>TSP-style, n ≤ 20</td></tr>
</table>`));

    const knapCard = card('🎒 0/1 knapsack decision', '');
    knapCard.appendChild(diagram(`
flowchart TD
    S["dp at item i, capacity w"] --> Skip["skip item: dp[i-1][w]"]
    S --> Fit{"weight[i] less or equal w?"}
    Fit -->|"no"| Skip
    Fit -->|"yes"| Take["take: value[i] + dp[i-1][w - weight[i]]"]
    Skip --> M["dp[i][w] = max of skip and take"]
    Take --> M
`, 'Each item is a binary choice; the table size is items times capacity'));
    section.appendChild(knapCard);

    section.appendChild(card('💻 Example — coin change (unbounded)', `<pre><code class="language-python">def coin_change(coins, amount):
    inf = amount + 1
    dp = [inf] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c &lt;= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != inf else -1</code></pre>
<p>Order matters: iterating amounts in the outer loop lets a coin be reused (unbounded).
Swap to "for each coin, for a from coin to amount" still unbounded. 0/1 requires iterating
the capacity <em>downward</em> so each item is spent at most once in a rolling array.</p>`));

    section.appendChild(card('⚠️ Pitfalls', `
<ul style="padding-left:20px;line-height:1.9;">
<li>State missing a dimension (forgot remaining capacity, or "did I use the previous house").</li>
<li>Off-by-one on prefixes: <code>dp[i]</code> meaning "first i chars" vs "index i".</li>
<li>Greedy when the DAG needs DP (canonical: coin systems that are not canonical, 0/1 knapsack).</li>
<li>Memoizing on a mutable list used as a key — freeze it to a tuple.</li>
<li>Modifying a rolling 1D array in the wrong direction and accidentally turning 0/1 into unbounded.</li>
</ul>`));

    section.appendChild(qaCard([
        ['Top-down or bottom-up?',
            '<p><b>A:</b> Top-down (memo) only computes reachable states and matches the recurrence you would write on a whiteboard. Bottom-up has no recursion-depth risk and better cache behavior. Start top-down in an interview, then mention how you would fill the table if they ask for space tricks.</p>'],
        ['How do you know it is DP and not greedy?',
            '<p><b>A:</b> If a local best choice can block a better global one, it is not greedy. 0/1 knapsack, coin change with arbitrary denominations, and edit distance all fail exchange arguments. If you can prove an exchange argument, prefer greedy — it is simpler and usually faster.</p>'],
        ['Space optimization?',
            '<p><b>A:</b> If <code>dp[i]</code> depends only on <code>dp[i-1]</code>, keep two rows or one rolling row. Knapsack 0/1 rolls in one array of size capacity, iterating capacity downward. Never optimize space until the 2D solution is correct.</p>'],
    ]));

    container.appendChild(section);
}

export function renderGreedy(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Greedy'));

    section.appendChild(card('🧠 Mental Model', `
<p>A greedy algorithm commits to a locally optimal choice and never revisits it. That is
legal only when you can prove that some globally optimal solution exists that <em>contains</em>
this choice — the exchange argument (or an equivalent matroid / greedy-choice proof).</p>
<p>Sorting is usually the first move: sort intervals by end time, jobs by deadline, edges
by weight. After the sort, a single scan decides. If you find yourself needing to "try
both" at a position, you have left greedy and entered DP or backtracking.</p>`));

    const exCard = card('🔁 Exchange argument, pictured', `
<p>Suppose OPT does not include the greedy pick <code>g</code>. Swap the conflicting piece
of OPT for <code>g</code>. If the new solution is still feasible and no worse, you may
assume OPT contains <code>g</code>, and induction does the rest. If the swap can make OPT
worse, greedy is wrong — that is 0/1 knapsack and most coin systems.</p>`);
    exCard.appendChild(diagram(`
flowchart TD
    G["Greedy picks g first"] --> OPT["Some optimal solution OPT"]
    OPT --> Has{"Does OPT contain g?"}
    Has -->|"yes"| Ind["Induct on the remaining instance"]
    Has -->|"no"| Swap["Swap the conflicting item in OPT for g"]
    Swap --> Feas{"Still feasible and not worse?"}
    Feas -->|"yes"| Ind
    Feas -->|"no"| Fail["Greedy is incorrect for this problem"]
`, 'If you cannot finish this picture, do not ship a greedy solution'));
    section.appendChild(exCard);

    const vsCard = card('⚔️ Greedy vs DP vs backtracking', '');
    vsCard.appendChild(diagram(`
flowchart TD
    Q["Can a local choice be proven safe?"] --> Y["yes: greedy"]
    Q --> N["no"]
    N --> Over{"Overlapping subproblems?"}
    Over -->|"yes"| DP["DP"]
    Over -->|"no"| BT["Backtracking / brute with prune"]
`, 'Greedy is the special case of DP where the recurrence collapses to one surviving choice'));
    section.appendChild(vsCard);

    section.appendChild(card('⚡ Common Patterns', `
<table class="complexity-table">
<tr><th>Pattern</th><th>Sort / pick rule</th><th>Proof flavour</th></tr>
<tr><td>Interval scheduling</td><td>earliest finishing time first</td><td>exchange: the greedy finish frees the most room</td></tr>
<tr><td>Interval merging</td><td>sort by start, extend or push</td><td>linear scan after sort</td></tr>
<tr><td>Jump game I</td><td>track farthest reachable</td><td>monotonic reachability</td></tr>
<tr><td>Huffman coding</td><td>always merge two lightest</td><td>exchange on the tree</td></tr>
<tr><td>MST (Kruskal / Prim)</td><td>lightest edge that does not cycle</td><td>cut property</td></tr>
<tr><td>Gas station / circular tour</td><td>start after the worst prefix deficit</td><td>unique start if total gas ≥ total cost</td></tr>
</table>`));

    section.appendChild(card('💻 Interval scheduling', `<pre><code class="language-python">def max_non_overlapping(intervals):
    intervals.sort(key=lambda x: x[1])  # end time
    count, end = 0, float("-inf")
    for s, e in intervals:
        if s &gt;= end:
            count += 1
            end = e
    return count

def merge(intervals):
    intervals.sort()
    out = []
    for s, e in intervals:
        if not out or s &gt; out[-1][1]:
            out.append([s, e])
        else:
            out[-1][1] = max(out[-1][1], e)
    return out</code></pre>`));

    section.appendChild(card('⚠️ When NOT to use', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>0/1 knapsack</b> — highest value/weight first can pack a mediocre item and block a
better pair. Needs DP.</li>
<li><b>Coin change</b> with arbitrary denominations — 1, 3, 4 and amount 6: greedy 4+1+1
loses to 3+3.</li>
<li><b>Shortest path with negative edges</b> — Dijkstra is greedy and wrong; use Bellman–Ford.</li>
<li><b>Any "must try subsets"</b> problem (subset sum, partition) — no local rule survives.</li>
</ul>`));

    section.appendChild(qaCard([
        ['How do you prove greedy in an interview?',
            '<p><b>A:</b> State the choice, state the invariant after k choices, then the exchange: take an optimal solution that disagrees at the first index, swap, show it is still optimal. If you cannot sketch that in two minutes, switch to DP.</p>'],
        ['Activity selection vs interval covering?',
            '<p><b>A:</b> Selection (max number of non-overlapping) sorts by end time. Covering a timeline with intervals is a different greedy: always pick the interval that extends coverage farthest. Same family, different sort key. Mixing them is a common fail.</p>'],
        ['Is Dijkstra greedy?',
            '<p><b>A:</b> Yes — it settles the closest unsettled node. The proof is an exchange on non-negative weights. Negative edges break the "settled means final" invariant, which is why you mention Bellman–Ford unprompted.</p>'],
    ]));

    container.appendChild(section);
}
