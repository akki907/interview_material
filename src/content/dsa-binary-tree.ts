// src/content/dsa-binary-tree.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-binary-tree",
    title: "Binary Tree",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                `
<p>A binary tree is a recursive structure: a node, a left child, a right child. Almost every
problem is "do something to this node, recurse, combine". DFS uses the call stack (or an
explicit stack). BFS uses a queue and processes level by level. If the problem mentions
<em>level</em>, <em>closest</em>, or <em>minimum depth</em>, start with BFS. If it mentions
<em>path</em>, <em>ancestor</em>, or <em>height</em>, start with DFS.</p>
<p><b>Null is a valid tree.</b> The base case is almost always <code>if not node: return
...</code>. Off-by-one on height comes from returning 0 vs -1 for a missing child — pick one
and be consistent (LeetCode height is usually 0 for a leaf's missing child, so a leaf has
height 0 or 1 depending on the problem statement; read it).</p>`,
        },
        {
            kind: "card",
            title: "🌲 Traversal order is a position choice",
            html:
                `
<p>Preorder: process, then left, then right (copy a tree, serialize). Inorder: left, process,
right (BST sorted order). Postorder: left, right, process (delete, compute height, evaluate
an expression tree). Level order: queue.</p>`,
        },
        {
            kind: "diagram",
            caption: "Preorder A B D E C F — Inorder D B E A F C — Postorder D E B F C A — BFS A B C D E F",
            source:
                `
flowchart TD
    A["A"] --> B["B"]
    A --> C["C"]
    B --> D["D"]
    B --> E["E"]
    C --> F["F"]
`,
        },
        {
            kind: "card",
            title: "🔁 DFS recursion vs BFS queue",
        },
        {
            kind: "diagram",
            caption: "DFS depth is the call stack; BFS width is the queue — both are O(n) time, O(h) vs O(w) space",
            source:
                `
flowchart TD
    D1["DFS: visit node"] --> D2["recurse left"]
    D2 --> D3["recurse right"]
    D3 --> D4["combine results"]
    Q1["BFS: queue starts with root"] --> Q2["pop front"]
    Q2 --> Q3["push non-null children"]
    Q3 --> Q4["repeat until queue empty"]
`,
        },
        {
            kind: "interactive",
            algo: "binary-tree",
            html:
                `Insert each value into a BST and watch where it lands, then walk the tree in-order and see the sorted result fall out.`,
        },
        {
            kind: "code",
            title: "💻 Code Example",
            language: "python",
            code:
                `def inorder(node, out):
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
    return 1 + max(height(node.left), height(node.right))`,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls",
            html:
                `
<ul style="padding-left:20px;line-height:1.9;">
<li>Recursing into <code>node.left</code> without a null check — crash. Check, then recurse.</li>
<li>Using a list as a queue with <code>pop(0)</code> — O(n) per pop. Use
<code>deque</code>.</li>
<li>Confusing height and depth. Depth is distance from root; height is distance to a leaf.</li>
<li>Returning early in DFS when you still need to search the other subtree (LCA without
covering both sides).</li>
</ul>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Recursive vs iterative DFS?",
                    a: "<p><b>A:</b> Same tree walk. Recursion is clearer; the call stack is O(h) and a skewed tree is O(n) and may overflow. Iterative DFS with an explicit stack is the safe production version. Interviews accept either if you mention the skew case.</p>",
                },
                {
                    q: "How do you serialize a binary tree?",
                    a: "<p><b>A:</b> Preorder with explicit null markers, or level order with nulls. Deserialize by consuming the same stream. BST serialization can omit nulls if you also store inorder, but a plain binary tree cannot.</p>",
                },
                {
                    q: "Diameter of a tree?",
                    a: "<p><b>A:</b> Longest path between any two nodes. At each node, diameter through it is height(left) + height(right) + maybe 2. Compute height in postorder and track a global max so you do not recompute: O(n).</p>",
                },
            ],
        },
    ],
});
