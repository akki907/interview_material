// src/app/Sidebar.tsx — topic navigation with per-group progress
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';
import { NAV } from '../lib/data';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';

function hrefFor(id: string) {
    return ['dashboard', 'todos', 'interview', 'flashcards'].includes(id) ? `/${id}` : `/topic/${id}`;
}

function NavGroup({ group }: { group: (typeof NAV)[number] }) {
    const [open, setOpen] = useState(true);
    const checked = useStore(s => s.checked);
    const location = useLocation();

    const children = group.children ?? [];
    const done = children.filter(c => checked[c.id]).length;

    if (!children.length) {
        return (
            <NavLink
                to={hrefFor(group.id)}
                className={({ isActive }) =>
                    cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-c2 text-c2i' : 'text-ink hover:bg-neutral'
                    )
                }
            >
                {group.label}
            </NavLink>
        );
    }

    const groupActive = children.some(c => location.pathname === hrefFor(c.id));

    return (
        <div className="mb-1">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-neutral cursor-pointer"
            >
                <span className="flex items-center gap-2">
                    <ChevronRightIcon className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
                    <span className={cn(groupActive && 'text-c2i')}>{group.label}</span>
                </span>
                <span className="text-[10px] font-normal text-muted">
                    {done}/{children.length}
                </span>
            </button>

            {open && (
                <ul className="mt-0.5 mb-2 ml-4 space-y-0.5 border-l border-rule pl-2">
                    {children.map(child => {
                        const isDone = !!checked[child.id];
                        return (
                            <li key={child.id}>
                                <NavLink
                                    to={hrefFor(child.id)}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                                            isActive
                                                ? 'bg-c2 text-c2i font-semibold'
                                                : 'text-muted hover:bg-neutral hover:text-ink'
                                        )
                                    }
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-full',
                                            isDone ? 'bg-c1i' : 'bg-rule'
                                        )}
                                    />
                                    <span className="truncate">{child.label}</span>
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export function Sidebar() {
    return (
        <aside className="hidden w-sidebar shrink-0 flex-col overflow-y-auto border-r border-rule bg-surface lg:flex">
            <div className="border-b border-rule px-4 py-4">
                <p className="font-serif text-base font-bold">🚀 Interview OS</p>
                <p className="text-[11px] text-muted">Senior AI Engineer</p>
            </div>
            <nav className="flex-1 px-2 py-3">
                {NAV.map(group => (
                    <NavGroup key={group.id} group={group} />
                ))}
            </nav>
        </aside>
    );
}