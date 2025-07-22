export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ConversationHistory {
  messages: Message[]
  lastUpdated: Date
}

export type Theme = 'light' | 'dark'

export interface ErrorState {
  type: 'api' | 'network' | 'rate_limit' | 'unknown'
  message: string
  retryable: boolean
}

// 人物プロファイル関連の型定義
export interface PersonProfile {
  id: string
  name: string
  description: string
  personality: string
  speakingStyle: string
  background: string
  expertise: string[]
  catchPhrase?: string
  createdAt: Date
  updatedAt: Date
}

export interface PersonProfileStorage {
  profiles: PersonProfile[]
  activeProfileId: string | null
  lastUpdated: Date
}

// 音声認識API の型定義
export interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

export interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

export interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

export interface WebkitSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

// Window インターフェースの拡張
declare global {
  interface Window {
    SpeechRecognition: {
      new(): WebkitSpeechRecognition
    }
    webkitSpeechRecognition: {
      new(): WebkitSpeechRecognition
    }
  }
}