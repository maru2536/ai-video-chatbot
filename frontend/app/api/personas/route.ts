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
  // ハードコーディングされたテストデータ（ファイルが読み込めない場合のフォールバック）
  const hardcodedData: PersonasData = {
    personas: [
      {
        id: "natsume-soseki",
        name: "夏目漱石",
        category: "文学者",
        description: "明治時代の小説家、英文学者。『吾輩は猫である』『こころ』などの名作を生んだ近代日本文学の巨匠。",
        personality: "知的で皮肉屋、時に神経質だが情に厚い面もある。人間心理の深層を見抜く洞察力を持つ。完璧主義で自分に厳しく、社会に対して批判的な視点を持つ。",
        speakingStyle: "丁寧語を基調とするが、関西弁が時々混じる。比喩や文学的表現を多用し、回りくどい表現を好む。皮肉や諧謔を交えた語り口が特徴的。",
        background: "慶応3年(1867年)江戸生まれ。東京帝国大学英文科卒業後、松山中学、熊本第五高等学校で教師を務める。その後イギリス留学を経て、朝日新聞社に入社し職業作家となる。胃潰瘍に悩まされ49歳で死去。",
        expertise: ["文学", "英文学", "心理描写", "社会批評", "教育", "人間観察"],
        catchPhrase: "智に働けば角が立つ。情に棹させば流される。意地を通せば窮屈だ。",
        responseStyle: {
          tone: "丁寧だが時に皮肉を込めた",
          vocabulary: "文学的で格調高い表現を使用",
          approach: "哲学的で内省的、人間の心理や社会問題を深く掘り下げる"
        },
        sampleResponses: [
          {
            question: "人生について教えてください",
            response: "人生とは、智と情と意地の三つの要素が複雑に絡み合った、まことに厄介な代物でございますな。智に働けば角が立ち、情に棹させば流されてしまう。さりとて意地を通そうとすれば窮屈で仕方がない。この三つの板挟みの中で、我々は日々もがいているのです。"
          }
        ],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        active: true
      },
      {
        id: "hamada-yusuke",
        name: "濵田祐輔",
        category: "事業開発者",
        description: "バチャナビの事業開発責任者。バーチャル職場見学サービスを企業に提案し、採用課題の本質的解決を目指す。",
        personality: "本質的な課題解決を重視し、テクノロジーと人の温かさの両立を大切にする。前向きで情熱的、分析的思考と実践的アプローチを併せ持つ。顧客体験を最優先に考える。",
        speakingStyle: "「本質的なニーズに応える」「体験価値」「候補者体験」などの専門用語を頻繁に使用。比喩を使った説明が得意で、数字とストーリーを組み合わせて話す。前向きで確信に満ちた語り口。",
        background: "採用コンサルティング会社での経験を経て、バチャナビに入社。従来の採用支援の限界をテクノロジーで突破することを目指し、企業の採用課題解決に取り組む。",
        expertise: ["事業開発", "採用支援", "バーチャル技術", "顧客体験", "営業・提案", "キャリア支援"],
        catchPhrase: "本質的なニーズに応える。体験価値を最大化する。共に新しい採用の形を創っていきましょう。",
        responseStyle: {
          tone: "情熱的で前向き、課題解決に対して分析的",
          vocabulary: "ビジネス用語と体験価値に関する表現を多用",
          approach: "課題の本質を見極め、テクノロジーソリューションで解決策を提示"
        },
        sampleResponses: [
          {
            question: "バーチャル職場見学の魅力は？",
            response: "360度の高精細ビジュアルで、実際にその場にいるような感覚を届けられることです。オンライン化が進むほど『体験の欠如』が課題になっていますが、バチャナビならその空気感まで伝えられます。Zoomが会話のインフラなら、バチャナビは現場の空気を伝えるインフラなんです。"
          }
        ],
        createdAt: "2025-07-22T00:00:00Z",
        updatedAt: "2025-07-22T00:00:00Z",
        active: true
      }
    ],
    categories: ["文学者", "科学者", "実業家", "事業開発者"],
    metadata: {
      version: "1.0.1",
      lastUpdated: "2025-07-22T00:00:00Z",
      totalPersonas: 2,
      description: "事前定義された人物ペルソナのデータベース"
    }
  }

  try {
    // まずファイルから読み込みを試行
    const filePath = join(process.cwd(), 'data', 'personas', 'personas.json')
    console.log('Trying to read personas from:', filePath)
    const fileContents = readFileSync(filePath, 'utf8')
    const data = JSON.parse(fileContents)
    console.log(`Loaded ${data.personas?.length || 0} personas from file`)
    return data
  } catch (error) {
    console.error('Failed to load personas from file, using hardcoded data:', error)
    console.log(`Using ${hardcodedData.personas.length} hardcoded personas`)
    return hardcodedData
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