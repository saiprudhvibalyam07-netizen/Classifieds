export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(503).json({
      error: 'Embedding service is not configured. Please set OPENAI_API_KEY environment variable.',
    })
    return
  }

  const { input, model, dimensions } = req.body

  if (!input) {
    res.status(400).json({ error: 'input is required' })
    return
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input,
        model: model || 'text-embedding-3-small',
        dimensions: dimensions || 1536,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      res.status(response.status).json({ error: errorBody })
      return
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Embeddings proxy error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
