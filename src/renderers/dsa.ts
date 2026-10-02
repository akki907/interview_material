// src/renderers/dsa.ts — DSA topic renderers
import { h, toast } from '../utils';
import { card, stepControls, pipelineStages } from '../components';

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

export function renderSlidingWindow(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Sliding Window'));

    section.appendChild(card('🧠 Mental Model', 'A window that slides over an array/string to find a subarray meeting certain constraints. Maintain two pointers (left, right) and expand/shrink the window.'));

    const vizCard = card('🎬 Visualization', '<div id="sw-viz" class="viz-area" style="position:relative;"></div>');
    section.appendChild(vizCard);

    const controls = h('div', { id: 'sw-controls' });
    section.appendChild(controls);

    section.appendChild(card('⚡ Optimized Approach', 'Expand right pointer to include elements. When window violates constraint, shrink from left. Track result as you go.', { id: 'sw-opt' }));

    section.appendChild(card('💻 Code Example', `<pre><code class="language-javascript">${SLIDING_WINDOW_CODE}</code></pre>`));

    section.appendChild(card('⏱️ Complexity', '<table class="complexity-table"><tr><th>Time</th><th>Space</th></tr><tr><td>O(n)</td><td>O(min(n, m))</td></tr></table>'));

    section.appendChild(card('🔥 Real-World Usage', 'Substring problems, log analysis, sensor data windows, rate limiting, network packet inspection.'));

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

export function renderTwoPointers(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Two Pointers'));
    section.appendChild(card('🧠 Mental Model', 'Two indices moving toward each other (or same direction) to find pairs/splits that satisfy a condition. Common on sorted arrays.'));
    section.appendChild(card('💻 Code Example', `<pre><code class="language-python">def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target: return [left + 1, right + 1]
        elif s < target: left += 1
        else: right -= 1
    return [-1, -1]</code></pre>`));
    section.appendChild(card('⏱️ Complexity', '<table class="complexity-table"><tr><th>Time</th><th>Space</th></tr><tr><td>O(n)</td><td>O(1)</td></tr></table>'));
    container.appendChild(section);
}

export function renderArrays(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Arrays'));
    section.appendChild(card('🧠 Mental Model', 'Contiguous memory, O(1) index access. Key patterns: prefix sum, two pointers, sliding window, Kadane\'s algorithm.'));
    section.appendChild(card('⚡ Common Patterns', "Prefix sum (range queries), Kadane's algorithm (max subarray), Dutch National Flag (sort 0/1/2)."));
    section.appendChild(card('💻 Code Example', `<pre><code class="language-javascript">// Prefix Sum
const prefix = [0];
for (let i = 0; i < nums.length; i++) {
    prefix.push(prefix[i] + nums[i]);
}
// Range sum [l, r] = prefix[r+1] - prefix[l]</code></pre>`));
    container.appendChild(section);
}

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

let stackData = [10, 20, 30, 40, 50];
function renderStackViz(): void {
    const viz = document.getElementById('stack-viz');
    if (!viz) return;
    let html = '<div style="display:flex;gap:8px;align-items:flex-end;height:120px;">';
    stackData.forEach((v, i) => {
        const isTop = i === stackData.length - 1;
        html += `<div style="width:50px;height:${v * 1.2}px;background:${isTop ? 'var(--accent)' : 'var(--bg-tertiary)'};border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;color:white;border:2px solid ${isTop ? 'var(--accent-light)' : 'var(--border)'};">${v}</div>`;
    });
    html += '</div>';
    viz.innerHTML = html;
}

export function renderStack(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Stack'));
    section.appendChild(card('🧠 Mental Model', 'LIFO. Monotonic stack for next greater/smaller element. Parenthesis matching.'));

    const vizCard = card('🎬 Push/Pop Animation', '<div id="stack-viz" class="viz-area"></div>');
    section.appendChild(vizCard);

    const btnGroup = h('div', { className: 'btn-group' });
    const pushBtn = h('button', { className: 'btn', textContent: 'Push' });
    pushBtn.addEventListener('click', () => {
        stackData.push(Math.floor(Math.random() * 100) + 1);
        renderStackViz();
    });
    const popBtn = h('button', { className: 'btn', textContent: 'Pop' });
    popBtn.addEventListener('click', () => {
        if (stackData.length > 0) stackData.pop();
        renderStackViz();
    });
    btnGroup.appendChild(pushBtn);
    btnGroup.appendChild(popBtn);
    section.appendChild(btnGroup);

    section.appendChild(card('💻 Code Example', `<pre><code class="language-javascript">// Monotonic Increasing Stack
const stack = [];
for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length-1]] > nums[i]) {
        stack.pop();
    }
    stack.push(i);
}</code></pre>`));
    container.appendChild(section);

    setTimeout(renderStackViz, 100);
}

export function renderQueue(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Queue'));
    section.appendChild(card('🧠 Mental Model', 'FIFO. Use for BFS, level-order traversal, rate limiting.'));
    section.appendChild(card('💻 Code Example', `<pre><code class="language-javascript">// Deque (double-ended queue)
const dq = [];
dq.push(1);  // enqueue
dq.shift();  // dequeue
dq.unshift(0); // prepend
dq.pop();    // remove last</code></pre>`));
    container.appendChild(section);
}

export function renderLinkedList(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Linked List'));
    section.appendChild(card('🧠 Mental Model', 'Nodes with pointers. Fast/slow pointer for cycle detection. Reverse in-place.'));
    section.appendChild(card('⚡ Common Patterns', 'Cycle detection (Floyd\'s algorithm), reverse linked list, merge two sorted lists, skip N from end.'));
    section.appendChild(card('🎬 Animation', '<div id="ll-viz" class="viz-area" style="position:relative;"></div>'));
    container.appendChild(section);

    setTimeout(() => {
        const viz = document.getElementById('ll-viz');
        if (!viz) return;
        const nodes = ['A', 'B', 'C', 'D'];
        viz.innerHTML = nodes.map((n, _i) =>
            `<span style="display:inline-flex;align-items:center;padding:8px 16px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;margin:4px;font-weight:600;">${n}</span><span style="color:var(--accent);margin:0 4px;">→</span>`
        ).join('');
    }, 100);
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

export function renderHeap(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Heap'));
    section.appendChild(card('🧠 Mental Model', 'Complete binary tree. Min-heap: parent ≤ children. Max-heap: parent ≥ children.'));
    section.appendChild(card('⚡ Common Patterns', 'Top K, merge sorted runs, median finder, task scheduler.'));
    section.appendChild(card('💻 Code Example', `<pre><code class="language-python">import heapq
# Min-heap
heapq.heappush(heap, val)
smallest = heapq.heappop(heap)
# Max-heap (negate values)
heapq.heappush(max_heap, -val)</code></pre>`));
    container.appendChild(section);
}

export function renderGraph(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Graph'));
    section.appendChild(card('🧠 Mental Model', 'Nodes + edges. BFS for shortest path (unweighted). DFS for connectivity. Dijkstra for weighted.'));
    section.appendChild(card('⚡ Common Patterns', 'BFS/DFS, topological sort, union-find, Dijkstra, Bellman-Ford, Floyd-Warshall.'));
    container.appendChild(section);
}

export function renderBacktracking(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Backtracking'));
    section.appendChild(card('🧠 Mental Model', 'Explore all possibilities, backtrack when invalid. DFS on decision tree.'));
    section.appendChild(card('💻 Code Example', `<pre><code class="language-python">def backtrack(path, choices):
    if is_valid_solution(path):
        result.append(path[:])
        return
    for c in choices:
        path.append(c)
        backtrack(path, choices)
        path.pop()</code></pre>`));
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
