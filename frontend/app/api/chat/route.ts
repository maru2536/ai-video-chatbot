import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "あなたは親切で知識豊富なAIアシスタントです。質問に対して分かりやすく、簡潔に答えてください。"
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    return NextResponse.json({
      response: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    )
  }
}