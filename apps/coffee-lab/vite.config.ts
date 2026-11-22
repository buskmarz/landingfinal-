import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
 base: '/coffee-lab/',
 plugins: [react()],
 server: {proxy: {'/coffee-lab/api/': 'http://127.0.0.1:5199'}},
 preview: {proxy: {'/coffee-lab/api/': 'http://127.0.0.1:5199'}},
 resolve: {alias: {'@': fileURLToPath(new URL('.', import.meta.url))}},
 build: {outDir: 'dist', emptyOutDir: true},
});
