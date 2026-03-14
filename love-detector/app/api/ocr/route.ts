import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured. Please add ANTHROPIC_API_KEY to your .env.local file.' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: '请完整提取这张图片中的所有文字内容。如果是聊天记录截图，请完整提取所有对话文字。保持原始格式，不添加任何分析或解释，只输出纯文字内容。',
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OCR API error:', err)
      return NextResponse.json({ error: 'Image recognition failed' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content[0].text
    return NextResponse.json({ text })
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
