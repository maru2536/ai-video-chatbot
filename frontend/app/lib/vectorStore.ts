interface Document {
  pageContent: string
  metadata: any
}

class SimpleEmbeddings {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate embedding: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }
}

export class VectorStore {
  private embeddings: SimpleEmbeddings
  private documents: Map<string, { embedding: number[], content: string, metadata: any }>

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    this.embeddings = new SimpleEmbeddings(process.env.OPENAI_API_KEY)
    this.documents = new Map()
  }

  async addDocuments(docs: Document[]): Promise<void> {
    for (const doc of docs) {
      const embedding = await this.embeddings.embedQuery(doc.pageContent)
      const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      this.documents.set(id, {
        embedding,
        content: doc.pageContent,
        metadata: doc.metadata
      })
    }
  }

  async similaritySearch(query: string, k: number = 4): Promise<Document[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query)
    
    const similarities: { id: string, score: number, doc: any }[] = []
    
    for (const [id, doc] of this.documents.entries()) {
      const score = this.cosineSimilarity(queryEmbedding, doc.embedding)
      similarities.push({ id, score, doc })
    }
    
    similarities.sort((a, b) => b.score - a.score)
    
    return similarities.slice(0, k).map(item => ({
      pageContent: item.doc.content,
      metadata: { ...item.doc.metadata, score: item.score }
    }))
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  getDocumentCount(): number {
    return this.documents.size
  }

  clear(): void {
    this.documents.clear()
  }
}

let vectorStoreInstance: VectorStore | null = null

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore()
  }
  return vectorStoreInstance
}