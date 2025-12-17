import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/nz-driving-simulator/', // Set base for GitHub Pages deployment
  plugins: [react()],
  server: {
    proxy: {
      '/api-nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-nominatim/, ''),
      },
    },
  },
})
