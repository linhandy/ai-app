import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { HouseDesign } from '@/lib/types';

const zenmux = new OpenAI({
  apiKey: process.env.ZENMUX_API_KEY!,
  baseURL: process.env.ZENMUX_BASE_URL || 'https://zenmux.ai/api/v1',
});
const MODEL = () => process.env.LLM_MODEL || 'google/gemini-2.5-flash';

export async function POST(req: NextRequest) {
  let design: HouseDesign;
  try {
    const body = await req.json();
    design = body.design;
  } catch {
    return NextResponse.json({ error: '请求体解析失败' }, { status: 400 });
  }
  if (!design?.floors) {
    return NextResponse.json({ error: '缺少设计数据' }, { status: 400 });
  }

  const floorDesc = (design.floors ?? []).map(f => {
    const roomList = (f.rooms ?? []).map(r =>
      `${r.name}(${r.width.toFixed(1)}×${r.height.toFixed(1)}m)`
    ).join('、');
    return `${f.label}：${roomList}`;
  }).join('；');

  const prompt = `评估以下自建房户型，5维度打分(0-100)，每项comment限10字内，pros/cons/suggestions各限2条每条15字内。

地块${design.landWidth}×${design.landHeight}m，建筑${design.buildingWidth}×${design.buildingHeight}m，朝${design.orientation}，${design.floors.length}层。
${floorDesc}

严格按此JSON格式输出，不加代码块：
{"scores":{"layout":{"score":80,"comment":"动线合理"},"lighting":{"score":75,"comment":"采光充足"},"aesthetics":{"score":70,"comment":"比例协调"},"structure":{"score":85,"comment":"结构稳定"},"flexibility":{"score":70,"comment":"扩展一般"}},"overall":76,"pros":["优点1","优点2"],"cons":["缺点1","缺点2"],"suggestions":["建议1","建议2"]}`;

  try {
    const resp = await zenmux.chat.completions.create({
      model: MODEL(),
      messages: [
        { role: 'system', content: '你是建筑评审专家。只输出紧凑JSON，comment限10字，pros/cons/suggestions各限2条每条15字。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const content = resp.choices[0]?.message?.content || '';

    // Try extracting JSON — handle truncated responses gracefully
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return NextResponse.json(JSON.parse(match[0]));
      } catch {
        // JSON was truncated — try to repair by closing brackets
      }
    }

    // Attempt repair: find first '{', try progressively closing brackets
    const start = content.indexOf('{');
    if (start !== -1) {
      let fragment = content.slice(start);
      // Count unclosed braces/brackets
      let braces = 0, brackets = 0;
      for (const ch of fragment) {
        if (ch === '{') braces++;
        else if (ch === '}') braces--;
        else if (ch === '[') brackets++;
        else if (ch === ']') brackets--;
      }
      // Trim trailing incomplete string value (cut at last complete key-value)
      fragment = fragment.replace(/,"?[^"]*$/, '');
      fragment = fragment.replace(/,"[^"]*":\s*"[^"]*$/, '');
      // Close brackets and braces
      for (let i = 0; i < brackets; i++) fragment += ']';
      for (let i = 0; i < braces; i++) fragment += '}';
      try {
        return NextResponse.json(JSON.parse(fragment));
      } catch { /* still broken, fall through */ }
    }

    throw new Error(`AI 返回格式异常，请重试`);
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error('[analyze]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
