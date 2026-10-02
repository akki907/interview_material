/// <reference types="vite/client" />

import type { ToastType } from './utils';

declare global {
    interface Window {
        /** Exposed by main.ts for rendered markup and renderers. */
        navigateTo(id: string): void;
        toast(msg: string, type?: ToastType): void;
        /** highlight.js, attached by the CDN <script> tag in index.html. */
        hljs?: { highlightAll(): void };
    }
}

export {};
