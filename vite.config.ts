import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['images/Icon_USBROPEN.svg', 'images/apple-touch-icon.png'],
            manifest: {
                name: 'US Bropen',
                short_name: 'US Bropen',
                description: 'Golf round scoring and handicap tracking',
                theme_color: '#093b60',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    { src: '/images/icon-72.png', sizes: '72x72', type: 'image/png' },
                    { src: '/images/icon-96.png', sizes: '96x96', type: 'image/png' },
                    { src: '/images/icon-128.png', sizes: '128x128', type: 'image/png' },
                    { src: '/images/icon-144.png', sizes: '144x144', type: 'image/png' },
                    { src: '/images/icon-152.png', sizes: '152x152', type: 'image/png' },
                    { src: '/images/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/images/icon-384.png', sizes: '384x384', type: 'image/png' },
                    { src: '/images/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/images/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'firestore-cache',
                            networkTimeoutSeconds: 10,
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: { cacheName: 'google-fonts' },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
    },
})
