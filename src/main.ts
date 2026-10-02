// src/main.ts — Entry point
import '../styles.css';
import { buildNav, navigateTo } from './nav';
import { initSearch } from './search';
import { initTheme } from './theme';
import { toast } from './utils';

// Expose for legacy inline handlers in rendered HTML
window.navigateTo = navigateTo;
window.toast = toast;

const flashcardModal = document.getElementById('flashcard-modal')!;
const codeModal = document.getElementById('code-modal')!;

// Flashcard modal
document.getElementById('fc-prev')!.addEventListener('click', () => {
    if (flashcardModal.classList.contains('hidden')) return;
    const front = document.getElementById('flashcard-front')!;
    const back = document.getElementById('flashcard-back')!;
    front.classList.toggle('hidden');
    back.classList.toggle('hidden');
});
document.getElementById('fc-next')!.addEventListener('click', () => {
    if (flashcardModal.classList.contains('hidden')) return;
    const front = document.getElementById('flashcard-front')!;
    const back = document.getElementById('flashcard-back')!;
    front.classList.toggle('hidden');
    back.classList.toggle('hidden');
});
document.getElementById('fc-close')!.addEventListener('click', () => flashcardModal.classList.add('hidden'));
flashcardModal.querySelector('.modal-backdrop')!.addEventListener('click', () => flashcardModal.classList.add('hidden'));

// Code modal
document.getElementById('code-modal-close')!.addEventListener('click', () => codeModal.classList.add('hidden'));
codeModal.querySelector('.modal-backdrop')!.addEventListener('click', () => codeModal.classList.add('hidden'));

// Init
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    buildNav();
    initSearch();
    navigateTo('dashboard');
});

// Responsive sidebar
document.getElementById('sidebar-toggle')!.addEventListener('click', () => {
    document.getElementById('sidebar')!.classList.toggle('open');
});
document.getElementById('mobile-menu-btn')!.addEventListener('click', () => {
    document.getElementById('sidebar')!.classList.toggle('open');
});
document.getElementById('sidebar-nav')!.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
        document.getElementById('sidebar')!.classList.remove('open');
    }
});

// Scroll reveal
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
