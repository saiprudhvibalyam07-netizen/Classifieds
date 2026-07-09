export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(503).json({
      error: 'AI service is not configured. Please set OPENAI_API_KEY environment variable.',
    })
    return
  }

  const { messages, model, stream, max_tokens, temperature, top_p, frequency_penalty, presence_penalty } = req.body

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array is required' })
    return
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        stream: stream ?? true,
        max_tokens: max_tokens || 4096,
        temperature: temperature ?? 0.7,
        top_p: top_p ?? 1,
        frequency_penalty: frequency_penalty ?? 0,
        presence_penalty: presence_penalty ?? 0,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      res.status(response.status).json({ error: errorBody })
      return
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }
      } catch (streamError) {
        console.error('Stream error:', streamError)
      } finally {
        res.end()
      }
    } else {
      const data = await response.json()
      res.status(200).json(data)
    }
  } catch (error) {
    console.error('Chat proxy error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
