// src/renderers/flashcards.ts
import { h, escHtml } from '../utils';
import { FLASHCARDS } from '../data';
import { card } from '../components';

export function renderFlashcards(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, '📇 Flashcards'));

    const catFilters = h('div', { className: 'btn-group' });
    const cats = ['All', ...new Set(FLASHCARDS.map(f => f.cat))];
    let currentFilter = 'All';
    let currentIdx = 0;

    cats.forEach(c => {
        const btn = h('button', { className: 'btn' + (c === 'All' ? ' btn-primary' : ''), textContent: c });
        btn.addEventListener('click', () => {
            currentFilter = c;
            currentIdx = 0;
            renderFiltered();
            catFilters.querySelectorAll('.btn').forEach(b => { b.classList.remove('btn-primary'); });
            btn.classList.add('btn-primary');
        });
        catFilters.appendChild(btn);
    });
    section.appendChild(catFilters);

    const filtered = () => currentFilter === 'All' ? FLASHCARDS : FLASHCARDS.filter(f => f.cat === currentFilter);

    function renderFiltered(): void {
        const cards = filtered();
        if (cards.length === 0) {
            section.appendChild(h('p', { textContent: 'No flashcards in this category.' }));
            return;
        }
        const fc = cards[currentIdx % cards.length];
        const front = h('div', { className: 'flashcard-front' });
        front.innerHTML = `<h3>${escHtml(fc.front)}</h3><p style="color:var(--text-muted);margin-top:8px;font-size:0.8rem;">${fc.cat} · ${currentIdx + 1}/${cards.length}</p>`;

        const back = h('div', { className: 'flashcard-back hidden' });
        back.innerHTML = `<h4>Answer</h4><p>${escHtml(fc.back)}</p>`;

        const flipBtn = h('button', { className: 'btn btn-primary', textContent: 'FLIP CARD' });
        flipBtn.addEventListener('click', () => {
            front.classList.toggle('hidden');
            back.classList.toggle('hidden');
        });

        const nav = h('div', { className: 'flashcard-nav' });
        nav.appendChild(h('button', { className: 'btn btn-sm', textContent: '← Prev', onClick: () => { currentIdx = (currentIdx - 1 + cards.length) % cards.length; renderFiltered(); } }));
        nav.appendChild(h('span', { textContent: `${currentIdx + 1} / ${cards.length}` }));
        nav.appendChild(h('button', { className: 'btn btn-sm', textContent: 'Next →', onClick: () => { currentIdx = (currentIdx + 1) % cards.length; renderFiltered(); } }));

        const cardContainer = document.getElementById('fc-container');
        if (cardContainer) {
            cardContainer.innerHTML = '';
            cardContainer.appendChild(front);
            cardContainer.appendChild(back);
            cardContainer.appendChild(flipBtn);
            cardContainer.appendChild(nav);
        } else {
            const c = card('', '', { id: 'fc-container' });
            c.appendChild(front);
            c.appendChild(back);
            c.appendChild(flipBtn);
            c.appendChild(nav);
            section.appendChild(c);
        }
    }

    renderFiltered();
    container.appendChild(section);
}
