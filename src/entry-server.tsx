import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'

export function render(url: string) {
  const helmetContext: Record<string, unknown> = {}

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>
  )

  const { helmet } = helmetContext as { helmet?: { title?: { toString(): string }; meta?: { toString(): string }; link?: { toString(): string }; script?: { toString(): string } } }

  return {
    html,
    head: `
${helmet?.title?.toString() || ''}
${helmet?.meta?.toString() || ''}
${helmet?.link?.toString() || ''}
${helmet?.script?.toString() || ''}
    `.trim(),
  }
}
