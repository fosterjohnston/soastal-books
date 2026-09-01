import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

function officeApi(): Plugin {
  const handle = (req: { url?: string; method?: string }, res: { statusCode: number; end: (b: string) => void }, next: () => void) => {
    const url = req.url?.split('?')[0]?.replace(/\/$/, '') || ''
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
  }

  return {
    name: 'soastal-office-api',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
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
