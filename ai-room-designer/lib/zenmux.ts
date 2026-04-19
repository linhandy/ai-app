import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import sharp from 'sharp'
import type { DesignMode } from './orders'
import { findStyleByKey, findRoomType } from './design-config'
import { isOverseas } from './region'

// Re-export for backward compatibility
export { STYLE_CATEGORIES, DESIGN_MODES } from './design-config'

/** Map quality tier → ZenMux Gemini image model */
const QUALITY_MODEL: Record<string, string> = {
  standard: 'google/gemini-3-pro-image-preview',
  premium:  'google/gemini-3-pro-image-preview',
  ultra:    'google/gemini-3-pro-image-preview',
}

/** Max pixel dimension per quality tier (null = no resize) */
const QUALITY_MAX_PX: Record<string, number | null> = {
  standard: 1024,
  premium: 2048,
  ultra: null, // no resize, keep native
}

export function buildStylePrompt(
  style: string,
  quality: string,
  mode: DesignMode = 'redesign',
  roomType: string = 'living_room',
  customPrompt?: string,
): string {
  const useEn = isOverseas || quality === 'standard'
  const room = findRoomType(roomType)
  const roomHint = useEn
    ? (room?.promptHint ?? 'a room')
    : (room?.promptHintCn ?? '房间')

  let base: string

  if (mode === 'inpaint') {
    const replacement = customPrompt?.trim() ?? 'something new'
    if (useEn) {
      return `This room photo has a red-highlighted area painted over it.\nReplace only the red-highlighted area with: ${replacement}.\nPreserve all non-highlighted areas exactly — keep all colors, materials, furniture, lighting, and layout unchanged outside the red area.\nRoom: ${roomHint}.`
    } else {
      return `这张房间照片上有一块红色高亮区域。\n只将红色高亮区域替换为：${replacement}。\n精确保留所有非高亮区域——保持红色区域外的所有颜色、材质、家具、灯光和布局完全不变。\n房间：${roomHint}。`
    }
  }

  if (mode === 'paint_walls') {
    base = useEn
      ? 'Change only the wall colors and wall materials in this room. Try warm white, light grey or pastel tones. Keep all furniture, fixtures and layout completely unchanged. Generate a photorealistic interior photo.'
      : '仅改变这个房间的墙面颜色和墙面材质，尝试暖白、浅灰或莫兰迪色调。保持所有家具、摆设和布局完全不变。生成真实感强的室内照片。'
  } else if (mode === 'change_lighting') {
    base = useEn
      ? 'Improve the lighting in this room dramatically. Add bright natural light from windows, warm ambient lighting, and accent lights. Make the room feel bright, inviting and well-lit. Keep furniture and layout unchanged. Generate a photorealistic interior photo.'
      : '大幅改善这个房间的光照效果。增加窗户自然光、暖色环境光和重点照明。让房间感觉明亮、温馨、光线充足。保持家具和布局不变。生成真实感强的室内照片。'
  } else if (mode === 'outdoor_redesign') {
    base = useEn
      ? 'Redesign this outdoor space with beautiful professional landscaping. Add lush plants, colorful flowers, trees, stone or wooden pathways, and stylish outdoor furniture. Keep the original space structure and architecture. Generate a photorealistic exterior landscape photo.'
      : '重新设计这个户外空间，打造专业景观效果。添加丰富的植物、五彩的花卉、树木、石板或木质小径和精致的户外家具。保留原有空间结构和建筑外形。生成真实感强的户外景观效果图。'
  } else if (mode === 'style-match') {
    base = useEn
      ? `The first image is the room to redesign. The second image is the style reference. Apply the interior design style from the second image to the room in the first image. Preserve the room's architectural structure and dimensions. Match the style: colors, materials, furniture style, lighting mood, and decorative aesthetic.`
      : `第一张图片是需要改造的房间，第二张图片是风格参考图。将第二张图片的室内设计风格应用到第一张图片的房间中。保留房间的建筑结构和尺寸。匹配风格：色彩、材质、家具风格、灯光氛围和装饰美感。`
  } else {
    const entry = findStyleByKey(style)
    if (!entry) throw new Error(`Unknown style: ${style}`)

    if (mode === 'sketch2render') {
      base = useEn
        ? `Convert this hand-drawn sketch into a photorealistic interior design render in ${entry.promptEn} style. Add realistic materials, proper lighting, and detailed furniture. Keep the room structure shown in the sketch. Generate a professional photorealistic interior design image.`
        : `将这张手绘草图转换为${entry.prompt}风格的写实室内设计效果图。添加真实的材质、合适的光线和详细的家具细节，保留草图中展示的空间结构。生成专业室内设计师水准的写实效果图。`
    } else if (mode === 'freestyle') {
      base = useEn
        ? `Generate a brand new ${entry.promptEn} interior design for a ${roomHint}. Beautiful natural lighting, realistic materials, professional interior photography quality. No people, no text overlays. Photorealistic interior design image.`
        : `生成一张全新的${entry.prompt}风格${roomHint}效果图。自然光线充足，材质真实，专业室内摄影级别的画质。无人物，无文字。生成专业室内设计写实效果图，高质量照片真实感。`
    } else if (mode === 'virtual_staging') {
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
        ? `Completely transform this room into ${entry.promptEn} interior design style. Keep only the architectural bones: walls, windows, door positions and overall room dimensions. Replace ALL furniture, wall finishes, flooring, lighting fixtures, textiles, artwork and decor to fully express the ${entry.promptEn} aesthetic — do not keep the original furnishings. Make the style transformation unmistakably visible. Professional interior photography, bright natural lighting, sharp details, photorealistic.`
        : `彻底将这张照片改造为${entry.prompt}风格的室内设计。只保留建筑结构：墙体、门窗位置和整体空间尺寸。**完全替换**所有家具、墙面饰面、地板、灯具、软装、艺术品和装饰——不要保留原有家具陈设。让风格转变一眼可辨。专业室内摄影级写实效果，自然光线充足，画面清晰锐利。`
    }
  }

  // Append room type context (freestyle embeds roomHint in base prompt, skip appending)
  if (mode !== 'freestyle') {
    const roomLine = useEn ? `Room: ${roomHint}.` : `房间：${roomHint}。`
    base = `${base}\n${roomLine}`
  }

  // Append optional custom prompt
  if (customPrompt?.trim()) {
    base += `\n${customPrompt.trim()}`
  }

  // Hyper Realism boost — only for Ultra quality (4096px, Pro/Unlimited only)
  // Note: inpaint mode exits early above, so this branch is for photo-mode prompts only
  if (quality === 'ultra') {
    const hyperRealism = useEn
      ? '\nHyper-realism boost: ultra-realistic architectural photography, cinematic lighting with ray-traced global illumination, shallow depth of field, crisp 8K details, magazine cover quality.'
      : '\n超写实加强：超真实建筑摄影、电影级光照和全局光追效果、浅景深虚化、8K级细节锐利度、杂志封面级品质。'
    base += hyperRealism
  }

  return base
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
  imagePath: string | null
  referenceImagePath?: string
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

  let contentParts: { inlineData?: { mimeType: string; data: string }; text?: string }[]

  if (mode === 'style-match' && !params.referenceImagePath) {
    throw new Error('style-match mode requires a referenceImagePath')
  }

  if (mode === 'style-match' && params.imagePath && params.referenceImagePath) {
    // style-match: two images — room photo + reference photo
    const roomBuffer = fs.readFileSync(params.imagePath)
    const roomBase64 = roomBuffer.toString('base64')
    const roomMime = params.imagePath.endsWith('.png') ? 'image/png'
      : params.imagePath.endsWith('.webp') ? 'image/webp'
      : 'image/jpeg'
    const refBuffer = fs.readFileSync(params.referenceImagePath)
    const refBase64 = refBuffer.toString('base64')
    const refMime = params.referenceImagePath.endsWith('.png') ? 'image/png'
      : params.referenceImagePath.endsWith('.webp') ? 'image/webp'
      : 'image/jpeg'
    contentParts = [
      { inlineData: { mimeType: roomMime, data: roomBase64 } },
      { inlineData: { mimeType: refMime, data: refBase64 } },
      { text: prompt },
    ]
  } else if (params.imagePath) {
    const imageBuffer = fs.readFileSync(params.imagePath)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = params.imagePath.endsWith('.png') ? 'image/png'
      : params.imagePath.endsWith('.webp') ? 'image/webp'
      : 'image/jpeg'
    contentParts = [
      { inlineData: { mimeType, data: base64Image } },
      { text: prompt },
    ]
  } else {
    // Freestyle mode — text-only generation, no input image
    contentParts = [{ text: prompt }]
  }

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: contentParts,
      },
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts || []
  for (const part of parts) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, 'base64')
      const maxPx = QUALITY_MAX_PX[quality ?? 'standard'] ?? QUALITY_MAX_PX.standard
      if (maxPx !== null) {
        const resized = await sharp(buffer)
          .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 92, progressive: true })
          .toBuffer()
        return resized
      }
      return buffer
    }
  }

  throw new Error('AI 未返回图片，请重试')
}
