import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export interface Persona {
  id: string
  name: string
  category: string
  description: string
  personality: string
  speakingStyle: string
  background: string
  expertise: string[]
  catchPhrase: string
  responseStyle: {
    tone: string
    vocabulary: string
    approach: string
  }
  sampleResponses: Array<{
    question: string
    response: string
  }>
  createdAt: string
  updatedAt: string
  active: boolean
}

export interface PersonasData {
  personas: Persona[]
  categories: string[]
  metadata: {
    version: string
    lastUpdated: string
    totalPersonas: number
    description: string
  }
}

// 人物データを取得する関数
function getPersonasData(): PersonasData {
  try {
    const filePath = join(process.cwd(), 'data', 'personas', 'personas.json')
    const fileContents = readFileSync(filePath, 'utf8')
    return JSON.parse(fileContents)
  } catch (error) {
    console.error('Failed to load personas data:', error)
    // フォールバック: 空のデータを返す
    return {
      personas: [],
      categories: [],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        totalPersonas: 0,
        description: 'Empty personas database'
      }
    }
  }
}

// GET: 全ての人物データまたは特定の人物データを取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get('id')
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('active') === 'true'

    const data = getPersonasData()
    let personas = data.personas

    // フィルタリング
    if (activeOnly) {
      personas = personas.filter(persona => persona.active)
    }

    if (category) {
      personas = personas.filter(persona => persona.category === category)
    }

    if (personaId) {
      const persona = personas.find(p => p.id === personaId)
      if (!persona) {
        return NextResponse.json(
          { error: 'Persona not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ persona })
    }

    // 全体の情報を返す
    return NextResponse.json({
      personas,
      categories: data.categories,
      metadata: {
        ...data.metadata,
        totalPersonas: personas.length
      }
    })
  } catch (error) {
    console.error('Error in GET /api/personas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personas' },
      { status: 500 }
    )
  }
}

// POST: 新しい人物データを追加（管理者機能）
export async function POST(request: Request) {
  try {
    const newPersona: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'> = await request.json()
    
    const data = getPersonasData()
    
    // 新しい人物データを作成
    const persona: Persona = {
      ...newPersona,
      id: generatePersonaId(newPersona.name),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    data.personas.push(persona)
    data.metadata.totalPersonas = data.personas.length
    data.metadata.lastUpdated = new Date().toISOString()
    
    // ここでファイルに保存する処理を追加する場合は、適切な権限チェックが必要
    // 現在は読み取り専用として実装
    
    return NextResponse.json({ persona }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/personas:', error)
    return NextResponse.json(
      { error: 'Failed to create persona' },
      { status: 500 }
    )
  }
}

// 人物IDを生成するヘルパー関数
function generatePersonaId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 特殊文字を除去
    .replace(/\s+/g, '-') // スペースをハイフンに
    .replace(/-+/g, '-') // 複数のハイフンを1つに
    .trim()
}