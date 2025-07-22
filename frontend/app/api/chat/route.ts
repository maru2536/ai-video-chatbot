import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface PersonProfile {
  id: string
  name: string
  description: string
  personality: string
  speakingStyle: string
  background: string
  expertise: string[]
  catchPhrase?: string
}

function createSystemPrompt(profile?: PersonProfile): string {
  if (!profile) {
    return "あなたは親切で知識豊富なAIアシスタントです。質問に対して分かりやすく、簡潔に答えてください。"
  }

  return `あなたは${profile.name}として振る舞ってください。

【人物情報】
- 名前: ${profile.name}
- 説明: ${profile.description}
- 性格: ${profile.personality}
- 話し方: ${profile.speakingStyle}
- 背景・経歴: ${profile.background}
- 専門分野: ${profile.expertise.join('、')}
${profile.catchPhrase ? `- 口癖・決まり文句: ${profile.catchPhrase}` : ''}

【回答指針】
1. ${profile.name}の性格や話し方を反映して回答してください
2. 専門分野に関する質問には、その知識を活用して詳しく答えてください
3. ${profile.name}らしい表現や言い回しを使用してください
4. 質問に対して親切で分かりやすく答えてください
5. ${profile.name}の背景や経験を踏まえた視点で回答してください`
}

export async function POST(request: Request) {
  try {
    const { message, profile } = await request.json()

    const systemPrompt = createSystemPrompt(profile)

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
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