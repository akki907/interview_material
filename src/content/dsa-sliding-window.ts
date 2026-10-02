// src/content/dsa-sliding-window.ts
import { registerContent } from './registry';

registerContent({
    id: 'dsa-sliding-window',
    title: 'Sliding Window',
    intro:
        'Replace enumeration of every subarray with enumeration of only the ones that can win — the O() ' +
        'delta comes from each index entering the window exactly once and leaving it exactly once.',
    blocks: [
        {
            kind: 'callout',
            tone: 'c1',
            title: 'The invariant that makes it correct',
            html:
                '<p>After the shrink loop finishes, <code>s[left..right]</code> is the <strong>shortest</strong> ' +
                'window ending at <code>right</code> that satisfies the constraint. Any longer window ending ' +
                'earlier was already recorded, so no candidate is ever skipped by moving <code>left</code> forward.</p>' +
                '<p>That invariant only survives if shrinking is <strong>monotone</strong>: once a start index ' +
                'becomes invalid, every later start index that includes it is invalid too. On non-monotone ' +
                'input (negative numbers) the technique does not apply.</p>',
        },
        {
            kind: 'diagram',
            caption:
                'Expand always runs n times; Shrink runs at most n times across the whole scan',
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
        {
            kind: 'code',
            title: 'Longest substring without repeating characters',
            language: 'javascript',
            code: `function lengthOfLongestSubstring(s) {
    const set = new Set();
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
}`,
            notes:
                '<ul><li><strong>The set is the window.</strong> It holds exactly <code>s[left..right]</code> ' +
                'and nothing more.</li>' +
                '<li><strong>Delete before increment.</strong> Swap those two lines and you evict the wrong ' +
                'element — the symptom is an infinite loop on inputs with three identical characters in a row.</li>' +
                '<li><strong>Record inside the loop.</strong> Windows valid only at an intermediate ' +
                '<code>right</code> never come back, so there is no second pass.</li></ul>',
        },
        {
            kind: 'table',
            title: '📏 Fixed-size vs variable-size window',
            headers: ['Aspect', 'Fixed size (exactly <code>k</code>)', 'Variable size (constraint-driven)'],
            rows: [
                [
                    'Pointer movement',
                    '<code>right</code> always advances; <code>left = right - k + 1</code>',
                    'Both pointers advance; which one moves depends on the constraint',
                ],
                [
                    'Answer per step',
                    'Always well defined — the window is valid by construction',
                    'Only well defined <em>after</em> the shrink loop drains',
                ],
                [
                    'Monotonicity needed',
                    'None',
                    '<strong>Required</strong> — shrinking a valid start only makes it worse',
                ],
                [
                    'Failure mode',
                    'Off-by-one when the input is shorter than <code>k</code>',
                    'Recording before shrinking; unbounded <code>left</code> drift on non-monotone input',
                ],
                [
                    'Canonical problem',
                    'Max sum of any <code>k</code> consecutive elements',
                    'Longest substring without repeating characters',
                ],
            ],
        },
        {
            kind: 'callout',
            tone: 'c3',
            title: 'Where positivity breaks the greedy shrink',
            html:
                '<p>The classic subarray variant ("smallest contiguous subarray summing to at least ' +
                '<code>target</code>") only works on <strong>non-negative</strong> numbers, because removing the ' +
                'left element must decrease the sum. Put a <code>-3</code> in the array and the greedy shrink ' +
                'stops being safe — use prefix sums plus a map of running totals instead.</p>',
        },
        {
            kind: 'qa',
            items: [
                {
                    q: 'Longest substring without repeating characters?',
                    a: '<p>Expand <code>right</code>; while the incoming character already exists in the ' +
                        'window, drop <code>s[left]</code> and advance. Track the max window length.</p>' +
                        '<p><strong>O(n)</strong> time, <strong>O(k)</strong> space where <code>k</code> is the ' +
                        'alphabet size.</p>',
                    level: 1,
                    probing: 'Whether you can state why the total work is O(n) despite the nested while loop.',
                    followUp: 'Ask: "why is the set exactly the window?" — that equivalence is the whole algorithm.',
                },
                {
                    q: 'Minimum window substring — what changes?',
                    a: '<p>The shrink loop becomes a <code>while</code> that keeps shrinking <em>while the sum is ' +
                        'still valid</em>, updating the best answer on each iteration rather than once at the end. ' +
                        'Still O(n) amortized for non-negative input.</p>',
                    level: 2,
                    probing: 'Moving the record step inside the shrink loop — recording after is the classic bug.',
                    followUp: '"What if the numbers can be negative?" — the answer is prefix sums + hashmap.',
                },
                {
                    q: 'Longest repeating character replacement?',
                    a: '<p>Slide a window while <code>windowLength - maxFrequency &gt; k</code>, where ' +
                        '<code>maxFrequency</code> is the highest single-character count <em>seen so far</em>, not ' +
                        'the highest in the current window.</p>' +
                        '<p>Not shrinking <code>maxFrequency</code> is what keeps it O(n); it is a valid lazy bound ' +
                        'because a stale overestimate only ever gives a window that is valid for some earlier ' +
                        'prefix.</p>',
                    level: 3,
                    probing: 'Whether you deliberately keep a stale maxFrequency and can justify it.',
                    followUp: '"Prove it is O(n)." — right advances n times, left at most n times.',
                },
                {
                    q: 'Minimum window substring with the two-pointer pattern applied to an array, not a string?',
                    a: '<p>Identical machinery; the window is <code>nums[left..right]</code> and the constraint is ' +
                        'a predicate over the window (sum &ge; target, product &le; limit, count of a value ' +
                        '&ge; k). Nothing about the technique is string-specific.</p>',
                    level: 3,
                    probing: 'Generalization: recognising the invariant, not the problem statement.',
                    followUp: '"What if the constraint needs a rolling aggregate?" — prefix sums or a BIT.',
                },
            ],
        },
    ],
});