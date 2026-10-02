// src/app/Header.tsx — search, theme toggle, progress rail
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoonIcon, SearchIcon, SunIcon } from 'lucide-react';
import { NAV, TOPIC_LABELS } from '../lib/data';
import { cn } from '../lib/utils';

function allTopics() {
    return NAV.flatMap(g =>
        g.children
            ? g.children.map(c => ({ id: c.id, label: c.label, group: g.label }))
            : [{ id: g.id, label: g.label, group: 'Overview' }]
    );
}

export function Header({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);
    const topics = useMemo(allTopics, []);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return topics.filter(t => t.label.toLowerCase().includes(q)).slice(0, 8);
    }, [query, topics]);

    // Reading progress rail for the main scroll container.
    useEffect(() => {
        const el = scrollRef.current?.parentElement;
        if (!el) return;
        const onScroll = () => {
            const max = el.scrollHeight - el.clientHeight;
            const pct = max <= 0 ? 0 : Math.min(100, (el.scrollTop / max) * 100);
            el.style.setProperty('--progress', pct + '%');
            const bar = el.parentElement?.querySelector<HTMLElement>('[data-progress]');
            if (bar) bar.style.width = pct + '%';
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    const go = (id: string) => {
        setQuery('');
        navigate(['dashboard', 'todos', 'interview', 'flashcards'].includes(id) ? `/${id}` : `/topic/${id}`);
    };

    const current = TOPIC_LABELS[location.pathname.replace('/topic/', '')];

    return (
        <header className="sticky top-0 z-30 shrink-0 border-b border-rule bg-paper">
            <div className="flex h-header items-center gap-3 px-5 sm:px-8 lg:px-10">
                <div className="lg:hidden">
                    <span className="font-serif text-sm font-bold">🚀 Interview OS</span>
                </div>

                <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') setQuery('');
                            if (e.key === 'Enter' && results[0]) go(results[0].id);
                        }}
                        placeholder="Search topics…"
                        className="h-9 w-full rounded-md border border-rule bg-surface pr-3 pl-9 text-sm outline-none placeholder:text-muted focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/30"
                    />
                    {results.length > 0 && (
                        <ul className="absolute top-full right-0 left-0 z-40 mt-1 overflow-hidden rounded-md border border-rule bg-surface shadow-float">
                            {results.map(r => (
                                <li key={r.id}>
                                    <button
                                        type="button"
                                        onClick={() => go(r.id)}
                                        className="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-neutral cursor-pointer"
                                    >
                                        <span className="text-sm">{r.label}</span>
                                        <span className="text-[11px] text-muted">{r.group}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onToggleTheme}
                    aria-label="Toggle dark mode"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-rule bg-surface text-sm transition-colors hover:border-focus cursor-pointer"
                >
                    {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
                </button>
            </div>

            {current && (
                <p className="px-5 pb-2 text-[11px] tracking-wider text-muted uppercase sm:px-8 lg:px-10">
                    {current}
                </p>
            )}

            <div className="h-0.5 bg-rule/40">
                <div
                    data-progress
                    className={cn('h-full bg-focus transition-[width] duration-100')}
                    style={{ width: '0%' }}
                />
            </div>
            <div ref={scrollRef} className="hidden" />
        </header>
    );
}