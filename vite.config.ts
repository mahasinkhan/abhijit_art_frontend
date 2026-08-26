import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split ONLY the libraries shared across most routes into their own
        // long-lived chunks. They rarely change, so an ordinary code change no
        // longer busts their cache — repeat visitors re-use them instead of
        // re-downloading React on every deploy.
        //
        // Route-specific heavy libs (d3 on Home, any charting in the dashboard)
        // are deliberately NOT grouped here: Vite already keeps each in the
        // route chunk that imports it, so it only downloads when that route
        // loads. Grouping route-disjoint libs together would force them ALL
        // onto every page and undo your route-splitting.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]react-router/.test(id)) return 'vendor-router'
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
          if (id.includes('framer-motion')) return 'vendor-motion'
          return undefined
        },
      },
    },
  },
})