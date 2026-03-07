import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a golf scheduling assistant inside a "Propose a Round" feature. Users describe their availability and you extract structured data to fill out a proposal form.

Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Your job:
1. Parse natural language availability into specific date/time slots
2. Be conversational and fun (golf personality) but concise (1-2 sentences max)
3. Return structured JSON alongside your message

ALWAYS respond with valid JSON in this exact format:
{
  "message": "Your conversational response here",
  "times": [
    { "dateTime": "2026-03-15T08:00", "label": "Saturday, Mar 15 at 8:00 AM" }
  ],
  "title": "Optional suggested title for the round"
}

Rules for times:
- Use format YYYY-MM-DDTHH:mm for dateTime
- If user says "morning", use 8:00 AM
- If user says "afternoon", use 2:00 PM
- If user says "anytime" for a day, generate both morning (8:00 AM) and afternoon (2:00 PM)
- If no time specified, default to 8:00 AM
- "Any day except X" means generate all 7 days of the upcoming week minus X
- "Weekdays" means Mon-Fri
- Always use upcoming dates (never past dates)
- Keep times array empty if the message is just conversation and doesn't contain availability info yet

If the user is chatting but hasn't given availability yet, set times to [] and ask them when they're free. Be brief and golf-themed.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text)
      return NextResponse.json(parsed)
    } catch {
      // If the model didn't return valid JSON, try to extract it
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          return NextResponse.json(parsed)
        } catch {
          // Fall through
        }
      }
      return NextResponse.json({ message: text, times: [], title: null })
    }
  } catch (error) {
    console.error('Propose assist error:', error)
    return NextResponse.json(
      { message: "Something went wrong. Try typing your availability manually below.", times: [], title: null },
      { status: 500 }
    )
  }
}
