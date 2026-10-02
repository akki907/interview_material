// src/theme.ts — light/dark theme with localStorage persistence
import { rerenderMermaidForTheme } from './mermaid';

const KEY = 'ios_theme';

export type Theme = 'light' | 'dark';

/** Stored preference wins; otherwise follow the OS preference. */
export function initialTheme(): Theme {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    const icon = document.querySelector('#theme-toggle .theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-pressed', String(theme === 'dark'));
}

export async function toggleTheme(): Promise<void> {
    const next: Theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    // Mermaid bakes theme colors into the rendered SVG, so redraw every diagram.
    await rerenderMermaidForTheme(document.getElementById('content'));
}

export function initTheme(): void {
    applyTheme(initialTheme());
    document.getElementById('theme-toggle')!.addEventListener('click', () => { void toggleTheme(); });
}
