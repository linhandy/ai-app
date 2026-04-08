import type { FloorSpec, GlobalSpec } from './types';

const FLOOR_LABELS = ['一', '二', '三', '四'];

// ─── System prompt ────────────────────────────────────────────────────────────
export function buildSystemPrompt(style?: string): string {
  const styleNote = style ? `\n- 设计风格：${style}` : '';
  return `你是专业中国自建房建筑设计师，熟悉农村宅基地建设规范和农村居住习惯。根据参数生成单层户型JSON。

设计原则：
- 房间矩形(x,y,width,height单位米)，原点在建筑左上角，不重叠
- 【关键约束】房间必须完全铺满整个建筑轮廓，x坐标范围[0, buildingWidth]，y坐标范围[0, buildingHeight]，每个角落都必须属于某个房间，不允许留白空白区域
- 动静分区：客厅/厨餐朝南，卧室可朝南，卫生间/楼梯朝北
- 厨房宜靠东或西侧，避免烟气穿堂；农村厨房面积≥10m²（需容纳灶台、操作台、储物）
- 楼梯间宽≥2.4m长≥4.5m，多层每层位置完全一致
- 面积尽量接近需求值，比例合理（开间宽/进深比约1:1.2）
- 房间数≤10，门窗各≤5
- 只输出JSON，不加注释或代码块${styleNote}`;
}

export const SINGLE_FLOOR_SYSTEM_PROMPT = buildSystemPrompt();

// ─── Convert FloorSpec to requirement string ──────────────────────────────────
export function floorSpecToText(spec: FloorSpec, floorNum: number, totalFloors: number): string {
  const parts: string[] = [];

  if (spec.livingRoom.enabled)
    parts.push(`客厅约${spec.livingRoom.area}m²`);
  if (spec.diningRoom.enabled)
    parts.push(`餐厅约${spec.diningRoom.area}m²`);
  if (spec.kitchen.enabled)
    parts.push(`厨房约${spec.kitchen.area}m²`);
  if (spec.balcony.enabled)
    parts.push(`阳台约${spec.balcony.area}m²`);

  spec.bedrooms.forEach((b, i) => {
    const type = i === 0 ? '主卧' : `次卧${i}`;
    const bath = b.hasBath ? '带独立卫生间' : '';
    parts.push(`${type}约${b.area}m²${bath ? '（' + bath + '）' : ''}`);
  });

  if (spec.bath.count > 0)
    parts.push(`公共卫生间${spec.bath.count}个每个约${spec.bath.area}m²（靠北侧，管道集中）`);

  if (parts.length === 0) {
    if (floorNum === 1) parts.push('商铺或车库（一层通铺，净高≥4m）');
    else parts.push('根据建筑规范合理布置');
  }

  return parts.join('，');
}

// ─── Per-floor prompt ─────────────────────────────────────────────────────────
export function buildSingleFloorPrompt(
  floorNum: number,
  totalFloors: number,
  buildingWidth: number,
  buildingHeight: number,
  orientation: string,
  requirement: string,
  stairContext?: string,
  globalSpec?: Partial<GlobalSpec>
): string {
  const label = FLOOR_LABELS[floorNum - 1] + '层';
  const isSingle = totalFloors === 1;
  const isFirst = floorNum === 1;

  const stairsNote = !isSingle && !isFirst && stairContext
    ? `\n楼梯间须与一层位置完全一致：${stairContext}`
    : (!isSingle && isFirst
        ? `\n需包含楼梯间（宽≥2.4m，长≥4.5m，靠${globalSpec?.stairsPos === 'left' ? '西' : globalSpec?.stairsPos === 'center' ? '中' : '东'}侧）。`
        : '');

  const elevatorNote = globalSpec?.hasElevator && isFirst
    ? `\n需包含电梯间（1.5m×2m，靠${globalSpec?.elevatorPos === 'left' ? '西' : globalSpec?.elevatorPos === 'center' ? '中' : '东'}侧）。`
    : '';

  const courtyardNote = globalSpec?.hasCourtyard && isFirst
    ? `\n南侧留院落（深度约${globalSpec.courtyardDepth ?? 4}m），大门与客厅形成南北轴线。`
    : '';

  // Overhang note for upper floors
  const oh = globalSpec?.overhang;
  const overhangNote = oh && floorNum > 1 && (oh.front || oh.back || oh.left || oh.right)
    ? `\n本层可向外悬挑：前（南）${oh.front}m、后（北）${oh.back}m、左（西）${oh.left}m、右（东）${oh.right}m，实际建筑轮廓相应扩大。`
    : '';

  const customNote = globalSpec?.customPrompt
    ? `\n额外要求：${globalSpec.customPrompt}`
    : '';

  return `建筑：${buildingWidth}m×${buildingHeight}m，大门朝${orientation}
${label}需求：${requirement}${stairsNote}${elevatorNote}${courtyardNote}${overhangNote}${customNote}

【重要】房间必须完全铺满 ${buildingWidth}m×${buildingHeight}m 区域（x: 0→${buildingWidth}，y: 0→${buildingHeight}），不得有任何空白，房间总面积应等于 ${(buildingWidth * buildingHeight).toFixed(1)}m²。

输出JSON格式：{"floor":${floorNum},"label":"${label}","rooms":[{"id":"f${floorNum}r1","name":"房间名","type":"类型","x":0,"y":0,"width":W,"height":H}],"doors":[{"id":"f${floorNum}d1","wall":"south|north|east|west","roomId":"f${floorNum}r1","position":0.5,"widthMeters":1.2,"isMain":true}],"windows":[{"id":"f${floorNum}w1","wall":"south","roomId":"f${floorNum}r1","position":0.5,"widthMeters":1.5}]}`;
}

export function buildSketchParsePrompt(): string {
  return `分析这张自建房草图/设计图，提取结构化参数（不是直接输出布局JSON）。

需要识别：
1. 建筑总尺寸（宽×深，单位米，如图中有标注则读取标注值）
2. 大门朝向（从指北针或标注判断，默认南）
3. 楼层数（如图中有多层标注）
4. 每层包含哪些房间及大致面积

输出JSON（不加代码块）：
{"buildingWidth":10,"buildingHeight":9,"orientation":"南","numFloors":2,"floorRequirements":["一楼：客厅约20m²、餐厅约12m²、厨房约10m²、卫生间约5m²","二楼：主卧约16m²、次卧2间各约12m²、卫生间约5m²"]}

规则：
- 仔细阅读图中所有文字标注（房间名、尺寸mm或m值）
- 如图中标注单位是mm（如5000），转换为m（如5.0）
- 所有房间面积之和应接近 buildingWidth × buildingHeight
- floorRequirements 用自然语言描述每层房间及面积
只输出JSON。`;
}

// ─── Optimize prompt (re-generate with feedback from scoring) ────────────────
export function buildOptimizePrompt(
  design: {
    buildingWidth: number; buildingHeight: number; orientation: string;
    floors: { floor: number; label: string; rooms: { name: string; type: string; x: number; y: number; width: number; height: number }[] }[];
  },
  weakDimensions: { key: string; label: string; score: number; comment: string }[],
): string {
  const floorDesc = design.floors.map(f => {
    const roomList = f.rooms.map(r =>
      `${r.name}(${r.type},${r.width}×${r.height}m,x${r.x},y${r.y})`
    ).join('、');
    return `${f.label}：${roomList}`;
  }).join('\n');

  const issues = weakDimensions.map(d =>
    `- ${d.label}(${d.score}分)：${d.comment}`
  ).join('\n');

  return `以下户型设计在AI评审中得分较低，请针对性优化。

建筑：${design.buildingWidth}m×${design.buildingHeight}m，朝${design.orientation}，${design.floors.length}层。
当前布局：
${floorDesc}

低分项：
${issues}

请基于以上反馈优化户型，保持建筑轮廓不变(${design.buildingWidth}×${design.buildingHeight}m)，房间必须完全铺满，不留空白。
输出完整JSON：{"buildingWidth":${design.buildingWidth},"buildingHeight":${design.buildingHeight},"orientation":"${design.orientation}","floors":[...]}
每层包含 floor/label/rooms/doors/windows，只输出JSON。`;
}

// ─── Quick design: Step 1 — parse user intent into structured requirements ──
export function buildQuickParsePrompt(
  userPrompt: string,
  defaultWidth: number,
  defaultHeight: number,
): string {
  return `分析以下自建房需求描述，提取结构化参数。

用户描述："${userPrompt}"

默认地块：${defaultWidth}m×${defaultHeight}m（用户未提及尺寸时使用此值）。

请输出JSON（不加代码块）：
{"landWidth":12,"landHeight":10,"orientation":"南","numFloors":2,"buildingWidth":11,"buildingHeight":9,"floorRequirements":["一楼：客厅约20m²、餐厅约12m²、厨房约10m²、老人房约14m²、卫生间1个约5m²","二楼：主卧约16m²带独卫、次卧2间各约12m²、公卫1个约5m²"]}

规则：
- buildingWidth = landWidth - 1（最少比地块小1m）
- buildingHeight = landHeight - 1
- floorRequirements 是数组，每层一条字符串，描述该层所有房间及面积
- 从用户描述中识别楼层数、朝向、每层房间需求
- 如有楼梯需求（多层房），每层自动包含楼梯间
- 面积要合理：客厅15-35m²，卧室10-20m²，厨房8-15m²，卫生间4-8m²
- 所有房间面积之和应接近 buildingWidth × buildingHeight
只输出JSON。`;
}

// ─── Quick design: Step 2 uses buildSingleFloorPrompt (same as param mode) ──
// No separate function needed — reuse the existing per-floor prompt pipeline
