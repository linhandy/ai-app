# RFC: 完整对标 InteriorAI — 功能补齐路线图

**日期：** 2026-04-19
**状态：** Draft — 待讨论
**所有者：** @linhandy
**背景：** 海外版 roomai.shop 价格已具备显著优势（Pro $9.99 vs 竞品 $19.99-29），但功能矩阵相比 interiorai.com 仍存在明显差距。本 RFC 列出需补齐的差异化功能，为每项提供技术路线、成本与排期依据。本 RFC 不承诺实施所有项，仅作为决策输入。

## 核心判断

**不追求功能完全对等**。我们的价格优势 + 已有特色（Inpainting 局部编辑、10 种设计模式、私密默认、40+ 风格）已形成差异化定位。补齐应聚焦：

1. **对转化率影响大的短板**（并行生成、Hyper Realism 可以立即提升感知质量）
2. **用户认知中的"必备"能力**（无水印、商用授权、优先渲染）
3. **放弃投入产出不成比例的项目**（VR walkthrough、Google Lens 一旦投入是重工程）

---

## 已完成（本次修复计划内）

- ✅ **Hyper Realism 模式** — Ultra 画质自动附加超写实后缀 (`lib/zenmux.ts`)
- ✅ **无水印 + 商用授权** — Pro/Unlimited 默认提供 (`lib/subscription.ts`)
- ✅ **分辨率分级** — Free 1024px / Pro 2048px / Unlimited 4096px
- ✅ **批量并行生成 UI** — 2-8 styles，基础版已上线

---

## P1 · 建议近期立项（6-10 人周）

### RFC-1: 并行生成多房间（4/8/16 rooms at once）
**现状：** 已有 `batch-generate` API，支持同一张图 2-8 个 style。
**竞品：** InteriorAI Pro 4 房间并行，Premium 8，Ultra 16。
**差距：** 我们是"一张图多风格"，竞品是"多张图多风格矩阵"。
**方案：**
- 前端：上传区改为多文件上传（最多 16 张），每张图独立选择 style
- 后端：扩展 `batch-generate` 接受 `{ uploadId, style }[]` 数组
- 限额：Pro 4 并行、Unlimited 16 并行（与竞品一致）
**成本：** 3 人周（前端 UI 占 2 周，后端 0.5 周，测试 0.5 周）
**依赖：** 无新第三方服务
**优先级：** 🔴 P1（直接影响感知"多任务能力"）

### RFC-2: 优先渲染队列
**竞品：** Unlimited 用户走独立队列，渲染耗时声称 10-15s vs 标准 30s。
**技术现状：** 我们依赖 ZenMux API，无法从外部强制优先级。
**方案 A（推荐）：** 在我方 API Gateway 做简单权重队列——Unlimited 请求立即 dispatch，Free 请求加 2-3s 随机延迟，营造体感差异，不动底层渲染。
**方案 B：** 引入自建 GPU 节点服务 Unlimited 用户。成本极高（~$2000/月 GPU），不划算。
**成本：** 方案 A 1.5 人周；方案 B 6+ 人周。
**优先级：** 🟡 P2（先用方案 A，营销文案即可支撑）

### RFC-3: 用户提示词自由编辑 (Write your own design prompts)
**现状：** 已有 `+ Add description (optional)` 但仅附加到风格 prompt 后。
**竞品：** 提供完全自定义 prompt 入口。
**方案：** 在 Design Mode 增加一个 `custom_prompt` 模式，完全按用户文本生成，不受 STYLE 限制。
**成本：** 0.5 人周
**优先级：** 🟢 P1（几乎零成本）

---

## P2 · 选择性立项（需评估 ROI）

### RFC-4: Add People（在设计中添加人物）
**竞品：** 提供"加入虚拟人物"以让效果图更生动。
**实现：** Gemini 3 Pro Image 原生支持，只需 prompt 控制 + 一个新 design mode `add_people`。
**成本：** 1 人周
**优先级：** 🟡 P2（功能噱头 > 实用价值）
**风险：** 生成的人物质量不稳定，可能产生恐怖谷效应，反噬品牌感。需严谨测试。

### RFC-5: 家具替换/搜索 (Add furniture with catalog)
**竞品：** 提供家具数据库，用户可选"IKEA 宜家", "Crate & Barrel" 等品牌样式。
**方案：** 把家具品牌/系列作为 prompt 标签 —— 内部维护 100+ "furniture-brand" 子 style。
**成本：** 2 人周（数据整理 1.5w + UI 0.5w）
**优先级：** 🟡 P2（可转化为 SEO 着陆页：`/furniture/ikea` 样式）

### RFC-6: Upscale 高清放大
**竞品：** 对已生成图上调到 8K。
**方案：** 引入 Real-ESRGAN 或 Topaz API。最简单：调用 Replicate 上的 `nightmareai/real-esrgan` 模型。
**成本：** 1 人周，每次 upscale API 成本约 $0.02
**定价：** 打包在 Unlimited 免费、Pro 每次 1 积分、Free 不支持
**优先级：** 🟢 P1（低成本高感知价值）

---

## P3 · 不建议实施（成本/回报不匹配）

### RFC-7: Walkthrough 视频生成
**竞品：** 生成 5-10s 室内漫游视频。
**技术选型：** Runway Gen-3（$0.05/s ~= $0.5/video）、Kling AI（类似成本）、Google Veo 3（更贵）。
**问题：**
- 单次成本 $0.5，在 Pro $9.99/月下难以包月覆盖多次
- 视频质量目前仍不稳定（镜头穿墙/家具漂移）
- 实际用户使用频次低（装修决策场景一张图足够）
**建议：** **不做**。若要做，作为独立付费功能 $2/video，而非打包在订阅内。
**优先级：** ⚫ P3

### RFC-8: VR 漫游 (Walk through in VR)
**方案：** Three.js + Model Viewer + 360° 全景图重建。
**问题：**
- 从单张 2D 效果图重建 3D 空间误差极大
- 用户需 VR 设备才能体验，受众极窄
- 开发成本 10+ 人周
**建议：** **不做**。竞品该功能实际使用率极低，是营销噱头。
**优先级：** ⚫ P3

### RFC-9: Google Lens 风格识别
**方案：** 用户上传一张参考图 → 提取风格向量 → 生成同风格设计。
**现状：** 我们已有 `style-match` 模式完全覆盖此能力。
**建议：** **已有 `style-match`，无需另做**。在营销文案中把 `style-match` 重新包装为 "Match any style from Pinterest/Instagram"。
**优先级：** ⚫ 已完成（只需改文案）

### RFC-10: Paint Walls / Change Lighting
**现状：** 已有对应的 design mode (`paint_walls`, `change_lighting`)。
**建议：** 在定价页和首页 DesignModesGrid 显眼展示这两个功能，无需新开发。
**优先级：** ⚫ 已完成（只需改展示）

---

## 建议的推进节奏

| 阶段 | 范围 | 人周 | 预期效果 |
|------|------|------|----------|
| M1（1 个月内）| RFC-1 并行生成 + RFC-3 自定义提示词 | 3.5w | 对齐竞品 Pro 能力感知 |
| M2（2 个月内）| RFC-6 Upscale + RFC-2 方案 A 优先队列 | 2.5w | 丰富 Pro/Unlimited 权益 |
| M3（3 个月内）| RFC-4 Add People + RFC-5 家具目录（可选）| 3w | 形成差异化 |
| 不做 | RFC-7/8/9/10 | — | 避免重工程、用现有能力替代 |

**总投入：** 6-9 人周（单人 1.5-2 个月）即可对齐竞品 70% 功能感知，不需要完整对等。

---

## 营销层面的差异化强化（0 开发投入）

1. **突出价格差**：`$9.99 vs $19.99` 在 Hero 和 Pricing 顶部持续展示
2. **突出 Inpainting 独家**："The only AI designer with precise area editing"
3. **突出 10 Design Modes**：Paint Walls / Change Lighting / Virtual Staging 等都是竞品"Pro-only"功能，我们 Free 就有
4. **突出 40+ 风格 vs 竞品 20+**：作为转化 hook

这些在现有代码里已有素材，只需 copy 强化。

---

## 待决策项

- [ ] RFC-1 是否立即排入下一个 sprint？
- [ ] RFC-6 Upscale 是否走 Replicate（运营成本）或自部署（固定服务器）？
- [ ] RFC-4 Add People 质量不稳定风险是否接受？
- [ ] 是否对 RFC-7/8/9 做竞调 spike 验证"不做"的判断？
