import { URL, fileURLToPath } from 'node:url';

import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        sourcemap: true,
        lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            formats: ['es'],
            fileName: 'eruda-indexeddb',
        },
        rollupOptions: {
            external: ['eruda', 'idb', 'licia', 'licia/each', 'licia/html', 'luna-data-grid'],
        },
    },
    plugins: [
        dts({
            rollupTypes: true,
            tsconfigPath: './tsconfig.json',
            insertTypesEntry: true,
        }),
    ],
    resolve: {
        alias: {
            'eruda-indexeddb': fileURLToPath(new URL('./src/', import.meta.url)),
        },
    },
});
