import OpenAI from 'openai'
import fs from 'fs'

export const STYLES: Record<string, { label: string; prompt: string }> = {
  '北欧简约': {
    label: '北欧简约',
    prompt: '改造成北欧简约风格：白色墙面、浅木色家具、绿植点缀、自然光线、干净利落的线条，整体明亮通透',
  },
  '现代轻奢': {
    label: '现代轻奢',
    prompt: '改造成现代轻奢风格：大理石元素、金属质感、灰调配色、高级材质、精致软装，彰显品质感',
  },
  '新中式': {
    label: '新中式',
    prompt: '改造成新中式风格：深色实木、格栅元素、水墨留白、禅意氛围、中国传统美学与现代设计融合',
  },
  '侘寂风': {
    label: '侘寂风',
    prompt: '改造成侘寂风格：自然肌理、不完美美感、素色调性、粗糙质感、极简留白，展现时间之美',
  },
  '工业风': {
    label: '工业风',
    prompt: '改造成工业风格：裸露砖墙、铁艺管道、水泥灰色、皮质家具、做旧金属，粗犷有个性',
  },
  '奶油风': {
    label: '奶油风',
    prompt: '改造成奶油风格：米白奶油色系、圆润造型、柔软织物、温暖灯光、治愈系氛围',
  },
}

export function buildStylePrompt(style: string): string {
  const entry = STYLES[style]
  if (!entry) throw new Error(`Unknown style: ${style}`)
  return `请将这张室内照片${entry.prompt}。保留原有的空间结构、门窗位置和整体布局，仅改变装修风格和家具陈设。生成专业室内设计师水准的效果图，高质量写实风格。`
}

export async function generateRoomImage(params: {
  imagePath: string
  style: string
}): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.ZENMUX_API_KEY!,
    baseURL: 'https://zenmux.ai/api/v1',
  })

  const imageStream = fs.createReadStream(params.imagePath)
  const prompt = buildStylePrompt(params.style)

  const response = await client.images.edit({
    model: 'gpt-image-1-mini',
    image: imageStream as unknown as Parameters<typeof client.images.edit>[0]['image'],
    prompt,
    size: '1024x1024',
  })

  const url = response.data?.[0]?.url
  if (!url) throw new Error('No image URL returned from ZenMux')
  return url
}
