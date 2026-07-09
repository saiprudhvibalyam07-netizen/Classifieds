import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

let render: ((url: string) => { html: string; head: string }) | null = null

async function getRender() {
  if (!render) {
    const mod = await import(path.resolve(root, 'dist/server/entry-server.js'))
    render = mod.render
  }
  return render
}

export default async function handler(req: any, res: any) {
  const url = req.url || '/'

  try {
    const renderFn = await getRender()
    const { html, head } = renderFn(url)

    const template = fs.readFileSync(
      path.resolve(root, 'dist/client/index.html'),
      'utf-8'
    )

    const fullHtml = template
      .replace('<!--ssr-html-->', html)
      .replace('<!--ssr-head-->', head)

    res.status(200)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(fullHtml)
  } catch (e) {
    console.error('SSR render error:', e)
    res.status(200)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    const fallback = fs.readFileSync(
      path.resolve(root, 'dist/client/index.html'),
      'utf-8'
    )
    res.end(fallback.replace('<!--ssr-html-->', '').replace('<!--ssr-head-->', ''))
  }
}
