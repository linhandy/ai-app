import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const zenmux = new OpenAI({
  apiKey: process.env.ZENMUX_API_KEY!,
  baseURL: process.env.ZENMUX_BASE_URL || 'https://zenmux.ai/api/v1',
});
const MODEL = () => process.env.LLM_MODEL || 'google/gemini-2.5-flash';

export async function POST(req: NextRequest) {
  let imageBase64: string;
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
  } catch {
    return NextResponse.json({ error: '请求体解析失败' }, { status: 400 });
  }
  if (!imageBase64) {
    return NextResponse.json({ error: '请上传图片' }, { status: 400 });
  }

  const prompt = `请仔细分析这张建筑平面图/草图，输出两部分内容：

1. summary: 用中文写一段详细的图纸分析（200-400字），包含：
   - 建筑类型判断（自建房/别墅/联排等）
   - 📐 核心尺寸（面宽、进深、单层面积，注意图中mm标注要转为m）
   - 🏠 户型功能布局（每个房间的名称、位置、大致面积）
   - 💡 户型亮点点评（动线、采光、结构特点）

2. 结构化参数（用于后续CAD生成）

输出JSON格式（不加代码块）：
{"buildingWidth":5,"buildingHeight":15,"orientation":"南","numFloors":2,"floorRequirements":["一楼：客厅约15m²、卧室约10m²、卫生间约5m²、楼梯间约8m²","二楼：卧室约12m²、卫生间约4m²、阳台约6m²"],"summary":"这是一张建筑平面图...（详细分析文字）"}

规则：
- 仔细读取图中所有文字标注（房间名、尺寸、标高）
- mm单位转m（如5000mm=5m）
- 每层floorRequirements需列出该层所有房间及面积
- summary要专业详细，让用户理解图纸内容`;

  try {
    const resp = await zenmux.chat.completions.create({
      model: MODEL(),
      messages: [
        { role: 'system', content: '你是资深建筑图纸识别专家，能准确读取平面图中的尺寸标注、房间功能和建筑布局。输出JSON。' },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: imageBase64 } },
          { type: 'text', text: prompt },
        ] },
      ],
      temperature: 0.2,
    });

    const content = resp.choices[0]?.message?.content || '';
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('识别结果格式异常');

    try {
      return NextResponse.json(JSON.parse(match[0]));
    } catch {
      // Try repair truncated JSON
      let fragment = match[0];
      let braces = 0, brackets = 0;
      for (const ch of fragment) {
        if (ch === '{') braces++; else if (ch === '}') braces--;
        if (ch === '[') brackets++; else if (ch === ']') brackets--;
      }
      fragment = fragment.replace(/,"?[^"]*$/, '');
      for (let i = 0; i < brackets; i++) fragment += ']';
      for (let i = 0; i < braces; i++) fragment += '}';
      return NextResponse.json(JSON.parse(fragment));
    }
  } catch (e: any) {
    console.error('[sketch-analyze]', e?.message || e);
    return NextResponse.json({ error: e?.message || '图纸识别失败' }, { status: 500 });
  }
}
