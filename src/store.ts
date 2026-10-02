// src/store.ts — localStorage persistence
const PREFIX = 'ios_';

export type Progress = Record<string, number>;
export type CheckedMap = Record<string, boolean>;

function get<T>(key: string): T | null {
    try { return JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null') as T; }
    catch { return null; }
}

function set(key: string, val: unknown): void {
    localStorage.setItem(PREFIX + key, JSON.stringify(val));
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
};
