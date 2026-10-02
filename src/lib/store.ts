// src/lib/store.ts — persistent app state (zustand + localStorage)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CheckedMap, Progress, TodoCategory, TodoItem, TodoPriority } from './types';
import { DEFAULT_TODOS } from './data';

interface AppState {
    progress: Progress;
    bookmarks: string[];
    checked: CheckedMap;
    todos: TodoItem[];
    theme: 'light' | 'dark';

    toggleBookmark: (id: string) => boolean;
    toggleCheck: (id: string) => boolean;
    setProgress: (p: Progress) => void;

    addTodo: (item: Omit<TodoItem, 'id' | 'createdAt'>) => TodoItem;
    toggleTodo: (id: string) => boolean;
    updateTodo: (id: string, updates: Partial<TodoItem>) => boolean;
    deleteTodo: (id: string) => boolean;
    clearCompletedTodos: () => number;
    resetTodos: () => void;

    setTheme: (theme: 'light' | 'dark') => void;
}

function initialTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            progress: {},
            bookmarks: [],
            checked: {},
            todos: DEFAULT_TODOS,
            theme: initialTheme(),

            toggleBookmark: id => {
                const on = !get().bookmarks.includes(id);
                set({ bookmarks: on ? [...get().bookmarks, id] : get().bookmarks.filter(b => b !== id) });
                return on;
            },

            toggleCheck: id => {
                const next = !get().checked[id];
                set({ checked: { ...get().checked, [id]: next } });
                return next;
            },

            setProgress: p => set({ progress: p }),

            addTodo: item => {
                const todo: TodoItem = {
                    ...item,
                    id: 'todo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                    createdAt: Date.now(),
                };
                set({ todos: [todo, ...get().todos] });
                return todo;
            },

            toggleTodo: id => {
                let done = false;
                set({
                    todos: get().todos.map(t => {
                        if (t.id !== id) return t;
                        done = !t.completed;
                        return { ...t, completed: done };
                    }),
                });
                return done;
            },

            updateTodo: (id, updates) => {
                const exists = get().todos.some(t => t.id === id);
                if (!exists) return false;
                set({ todos: get().todos.map(t => (t.id === id ? { ...t, ...updates } : t)) });
                return true;
            },

            deleteTodo: id => {
                const next = get().todos.filter(t => t.id !== id);
                if (next.length === get().todos.length) return false;
                set({ todos: next });
                return true;
            },

            clearCompletedTodos: () => {
                const count = get().todos.filter(t => t.completed).length;
                if (count > 0) set({ todos: get().todos.filter(t => !t.completed) });
                return count;
            },

            resetTodos: () => set({ todos: DEFAULT_TODOS }),

            setTheme: theme => set({ theme }),
        }),
        {
            name: 'ios',
            version: 1,
            partialize: s => ({
                progress: s.progress,
                bookmarks: s.bookmarks,
                checked: s.checked,
                todos: s.todos,
                theme: s.theme,
            }),
        }
    )
);

/** Topic ids that belong to a nav group (i.e. real study topics). */
export function isTopicId(id: string): boolean {
    return id !== 'dashboard' && id !== 'todos' && id !== 'interview' && id !== 'flashcards';
}

export type { TodoCategory, TodoPriority };