import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { platform } from 'node:process'

// Solo se expone en el servidor local de Vite, no forma parte del build.
function identidadLocal() {
  let raiz = resolve(fileURLToPath(new URL('.', import.meta.url))).replaceAll('\\', '/')
  if (platform === 'win32') raiz = raiz.toLowerCase()
  const instalacion = createHash('sha256').update(raiz).digest('hex').slice(0, 16)
  return {
    name: 'tunelab-identidad-local',
    configureServer(server) {
      server.middlewares.use('/__tunelab_local', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify({ protocolo: 'tunelab-local-v1', instalacion }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), identidadLocal()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
