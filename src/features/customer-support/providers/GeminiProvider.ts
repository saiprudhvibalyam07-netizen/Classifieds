import { GoogleGenAI } from '@google/genai'
import { GEMINI_CONFIG } from '../config/gemini'

export class GeminiProvider {
  private client: GoogleGenAI | null = null

  private getClient(): GoogleGenAI {
    if (this.client) return this.client

    if (!GEMINI_CONFIG.apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured. Set VITE_GEMINI_API_KEY in your environment.',
      )
    }

    this.client = new GoogleGenAI({ apiKey: GEMINI_CONFIG.apiKey })
    return this.client
  }

  async sendMessage(message: string): Promise<string> {
    const ai = this.getClient()

    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.model,
      contents: message,
      config: {
        systemInstruction: GEMINI_CONFIG.systemInstruction,
      },
    })

    return response.text ?? ''
  }
}
