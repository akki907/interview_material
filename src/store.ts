// src/store.ts — localStorage persistence
import type { Progress, CheckedMap, TodoItem, TodoCategory, TodoPriority } from './types';
import { DEFAULT_TODOS } from './data';

export type { Progress, CheckedMap, TodoItem, TodoCategory, TodoPriority };

const PREFIX = 'ios_';

function get<T>(key: string): T | null {
    try { return JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null') as T; }
    catch { return null; }
}

function set(key: string, val: unknown): void {
    localStorage.setItem(PREFIX + key, JSON.stringify(val));
}

function notifyTodos(): void {
    if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
        document.dispatchEvent(new CustomEvent('todos-changed'));
    }
}

export const Store = {
    getProgress(): Progress { return get<Progress>('progress') ?? {}; },
    saveProgress(p: Progress) { set('progress', p); },
    getBookmarks(): string[] { return get<string[]>('bookmarks') ?? []; },
    toggleBookmark(id: string): boolean {
        const b = this.getBookmarks();
        const i = b.indexOf(id);
        if (i >= 0) b.splice(i, 1); else b.push(id);
        set('bookmarks', b);
        return i < 0;
    },
    isBookmarked(id: string): boolean { return this.getBookmarks().includes(id); },
    getChecked(): CheckedMap { return get<CheckedMap>('checked') ?? {}; },
    toggleCheck(id: string): boolean {
        const c = this.getChecked();
        c[id] = !c[id];
        set('checked', c);
        return c[id];
    },
    isChecked(id: string): boolean { return !!this.getChecked()[id]; },

    // Todo management
    getTodos(): TodoItem[] {
        const raw = get<TodoItem[]>('todos');
        if (!raw) {
            set('todos', DEFAULT_TODOS);
            return [...DEFAULT_TODOS];
        }
        return raw;
    },
    saveTodos(todos: TodoItem[]): void {
        set('todos', todos);
        notifyTodos();
    },
    addTodo(item: Omit<TodoItem, 'id' | 'createdAt'>): TodoItem {
        const todos = this.getTodos();
        const newTodo: TodoItem = {
            ...item,
            id: 'todo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            createdAt: Date.now(),
        };
        todos.unshift(newTodo);
        this.saveTodos(todos);
        return newTodo;
    },
    toggleTodo(id: string): boolean {
        const todos = this.getTodos();
        const item = todos.find(t => t.id === id);
        if (!item) return false;
        item.completed = !item.completed;
        this.saveTodos(todos);
        return item.completed;
    },
    updateTodo(id: string, updates: Partial<TodoItem>): boolean {
        const todos = this.getTodos();
        const index = todos.findIndex(t => t.id === id);
        if (index === -1) return false;
        todos[index] = { ...todos[index], ...updates };
        this.saveTodos(todos);
        return true;
    },
    deleteTodo(id: string): boolean {
        const todos = this.getTodos();
        const initialLen = todos.length;
        const filtered = todos.filter(t => t.id !== id);
        if (filtered.length !== initialLen) {
            this.saveTodos(filtered);
            return true;
        }
        return false;
    },
    clearCompletedTodos(): number {
        const todos = this.getTodos();
        const active = todos.filter(t => !t.completed);
        const count = todos.length - active.length;
        if (count > 0) {
            this.saveTodos(active);
        }
        return count;
    },
    resetTodos(): TodoItem[] {
        set('todos', DEFAULT_TODOS);
        notifyTodos();
        return [...DEFAULT_TODOS];
    },
};

