// src/search.ts — Global search
import { NAV, INTERVIEW_QUESTIONS } from './data';
import { navigateTo } from './nav';
import { Store } from './store';

interface Searchable {
    id: string;
    title: string;
    cat: string;
}

export function initSearch(): void {
    const input = document.getElementById('search-input') as HTMLInputElement;
    const results = document.getElementById('search-results')!;

    const searchable: Searchable[] = [];
    NAV.forEach(g => {
        if (g.children) {
            g.children.forEach(c => searchable.push({ id: c.id, title: c.label, cat: g.label.split(' ')[0] }));
        } else {
            searchable.push({ id: g.id, title: g.label, cat: 'General' });
        }
    });
    INTERVIEW_QUESTIONS.forEach(q => searchable.push({ id: 'interview-' + q.topic, title: q.question, cat: 'Interview' }));

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        if (q.length < 2) { results.classList.add('hidden'); return; }
        const currentSearchable = [...searchable];
        try {
            Store.getTodos().forEach(t => {
                currentSearchable.push({ id: 'todos', title: `[Todo] ${t.title}`, cat: 'Todos' });
            });
        } catch { /* ignore if store unavailable */ }
        const matches = currentSearchable.filter(s => s.title.toLowerCase().includes(q));
        if (matches.length === 0) {
            results.innerHTML = '<div class="search-result-item"><span style="color:var(--text-muted)">No results</span></div>';
        } else {
            results.innerHTML = matches.map(m =>
                `<div class="search-result-item" data-id="${m.id}">
                    <div class="sr-cat">${m.cat}</div>
                    <div class="sr-title">${m.title}</div>
                </div>`
            ).join('');
        }
        results.classList.remove('hidden');

        results.querySelectorAll<HTMLElement>('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                navigateTo(el.dataset.id!);
                results.classList.add('hidden');
                input.value = '';
            });
        });
    });

    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            input.focus();
        }
        if (e.key === 'Escape') {
            results.classList.add('hidden');
            input.blur();
        }
    });
}
