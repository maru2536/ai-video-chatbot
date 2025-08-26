import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { getVectorStore } from '@/app/lib/vectorStore'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルがアップロードされていません' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // ファイル内容をテキストとして読み取り
    let textContent = ''
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (fileExtension === 'txt' || fileExtension === 'md') {
      textContent = buffer.toString('utf-8')
    } else if (fileExtension === 'pdf') {
      // PDFの場合は簡易的にバッファをテキスト化（実際のPDF解析ではない）
      textContent = buffer.toString('utf-8').replace(/[^\x20-\x7E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
    } else {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。TXT、MDファイルのみ対応しています。' },
        { status: 400 }
      )
    }
    
    if (!textContent.trim()) {
      return NextResponse.json(
        { error: 'ファイルの内容を読み取れませんでした' },
        { status: 400 }
      )
    }
    
    // テキストをチャンクに分割
    const chunkSize = 1000
    const chunks = []
    for (let i = 0; i < textContent.length; i += chunkSize) {
      const chunk = textContent.slice(i, i + chunkSize)
      chunks.push({
        pageContent: chunk,
        metadata: {
          source: file.name,
          uploadedAt: new Date().toISOString(),
          chunkIndex: Math.floor(i / chunkSize)
        }
      })
    }
    
    const vectorStore = getVectorStore()
    await vectorStore.addDocuments(chunks)
    
    return NextResponse.json({
      success: true,
      message: `ファイル「${file.name}」が正常にアップロードされ、処理されました`,
      documentCount: chunks.length,
      totalDocuments: vectorStore.getDocumentCount()
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'ファイルのアップロード中にエラーが発生しました' },
      { status: 500 }
    )
  }
}