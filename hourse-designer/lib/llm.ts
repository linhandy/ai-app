import OpenAI from 'openai';
import type { HouseDesign, DesignInput, FloorPlan, GlobalSpec } from './types';
import { buildSystemPrompt, buildSingleFloorPrompt, buildSketchParsePrompt, floorSpecToText, buildOptimizePrompt, buildQuickParsePrompt } from './prompts';
import { validateAndFix } from './validation';

const zenmux = new OpenAI({
  apiKey: process.env.ZENMUX_API_KEY!,
  baseURL: process.env.ZENMUX_BASE_URL || 'https://zenmux.ai/api/v1',
});

const MODEL = () => process.env.LLM_MODEL || 'google/gemini-2.5-flash';

function extractJson(raw: string): string {
  const s = raw.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  const start = s.indexOf('{');
  if (start === -1) throw new Error('LLM 未返回 JSON 数据，请重试');

  let depth = 0;
  let end = -1;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error('LLM 输出不完整，请重试（可尝试简化每层需求）');
  return s.slice(start, end + 1);
}

async function callLLM(systemPrompt: string, userPrompt: string, imageBase64?: string): Promise<string> {
  const userContent: OpenAI.ChatCompletionContentPart[] = imageBase64
    ? [
        { type: 'image_url', image_url: { url: imageBase64 } },
        { type: 'text', text: userPrompt },
      ]
    : [{ type: 'text', text: userPrompt }];

  const res = await zenmux.chat.completions.create({
    model: MODEL(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
    // No max_tokens: let the model use its full context window.
    // Gemini 2.5 thinking tokens consume quota within a fixed limit,
    // so capping max_tokens causes JSON truncation.
  });

  const choice = res.choices[0];
  console.log(`[llm] finish_reason=${choice.finish_reason} tokens=${res.usage?.completion_tokens} len=${choice.message.content?.length}`);

  if (choice.finish_reason === 'length') {
    // Retry once with a stripped-down prompt asking for minimal output
    console.warn('[llm] truncated, retrying with minimal prompt');
    return callLLMMinimal(systemPrompt, userPrompt, imageBase64);
  }
  return choice.message.content?.trim() ?? '';
}

async function callLLMMinimal(systemPrompt: string, userPrompt: string, imageBase64?: string): Promise<string> {
  // Add an explicit instruction to use the absolute minimum number of rooms/doors/windows
  const minimalSuffix = '\n\n重要：输出尽量简洁，每层最多6个房间，每个房间只保留必填字段，门窗各不超过3个。';
  const userContent: OpenAI.ChatCompletionContentPart[] = imageBase64
    ? [
        { type: 'image_url', image_url: { url: imageBase64 } },
        { type: 'text', text: userPrompt + minimalSuffix },
      ]
    : [{ type: 'text', text: userPrompt + minimalSuffix }];

  const res = await zenmux.chat.completions.create({
    model: MODEL(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.1,
  });

  const choice = res.choices[0];
  console.log(`[llm-minimal] finish_reason=${choice.finish_reason} tokens=${res.usage?.completion_tokens}`);

  if (choice.finish_reason === 'length') {
    throw new Error('AI 生成内容过长，请减少楼层数或简化每层需求后重试');
  }
  return choice.message.content?.trim() ?? '';
}

/** Generate floor plans one floor at a time to avoid truncation */
export async function generateFloorPlan(
  input: DesignInput,
  globalSpec?: Partial<GlobalSpec>,
  onFloorStart?: (floorNum: number, total: number) => void
): Promise<HouseDesign> {
  // Use larger of (land - 1m total setback) or (90%) to avoid shrinking small plots
  const buildingWidth = Math.max(input.landWidth - 1, input.landWidth * 0.9);
  const buildingHeight = Math.max(input.landHeight - 1, input.landHeight * 0.9);

  const systemPrompt = buildSystemPrompt(globalSpec?.style);

  const makePrompt = (floorNum: number, stairCtx?: string) =>
    buildSingleFloorPrompt(floorNum, input.numFloors, buildingWidth, buildingHeight,
      input.orientation, input.floorRequirements[floorNum - 1] || '根据实际需求合理分配',
      stairCtx, globalSpec);

  const parseFloor = async (floorNum: number, stairCtx?: string): Promise<FloorPlan> => {
    const raw = await callLLM(systemPrompt, makePrompt(floorNum, stairCtx));
    return JSON.parse(extractJson(raw)) as FloorPlan;
  };

  // ── Floor 1 first (need stair position for upper floors) ──────────────────
  onFloorStart?.(1, input.numFloors);
  const floor1 = await parseFloor(1);

  let stairContext: string | undefined;
  if (input.numFloors > 1) {
    const stairsRoom = (floor1.rooms ?? []).find(r => r.type === '楼梯间' || r.name.includes('楼梯'));
    if (stairsRoom) {
      stairContext = `x=${stairsRoom.x} y=${stairsRoom.y} width=${stairsRoom.width} height=${stairsRoom.height}`;
    }
  }

  // ── Upper floors in parallel ───────────────────────────────────────────────
  const upperNums = Array.from({ length: Math.max(0, input.numFloors - 1) }, (_, i) => i + 2);
  upperNums.forEach(n => onFloorStart?.(n, input.numFloors));
  const upperFloors = await Promise.all(upperNums.map(n => parseFloor(n, stairContext)));

  const floors: FloorPlan[] = [floor1, ...upperFloors];

  const design: HouseDesign = {
    landWidth: input.landWidth,
    landHeight: input.landHeight,
    orientation: input.orientation,
    buildingWidth,
    buildingHeight,
    floors,
  };

  return validateAndFix(design, input, globalSpec);
}

/** Generate floor plan from a free-text quick-design prompt (two-step: parse → generate) */
export async function generateFromQuickPrompt(
  promptText: string,
  landWidth: number,
  landHeight: number,
  orientation: string
): Promise<HouseDesign> {
  // ── Step 1: Parse user intent into structured requirements ──────────────
  const parsePrompt = buildQuickParsePrompt(promptText, landWidth, landHeight);
  const parseRaw = await callLLM(
    '你是建筑需求分析专家。从用户的自然语言描述中提取结构化建房参数，只输出JSON。',
    parsePrompt,
  );
  const parseJson = extractJson(parseRaw);
  const parsed = JSON.parse(parseJson) as {
    landWidth?: number; landHeight?: number;
    orientation?: string; numFloors?: number;
    buildingWidth?: number; buildingHeight?: number;
    floorRequirements?: string[];
  };

  const lw = parsed.landWidth || landWidth;
  const lh = parsed.landHeight || landHeight;
  const ori = (parsed.orientation as DesignInput['orientation']) || (orientation as DesignInput['orientation']) || '南';
  const nf = Math.max(1, Math.min(4, parsed.numFloors || 2));
  const bw = parsed.buildingWidth || Math.max(lw - 1, lw * 0.9);
  const bh = parsed.buildingHeight || Math.max(lh - 1, lh * 0.9);
  const reqs = parsed.floorRequirements || [];

  // Ensure we have a requirement string for each floor
  const floorReqs = Array.from({ length: nf }, (_, i) =>
    reqs[i] || (i === 0 ? '客厅、餐厅、厨房、卫生间' : '主卧、次卧、卫生间')
  );

  console.log(`[quick] parsed: ${bw}×${bh}m, ${nf}层, 朝${ori}, reqs:`, floorReqs);

  // ── Step 2: Use the same high-quality per-floor pipeline as param mode ──
  const input: DesignInput = {
    landWidth: lw, landHeight: lh, orientation: ori,
    numFloors: nf, floorRequirements: floorReqs,
  };

  return generateFloorPlan(input, undefined, undefined);
}

/** Generate floor plan from an uploaded sketch image (two-step: parse image → generate per-floor) */
export async function generateFromSketch(imageBase64: string): Promise<HouseDesign> {
  // ── Step 1: Understand the sketch — extract structured requirements ─────
  const parsePrompt = buildSketchParsePrompt();
  const parseRaw = await callLLM(
    '你是建筑图纸识别专家。仔细阅读草图中的所有标注（房间名、尺寸、朝向），提取结构化参数，只输出JSON。',
    parsePrompt,
    imageBase64,
  );
  const parseJson = extractJson(parseRaw);
  const parsed = JSON.parse(parseJson) as {
    buildingWidth?: number; buildingHeight?: number;
    orientation?: string; numFloors?: number;
    floorRequirements?: string[];
  };

  const bw = parsed.buildingWidth || 10;
  const bh = parsed.buildingHeight || 9;
  const ori = (parsed.orientation as DesignInput['orientation']) || '南';
  const nf = Math.max(1, Math.min(4, parsed.numFloors || 1));
  const reqs = parsed.floorRequirements || [];
  const floorReqs = Array.from({ length: nf }, (_, i) =>
    reqs[i] || (i === 0 ? '客厅、餐厅、厨房、卫生间' : '主卧、次卧、卫生间')
  );

  console.log(`[sketch] parsed: ${bw}×${bh}m, ${nf}层, 朝${ori}, reqs:`, floorReqs);

  // ── Step 2: Use the same high-quality per-floor pipeline ────────────────
  const input: DesignInput = {
    landWidth: bw + 1, landHeight: bh + 1, orientation: ori,
    numFloors: nf, floorRequirements: floorReqs,
  };

  return generateFloorPlan(input, undefined, undefined);
}

/** Optimize an existing design based on scoring feedback */
export async function optimizeDesign(
  currentDesign: HouseDesign,
  weakDimensions: { key: string; label: string; score: number; comment: string }[],
): Promise<HouseDesign> {
  const prompt = buildOptimizePrompt(
    {
      buildingWidth: currentDesign.buildingWidth,
      buildingHeight: currentDesign.buildingHeight,
      orientation: currentDesign.orientation,
      floors: (currentDesign.floors ?? []).map(f => ({
        floor: f.floor, label: f.label,
        rooms: (f.rooms ?? []).map(r => ({
          name: r.name, type: r.type, x: r.x, y: r.y, width: r.width, height: r.height,
        })),
      })),
    },
    weakDimensions,
  );

  const systemPrompt = `你是专业中国自建房建筑设计师。根据评审反馈优化户型布局，输出完整多层JSON，每层含rooms/doors/windows数组。只输出JSON。`;
  const raw = await callLLM(systemPrompt, prompt);
  const json = extractJson(raw);
  const parsed = JSON.parse(json) as {
    buildingWidth?: number; buildingHeight?: number; orientation?: string; floors: FloorPlan[];
  };

  const design: HouseDesign = {
    landWidth: currentDesign.landWidth,
    landHeight: currentDesign.landHeight,
    orientation: (parsed.orientation as HouseDesign['orientation']) || currentDesign.orientation,
    buildingWidth: parsed.buildingWidth || currentDesign.buildingWidth,
    buildingHeight: parsed.buildingHeight || currentDesign.buildingHeight,
    floors: parsed.floors || [],
  };

  const fakeInput: DesignInput = {
    landWidth: design.landWidth,
    landHeight: design.landHeight,
    orientation: design.orientation,
    numFloors: design.floors.length || currentDesign.floors.length,
    floorRequirements: design.floors.map(() => ''),
  };

  return validateAndFix(design, fakeInput);
}
