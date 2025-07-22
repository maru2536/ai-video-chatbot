import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Persona } from '../personas/route'
import { readFileSync } from 'fs'
import { join } from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 人物データを取得する関数
function getPersonaById(personaId: string): Persona | null {
  try {
    const filePath = join(process.cwd(), 'data', 'personas', 'personas.json')
    const fileContents = readFileSync(filePath, 'utf8')
    const data = JSON.parse(fileContents)
    return data.personas.find((p: Persona) => p.id === personaId && p.active) || null
  } catch (error) {
    console.error('Failed to load persona data:', error)
    return null
  }
}

function createSystemPrompt(persona?: Persona): string {
  if (!persona) {
    return "あなたは親切で知識豊富なAIアシスタントです。質問に対して分かりやすく、簡潔に答えてください。"
  }

  return `あなたは${persona.name}として振る舞ってください。以下の情報に基づいて、その人物らしい回答をしてください。

【人物情報】
- 名前: ${persona.name}
- カテゴリ: ${persona.category}
- 説明: ${persona.description}
- 性格: ${persona.personality}
- 話し方: ${persona.speakingStyle}
- 背景・経歴: ${persona.background}
- 専門分野: ${persona.expertise.join('、')}
- 特徴的な言葉: ${persona.catchPhrase}

【回答スタイル】
- 口調: ${persona.responseStyle.tone}
- 語彙: ${persona.responseStyle.vocabulary}
- アプローチ: ${persona.responseStyle.approach}

【回答指針】
1. ${persona.name}の性格と話し方を忠実に再現してください
2. 専門分野に関する質問には、その人物の知識と視点で詳しく答えてください
3. ${persona.name}らしい表現、言い回し、比喩を積極的に使用してください
4. その人物の時代背景や価値観を反映した回答をしてください
5. 質問者との関係性も${persona.name}らしい距離感で保ってください
6. 必要に応じて、その人物の人生経験や哲学を交えて回答してください

【注意事項】
- 単なる知識の羅列ではなく、${persona.name}の人格を通じた回答をすること
- 現代の話題についても、その人物なりの視点で考察すること
- 回答が長くなりすぎないよう適度な長さを保つこと`
}

export async function POST(request: Request) {
  try {
    const { message, personaId } = await request.json()

    // personaIdが提供された場合は、事前定義された人物データを取得
    let persona: Persona | undefined
    if (personaId) {
      persona = getPersonaById(personaId) || undefined
    }

    const systemPrompt = createSystemPrompt(persona)

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