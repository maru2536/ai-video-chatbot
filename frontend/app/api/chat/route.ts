import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getVectorStore } from '@/app/lib/vectorStore'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { message, useRAG = false } = await request.json()

    let systemPrompt = "あなたは親切で知識豊富なAIアシスタントです。質問に対して分かりやすく、簡潔に答えてください。"
    let augmentedMessage = message
    
    // RAG機能が有効な場合、関連するコンテキストを検索
    if (useRAG) {
      const vectorStore = getVectorStore()
      const relevantDocs = await vectorStore.similaritySearch(message, 3)
      
      if (relevantDocs.length > 0) {
        const context = relevantDocs
          .map(doc => doc.pageContent)
          .join('\n\n')
        
        augmentedMessage = `以下のコンテキストを参考にして質問に答えてください：

【コンテキスト】
${context}

【質問】
${message}`
        
        systemPrompt += '\n\n提供されたコンテキストを参考にしつつ、自然な会話として応答してください。コンテキストに含まれない情報については、一般的な知識で補完してください。'
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: augmentedMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    return NextResponse.json({
      response: completion.choices[0].message.content,
      ragUsed: useRAG,
      documentsFound: useRAG ? (await getVectorStore().similaritySearch(message, 1)).length : 0
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    )
  }
}