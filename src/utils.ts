// src/utils.ts — Utility functions
export type ToastType = 'info' | 'success' | 'error' | 'warning';

/** Attribute values `h()` knows how to apply; anything else goes through `setAttribute`. */
export type AttrValue = string | number | boolean | EventListener;
/** Props object for `h()`: `className`/`innerHTML`/`textContent` plus `on*` handlers. */
export type Attrs = Record<string, AttrValue>;
/** What `h()` accepts as a child; `false`/`null`/`undefined` are skipped. */
export type Child = Node | string | number | null | undefined | false;

export function toast(msg: string, type: ToastType = 'info'): void {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.getElementById('toast-container')!.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

export function escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Attrs = {},
    ...children: Child[]
): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') e.className = String(v);
        else if (k === 'innerHTML') e.innerHTML = String(v);
        else if (k === 'textContent') e.textContent = String(v);
        else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
        else e.setAttribute(k, String(v));
    }
    for (const c of children) {
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else if (typeof c === 'number') e.appendChild(document.createTextNode(String(c)));
        else if (c) e.appendChild(c);
    }
    return e;
}

export function pad(n: number): string {
    return n < 10 ? '0' + n : '' + n;
}
