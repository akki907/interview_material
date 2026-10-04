// src/content/dsa-bst.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-bst",
    title: "BST",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html:
                `
<p>A binary search tree adds one invariant: every value in the left subtree is
<code>&lt; node.val</code>, every value in the right is <code>&gt; node.val</code> (or
<code>≤</code> if duplicates are allowed — pin that down). Inorder traversal then emits
sorted order. Search, insert, and min/max are O(h). If the tree is balanced, h = log n;
if you insert sorted data into an unbalanced BST, h = n and you have a linked list.</p>
<p>Self-balancing trees (AVL, red-black, Treap) restore h = O(log n) after each write.
Interviews rarely make you rotate by hand; they do ask you to <em>name</em> the degradation
and to validate / recover the invariant.</p>`,
        },
        {
            kind: "card",
            title: "The search path",
            html:
                `
<p>At each node you throw away half the tree <em>if</em> the invariant holds. Validation
cannot only compare a node to its two children — a grandchild on the left can still be
larger than the root. Thread a running <code>(low, high)</code> window down the recursion.</p>`,
        },
        {
            kind: "diagram",
            caption: "Left subtree of 8 is entirely less than 8 — including 7, which is not a direct child",
            source:
                `
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
`,
        },
        {
            kind: "card",
            title: "Validate with a range, not a local compare",
        },
        {
            kind: "diagram",
            caption: "Each child inherits a tighter window; local child checks miss BST violations",
            source:
                `
flowchart TD
    N["node, low, high"] --> C{"low less than val less than high?"}
    C -->|"no"| F["not a BST"]
    C -->|"yes"| L["left: same low, high becomes val"]
    C -->|"yes"| R["right: low becomes val, same high"]
    L --> N2["recurse"]
    R --> N2
`,
        },
        {
            kind: "table",
            title: "Common Patterns",
            headers: ["Problem", "Idea", "Time"],
            rows:
                                    [
                        [
                            "Search / insert",
                            "walk left or right from the root",
                            "O(h)",
                        ],
                        [
                            "Delete",
                            "0 children: drop; 1 child: splice; 2 children: replace with inorder successor",
                            "O(h)",
                        ],
                        [
                            "kth smallest",
                            "inorder until you have visited k nodes",
                            "O(h + k)",
                        ],
                        [
                            "Lowest common ancestor",
                            "walk down until the nodes split left/right of you",
                            "O(h)",
                        ],
                        [
                            "Validate",
                            "range recursion, or inorder must be strictly increasing",
                            "O(n)",
                        ],
                        [
                            "Convert sorted array to BST",
                            "midpoint as root, recurse on halves — balanced by construction",
                            "O(n)",
                        ],
                    ],
        },
        {
            kind: "code",
            title: "Example",
            language: "python",
            code:
                `def is_valid_bst(node, low=float("-inf"), high=float("inf")):
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
            return node`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "BST vs heap?",
                    a: "<p><b>A:</b> BST totally orders the keys (inorder is sorted) and supports successor/predecessor. A heap only orders parent vs children; the minimum is at the root in O(1), but finding an arbitrary key is O(n). Use a heap for priority; a BST (or TreeMap) for sorted sets.</p>",
                },
                {
                    q: "Why can insert be O(n)?",
                    a: "<p><b>A:</b> Sorted inserts always go right (or always left). The tree becomes a chain. That is why production maps are red-black or hash tables, not naive BSTs.</p>",
                },
                {
                    q: "Inorder successor of a node?",
                    a: "<p><b>A:</b> If it has a right child, the minimum of that subtree. Else walk parents until you come from a left child. In a parent-pointer-free tree, keep the last node you turned left from while searching.</p>",
                },
            ],
        },
    ],
});
