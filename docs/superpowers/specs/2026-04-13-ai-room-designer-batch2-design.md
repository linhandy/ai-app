# AI Room Designer - 第2批功能扩展设计文档

**日期：** 2026-04-13  
**范围：** 第2批 - Sketch2Image + Freestyle + 户外设计模式  
**参考：** InteriorAI.com 同名功能

---

## 背景

Batch 1 完成了40种风格、20种房间类型、自定义Prompt。Batch 2 新增三种生成模式：

- **Sketch2Image（草图生成）**：上传手绘草图，AI 转换为写实效果图
- **Freestyle（自由生成）**：无需上传照片，从零生成室内设计图
- **户外设计**：上传户外照片，AI 重新设计景观

---

## 架构方案

**方案 A（配置驱动扩展）**：在现有 `DESIGN_MODES` + `DesignMode` 类型上扩展，新增 `needsUpload: boolean` 字段。`uploadId` 在 Order 中变为可选（freestyle 时为 null）。零新页面，零新组件，完全沿用现有付款/生成/结果流程。

---

## 数据结构变更

### DesignMode 联合类型（lib/orders.ts）

```typescript
export type DesignMode =
  | 'redesign'
  | 'virtual_staging'
  | 'add_furniture'
  | 'paint_walls'
  | 'change_lighting'
  | 'sketch2render'     // 新增
  | 'freestyle'         // 新增
  | 'outdoor_redesign'  // 新增
```

### DESIGN_MODES（lib/design-config.ts）

新增 `needsUpload: boolean` 字段，所有现有模式为 `true`：

```typescript
{ key: 'redesign',         label: '风格改造', icon: '🎨', desc: '改变整体装修风格',   needsStyle: true,  needsUpload: true  }
{ key: 'virtual_staging',  label: '虚拟家装', icon: '🛋️', desc: '空房间添加全套家具', needsStyle: true,  needsUpload: true  }
{ key: 'add_furniture',    label: '添加家具', icon: '🪑', desc: '现有房间增添家具',   needsStyle: true,  needsUpload: true  }
{ key: 'paint_walls',      label: '墙面换色', icon: '🖌️', desc: '改变墙面颜色材质',   needsStyle: false, needsUpload: true  }
{ key: 'change_lighting',  label: '灯光优化', icon: '💡', desc: '改善房间光照效果',   needsStyle: false, needsUpload: true  }
{ key: 'sketch2render',    label: '草图生成', icon: '✏️', desc: '草图变效果图',       needsStyle: true,  needsUpload: true  }
{ key: 'freestyle',        label: '自由生成', icon: '✨', desc: '无需上传照片',       needsStyle: true,  needsUpload: false }
{ key: 'outdoor_redesign', label: '户外设计', icon: '🌿', desc: '庭院景观改造',       needsStyle: false, needsUpload: true  }
```

### Order 接口（lib/orders.ts）

```typescript
export interface Order {
  // ...现有字段...
  uploadId: string | null   // freestyle 时为 null，其他模式为上传文件名
}
```

`createOrder` 参数中 `uploadId` 变为 `string | null`。

### 新增 5 种户外房间类型（追加到 lib/design-config.ts ROOM_TYPES）

```typescript
{ key: 'garden',     label: '花园',     icon: '🌳', promptHint: 'backyard garden with lawn and plants',     promptHintCn: '花园，有草坪和植物' }
{ key: 'patio',      label: '露台',     icon: '🪑', promptHint: 'patio or terrace outdoor seating area',    promptHintCn: '露台，户外休闲区' }
{ key: 'front_yard', label: '前院',     icon: '🏡', promptHint: 'front yard entrance garden',               promptHintCn: '前院，入口花园' }
{ key: 'rooftop',    label: '屋顶花园', icon: '🌇', promptHint: 'rooftop terrace garden with city view',    promptHintCn: '屋顶花园，城市景观' }
{ key: 'pool_area',  label: '泳池区',   icon: '🏊', promptHint: 'pool area with surrounding landscape',     promptHintCn: '泳池区，周边景观' }
```

---

## Prompt 设计（lib/zenmux.ts）

`buildStylePrompt` 新增三个 mode 分支，standard 质量用英文，premium/ultra 用中文：

### sketch2render

**英文：**
```
Convert this hand-drawn sketch into a photorealistic interior design render in {style.promptEn} style.
Add realistic materials, proper lighting, and detailed furniture. Keep the room structure shown in the sketch.
Room: {roomHint}.
Generate a professional photorealistic interior design image.
```

**中文：**
```
将这张手绘草图转换为{style.prompt}风格的写实室内设计效果图。
添加真实的材质、合适的光线和详细的家具细节，保留草图中展示的空间结构。
房间：{roomHintCn}。
生成专业室内设计师水准的写实效果图。
```

### freestyle（无输入图片，纯文字生成）

**英文：**
```
Generate a brand new {style.promptEn} interior design for a {roomHint}.
Beautiful natural lighting, realistic materials, professional interior photography quality.
No people, no text overlays. Photorealistic interior design image.
```

**中文：**
```
生成一张全新的{style.prompt}风格{roomHintCn}效果图。
自然光线充足，材质真实，专业室内摄影级别的画质。
无人物，无文字。生成专业室内设计写实效果图，高质量照片真实感。
```

### outdoor_redesign（needsStyle: false，不查找风格）

**英文：**
```
Redesign this outdoor space with beautiful professional landscaping.
Add lush plants, colorful flowers, trees, stone or wooden pathways, and stylish outdoor furniture.
Keep the original space structure and architecture. Generate a photorealistic exterior landscape photo.
Room: {roomHint}.
```

**中文：**
```
重新设计这个户外空间，打造专业景观效果。
添加丰富的植物、五彩的花卉、树木、石板或木质小径和精致的户外家具。
保留原有空间结构和建筑外形。生成真实感强的户外景观效果图。
房间：{roomHintCn}。
```

---

## API 改动

### create-order/route.ts

新的验证逻辑：

```typescript
// uploadId 仅在非 freestyle 模式时必填
if (mode !== 'freestyle' && !uploadId) {
  return NextResponse.json({ error: '请先上传图片' }, { status: 400 })
}

// style 仅在 needsStyle=true 的模式时校验
const modeConfig = DESIGN_MODES.find(m => m.key === mode)
if (modeConfig?.needsStyle && !ALL_STYLE_KEYS.includes(style)) {
  return NextResponse.json({ error: '无效的风格' }, { status: 400 })
}
```

### generate/route.ts

```typescript
// freestyle 模式：imagePath 为 null，跳过文件读取
const imagePath = order.uploadId
  ? path.join(UPLOAD_DIR, order.uploadId)
  : null

const resultBuffer = await generateRoomImage({
  imagePath,  // null for freestyle
  style: order.style,
  quality: order.quality,
  mode: order.mode,
  roomType: order.roomType,
  customPrompt: order.customPrompt,
})
```

---

## zenmux.ts — generateRoomImage

`imagePath` 参数变为 `string | null`：

```typescript
export async function generateRoomImage(params: {
  imagePath: string | null   // null for freestyle
  style: string
  quality?: string
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
}): Promise<Buffer>
```

Contents 构建：

```typescript
const parts = imagePath
  ? [
      { inlineData: { mimeType, data: base64Image } },
      { text: prompt },
    ]
  : [{ text: prompt }]

contents: [{ role: 'user', parts }]
```

---

## UI 改动（app/generate/page.tsx）

### 上传区条件渲染

```tsx
{currentMode.needsUpload ? (
  <UploadZone onUpload={(id) => setUploadId(id)} />
) : (
  <div className="w-full h-48 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center">
    <p className="text-gray-500 text-sm text-center">
      ✨ 自由生成模式<br />无需上传照片，AI 将从零生成效果图
    </p>
  </div>
)}
```

### 付款按钮启用条件

```tsx
// 原：disabled={loading || generating || !uploadId}
// 改：
disabled={loading || generating || (currentMode.needsUpload && !uploadId)}
```

### 导航提示文字

```tsx
<span className="text-gray-600 text-sm">
  {currentMode.needsUpload
    ? '上传照片 → 选择风格 → 付款生成'
    : '选择风格 → 描述需求 → 付款生成'}
</span>
```

---

## 数据库 Migration

无新字段。`uploadId` 在 DB 中已为 `TEXT NOT NULL`，需改为允许 NULL：

```sql
-- 不能直接 ALTER COLUMN（SQLite 限制）
-- 改为：在 CREATE TABLE 中将 uploadId 改为 TEXT（去掉 NOT NULL）
-- 对已有数据无影响（现有记录都有 uploadId）
```

实现方式：更新 `initDb()` 中的 `CREATE TABLE IF NOT EXISTS` 语句，将 `uploadId TEXT NOT NULL` 改为 `uploadId TEXT`。已有数据库不受影响（IF NOT EXISTS 跳过重建）。对已存在的 DB，现有数据的 uploadId 均非空，行为不变。

---

## 测试覆盖

### zenmux.test.ts 新增

| 测试 | 期望 |
|------|------|
| `buildStylePrompt('nordic_minimal', 'standard', 'sketch2render', 'living_room')` | 含 'sketch' 或 'hand-drawn' |
| `buildStylePrompt('nordic_minimal', 'premium', 'sketch2render', 'bedroom')` | 含 '草图' |
| `buildStylePrompt('nordic_minimal', 'standard', 'freestyle', 'living_room')` | 含 'Generate a brand new' |
| `buildStylePrompt('nordic_minimal', 'premium', 'freestyle', 'bedroom')` | 含 '生成一张全新' |
| `buildStylePrompt('any', 'standard', 'outdoor_redesign', 'garden')` | 含 'landscaping' 或 'garden' |
| `buildStylePrompt('any', 'premium', 'outdoor_redesign', 'patio')` | 含 '户外' 或 '景观' |

### orders.test.ts 新增

| 测试 | 期望 |
|------|------|
| `createOrder({ uploadId: null, mode: 'freestyle', ... })` | 成功创建，uploadId 为 null |
| create-order API：freestyle + 无 uploadId | 200 |
| create-order API：redesign + 无 uploadId | 400 |

---

## 不在本次范围内

- SketchUp 模式（需 3D 文件格式支持）
- 生成多张图片（批量出图）
- 户外风格分类（本次户外模式不需要选风格）
- 缩略图生成脚本扩展（户外模式无需缩略图）
