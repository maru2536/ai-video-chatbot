'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'
import './simple-ui.css'

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
        body: JSON.stringify({ message: textToSend }),
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
  }, [message, messages, saveConversation, speechSynthesisSupported, speakText])

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
  }, [loadConversation])

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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            💬 AIチャットボット
          </h1>
          
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
    </div>
  )
}