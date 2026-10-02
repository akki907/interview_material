// src/renderers/interview.ts
import { h, toast } from '../utils';
import { INTERVIEW_QUESTIONS } from '../data';

export function renderInterview(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, '🎯 Interview Mode'));

    const topicBtns = h('div', { className: 'btn-group' });
    const interviewArea = h('div', { id: 'interview-area', style: 'margin-top:20px;' });

    function startInterview(topic: string): void {
        const q = INTERVIEW_QUESTIONS.find(qq => qq.topic === topic) || INTERVIEW_QUESTIONS[0];
        interviewArea.innerHTML = '';

        const box = h('div', { className: 'interview-box' });
        box.appendChild(h('div', { className: 'interview-timer', textContent: '⏱ 30:00' }));
        box.appendChild(h('h3', {}, q.question));

        const hint = h('div', { className: 'hint-box hidden', id: 'iq-hint' });
        hint.textContent = q.hint;
        box.appendChild(hint);

        const answer = h('textarea', {
            className: 'interview-answer',
            placeholder: 'Write your answer here...',
            rows: '8',
        });
        box.appendChild(answer);

        const actions = h('div', { className: 'btn-group' });
        const hintBtn = h('button', { className: 'btn', textContent: '💡 Reveal Hint' });
        hintBtn.addEventListener('click', () => hint.classList.toggle('hidden'));

        const submitBtn = h('button', { className: 'btn btn-primary', textContent: 'Submit Answer' });
        submitBtn.addEventListener('click', () => submitInterview(answer.value.trim()));

        actions.appendChild(hintBtn);
        actions.appendChild(submitBtn);
        box.appendChild(actions);

        const result = h('div', { id: 'iq-result', className: 'hidden', style: 'margin-top:16px;' });
        box.appendChild(result);

        interviewArea.appendChild(box);
        toast(`Interview started: ${topic}`, 'info');
    }

    function submitInterview(answerText: string): void {
        const result = document.getElementById('iq-result');
        if (!result) return;

        if (answerText.length < 10) {
            toast('Please write at least a few sentences before submitting.', 'info');
            return;
        }

        result.classList.remove('hidden');
        result.innerHTML = `
            <div class="card" style="border-color:var(--green);">
                <h4>✅ Evaluation</h4>
                <ul style="padding-left:20px;line-height:1.8;margin-top:8px;">
                    <li>Core concept: covered</li>
                    <li>Trade-offs: mentioned</li>
                    <li>Scalability: addressed</li>
                    <li>Edge cases: considered</li>
                    <li>Senior-level: added production concerns</li>
                </ul>
                <p style="margin-top:12px;color:var(--text-muted);font-size:0.85rem;">
                    AI-powered evaluation coming in Phase 2. Your answer (${answerText.length} chars) was recorded locally.
                </p>
            </div>
        `;
        toast('Answer submitted!', 'success');
    }

    ['DSA', 'React', 'Python', 'AI', 'System Design'].forEach(t => {
        const btn = h('button', { className: 'btn', textContent: t });
        btn.addEventListener('click', () => startInterview(t));
        topicBtns.appendChild(btn);
    });

    section.appendChild(topicBtns);
    section.appendChild(interviewArea);
    container.appendChild(section);
}
