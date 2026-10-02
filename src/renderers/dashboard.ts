// src/renderers/dashboard.ts
import { h } from '../utils';
import { Store } from '../store';
import { PROGRESS, STATS, WEAK_AREAS, RECENTLY_STUDIED } from '../data';
import { progressBar } from '../components';

export function renderDashboard(container: HTMLElement): void {
    const prog = Store.getProgress();
    const p = { ...PROGRESS, ...prog };

    const section = h('div', { className: 'page-enter' });

    section.appendChild(h('h2', { style: 'margin-bottom:4px;' }, 'Your Engineering Journey'));
    section.appendChild(h('p', { style: 'color:var(--text-muted);margin-bottom:20px;' }, 'Track your progress across all areas'));

    const statsGrid = h('div', { className: 'stats-grid' });
    const stats = [
        { label: 'Problems Solved', value: STATS.problemsSolved, color: 'var(--accent)' },
        { label: 'Topics Done', value: STATS.topicsCompleted, color: 'var(--green)' },
        { label: 'Current Streak', value: STATS.streak + ' 🔥', color: 'var(--orange)' },
        { label: 'Learning Hours', value: STATS.learningHours, color: 'var(--yellow)' },
    ];
    stats.forEach(s => {
        const sc = h('div', { className: 'stat-card' });
        sc.innerHTML = `<div class="stat-value" style="color:${s.color}">${s.value}</div><div class="stat-label">${s.label}</div>`;
        statsGrid.appendChild(sc);
    });
    section.appendChild(statsGrid);

    section.appendChild(h('h3', { style: 'font-size:0.95rem;margin:20px 0 12px;' }, 'Progress by Topic'));
    const labels = ['dsa', 'react', 'python', 'ai', 'design'];
    const colors = ['dsa', 'react', 'python', 'ai', 'design'];
    const labelNames = ['DSA', 'React', 'Python', 'AI Engineering', 'System Design'];
    labels.forEach((l, i) => {
        section.appendChild(progressBar(labelNames[i], p[l] || 0, colors[i]));
    });

    section.appendChild(h('h3', { style: 'font-size:0.95rem;margin:20px 0 8px;' }, '⚠️ Weak Areas'));
    const weakList = h('ul', { className: 'weak-list' });
    WEAK_AREAS.forEach(a => { const li = h('li', { textContent: a }); weakList.appendChild(li); });
    section.appendChild(weakList);

    section.appendChild(h('h3', { style: 'font-size:0.95rem;margin:20px 0 8px;' }, '📚 Recently Studied'));
    const recentWrap = h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;' });
    RECENTLY_STUDIED.forEach(t => {
        const tag = h('span', { className: 'tag tag-blue', textContent: t });
        recentWrap.appendChild(tag);
    });
    section.appendChild(recentWrap);

    section.appendChild(h('h3', { style: 'font-size:0.95rem;margin:20px 0 8px;' }, 'Quick Actions'));
    const qa = h('div', { className: 'btn-group' });
    ['dsa-sliding-window', 'react-hooks', 'ai-rag', 'interview'].forEach(id => {
        const btn = h('button', { className: 'btn', textContent: 'Go to ' + id.split('-').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ') });
        btn.addEventListener('click', () => window.navigateTo(id));
        qa.appendChild(btn);
    });
    section.appendChild(qa);

    container.appendChild(section);
}
