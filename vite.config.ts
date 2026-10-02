import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: '.',
    envDir: '.',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components.ts'),
            '@utils': path.resolve(__dirname, './src/utils.ts'),
            '@store': path.resolve(__dirname, './src/store.ts'),
            '@data': path.resolve(__dirname, './src/data.ts'),
            '@nav': path.resolve(__dirname, './src/nav.ts'),
            '@renderers': path.resolve(__dirname, './src/renderers'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': ['ai'],
                },
            },
        },
    },
    css: {
        postcss: {},
    },
});
