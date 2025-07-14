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

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

export interface WebkitSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onaudiostart: ((this: WebkitSpeechRecognition, ev: Event) => any) | null
  onaudioend: ((this: WebkitSpeechRecognition, ev: Event) => any) | null
  onend: ((this: WebkitSpeechRecognition, ev: Event) => any) | null
  onerror: ((this: WebkitSpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onresult: ((this: WebkitSpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onstart: ((this: WebkitSpeechRecognition, ev: Event) => any) | null
}

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): WebkitSpeechRecognition
    }
    SpeechRecognition: {
      new (): WebkitSpeechRecognition
    }
  }
}

export type Theme = 'light' | 'dark'

export interface ErrorState {
  type: 'network' | 'api' | 'rate_limit' | 'unknown'
  message: string
  retryable: boolean
  retryAfter?: number
}