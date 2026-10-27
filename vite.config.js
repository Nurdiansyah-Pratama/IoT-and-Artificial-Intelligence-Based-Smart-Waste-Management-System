import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const viteHost = process.env.VITE_HOST || '127.0.0.1';
const viteOrigin = process.env.VITE_ORIGIN || 'http://127.0.0.1:5173';
const viteHmrHost = process.env.VITE_HMR_HOST || '127.0.0.1';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: viteHost,
        port: 5173,
        origin: viteOrigin,
        cors: true,
        hmr: {
            host: viteHmrHost,
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
