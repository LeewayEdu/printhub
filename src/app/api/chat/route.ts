import { NextRequest, NextResponse } from 'next/server'
import { getChatContext } from '@/lib/chat-context'
import { buildSystemPrompt } from '@/lib/chat-prompt'

const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    // Live prices, discounts and delivery fees (cached for a few minutes)
    const systemPrompt = buildSystemPrompt(await getChatContext())

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 400,
        temperature: 0.4,
      }),
    })

    const data = await response.json()

    // Log error from Groq if any
    if (!response.ok || data.error) {
      console.error('Groq API error:', JSON.stringify(data))
      return NextResponse.json({ 
        reply: `Sorry, I could not process that. Please try again or chat with us on WhatsApp: +234 805 292 9523` 
      })
    }

    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not process that. Please try again or chat with us on WhatsApp: +234 805 292 9523'

    return NextResponse.json({ reply })
  } catch (error) {
    return NextResponse.json({ reply: 'Sorry, something went wrong. Please chat with us on WhatsApp: +234 805 292 9523' }, { status: 500 })
  }
}