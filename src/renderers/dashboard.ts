// src/renderers/dashboard.ts
import { h, escHtml } from '../utils';
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

    section.appendChild(h('h3', { style: 'font-size:0.95rem;margin:20px 0 8px;' }, '🎯 Priority Study Goals'));
    const todosCard = h('div', { className: 'card dashboard-todos-card' });
    const renderDashboardTodos = () => {
        todosCard.innerHTML = '';
        const allTodos = Store.getTodos();
        const activeTodos = allTodos.filter(t => !t.completed);
        const topTodos = [...activeTodos].sort((a, b) => {
            const prioWeight = { high: 3, medium: 2, low: 1 };
            return prioWeight[b.priority] - prioWeight[a.priority];
        }).slice(0, 4);

        if (topTodos.length === 0) {
            todosCard.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <p style="color:var(--text-muted);font-size:0.9rem;">🎉 All study goals completed! Great work.</p>
                    <button class="btn btn-sm btn-primary" id="dash-open-todos">Manage Goals</button>
                </div>
            `;
            todosCard.querySelector('#dash-open-todos')?.addEventListener('click', () => window.navigateTo('todos'));
        } else {
            const list = h('div', { className: 'dash-todo-list' });
            topTodos.forEach(t => {
                const item = h('div', { className: 'dash-todo-item' });
                const prioEmoji = t.priority === 'high' ? '🔥' : t.priority === 'medium' ? '⚡' : '☕';
                item.innerHTML = `
                    <button class="todo-check-btn ${t.completed ? 'checked' : ''}" title="Mark complete">${t.completed ? '✓' : ''}</button>
                    <div class="dash-todo-text">
                        <span class="tag tag-${t.category === 'dsa' ? 'blue' : t.category === 'react' ? 'cyan' : t.category === 'ai' ? 'purple' : 'gray'}" style="font-size:0.7rem;padding:2px 6px;">${t.category.toUpperCase()}</span>
                        <span style="font-size:0.85rem;margin-left:6px;">${escHtml(t.title)}</span>
                    </div>
                    <span style="font-size:0.8rem;color:var(--muted);">${prioEmoji}</span>
                `;
                item.querySelector('.todo-check-btn')!.addEventListener('click', () => {
                    Store.toggleTodo(t.id);
                    renderDashboardTodos();
                });
                list.appendChild(item);
            });
            todosCard.appendChild(list);

            const footer = h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:8px;border-top:1px solid var(--rule);' });
            footer.innerHTML = `
                <span style="font-size:0.8rem;color:var(--muted);">${activeTodos.length} goal(s) remaining</span>
                <button class="btn btn-sm btn-primary" id="dash-view-all-todos">View & Manage Goals →</button>
            `;
            footer.querySelector('#dash-view-all-todos')!.addEventListener('click', () => window.navigateTo('todos'));
            todosCard.appendChild(footer);
        }
    };
    renderDashboardTodos();
    section.appendChild(todosCard);

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
    ['todos', 'dsa-sliding-window', 'react-hooks', 'ai-rag', 'interview'].forEach(id => {
        const label = id === 'todos' ? '✅ Study Todos' : 'Go to ' + id.split('-').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
        const btn = h('button', { className: 'btn', textContent: label });
        btn.addEventListener('click', () => window.navigateTo(id));
        qa.appendChild(btn);
    });
    section.appendChild(qa);

    container.appendChild(section);
}
