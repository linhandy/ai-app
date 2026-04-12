# AI Room Designer - 第1批功能扩展设计文档

**日期：** 2026-04-12  
**范围：** 第1批 - 50+风格 + 房间类型 + 自定义Prompt  
**第2批（本文不涉及）：** Sketch2Image + Freestyle + 户外设计模式

---

## 背景

当前 ai-room-designer 仅有6种装修风格，缺少房间类型选择和自定义Prompt功能，与对标产品 InteriorAI.com（50+风格）存在明显差距。本次扩展目标：

- 风格从6种扩展到50+种，分8大类组织
- 新增房间类型选择（20种，必选），用于精准AI prompt
- 新增自定义Prompt输入（可选，追加模式）
- 所有新风格通过脚本批量生成缩略图

---

## 架构方案

**配置驱动（方案A）**：所有风格和房间类型数据集中在 `lib/design-config.ts`，不引入额外数据库表。DB schema 仅新增两个字段（`roomType`、`customPrompt`）。

---

## 数据结构

### 风格数据结构

```typescript
interface Style {
  key: string          // 唯一标识，英文下划线，如 'nordic_minimal'
  label: string        // 中文名，如 '北欧简约'
  prompt: string       // 中文prompt（premium/ultra模型使用）
  promptEn: string     // 英文prompt（standard模型使用）
  thumbnail: string    // 缩略图路径，如 '/styles/thumbnails/nordic_minimal.jpg'
}

interface StyleCategory {
  key: string          // 大类标识，如 'minimalist'
  label: string        // 大类中文名，如 '简约系'
  icon: string         // emoji图标
  styles: Style[]
}
```

### 8大风格分类（共50+种）

| 大类 | key | icon | 子风格 | 数量 |
|------|-----|------|--------|------|
| 简约系 | minimalist | ✨ | 北欧简约、日式无印、极简主义、奶油风、原木风、白色极简 | 6 |
| 中式系 | chinese | 🏮 | 新中式、禅意东方、中式古典、中国风轻奢 | 4 |
| 欧式系 | european | 🏛️ | 法式浪漫、意式极简、地中海、英式田园、西班牙殖民 | 5 |
| 现代系 | modern | 🏙️ | 现代轻奢、现代简约、都市摩登、高科技风、未来主义 | 5 |
| 复古系 | retro | 🎞️ | 复古美式、Mid-Century Modern、Art Deco、波西米亚、Vintage | 5 |
| 自然系 | natural | 🌿 | 侘寂风、有机现代、热带度假、乡村田园、木屋风 | 5 |
| 工业系 | industrial | 🏭 | 工业风、Loft风、蒸汽朋克、仓库改造 | 4 |
| 创意系 | creative | 🎨 | 孟菲斯、色彩碰撞、赛博朋克、童趣风、摩洛哥风、东南亚风 | 6 |

**总计：40种（基础），可在实现时补充至50+）**

### 房间类型数据结构

```typescript
interface RoomType {
  key: string          // 唯一标识，如 'living_room'
  label: string        // 中文名，如 '客厅'
  icon: string         // emoji
  promptHint: string   // 英文prompt补充，如 'living room with seating area'
  promptHintCn: string // 中文prompt补充，如 '客厅，有沙发和茶几区域'
}
```

### 20种房间类型

分4组：

| 组 | 房间类型（key） |
|----|----------------|
| 居住空间 | living_room、bedroom、kids_room、study、dressing_room |
| 功能空间 | kitchen、dining_room、bathroom、balcony、laundry_room |
| 公共空间 | entrance、hallway、staircase、elevator_lobby |
| 商业空间 | office、cafe、restaurant、hotel_room、retail_store、gym |

### Order 类型新增字段

```typescript
// lib/orders.ts
export interface Order {
  // ... 现有字段不变 ...
  roomType: string      // 新增，必填，默认 'living_room'
  customPrompt?: string // 新增，可选，最多200字
}
```

---

## UI 改动

### Generate 页面新流程

```
上传图片
  ↓
选择设计模式（现有，不变）
  ↓
选择房间类型（新增，必选，20种，4行×5列网格，图标+文字）
  ↓
选择风格大类（新增，Tab横向滚动，8个大类）
  ↓
选择子风格（重构StyleSelector，2列网格，图片+名称）
  ↓（needsStyle=false的模式跳过上面两步）
补充描述（新增，默认折叠，可选文本框，4行，max 200字）
  ↓
选择画质（现有，不变）
  ↓
付款
```

### StyleSelector 组件重构

- **现有**：单层6个风格卡片
- **重构后**：
  - 顶部：大类Tab栏（横向可滚动，8个Tab）
  - 下方：当前大类子风格2列网格（图片卡片，图片+中文名）
  - 切换大类时网格区域滚动至顶
  - 选中状态：蓝色边框高亮

### 房间类型选择器（新组件 RoomTypeSelector）

- 网格布局，每行5个
- 每个选项：emoji图标（上）+ 文字（下）
- 必选，未选择时付款按钮不可用
- 不受 `needsStyle` 影响，所有模式下都显示

### 自定义Prompt（内联，无需新组件）

- 位置：StyleSelector 下方（needsStyle=false时在模式选择器下方）
- 默认折叠，点击 "+ 补充描述（可选）" 展开
- 展开后：`<textarea>` 4行，placeholder："例如：窗帘用亚麻材质，加一张书桌，整体偏暖色调..."
- 字数限制：200字，显示剩余字数
- 收起后保留已输入内容

---

## API 改动

### create-order/route.ts

新增接收参数：
- `roomType: string`（必填，验证必须在 ROOM_TYPES 的 key 列表中）
- `customPrompt?: string`（可选，trim后截断到200字）

传给 `createOrder()` 存入 DB。

### zenmux.ts - buildStylePrompt()

函数签名：
```typescript
export function buildStylePrompt(
  style: string,
  quality: string,
  mode: DesignMode,
  roomType: string,
  customPrompt?: string
): string
```

Prompt拼接规则（standard模型用英文，premium/ultra用中文）：

**英文版：**
```
[原有风格/模式prompt（英文）]
Room: [roomType.promptHint]
[customPrompt（如有，原文追加）]
```

**中文版：**
```
[原有风格/模式prompt（中文）]
房间：[roomType.promptHintCn]
[customPrompt（如有，原文追加）]
```

---

## 数据库 Migration

```sql
ALTER TABLE orders ADD COLUMN roomType TEXT NOT NULL DEFAULT 'living_room';
ALTER TABLE orders ADD COLUMN customPrompt TEXT;
```

Migration 在应用启动时（`lib/orders.ts` 的 `initDb()`）检测并执行。用 `PRAGMA table_info(orders)` 判断字段是否存在，不存在则 ALTER。

---

## 缩略图生成脚本

**文件：** `scripts/generate-thumbnails.ts`

**行为：**
1. 读取 `STYLE_CATEGORIES` 中所有风格
2. 对每个风格，检查 `public/styles/thumbnails/{key}.jpg` 是否存在，存在则跳过
3. 调用 Gemini standard 模型（`google/gemini-2.5-flash-image`）生成512×512图片
4. Prompt：`"A professional interior design photo in {style} style. Compact room view, good lighting, photorealistic. No people."`
5. 串行执行（间隔500ms，避免限流）
6. 保存为 JPEG

**运行：** `npx ts-node scripts/generate-thumbnails.ts`

**开发期过渡：** 未生成缩略图前，每个风格卡片用颜色渐变占位图（CSS实现，`bg-gradient-to-br from-{color}-100 to-{color}-200`）

---

## 测试要点

- `create-order` 拒绝无效 `roomType`（400）
- `create-order` 拒绝超200字的 `customPrompt`（400）
- `buildStylePrompt` 正确拼接 roomType hint 和 customPrompt
- 旧订单（无 roomType 字段）的 DB migration 向后兼容（DEFAULT 'living_room'）
- StyleSelector 切换大类后子风格正确更新
- 自定义Prompt收起后内容保留

---

## 不在本次范围内

- Sketch2Image（草图生成）
- Freestyle（无需上传照片）
- 户外设计模式
- 风格缩略图的 CDN 托管
- 管理后台（动态增删风格）
