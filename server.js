import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function createDevServer() {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'warn',
  })

  const stack = vite.middlewares.stack
  const rawFsIdx = stack.findIndex(
    (m) => m.handle && m.handle.name === 'viteServeRawFsMiddleware'
  )
  if (rawFsIdx !== -1) stack.splice(rawFsIdx, 1)

  vite.middlewares.use((req, res, next) => {
    const url = req.originalUrl || req.url

    if (url.includes('.')) return next()

    vite.ssrLoadModule('/src/entry-server.tsx')
      .then(({ render }) => {
        const { html, head } = render(url)
        const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
        return vite.transformIndexHtml(url, template)
          .then((transformed) => ({ transformed, html, head }))
      })
      .then(({ transformed, html, head }) => {
        const fullHtml = transformed
          .replace('<!--ssr-html-->', html)
          .replace('<!--ssr-head-->', head)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(fullHtml)
      })
      .catch((e) => {
        vite.ssrFixStacktrace(e)
        console.error('SSR dev error:', e)
        try {
          res.writeHead(500)
          res.end(e instanceof Error ? e.message : String(e))
        } catch (_) {}
      })
  })

  const { createServer: createHttpServer } = await import('http')
  const server = createHttpServer(vite.middlewares)
  const port = 5173
  server.listen(port, () => {
    console.log(`SSR dev server running at http://localhost:${port}`)
  })
}

createDevServer().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
