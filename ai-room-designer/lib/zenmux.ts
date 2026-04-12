import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import type { DesignMode } from './orders'
import { findStyleByKey, findRoomType } from './design-config'

// Re-export for backward compatibility
export { STYLE_CATEGORIES, DESIGN_MODES } from './design-config'

/** Map quality tier → ZenMux Gemini image model */
const QUALITY_MODEL: Record<string, string> = {
  standard: 'google/gemini-2.5-flash-image',
  premium:  'google/gemini-3.1-flash-image-preview',
  ultra:    'google/gemini-3-pro-image-preview',
}

export function buildStylePrompt(
  style: string,
  quality: string,
  mode: DesignMode = 'redesign',
  roomType: string = 'living_room',
  customPrompt?: string,
): string {
  const useEn = quality === 'standard'
  const room = findRoomType(roomType)
  const roomHint = useEn
    ? (room?.promptHint ?? 'a room')
    : (room?.promptHintCn ?? '房间')

  let base: string

  if (mode === 'paint_walls') {
    base = useEn
      ? 'Change only the wall colors and wall materials in this room. Try warm white, light grey or pastel tones. Keep all furniture, fixtures and layout completely unchanged. Generate a photorealistic interior photo.'
      : '仅改变这个房间的墙面颜色和墙面材质，尝试暖白、浅灰或莫兰迪色调。保持所有家具、摆设和布局完全不变。生成真实感强的室内照片。'
  } else if (mode === 'change_lighting') {
    base = useEn
      ? 'Improve the lighting in this room dramatically. Add bright natural light from windows, warm ambient lighting, and accent lights. Make the room feel bright, inviting and well-lit. Keep furniture and layout unchanged. Generate a photorealistic interior photo.'
      : '大幅改善这个房间的光照效果。增加窗户自然光、暖色环境光和重点照明。让房间感觉明亮、温馨、光线充足。保持家具和布局不变。生成真实感强的室内照片。'
  } else {
    const entry = findStyleByKey(style)
    if (!entry) throw new Error(`Unknown style: ${style}`)

    if (mode === 'virtual_staging') {
      base = useEn
        ? `Stage this empty room professionally with complete furniture and decor in ${entry.promptEn} style. Add sofa, tables, rugs, plants, art, lighting fixtures. Create a fully furnished, magazine-worthy interior. Keep room structure and windows. Generate a photorealistic interior design image.`
        : `请为这个空房间进行专业的虚拟家装布置，使用${entry.prompt}的风格。添加沙发、桌椅、地毯、绿植、装饰画、灯具等完整家具陈设。保留原有空间结构和门窗。生成专业室内设计师水准的效果图。`
    } else if (mode === 'add_furniture') {
      base = useEn
        ? `Add more stylish furniture and decor to this room in ${entry.promptEn} style. Add complementary pieces like accent chairs, side tables, plants, art, and decorative items. Keep existing furniture and room structure. Generate a photorealistic interior photo.`
        : `在这个房间中添加更多${entry.prompt}风格的家具和装饰品。添加点缀椅、边桌、绿植、装饰画、摆件等。保留现有家具和房间结构。生成真实感强的室内照片。`
    } else {
      // redesign (default)
      base = useEn
        ? `Redesign this room photo: ${entry.promptEn}. Keep the original room structure, windows and layout. Only change furniture, decor and style. Ensure bright lighting, clear details. Generate a professional photorealistic interior design image.`
        : `请将这张室内照片${entry.prompt}。保留原有的空间结构、门窗位置和整体布局，仅改变装修风格和家具陈设。保证充足的光线亮度，画面明亮清晰，不要偏暗。生成专业室内设计师水准的效果图，高质量写实风格，照片真实感强。`
    }
  }

  // Append room type context
  const roomLine = useEn ? `Room: ${roomHint}.` : `房间：${roomHint}。`
  let result = `${base}\n${roomLine}`

  // Append optional custom prompt
  if (customPrompt?.trim()) {
    result += `\n${customPrompt.trim()}`
  }

  return result
}

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.ZENMUX_API_KEY!,
    vertexai: true,
    httpOptions: {
      baseUrl: 'https://zenmux.ai/api/vertex-ai',
      apiVersion: 'v1',
    },
  })
}

export async function generateRoomImage(params: {
  imagePath: string
  style: string
  quality?: string
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
}): Promise<Buffer> {
  const quality = params.quality ?? 'standard'
  const mode = params.mode ?? 'redesign'
  const roomType = params.roomType ?? 'living_room'
  const client = getGenAIClient()
  const model = QUALITY_MODEL[quality] ?? QUALITY_MODEL.standard
  const prompt = buildStylePrompt(params.style, quality, mode, roomType, params.customPrompt)

  const imageBuffer = fs.readFileSync(params.imagePath)
  const base64Image = imageBuffer.toString('base64')
  const mimeType = params.imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts || []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64')
    }
  }

  throw new Error('AI 未返回图片，请重试')
}
