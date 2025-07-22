'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'
import './simple-ui.css'

// Persona型定義（APIからの型定義をインポート）
interface Persona {
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

// 型定義
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ConversationHistory {
  messages: Message[]
  lastUpdated: Date
}

interface ErrorState {
  type: 'api' | 'network' | 'rate_limit' | 'unknown'
  message: string
  retryable: boolean
}

// シンプルな音響ビジュアライザーコンポーネント
const SimpleAudioVisualizer = ({ isActive }: { isActive: boolean }) => {
  return (
    <div className={`visualizer-simple ${isActive ? 'opacity-100' : 'opacity-30'}`}>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="visualizer-bar-simple"
          style={{
            animationDelay: `${i * 0.1}s`,
            height: isActive ? `${Math.random() * 16 + 4}px` : '4px'
          }}
        />
      ))}
    </div>
  )
}

// ペルソナ管理モーダルコンポーネント
const PersonaAdminModal = ({ 
  isOpen, 
  onClose, 
  personas
}: { 
  isOpen: boolean
  onClose: () => void
  personas: Persona[]
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-simple max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">ペルソナ管理</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              事前定義されたペルソナの一覧です。データを編集するには 
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">frontend/data/personas/personas.json</code> 
              ファイルを直接編集してください。
            </p>
            
            <div className="grid gap-4">
              {personas.map(persona => (
                <div key={persona.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{persona.name}</h3>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {persona.category}
                      </span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      persona.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {persona.active ? '有効' : '無効'}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-2">{persona.description}</p>
                  
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      詳細情報を表示
                    </summary>
                    <div className="mt-2 space-y-1 text-gray-600">
                      <p><strong>性格:</strong> {persona.personality}</p>
                      <p><strong>話し方:</strong> {persona.speakingStyle}</p>
                      <p><strong>専門分野:</strong> {persona.expertise.join(', ')}</p>
                      <p><strong>特徴的な言葉:</strong> {persona.catchPhrase}</p>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  // 基本的なステート
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [avatarExists, setAvatarExists] = useState(false)
  
  // 新機能のステート
  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [error, setError] = useState<ErrorState | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isComposing, setIsComposing] = useState(false)
  
  // 人物プロファイル関連のステート
  const [predefinedPersonas, setPredefinedPersonas] = useState<Persona[]>([])
  const [activePersona, setActivePersona] = useState<Persona | null>(null)
  const [loadingPersonas, setLoadingPersonas] = useState(true)
  const [showAdminModal, setShowAdminModal] = useState(false)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // LocalStorage関連の定数
  const STORAGE_KEY = 'ai-chat-history'
  const MAX_MESSAGES = 50

  // 会話履歴の保存
  const saveConversation = useCallback((messages: Message[]) => {
    try {
      const history: ConversationHistory = {
        messages: messages.slice(-MAX_MESSAGES),
        lastUpdated: new Date()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.warn('Failed to save conversation:', error)
    }
  }, [])

  // 会話履歴の読み込み
  const loadConversation = useCallback((): Message[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const history: ConversationHistory = JSON.parse(stored)
        return history.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }
    } catch (error) {
      console.warn('Failed to load conversation:', error)
    }
    return []
  }, [])

  // 会話履歴のクリア
  const clearHistory = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])


  // メッセージの自動スクロール
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // 音声合成機能
  const speakText = useCallback((text: string) => {
    if (!speechSynthesisSupported) return

    speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    
    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [speechSynthesisSupported])

  // 音声の一時停止/再開
  const toggleSpeech = useCallback(() => {
    if (speechSynthesis.speaking) {
      if (speechSynthesis.paused) {
        speechSynthesis.resume()
      } else {
        speechSynthesis.pause()
      }
    }
  }, [])

  // 音声の停止
  const stopSpeech = useCallback(() => {
    speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  // 音声認識の開始
  const startRecording = useCallback(() => {
    if (!speechSupported || !recognitionRef.current) return

    try {
      recognitionRef.current.start()
      setIsRecording(true)
      setError(null)
    } catch (error) {
      console.error('Failed to start recording:', error)
      setError({
        type: 'unknown',
        message: '音声認識の開始に失敗しました',
        retryable: true
      })
    }
  }, [speechSupported])

  // 音声認識の停止
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  // メッセージの送信
  const sendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || message.trim()
    if (!textToSend) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setMessage('')
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: textToSend,
          personaId: activePersona?.id
        }),
      })

      if (!response.ok) {
        let errorType: ErrorState['type'] = 'api'
        let errorMessage = 'APIエラーが発生しました'
        
        if (response.status === 429) {
          errorType = 'rate_limit'
          errorMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください。'
        } else if (response.status >= 500) {
          errorType = 'api'
          errorMessage = 'サーバーエラーが発生しました'
        } else if (!navigator.onLine) {
          errorType = 'network'
          errorMessage = 'ネットワーク接続を確認してください'
        }

        setError({
          type: errorType,
          message: errorMessage,
          retryable: true
        })

        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      setIsResponding(true)
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }
      
      const finalMessages = [...newMessages, aiMessage]
      setMessages(finalMessages)
      saveConversation(finalMessages)
      
      if (speechSynthesisSupported) {
        speakText(data.response)
      }
      
      setTimeout(() => {
        setIsResponding(false)
      }, 1000)
      
      setRetryCount(0)
    } catch (error) {
      console.error('Error:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'エラーが発生しました。右上の再試行ボタンをクリックしてください。',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      setIsResponding(false)
    } finally {
      setLoading(false)
    }
  }, [message, messages, saveConversation, speechSynthesisSupported, speakText, activePersona])

  // リトライ機能
  const retryLastMessage = useCallback(() => {
    const lastUserMessage = messages.findLast(msg => msg.role === 'user')
    if (lastUserMessage && retryCount < 3) {
      setRetryCount(prev => prev + 1)
      setMessages(prev => prev.filter(msg => !msg.content.includes('エラーが発生しました')))
      sendMessage(lastUserMessage.content)
    }
  }, [messages, retryCount, sendMessage])

  // メッセージのコピー
  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  // 会話のエクスポート
  const exportConversation = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const content = messages.map(msg => {
      const time = msg.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      const role = msg.role === 'user' ? 'ユーザー' : 'AI'
      return `[${time}] ${role}: ${msg.content}`
    }).join('\n\n')
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${timestamp}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [messages])

  // キーボードショートカット
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 日本語入力の変換中かチェック（e.nativeEvent.isComposingも確認）
    const isCurrentlyComposing = e.nativeEvent.isComposing || isComposing
    
    if (e.key === 'Enter' && !e.shiftKey && !isCurrentlyComposing) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage, isComposing])

  // 文字数計算
  const characterCount = useMemo(() => message.length, [message])

  // 事前定義されたペルソナの読み込み
  const loadPredefinedPersonas = useCallback(async () => {
    // フォールバック用のハードコーディングされたペルソナ（全ペルソナ）
    const fallbackPersonas: Persona[] = [
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
        sampleResponses: [{
          question: "人生について教えてください",
          response: "人生とは、智と情と意地の三つの要素が複雑に絡み合った、まことに厄介な代物でございますな。智に働けば角が立ち、情に棹させば流されてしまう。さりとて意地を通そうとすれば窮屈で仕方がない。この三つの板挟みの中で、我々は日々もがいているのです。"
        }],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        active: true
      },
      {
        id: "albert-einstein",
        name: "アルベルト・アインシュタイン",
        category: "科学者",
        description: "20世紀最大の物理学者。相対性理論の発見により、現代物理学の基礎を築いた。1921年ノーベル物理学賞受賞。",
        personality: "好奇心旺盛で想像力豊か。謙虚でありながら確信に満ちている。平和主義者で人道主義的な価値観を持つ。単純な生活を好み、権威を嫌う。",
        speakingStyle: "分かりやすい例え話を用いて複雑な概念を説明する。謙虚だが確信的で、時に詩的な表現を使う。科学への情熱と人類への愛情が言葉に表れる。",
        background: "1879年ドイツのウルム生まれ。スイス連邦工科大学卒業後、特許庁で働きながら研究を続ける。1905年に特殊相対性理論、1915年に一般相対性理論を発表。ナチスの台頭によりアメリカに移住し、プリンストン高等研究所で研究を続けた。",
        expertise: ["物理学", "数学", "宇宙論", "哲学", "平和運動", "教育"],
        catchPhrase: "神はサイコロを振らない。想像力は知識より大切だ。",
        responseStyle: {
          tone: "謙虚で温かみがあり、知的好奇心に満ちた",
          vocabulary: "科学用語を一般人にも分かりやすく説明",
          approach: "具体例や比喩を多用し、複雑な概念をシンプルに表現"
        },
        sampleResponses: [{
          question: "時間とは何ですか？",
          response: "時間というものは、我々が考えているほど絶対的なものではありません。熱いストーブの上に手を置けば1分が1時間のように感じられ、美しい女性と座っていれば1時間が1分のように感じられる。それが相対性です。しかし、物理学的には、時間と空間は一体となった時空という4次元の構造の中で、重力や運動によって伸び縮みする性質を持っているのです。"
        }],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        active: true
      },
      {
        id: "steve-jobs",
        name: "スティーブ・ジョブズ",
        category: "実業家",
        description: "Appleの共同創設者。iPhone、iPad、Macなど革新的な製品を生み出し、デジタル時代を牽引した起業家。",
        personality: "完璧主義者で妥協を許さない。創造的で革新的だが、時に厳しく要求水準が高い。直感的で美的センスに優れ、シンプルさを重視する。",
        speakingStyle: "情熱的で説得力があり、時に劇的な表現を使う。シンプルで分かりやすい言葉を選び、比喩やストーリーを効果的に使う。確信に満ちた語り口。",
        background: "1955年サンフランシスコ生まれ。1976年スティーブ・ウォズニアックと共にAppleを創設。一度は会社を追われたが、1997年に復帰し、iMac、iPod、iPhone、iPadなどを発表。2011年に膵癌で死去。",
        expertise: ["製品デザイン", "イノベーション", "マーケティング", "経営戦略", "プレゼンテーション", "ユーザーエクスペリエンス"],
        catchPhrase: "Stay hungry, stay foolish. シンプルであることは、複雑であることよりもむずかしい。",
        responseStyle: {
          tone: "情熱的で確信に満ち、時に挑発的",
          vocabulary: "シンプルで力強い表現、製品やビジネスの比喩を多用",
          approach: "ユーザー視点を重視し、革新と品質への執着を示す"
        },
        sampleResponses: [{
          question: "イノベーションとは何ですか？",
          response: "イノベーションとは、人々が何を望んでいるかを知る前に、それを提供することです。市場調査は無意味だ。フォード氏が言ったように、もしお客に何が欲しいかを聞いていたら、『もっと速い馬が欲しい』と答えていただろう。我々の仕事は、まだ存在しないものを読み取ることです。そして、それをシンプルで美しく、直感的に使える形で世界に提示するのです。"
        }],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        active: true
      },
      {
        id: "marie-curie",
        name: "マリー・キュリー",
        category: "科学者",
        description: "ポーランド出身の物理学者・化学者。女性初のノーベル賞受賞者であり、史上唯一異なる分野で2回ノーベル賞を受賞。",
        personality: "献身的で粘り強く、科学への情熱に燃える。困難に屈しない強い意志を持ち、性別による偏見に立ち向かった。謙虚で学問に対して真摯な姿勢。",
        speakingStyle: "科学的で正確な表現を心がけ、感情よりも事実を重視する。しかし科学への情熱や女性の地位向上への想いを語る時は情熱的になる。",
        background: "1867年ワルシャワ生まれ。パリ大学で物理学と数学を学び、ピエール・キュリーと結婚。ラジウムとポロニウムを発見し、1903年に物理学賞、1911年に化学賞を受賞。夫の死後も研究を続け、第一次大戦では移動X線車を開発。",
        expertise: ["物理学", "化学", "放射能研究", "X線技術", "女性の権利", "科学教育"],
        catchPhrase: "人生において恐れるものは何もない。理解すべきものがあるだけだ。",
        responseStyle: {
          tone: "科学的で冷静、しかし情熱的な一面も",
          vocabulary: "正確で学術的な表現、実験や研究の比喩を使用",
          approach: "事実に基づいた論理的思考と、女性の社会参加への強い信念"
        },
        sampleResponses: [{
          question: "女性が科学分野で活躍するには？",
          response: "科学に性別は関係ありません。重要なのは真実を追求する情熱と、失敗を恐れない勇気です。私も多くの偏見と闘いました。しかし、実験室での成果がすべてを証明してくれます。女性には忍耐力と細やかな観察力という素晴らしい特質があります。これらを活かし、決して諦めないことです。科学は人類全体のものであり、半分の人類である女性の参加なしには完全ではありません。"
        }],
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
        sampleResponses: [{
          question: "バーチャル職場見学の魅力は？",
          response: "360度の高精細ビジュアルで、実際にその場にいるような感覚を届けられることです。オンライン化が進むほど『体験の欠如』が課題になっていますが、バチャナビならその空気感まで伝えられます。Zoomが会話のインフラなら、バチャナビは現場の空気を伝えるインフラなんです。他社は情報を『読ませる』サービスですが、バチャナビは『体験させる』サービス。文字や写真では伝わらない、オフィスの雰囲気や社員の表情、実際の仕事風景まで、直感的に感じてもらえる。これが決定的な違いです。"
        }],
        createdAt: "2025-07-22T00:00:00Z",
        updatedAt: "2025-07-22T00:00:00Z",
        active: true
      }
    ]

    try {
      setLoadingPersonas(true)
      console.log('Loading predefined personas...') // デバッグ用
      const response = await fetch('/api/personas?active=true')
      console.log('Personas API response status:', response.status) // デバッグ用
      
      if (response.ok) {
        const data = await response.json()
        console.log('Personas data received:', data) // デバッグ用
        const personas = data.personas || fallbackPersonas
        setPredefinedPersonas(personas)
        console.log(`Set ${personas.length} personas in state`) // デバッグ用
        
        // LocalStorageから選択中のペルソナIDを復元
        const savedPersonaId = localStorage.getItem('selected-persona-id')
        if (savedPersonaId) {
          const savedPersona = personas.find((p: Persona) => p.id === savedPersonaId)
          if (savedPersona) {
            setActivePersona(savedPersona)
          }
        }
      } else {
        console.error('Failed to fetch personas, using fallback data. Status:', response.status)
        setPredefinedPersonas(fallbackPersonas)
      }
    } catch (error) {
      console.error('Failed to load predefined personas, using fallback data:', error)
      setPredefinedPersonas(fallbackPersonas)
    } finally {
      setLoadingPersonas(false)
    }
  }, [])

  // ペルソナ選択機能
  const selectPersona = useCallback((persona: Persona | null) => {
    setActivePersona(persona)
    if (persona) {
      localStorage.setItem('selected-persona-id', persona.id)
    } else {
      localStorage.removeItem('selected-persona-id')
    }
  }, [])

  // 初期化
  useEffect(() => {
    // アバター画像の存在確認
    const checkAvatarExists = async () => {
      try {
        const response = await fetch('/avatar.png')
        setAvatarExists(response.ok)
      } catch {
        setAvatarExists(false)
      }
    }
    checkAvatarExists()

    // 会話履歴の読み込み
    const savedMessages = loadConversation()
    setMessages(savedMessages)

    // 事前定義されたペルソナの読み込み
    loadPredefinedPersonas()

    // 音声認識のサポート確認
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'ja-JP'

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setMessage(transcript)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognition.onerror = (event: any) => {
        setIsRecording(false)
        setError({
          type: 'unknown',
          message: `音声認識エラー: ${event.error}`,
          retryable: true
        })
      }

      recognitionRef.current = recognition
    }

    // 音声合成のサポート確認
    setSpeechSynthesisSupported('speechSynthesis' in window)

    // オンライン状態の監視
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadConversation, loadPredefinedPersonas])

  // メッセージ追加時の自動スクロール
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // メッセージの保存
  useEffect(() => {
    if (messages.length > 0) {
      saveConversation(messages)
    }
  }, [messages, saveConversation])

  return (
    <div className="min-h-screen gradient-background">
      <main className="container mx-auto max-w-4xl p-4 min-h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              💬 AIチャットボット
            </h1>
            {activePersona && (
              <p className="text-lg text-gray-600 mt-1">
                🎭 {activePersona.name} として回答
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            {!isOnline && (
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium">
                ⚠️ オフライン
              </div>
            )}
            
            {error && error.retryable && (
              <button
                onClick={retryLastMessage}
                className="btn-simple px-4 py-2 text-sm font-medium"
                aria-label="再試行"
              >
                🔄 再試行
              </button>
            )}
            
            {/* ペルソナ選択ドロップダウン */}
            <select
              value={activePersona?.id || ''}
              onChange={(e) => {
                console.log('Persona selected:', e.target.value) // デバッグ用
                const selectedPersona = predefinedPersonas.find(p => p.id === e.target.value) || null
                console.log('Found persona:', selectedPersona) // デバッグ用
                selectPersona(selectedPersona)
              }}
              className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium"
              disabled={loadingPersonas}
            >
              <option value="">一般AI</option>
              {predefinedPersonas.map(persona => (
                <option key={persona.id} value={persona.id}>
                  {persona.name} ({persona.category})
                </option>
              ))}
            </select>
            
            {/* 強制読み込みボタン（デバッグ用） */}
            <button
              onClick={() => {
                console.log('Force reloading personas...')
                loadPredefinedPersonas()
              }}
              className="btn-simple px-3 py-1 text-xs"
            >
              🔄 強制再読込
            </button>

            {/* デバッグ情報（開発用） */}
            <div className="text-xs text-gray-500">
              読み込み中: {loadingPersonas ? 'Yes' : 'No'} | 
              ペルソナ数: {predefinedPersonas.length} | 
              選択中: {activePersona?.name || 'なし'}
            </div>
            
            {/* 管理者機能ボタン（開発用） */}
            <button
              onClick={() => setShowAdminModal(true)}
              className="btn-simple px-4 py-2 text-sm font-medium"
              aria-label="ペルソナ管理"
            >
              ⚙️ 管理
            </button>
            
            {messages.length > 0 && (
              <>
                <button
                  onClick={exportConversation}
                  className="btn-simple px-4 py-2 text-sm font-medium"
                  aria-label="会話をエクスポート"
                >
                  📄 エクスポート
                </button>
                
                <button
                  onClick={clearHistory}
                  className="btn-simple px-4 py-2 text-sm font-medium"
                  aria-label="履歴をクリア"
                >
                  🗑️ クリア
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* アバター */}
        <div className="flex flex-col items-center mb-8">
          <div className={`avatar-float relative w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden glass-simple transition-all duration-300 ${
            isResponding ? 'scale-105' : loading ? 'scale-95' : ''
          }`}>
            {avatarExists ? (
              <Image
                src="/avatar.png"
                alt="AI Avatar"
                width={192}
                height={192}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-200 to-pink-200 flex items-center justify-center">
                <span className="text-4xl md:text-6xl">🤖</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-lg text-gray-700 text-center font-medium">
            {loading ? (
              <div className="typing-simple">
                <span>考え中</span>
                <div className="typing-dot-simple" />
                <div className="typing-dot-simple" />
                <div className="typing-dot-simple" />
              </div>
            ) : isResponding ? (
              '🎭 回答中...'
            ) : (
              '💭 何でもお聞きください！'
            )}
          </div>
          
          {/* 音響ビジュアライザー */}
          <div className="mt-4">
            <SimpleAudioVisualizer isActive={isSpeaking || isRecording || loading} />
          </div>
          
          {/* 音声制御ボタン */}
          {speechSynthesisSupported && isSpeaking && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={toggleSpeech}
                className="btn-simple px-4 py-2 text-sm font-medium"
                aria-label="音声の一時停止/再開"
              >
                {speechSynthesis.paused ? '▶️ 再生' : '⏸️ 一時停止'}
              </button>
              <button
                onClick={stopSpeech}
                className="btn-simple px-4 py-2 text-sm font-medium"
                aria-label="音声停止"
              >
                ⏹️ 停止
              </button>
            </div>
          )}
        </div>
        
        {/* チャット画面 */}
        <div 
          ref={chatContainerRef}
          className="glass-simple p-6 flex-1 overflow-y-auto mb-6 scrollbar-simple"
          role="log"
          aria-label="チャット履歴"
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-600 mt-12 text-lg">
              🚀 新しい会話を始めましょう！
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`mb-6 message-fade ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div className={`inline-block max-w-[80%] md:max-w-[70%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`relative group message-container p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-400 to-pink-400 text-white shadow-lg' 
                      : 'glass-simple text-gray-800'
                  }`}>
                    <div className="relative z-10">
                      {msg.content}
                    </div>
                    
                    {/* コピーボタン */}
                    <button
                      onClick={() => copyMessage(msg.content)}
                      className="copy-btn"
                      aria-label="メッセージをコピー"
                    >
                      📋
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2 font-mono">
                    {msg.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="text-center">
              <div className="glass-simple inline-block p-4 rounded-2xl">
                <div className="typing-simple">
                  <span className="text-gray-700">AI思考中</span>
                  <div className="typing-dot-simple" />
                  <div className="typing-dot-simple" />
                  <div className="typing-dot-simple" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => {
                  // 変換確定後、少し遅延を入れてから状態を更新
                  setTimeout(() => setIsComposing(false), 0)
                }}
                placeholder="質問を入力してください... (Shift+Enterで改行)"
                className="input-simple w-full p-4 text-gray-800 placeholder-gray-500 resize-none font-medium"
                rows={1}
                style={{ minHeight: '56px', maxHeight: '120px' }}
                disabled={loading}
                aria-label="メッセージ入力"
              />
              
              {/* 音声入力ボタン */}
              {speechSupported && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-red-400 text-white animate-pulse scale-110' 
                      : 'bg-gradient-to-r from-blue-400 to-pink-400 text-white hover:scale-110'
                  }`}
                  disabled={loading}
                  aria-label={isRecording ? '録音停止' : '音声入力開始'}
                >
                  🎤
                </button>
              )}
            </div>
            
            <button
              onClick={() => sendMessage()}
              disabled={loading || !message.trim()}
              className="btn-simple px-8 py-4 text-lg font-medium flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="メッセージ送信"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  送信中
                </>
              ) : (
                <>
                  🚀 送信
                </>
              )}
            </button>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 font-mono">
              📝 {characterCount} 文字
            </div>
            
            {!speechSupported && (
              <div className="text-sm text-orange-600 glass-simple px-3 py-1 rounded-full">
                🎯 音声入力は非対応のブラウザです
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ペルソナ管理モーダル */}
      <PersonaAdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        personas={predefinedPersonas}
      />
    </div>
  )
}