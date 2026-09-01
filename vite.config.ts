import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

function officeApi(): Plugin {
  return {
    name: 'soastal-office-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/session' && url !== '/api/books') {
          next()
          return
        }
        void (async () => {
          const mod = url === '/api/session' ? await import('./api/session.js') : await import('./api/books.js')
          await mod.default(req, res)
        })().catch((err: unknown) => {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), officeApi()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 43173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 43173,
    strictPort: true,
  },
})
