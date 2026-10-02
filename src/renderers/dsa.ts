// src/renderers/dsa.ts — DSA topic renderers
import { h, toast } from '../utils';
import { card, pipelineStages } from '../components';


export function renderStrings(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Strings'));
    section.appendChild(card('🧠 Mental Model', 'Character-level processing. Patterns: sliding window, KMP, Rabin-Karp, Trie.'));
    section.appendChild(card('⚡ Common Patterns', 'Palindrome checks, anagram detection, substring search, run-length encoding.'));
    container.appendChild(section);
}

export function renderHashMaps(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Hash Maps'));
    section.appendChild(card('🧠 Mental Model', 'O(1) average lookup. Use for frequency counting, deduplication, complement problems.'));
    section.appendChild(card('💻 Code Example', `<pre><code class="language-python">from collections import Counter
freq = Counter(nums)
# Two-sum pattern: complement = target - num</code></pre>`));
    section.appendChild(card('⏱️ Complexity', '<table class="complexity-table"><tr><th>Time</th><th>Space</th></tr><tr><td>O(n)</td><td>O(n)</td></tr></table>'));
    container.appendChild(section);
}


export function renderBinaryTree(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Binary Tree'));
    section.appendChild(card('🧠 Mental Model', 'Recursive structure. DFS (pre/in/post-order) and BFS (level-order).'));
    section.appendChild(card('🎬 Traversal Animation', '<div id="bt-viz" class="viz-area"></div>'));
    section.appendChild(card('💻 Code Example', `<pre><code class="language-python"># Inorder traversal (LVR)
def inorder(node):
    if not node: return
    inorder(node.left)
    print(node.val)
    inorder(node.right)</code></pre>`));
    container.appendChild(section);
}

export function renderBST(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'BST'));
    section.appendChild(card('🧠 Mental Model', 'Left < Root < Right. O(log n) operations when balanced.'));
    section.appendChild(card('⚡ Common Patterns', 'Validate BST, find kth smallest, lowest common ancestor, serialize/deserialize.'));
    container.appendChild(section);
}

export function renderDP(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Dynamic Programming'));
    section.appendChild(card('🧠 Mental Model', 'Problem → State → Transition → Base Case → Memoization/Tabulation'));

    section.appendChild(card('🎬 DP Pipeline', pipelineStages([
        { name: 'Problem', desc: 'Define what we are solving' },
        { name: 'State', desc: 'What variables define subproblems' },
        { name: 'Transition', desc: 'How to build from smaller subproblems' },
        { name: 'Base Case', desc: 'Trivial case(s)' },
        { name: 'Memo/Tabulation', desc: 'Store and reuse results' },
    ], (i, s) => {
        toast(`Stage ${i+1}: ${s.name} — ${s.desc}`, 'info');
    })));

    section.appendChild(card('⚡ Common Patterns', '0/1 Knapsack, LCS, LIS, Coin Change, Subset Sum, House Robber, Edit Distance.'));
    container.appendChild(section);
}

export function renderGreedy(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Greedy'));
    section.appendChild(card('🧠 Mental Model', 'Make locally optimal choice at each step. Prove with exchange argument.'));
    section.appendChild(card('⚡ Common Patterns', 'Activity selection, Huffman coding, minimum spanning tree, interval scheduling.'));
    section.appendChild(card('⚠️ When NOT to use', 'When local optimum ≠ global optimum (e.g., 0/1 knapsack).'));
    container.appendChild(section);
}
