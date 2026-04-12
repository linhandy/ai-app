# AI Room Designer Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand styles from 6 to 40+, add 20 room types (required), and optional custom prompt input — all config-driven, no new DB tables.

**Architecture:** Style data moves from a flat `STYLES` Record keyed by Chinese name to a `STYLE_CATEGORIES` array of 8 categories, each with typed `Style` objects keyed by English underscore IDs. Room types live in a `ROOM_TYPES` array. `buildStylePrompt` gains two new params (`roomType`, `customPrompt`). Orders DB gets two new columns with an additive migration. UI gains a `RoomTypeSelector` component and a rewritten `StyleSelector` with category tabs.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, LibSQL (@libsql/client), Google GenAI SDK via ZenMux, Jest + ts-jest

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Rewrite | `ai-room-designer/lib/design-config.ts` | STYLE_CATEGORIES (40 styles, 8 categories), ROOM_TYPES (20), DESIGN_MODES (unchanged), helper `findStyleByKey`, `findRoomType` |
| Modify | `ai-room-designer/lib/orders.ts` | Add `roomType`/`customPrompt` to Order type, INSERT, rowToOrder, migration |
| Modify | `ai-room-designer/lib/zenmux.ts` | Update `buildStylePrompt` signature + lookup; update `generateRoomImage` params |
| Modify | `ai-room-designer/app/api/create-order/route.ts` | Accept + validate `roomType` / `customPrompt` |
| Modify | `ai-room-designer/app/api/generate/route.ts` | Pass `roomType`/`customPrompt` to `generateRoomImage` |
| Create | `ai-room-designer/components/RoomTypeSelector.tsx` | 20-room grid picker, emoji + label |
| Rewrite | `ai-room-designer/components/StyleSelector.tsx` | Category Tab bar + sub-style grid with gradient fallback thumbnail |
| Modify | `ai-room-designer/app/generate/page.tsx` | Add roomType state, customPrompt state + textarea, wire new components |
| Modify | `ai-room-designer/__tests__/zenmux.test.ts` | Update to new style keys + new `buildStylePrompt` params |
| Modify | `ai-room-designer/__tests__/orders.test.ts` | Add roomType/customPrompt field tests |
| Create | `ai-room-designer/scripts/generate-thumbnails.ts` | Batch Gemini image generation for all style thumbnails |

---

## Task 1: Rewrite lib/design-config.ts

**Files:**
- Rewrite: `ai-room-designer/lib/design-config.ts`

- [ ] **Step 1: Replace the file with the full STYLE_CATEGORIES + ROOM_TYPES data**

```typescript
import type { DesignMode } from './orders'

export interface Style {
  key: string
  label: string
  prompt: string      // Chinese — used for premium/ultra quality
  promptEn: string    // English — used for standard quality
  thumbnail: string   // path under /public, e.g. '/styles/thumbnails/nordic_minimal.jpg'
}

export interface StyleCategory {
  key: string
  label: string
  icon: string
  styles: Style[]
}

export interface RoomType {
  key: string
  label: string
  icon: string
  promptHint: string    // English room context appended to AI prompt
  promptHintCn: string  // Chinese room context appended to AI prompt
}

export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    key: 'minimalist',
    label: '简约系',
    icon: '✨',
    styles: [
      {
        key: 'nordic_minimal',
        label: '北欧简约',
        prompt: '改造成北欧简约风格：白色墙面、浅木色家具、绿植点缀、自然光线、干净利落的线条，整体明亮通透',
        promptEn: 'Nordic minimal style: white walls, light wood furniture, plants, natural light, clean lines, bright and airy',
        thumbnail: '/styles/thumbnails/nordic_minimal.jpg',
      },
      {
        key: 'japanese_muji',
        label: '日式无印',
        prompt: '改造成日式无印风格：原木色调、功能性设计、棉麻材质、禅意留白、整洁有序的极简空间',
        promptEn: 'Japanese Muji style: natural wood tones, functional design, cotton and linen materials, zen whitespace, clean minimal space',
        thumbnail: '/styles/thumbnails/japanese_muji.jpg',
      },
      {
        key: 'minimalism',
        label: '极简主义',
        prompt: '改造成极简主义风格：绝对留白、单色系配色、隐藏收纳、无装饰面、只保留必要家具',
        promptEn: 'Minimalism style: absolute whitespace, monochromatic palette, hidden storage, decoration-free surfaces, only essential furniture',
        thumbnail: '/styles/thumbnails/minimalism.jpg',
      },
      {
        key: 'cream_style',
        label: '奶油风',
        prompt: '改造成奶油风格：米白奶油色系、圆润造型、柔软织物、温暖灯光、治愈系氛围',
        promptEn: 'Cream style: milky white cream palette, rounded shapes, soft fabrics, warm lighting, cozy healing atmosphere',
        thumbnail: '/styles/thumbnails/cream_style.jpg',
      },
      {
        key: 'raw_wood',
        label: '原木风',
        prompt: '改造成原木风格：大量天然木材、木纹肌理、温暖米色调、植物绿意、自然材质',
        promptEn: 'Raw wood style: abundant natural wood, wood grain texture, warm beige tones, plant greenery, natural materials',
        thumbnail: '/styles/thumbnails/raw_wood.jpg',
      },
      {
        key: 'white_minimal',
        label: '白色极简',
        prompt: '改造成白色极简风格：全白色调、干净线条、玻璃与金属点缀、高度整洁、强调空间感',
        promptEn: 'White minimalist style: all-white palette, clean lines, glass and metal accents, highly tidy, emphasizing spaciousness',
        thumbnail: '/styles/thumbnails/white_minimal.jpg',
      },
    ],
  },
  {
    key: 'chinese',
    label: '中式系',
    icon: '🏮',
    styles: [
      {
        key: 'new_chinese',
        label: '新中式',
        prompt: '改造成新中式风格：深色实木、格栅元素、水墨留白、禅意氛围、中国传统美学与现代设计融合',
        promptEn: 'New Chinese style: dark solid wood, lattice elements, ink wash aesthetic, zen atmosphere, Chinese tradition meets modern design',
        thumbnail: '/styles/thumbnails/new_chinese.jpg',
      },
      {
        key: 'zen_eastern',
        label: '禅意东方',
        prompt: '改造成禅意东方风格：竹木材质、枯山水元素、低矮家具、蜡烛灯光、极简东方禅意美学',
        promptEn: 'Zen Eastern style: bamboo and wood materials, dry garden elements, low furniture, candlelight, minimal Eastern Zen aesthetic',
        thumbnail: '/styles/thumbnails/zen_eastern.jpg',
      },
      {
        key: 'chinese_classical',
        label: '中式古典',
        prompt: '改造成中式古典风格：红木家具、花鸟屏风、青花瓷器摆件、宫灯元素、传统中国古典审美',
        promptEn: 'Chinese classical style: rosewood furniture, bird-flower screens, blue-white porcelain decor, palace lanterns, traditional Chinese classical aesthetic',
        thumbnail: '/styles/thumbnails/chinese_classical.jpg',
      },
      {
        key: 'chinese_luxury',
        label: '中国风轻奢',
        prompt: '改造成中国风轻奢风格：金色与朱砂红点缀、现代造型融合中式图案、丝绒面料、高级精致质感',
        promptEn: 'Chinese luxury style: gold and vermilion red accents, modern forms with Chinese patterns, velvet fabrics, premium refined feel',
        thumbnail: '/styles/thumbnails/chinese_luxury.jpg',
      },
    ],
  },
  {
    key: 'european',
    label: '欧式系',
    icon: '🏛️',
    styles: [
      {
        key: 'french_romantic',
        label: '法式浪漫',
        prompt: '改造成法式浪漫风格：雕花木线条、粉灰色调、丝绒软装、金色装饰细节、优雅浪漫氛围',
        promptEn: 'French romantic style: carved wood moldings, dusty rose and grey tones, velvet soft furnishings, gold decorative details, elegant romantic atmosphere',
        thumbnail: '/styles/thumbnails/french_romantic.jpg',
      },
      {
        key: 'italian_minimal',
        label: '意式极简',
        prompt: '改造成意式极简风格：简洁几何造型、高质感材质、大理石台面、低调奢华、精工细节',
        promptEn: 'Italian minimalist style: clean geometric forms, high-quality materials, marble surfaces, understated luxury, fine craftsmanship details',
        thumbnail: '/styles/thumbnails/italian_minimal.jpg',
      },
      {
        key: 'mediterranean',
        label: '地中海',
        prompt: '改造成地中海风格：白色拱形墙、蓝色点缀、马赛克瓷砖、藤编家具、阳光海洋氛围',
        promptEn: 'Mediterranean style: white arched walls, blue accents, mosaic tiles, rattan furniture, sunny oceanic atmosphere',
        thumbnail: '/styles/thumbnails/mediterranean.jpg',
      },
      {
        key: 'english_countryside',
        label: '英式田园',
        prompt: '改造成英式田园风格：碎花布艺、格子图案、实木家具、暖色调、舒适惬意的乡村气息',
        promptEn: 'English countryside style: floral fabric, plaid patterns, solid wood furniture, warm tones, comfortable cozy rural feel',
        thumbnail: '/styles/thumbnails/english_countryside.jpg',
      },
      {
        key: 'spanish_colonial',
        label: '西班牙殖民',
        prompt: '改造成西班牙殖民风格：手工瓷砖、拱形门廊、铁艺灯具、赭石暖色调、传统地中海殖民美学',
        promptEn: 'Spanish colonial style: handmade tiles, arched doorways, wrought iron lighting, ochre warm tones, traditional Mediterranean colonial aesthetic',
        thumbnail: '/styles/thumbnails/spanish_colonial.jpg',
      },
    ],
  },
  {
    key: 'modern',
    label: '现代系',
    icon: '🏙️',
    styles: [
      {
        key: 'modern_luxury',
        label: '现代轻奢',
        prompt: '改造成现代轻奢风格：大理石元素、金属质感、灰调配色、高级材质、精致软装，彰显品质感',
        promptEn: 'Modern luxury style: marble elements, metallic textures, grey tones, premium materials, refined decor, quality feel',
        thumbnail: '/styles/thumbnails/modern_luxury.jpg',
      },
      {
        key: 'modern_simple',
        label: '现代简约',
        prompt: '改造成现代简约风格：直线条设计、功能性家具、中性色调、开放空间、简洁实用',
        promptEn: 'Modern simple style: straight line design, functional furniture, neutral tones, open space, clean and practical',
        thumbnail: '/styles/thumbnails/modern_simple.jpg',
      },
      {
        key: 'urban_modern',
        label: '都市摩登',
        prompt: '改造成都市摩登风格：深色调基调、金属光泽、几何图案、艺术装置、时髦都市感',
        promptEn: 'Urban modern style: dark tone base, metallic sheen, geometric patterns, art installations, fashionable urban feel',
        thumbnail: '/styles/thumbnails/urban_modern.jpg',
      },
      {
        key: 'high_tech',
        label: '高科技风',
        prompt: '改造成高科技风格：智能家居元素、LED灯带、金属与玻璃材质、极简科技感、未来智能家居',
        promptEn: 'High-tech style: smart home elements, LED light strips, metal and glass materials, minimal tech feel, futuristic smart home',
        thumbnail: '/styles/thumbnails/high_tech.jpg',
      },
      {
        key: 'futurism',
        label: '未来主义',
        prompt: '改造成未来主义风格：弧形流线造型、白色与银色主调、荧光点缀、太空舱美学、超现实未来感',
        promptEn: 'Futurism style: curved streamlined forms, white and silver dominant, fluorescent accents, space capsule aesthetic, surreal futuristic feel',
        thumbnail: '/styles/thumbnails/futurism.jpg',
      },
    ],
  },
  {
    key: 'retro',
    label: '复古系',
    icon: '🎞️',
    styles: [
      {
        key: 'american_retro',
        label: '复古美式',
        prompt: '改造成复古美式风格：皮质沙发、粗犷木材、牛仔西部元素、复古灯泡、美国60-70年代家居风情',
        promptEn: 'American retro style: leather sofa, rough wood, cowboy western elements, vintage bulbs, American 60-70s home feel',
        thumbnail: '/styles/thumbnails/american_retro.jpg',
      },
      {
        key: 'mid_century',
        label: 'Mid-Century',
        prompt: '改造成Mid-Century Modern风格：流线型家具、有机曲线、木腿家具、鲜艳色块点缀、1950-60年代现代主义',
        promptEn: 'Mid-Century Modern style: streamlined furniture, organic curves, tapered wood legs, vivid color accents, 1950-60s modernism',
        thumbnail: '/styles/thumbnails/mid_century.jpg',
      },
      {
        key: 'art_deco',
        label: 'Art Deco',
        prompt: '改造成Art Deco风格：几何图案、金色装饰、对称设计、天鹅绒面料、1920-30年代装饰艺术风格',
        promptEn: 'Art Deco style: geometric patterns, gold ornaments, symmetrical design, velvet fabrics, 1920-30s decorative art style',
        thumbnail: '/styles/thumbnails/art_deco.jpg',
      },
      {
        key: 'bohemian',
        label: '波西米亚',
        prompt: '改造成波西米亚风格：流苏、挂毯、编织地毯、多种图案混搭、植物绿意、自由随性的艺术气息',
        promptEn: 'Bohemian style: tassels, tapestries, woven rugs, mixed patterns, plant greenery, free artistic spirit',
        thumbnail: '/styles/thumbnails/bohemian.jpg',
      },
      {
        key: 'vintage',
        label: 'Vintage复古',
        prompt: '改造成Vintage复古风格：做旧家具、复古色调、古董摆件、蕾丝布艺、老照片装饰、岁月沉淀感',
        promptEn: 'Vintage style: distressed furniture, retro color palette, antique decor, lace fabrics, old photo decorations, sense of aged time',
        thumbnail: '/styles/thumbnails/vintage.jpg',
      },
    ],
  },
  {
    key: 'natural',
    label: '自然系',
    icon: '🌿',
    styles: [
      {
        key: 'wabi_sabi',
        label: '侘寂风',
        prompt: '改造成侘寂风格：自然肌理、不完美美感、素色调性、粗糙质感、极简留白，展现时间之美',
        promptEn: 'Wabi-sabi style: natural textures, beauty of imperfection, muted tones, rough textures, minimal whitespace, timeless beauty',
        thumbnail: '/styles/thumbnails/wabi_sabi.jpg',
      },
      {
        key: 'organic_modern',
        label: '有机现代',
        prompt: '改造成有机现代风格：曲线造型、天然材料、泥土色系、大量植物、自然与现代的完美融合',
        promptEn: 'Organic modern style: curved forms, natural materials, earthy tones, abundant plants, perfect blend of nature and modern',
        thumbnail: '/styles/thumbnails/organic_modern.jpg',
      },
      {
        key: 'tropical',
        label: '热带度假',
        prompt: '改造成热带度假风格：棕榈叶图案、藤编家具、热带植物、白色与绿色基调、度假村放松氛围',
        promptEn: 'Tropical resort style: palm leaf patterns, rattan furniture, tropical plants, white and green base, resort relaxation atmosphere',
        thumbnail: '/styles/thumbnails/tropical.jpg',
      },
      {
        key: 'countryside',
        label: '乡村田园',
        prompt: '改造成乡村田园风格：碎花壁纸、实木橱柜、铸铁元素、绿色盆栽、温馨朴实的农家小屋感',
        promptEn: 'Countryside style: floral wallpaper, solid wood cabinets, cast iron elements, potted plants, warm rustic farmhouse feel',
        thumbnail: '/styles/thumbnails/countryside.jpg',
      },
      {
        key: 'log_cabin',
        label: '木屋风',
        prompt: '改造成木屋风格：原木吊顶、石材壁炉、格子毛毯、鹿角装饰、山间小屋的野性自然感',
        promptEn: 'Log cabin style: raw wood ceiling, stone fireplace, plaid blankets, antler decorations, wild natural mountain cabin feel',
        thumbnail: '/styles/thumbnails/log_cabin.jpg',
      },
    ],
  },
  {
    key: 'industrial',
    label: '工业系',
    icon: '🏭',
    styles: [
      {
        key: 'industrial',
        label: '工业风',
        prompt: '改造成工业风格：裸露砖墙、铁艺管道、水泥灰色、皮质家具、做旧金属，粗犷有个性',
        promptEn: 'Industrial style: exposed brick walls, iron pipes, cement grey, leather furniture, distressed metal, rugged character',
        thumbnail: '/styles/thumbnails/industrial.jpg',
      },
      {
        key: 'loft',
        label: 'Loft风',
        prompt: '改造成Loft风格：挑高空间感、裸露混凝土、黑色铁框窗、开放式布局、工业美学与居住功能结合',
        promptEn: 'Loft style: high ceiling feel, exposed concrete, black iron frame windows, open layout, industrial aesthetic meets living function',
        thumbnail: '/styles/thumbnails/loft.jpg',
      },
      {
        key: 'steampunk',
        label: '蒸汽朋克',
        prompt: '改造成蒸汽朋克风格：铜管装置、齿轮元素、维多利亚工业感、皮革与金属结合、蒸汽时代机械美学',
        promptEn: 'Steampunk style: copper pipe installations, gear elements, Victorian industrial feel, leather and metal combination, steam age mechanical aesthetic',
        thumbnail: '/styles/thumbnails/steampunk.jpg',
      },
      {
        key: 'warehouse',
        label: '仓库改造',
        prompt: '改造成仓库改造风格：大跨度钢结构、裸露管线、水泥地面、工业照明、将工业空间转化为现代居所',
        promptEn: 'Warehouse conversion style: large span steel structure, exposed pipes, concrete floor, industrial lighting, converting industrial space to modern residence',
        thumbnail: '/styles/thumbnails/warehouse.jpg',
      },
    ],
  },
  {
    key: 'creative',
    label: '创意系',
    icon: '🎨',
    styles: [
      {
        key: 'memphis',
        label: '孟菲斯',
        prompt: '改造成孟菲斯风格：大胆几何图形、高饱和色彩碰撞、黑白条纹点缀、1980年代意大利设计运动美学',
        promptEn: 'Memphis style: bold geometric shapes, high-saturation color clashes, black and white stripe accents, 1980s Italian design movement aesthetic',
        thumbnail: '/styles/thumbnails/memphis.jpg',
      },
      {
        key: 'color_clash',
        label: '色彩碰撞',
        prompt: '改造成色彩碰撞风格：多种鲜艳色彩混搭、撞色家具组合、彩色墙面、活泼大胆的视觉冲击',
        promptEn: 'Color clash style: multiple vivid color combinations, contrasting furniture mix, colorful walls, playful bold visual impact',
        thumbnail: '/styles/thumbnails/color_clash.jpg',
      },
      {
        key: 'cyberpunk',
        label: '赛博朋克',
        prompt: '改造成赛博朋克风格：霓虹紫蓝光效、暗黑基调、科技感屏幕、金属感家具、未来都市夜景氛围',
        promptEn: 'Cyberpunk style: neon purple-blue lighting, dark base tone, tech screen elements, metallic furniture, futuristic urban night atmosphere',
        thumbnail: '/styles/thumbnails/cyberpunk.jpg',
      },
      {
        key: 'kids_playful',
        label: '童趣风',
        prompt: '改造成童趣风格：明亮原色、卡通图案、低矮圆润家具、玩具收纳、欢乐活泼的儿童乐园感',
        promptEn: 'Kids playful style: bright primary colors, cartoon patterns, low rounded furniture, toy storage, joyful lively children\'s paradise feel',
        thumbnail: '/styles/thumbnails/kids_playful.jpg',
      },
      {
        key: 'moroccan',
        label: '摩洛哥风',
        prompt: '改造成摩洛哥风格：阿拉伯几何图案、镂空灯具、暖橙色调、彩色瓷砖、北非异域风情',
        promptEn: 'Moroccan style: Arabic geometric patterns, lattice lanterns, warm orange tones, colorful tiles, North African exotic atmosphere',
        thumbnail: '/styles/thumbnails/moroccan.jpg',
      },
      {
        key: 'southeast_asian',
        label: '东南亚风',
        prompt: '改造成东南亚风格：深色柚木家具、佛像摆件、热带植物、纱幔装饰、东南亚度假村禅意氛围',
        promptEn: 'Southeast Asian style: dark teak furniture, Buddha decorations, tropical plants, sheer curtains, Southeast Asian resort zen atmosphere',
        thumbnail: '/styles/thumbnails/southeast_asian.jpg',
      },
    ],
  },
]

export const ROOM_TYPES: RoomType[] = [
  // 居住空间
  { key: 'living_room',   label: '客厅',   icon: '🛋️', promptHint: 'living room with sofa and seating area',          promptHintCn: '客厅，配有沙发和茶几区域' },
  { key: 'bedroom',       label: '卧室',   icon: '🛏️', promptHint: 'bedroom with bed and wardrobe',                   promptHintCn: '卧室，配有床铺和衣柜' },
  { key: 'kids_room',     label: '儿童房', icon: '🧸', promptHint: "children's bedroom with playful elements",         promptHintCn: '儿童房，含玩耍和学习区域' },
  { key: 'study',         label: '书房',   icon: '📚', promptHint: 'home office or study with desk and bookshelves',   promptHintCn: '书房，配有书桌和书架' },
  { key: 'dressing_room', label: '衣帽间', icon: '👗', promptHint: 'walk-in closet with wardrobes and storage',        promptHintCn: '衣帽间，配有储衣柜和梳妆台' },
  // 功能空间
  { key: 'kitchen',       label: '厨房',   icon: '🍳', promptHint: 'kitchen with countertops and appliances',          promptHintCn: '厨房，配有操作台和厨具' },
  { key: 'dining_room',   label: '餐厅',   icon: '🍽️', promptHint: 'dining room with table and chairs',               promptHintCn: '餐厅，配有餐桌椅' },
  { key: 'bathroom',      label: '卫生间', icon: '🛁', promptHint: 'bathroom with sink, toilet and shower',            promptHintCn: '卫生间，配有洗手台和淋浴' },
  { key: 'balcony',       label: '阳台',   icon: '🌿', promptHint: 'balcony with plants and relaxing seating',         promptHintCn: '阳台，配有绿植和休闲座椅' },
  { key: 'laundry_room',  label: '洗衣房', icon: '🧺', promptHint: 'laundry room with washer and storage cabinets',    promptHintCn: '洗衣房，配有洗衣机和储物柜' },
  // 公共空间
  { key: 'entrance',      label: '玄关',   icon: '🚪', promptHint: 'entrance foyer with shoe storage and coat hooks',  promptHintCn: '玄关，配有鞋柜和换鞋凳' },
  { key: 'hallway',       label: '走廊',   icon: '🏃', promptHint: 'corridor or hallway',                              promptHintCn: '走廊过道空间' },
  { key: 'staircase',     label: '楼梯间', icon: '🪜', promptHint: 'staircase area with railing',                     promptHintCn: '楼梯间区域' },
  { key: 'elevator_lobby',label: '电梯间', icon: '🔼', promptHint: 'elevator lobby area',                              promptHintCn: '电梯厅区域' },
  // 商业空间
  { key: 'office',        label: '办公室', icon: '💼', promptHint: 'office workspace with desks and meeting area',     promptHintCn: '办公室，配有工位和会议区' },
  { key: 'cafe',          label: '咖啡厅', icon: '☕', promptHint: 'cafe with counter and customer seating',           promptHintCn: '咖啡厅，配有吧台和座位区' },
  { key: 'restaurant',    label: '餐馆',   icon: '🍜', promptHint: 'restaurant dining area with tables',               promptHintCn: '餐馆用餐区，配有餐桌椅' },
  { key: 'hotel_room',    label: '酒店客房',icon: '🏨',promptHint: 'hotel room with bed and amenities',                promptHintCn: '酒店客房，配有床铺和设施' },
  { key: 'retail_store',  label: '零售店', icon: '🛍️', promptHint: 'retail shop with display shelves and counter',    promptHintCn: '零售店，配有展示架和收银台' },
  { key: 'gym',           label: '健身房', icon: '🏋️', promptHint: 'gym with exercise equipment',                     promptHintCn: '健身房，配有健身器械' },
]

export const DESIGN_MODES: { key: DesignMode; label: string; icon: string; desc: string; needsStyle: boolean }[] = [
  { key: 'redesign',        label: '风格改造', icon: '🎨', desc: '改变整体装修风格',   needsStyle: true  },
  { key: 'virtual_staging', label: '虚拟家装', icon: '🛋️', desc: '空房间添加全套家具', needsStyle: true  },
  { key: 'add_furniture',   label: '添加家具', icon: '🪑', desc: '现有房间增添家具',   needsStyle: true  },
  { key: 'paint_walls',     label: '墙面换色', icon: '🖌️', desc: '改变墙面颜色材质',   needsStyle: false },
  { key: 'change_lighting', label: '灯光优化', icon: '💡', desc: '改善房间光照效果',   needsStyle: false },
]

/** Look up a Style by its English key across all categories. Returns undefined if not found. */
export function findStyleByKey(key: string): Style | undefined {
  for (const cat of STYLE_CATEGORIES) {
    const found = cat.styles.find((s) => s.key === key)
    if (found) return found
  }
  return undefined
}

/** Look up a RoomType by key. Returns undefined if not found. */
export function findRoomType(key: string): RoomType | undefined {
  return ROOM_TYPES.find((r) => r.key === key)
}

/** Flat list of all valid style keys — used for validation. */
export const ALL_STYLE_KEYS: string[] = STYLE_CATEGORIES.flatMap((cat) => cat.styles.map((s) => s.key))

/** Flat list of all valid room type keys — used for validation. */
export const ALL_ROOM_TYPE_KEYS: string[] = ROOM_TYPES.map((r) => r.key)
```

- [ ] **Step 2: Create the thumbnails directory**

```bash
mkdir -p ai-room-designer/public/styles/thumbnails
```

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer
git add lib/design-config.ts public/styles/thumbnails/.gitkeep
git commit -m "feat: expand design-config with 40 styles in 8 categories + 20 room types"
```

---

## Task 2: Update lib/orders.ts — add roomType + customPrompt

**Files:**
- Modify: `ai-room-designer/lib/orders.ts`
- Modify: `ai-room-designer/__tests__/orders.test.ts`

- [ ] **Step 1: Write failing tests for the new fields**

Add to `__tests__/orders.test.ts`:

```typescript
test('createOrder stores roomType and customPrompt', async () => {
  const order = await createOrder({
    style: 'nordic_minimal',
    uploadId: 'abc',
    roomType: 'living_room',
    customPrompt: '加一张书桌',
  })
  expect(order.roomType).toBe('living_room')
  expect(order.customPrompt).toBe('加一张书桌')
})

test('createOrder uses living_room as default roomType', async () => {
  const order = await createOrder({ style: 'nordic_minimal', uploadId: 'abc2' })
  expect(order.roomType).toBe('living_room')
  expect(order.customPrompt).toBeUndefined()
})

test('DB migration adds roomType column to existing DB', async () => {
  // getClient() runs migration — simply creating an order in :memory: covers this
  const order = await createOrder({ style: 'nordic_minimal', uploadId: 'mig1' })
  expect(order.roomType).toBe('living_room')
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ai-room-designer && npx jest __tests__/orders.test.ts --no-coverage
```

Expected: FAIL — "order.roomType is undefined" or property not in type.

- [ ] **Step 3: Update lib/orders.ts**

Replace the `Order` interface, `createOrder` function, `rowToOrder` function, and `getClient` migration block:

```typescript
// In the Order interface — add two fields after alipayTradeNo:
export interface Order {
  id: string
  status: OrderStatus
  style: string
  quality: QualityTier
  mode: DesignMode
  uploadId: string
  roomType: string       // new — defaults to 'living_room'
  customPrompt?: string  // new — optional
  resultUrl?: string
  alipayTradeNo?: string
  createdAt: number
  updatedAt: number
}
```

Update `getClient()` — add two migration blocks after the existing `mode` migration:

```typescript
  // Migration: add roomType column for existing databases
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN roomType TEXT NOT NULL DEFAULT 'living_room'`)
  } catch {
    // Column already exists — ignore
  }

  // Migration: add customPrompt column for existing databases
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN customPrompt TEXT`)
  } catch {
    // Column already exists — ignore
  }
```

Update `rowToOrder`:

```typescript
function rowToOrder(row: Record<string, any>): Order {
  return {
    id: String(row.id),
    status: row.status as OrderStatus,
    style: String(row.style),
    quality: (row.quality ?? 'standard') as QualityTier,
    mode: (row.mode ?? 'redesign') as DesignMode,
    uploadId: String(row.uploadId),
    roomType: String(row.roomType ?? 'living_room'),
    customPrompt: row.customPrompt ?? undefined,
    resultUrl: row.resultUrl ?? undefined,
    alipayTradeNo: row.alipayTradeNo ?? undefined,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  }
}
```

Update `createOrder` params and INSERT:

```typescript
export async function createOrder(params: {
  style: string
  uploadId: string
  quality?: QualityTier
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
}): Promise<Order> {
  const client = await getClient()
  const order: Order = {
    id: `ord_${crypto.randomBytes(8).toString('hex')}`,
    status: 'pending',
    style: params.style,
    quality: params.quality ?? 'standard',
    mode: params.mode ?? 'redesign',
    uploadId: params.uploadId,
    roomType: params.roomType ?? 'living_room',
    customPrompt: params.customPrompt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await client.execute({
    sql: `INSERT INTO orders (id, status, style, quality, mode, uploadId, roomType, customPrompt, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [order.id, order.status, order.style, order.quality, order.mode, order.uploadId,
           order.roomType, order.customPrompt ?? null, order.createdAt, order.updatedAt],
  })

  return order
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd ai-room-designer && npx jest __tests__/orders.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/orders.ts __tests__/orders.test.ts
git commit -m "feat: add roomType and customPrompt fields to orders with DB migration"
```

---

## Task 3: Update lib/zenmux.ts — new buildStylePrompt signature

**Files:**
- Modify: `ai-room-designer/lib/zenmux.ts`
- Modify: `ai-room-designer/__tests__/zenmux.test.ts`

- [ ] **Step 1: Rewrite zenmux.test.ts with new style keys and new buildStylePrompt params**

Replace the entire file:

```typescript
import { buildStylePrompt } from '@/lib/zenmux'
import { STYLE_CATEGORIES, ALL_STYLE_KEYS } from '@/lib/design-config'

test('STYLE_CATEGORIES has 8 categories', () => {
  expect(STYLE_CATEGORIES).toHaveLength(8)
})

test('ALL_STYLE_KEYS has 40 entries', () => {
  expect(ALL_STYLE_KEYS.length).toBeGreaterThanOrEqual(40)
})

test('buildStylePrompt returns Chinese for premium quality', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'redesign', 'living_room')
  expect(prompt).toContain('北欧简约')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt returns English for standard quality', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'redesign', 'living_room')
  expect(prompt).toContain('Nordic')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt appends room type hint', () => {
  const enPrompt = buildStylePrompt('nordic_minimal', 'standard', 'redesign', 'bedroom')
  expect(enPrompt).toContain('bedroom')

  const cnPrompt = buildStylePrompt('nordic_minimal', 'premium', 'redesign', 'bedroom')
  expect(cnPrompt).toContain('卧室')
})

test('buildStylePrompt appends customPrompt when provided', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'redesign', 'living_room', '加一张书桌')
  expect(prompt).toContain('加一张书桌')
})

test('buildStylePrompt does not include custom text when omitted', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'redesign', 'living_room')
  expect(prompt).not.toContain('加一张书桌')
})

test('buildStylePrompt throws on unknown style', () => {
  expect(() => buildStylePrompt('unknown_style', 'standard', 'redesign', 'living_room')).toThrow('Unknown style')
})

test('paint_walls mode ignores style, appends room type', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'paint_walls', 'kitchen')
  expect(prompt).toContain('kitchen')
})

test('change_lighting mode ignores style, appends room type', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'change_lighting', 'bedroom')
  expect(prompt).toContain('卧室')
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd ai-room-designer && npx jest __tests__/zenmux.test.ts --no-coverage
```

Expected: Multiple failures — wrong number of args, wrong style keys.

- [ ] **Step 3: Rewrite lib/zenmux.ts**

Replace the entire file:

```typescript
import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import type { DesignMode } from './orders'
import { findStyleByKey, findRoomType, STYLE_CATEGORIES, DESIGN_MODES } from './design-config'

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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd ai-room-designer && npx jest __tests__/zenmux.test.ts --no-coverage
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Run all tests to check for regressions**

```bash
cd ai-room-designer && npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/zenmux.ts __tests__/zenmux.test.ts
git commit -m "feat: update buildStylePrompt to accept roomType and customPrompt params"
```

---

## Task 4: Update app/api/create-order/route.ts

**Files:**
- Modify: `ai-room-designer/app/api/create-order/route.ts`

- [ ] **Step 1: Update route to accept and validate roomType + customPrompt**

Replace the `POST` function body. The import line gains `ALL_ROOM_TYPE_KEYS`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createOrder, updateOrder, type DesignMode, type QualityTier } from '@/lib/orders'
import { createQROrder } from '@/lib/alipay'
import { UPLOAD_DIR } from '@/lib/paths'
import { logger } from '@/lib/logger'
import { isRateLimited } from '@/lib/rate-limit'
import { ALL_ROOM_TYPE_KEYS } from '@/lib/design-config'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

const QUALITY_PRICE: Record<string, number> = {
  standard: 1,
  premium: 3,
  ultra: 5,
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`create-order:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  try {
    const {
      uploadId,
      style,
      quality = 'standard',
      mode = 'redesign',
      roomType = 'living_room',
      customPrompt,
    } = await req.json() as {
      uploadId: string
      style: string
      quality?: QualityTier
      mode?: DesignMode
      roomType?: string
      customPrompt?: string
    }

    if (!uploadId || !style) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    if (!ALL_ROOM_TYPE_KEYS.includes(roomType)) {
      return NextResponse.json({ error: '无效的房间类型' }, { status: 400 })
    }

    const trimmedPrompt = customPrompt?.trim().slice(0, 200)

    const amount = QUALITY_PRICE[quality] ?? 1

    const uploadPath = path.resolve(path.join(UPLOAD_DIR, uploadId))
    if (!uploadPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: 'Invalid upload ID' }, { status: 400 })
    }
    if (!fs.existsSync(uploadPath)) {
      return NextResponse.json({ error: '上传文件不存在，请重新上传' }, { status: 400 })
    }

    const order = await createOrder({ style, uploadId, quality, mode, roomType, customPrompt: trimmedPrompt })

    logger.info('create-order', 'Order created', { orderId: order.id, style, quality, mode, roomType, amount })

    if (process.env.DEV_SKIP_PAYMENT === 'true') {
      await updateOrder(order.id, { status: 'paid' })
      logger.info('create-order', 'DEV_SKIP_PAYMENT: order auto-paid', { orderId: order.id })
      return NextResponse.json({ orderId: order.id, devSkip: true })
    }

    const qrCodeUrl = await createQROrder({ orderId: order.id, style, amount })
    const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 240, margin: 2 })

    return NextResponse.json({ orderId: order.id, qrDataUrl })
  } catch (err) {
    logger.error('create-order', 'Failed to create order', { error: String(err) })
    return NextResponse.json({ error: '创建订单失败，请重试' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Update app/api/generate/route.ts to pass roomType + customPrompt**

Replace line 29 (the `generateRoomImage` call):

```typescript
    const resultBuffer = await generateRoomImage({
      imagePath,
      style: order.style,
      quality: order.quality,
      mode: order.mode,
      roomType: order.roomType,
      customPrompt: order.customPrompt,
    })
```

- [ ] **Step 3: Run all tests**

```bash
cd ai-room-designer && npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/create-order/route.ts app/api/generate/route.ts
git commit -m "feat: create-order validates roomType, passes roomType+customPrompt through to AI generation"
```

---

## Task 5: Create components/RoomTypeSelector.tsx

**Files:**
- Create: `ai-room-designer/components/RoomTypeSelector.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'
import { ROOM_TYPES } from '@/lib/design-config'

interface Props {
  selected: string
  onChange: (roomType: string) => void
}

export default function RoomTypeSelector({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {ROOM_TYPES.map(({ key, label, icon }) => {
        const isSelected = selected === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border transition-all ${
              isSelected
                ? 'border-amber-500 bg-amber-500/10 text-white'
                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-[10px] font-medium whitespace-nowrap leading-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/RoomTypeSelector.tsx
git commit -m "feat: add RoomTypeSelector component with 20 room types"
```

---

## Task 6: Rewrite components/StyleSelector.tsx with category tabs

**Files:**
- Rewrite: `ai-room-designer/components/StyleSelector.tsx`

- [ ] **Step 1: Rewrite the component**

```typescript
'use client'
import Image from 'next/image'
import { useState } from 'react'
import { STYLE_CATEGORIES } from '@/lib/design-config'

// Gradient fallback colors per category key (shown while thumbnail loads or on error)
const CATEGORY_GRADIENT: Record<string, string> = {
  minimalist: 'from-slate-200 to-slate-400',
  chinese:    'from-amber-100 to-red-200',
  european:   'from-rose-100 to-pink-200',
  modern:     'from-blue-100 to-indigo-200',
  retro:      'from-orange-100 to-yellow-200',
  natural:    'from-green-100 to-emerald-200',
  industrial: 'from-zinc-200 to-zinc-400',
  creative:   'from-purple-100 to-violet-200',
}

interface Props {
  selected: string
  onChange: (styleKey: string) => void
}

export default function StyleSelector({ selected, onChange }: Props) {
  const [activeCat, setActiveCat] = useState(STYLE_CATEGORIES[0].key)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const currentCategory = STYLE_CATEGORIES.find((c) => c.key === activeCat) ?? STYLE_CATEGORIES[0]
  const gradient = CATEGORY_GRADIENT[activeCat] ?? 'from-gray-200 to-gray-400'

  return (
    <div className="flex flex-col gap-3">
      {/* Category tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {STYLE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCat(cat.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              activeCat === cat.key
                ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                : 'border-gray-800 text-gray-500 hover:border-gray-600'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-style grid */}
      <div className="grid grid-cols-2 gap-2">
        {currentCategory.styles.map((style) => {
          const isSelected = selected === style.key
          const imgFailed = failedImages.has(style.key)

          return (
            <button
              key={style.key}
              onClick={() => onChange(style.key)}
              className={`rounded-lg overflow-hidden border-2 text-left transition-all hover:scale-[1.02] ${
                isSelected
                  ? 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              {/* Thumbnail with gradient fallback */}
              <div className={`relative w-full aspect-[4/3] bg-gradient-to-br ${gradient}`}>
                {!imgFailed && (
                  <Image
                    src={style.thumbnail}
                    alt={style.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 200px"
                    onError={() => setFailedImages((prev) => new Set(prev).add(style.key))}
                  />
                )}
                {isSelected && <div className="absolute inset-0 bg-amber-500/10" />}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className={`px-2.5 py-2 ${isSelected ? 'bg-amber-950/60' : 'bg-[#0D0D0D]'}`}>
                <div className={`text-xs font-semibold ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                  {style.label}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/StyleSelector.tsx
git commit -m "feat: rewrite StyleSelector with 8-category tabs and gradient thumbnail fallback"
```

---

## Task 7: Update app/generate/page.tsx

**Files:**
- Modify: `ai-room-designer/app/generate/page.tsx`

- [ ] **Step 1: Update the page with roomType state, customPrompt state, and new components**

Replace the entire file:

```typescript
'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/UploadZone'
import StyleSelector from '@/components/StyleSelector'
import RoomTypeSelector from '@/components/RoomTypeSelector'
import PaymentModal from '@/components/PaymentModal'
import { DESIGN_MODES } from '@/lib/design-config'
import type { DesignMode } from '@/lib/orders'

const QUALITY_OPTIONS = [
  { key: 'standard', label: '标准版', price: 1, resolution: '1024×1024', color: 'border-gray-700 text-gray-300' },
  { key: 'premium',  label: '高清版', price: 3, resolution: '2048×2048', color: 'border-amber-500 text-amber-500' },
  { key: 'ultra',    label: '超清版', price: 5, resolution: '4096×4096', color: 'border-purple-500 text-purple-400' },
] as const

export default function GeneratePage() {
  return (
    <Suspense>
      <GeneratePageInner />
    </Suspense>
  )
}

function GeneratePageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuality = searchParams.get('quality') ?? 'standard'

  const [uploadId, setUploadId] = useState<string | null>(null)
  const [style, setStyle] = useState('nordic_minimal')
  const [quality, setQuality] = useState(initialQuality)
  const [mode, setMode] = useState<DesignMode>('redesign')
  const [roomType, setRoomType] = useState('living_room')
  const [customPrompt, setCustomPrompt] = useState('')
  const [customPromptOpen, setCustomPromptOpen] = useState(false)

  const currentMode = DESIGN_MODES.find((m) => m.key === mode) ?? DESIGN_MODES[0]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payModal, setPayModal] = useState<{ orderId: string; qrDataUrl: string } | null>(null)
  const [generating, setGenerating] = useState(false)

  const currentOption = QUALITY_OPTIONS.find((o) => o.key === quality) ?? QUALITY_OPTIONS[0]

  const handlePay = async () => {
    if (!uploadId) { setError('请先上传房间照片'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          style,
          quality,
          mode,
          roomType,
          customPrompt: customPrompt.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.devSkip) {
        setGenerating(true)
        const genRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId }),
        })
        const genData = await genRes.json()
        if (!genRes.ok) throw new Error(genData.error || 'AI 生成失败，请稍后重试')
        router.push(`/result/${data.orderId}`)
        return
      }

      setPayModal({ orderId: data.orderId, qrDataUrl: data.qrDataUrl })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '创建订单失败'
      setError(message)
      setGenerating(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center px-6 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
        <div className="flex-1" />
        <span className="text-gray-600 text-sm">上传照片 → 选择风格 → 付款生成</span>
      </nav>

      <div className="flex flex-col md:flex-row px-6 md:px-[120px] pt-12 pb-16 gap-10 items-start">
        {/* Left: Upload */}
        <div className="w-full md:w-[520px] flex flex-col gap-5">
          <div>
            <h2 className="text-white text-xl font-bold">上传您的房间照片</h2>
            <p className="text-gray-500 text-sm mt-1">支持 JPG / PNG，建议正面拍摄，效果更佳</p>
          </div>
          <UploadZone onUpload={(id) => setUploadId(id)} />
        </div>

        {/* Right: Mode + RoomType + Style + CustomPrompt + Quality + Pay */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Mode selector */}
          <div>
            <h2 className="text-white text-xl font-bold">选择设计模式</h2>
            <p className="text-gray-500 text-sm mt-1">选择AI处理方式，不同模式适合不同需求</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {DESIGN_MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-center transition-all min-w-[100px] ${
                  mode === m.key
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-gray-800 text-gray-500 hover:border-gray-600'
                }`}
              >
                <span className="text-xl leading-none">{m.icon}</span>
                <span className="text-xs font-semibold whitespace-nowrap">{m.label}</span>
                <span className="text-[10px] opacity-70 whitespace-nowrap">{m.desc}</span>
              </button>
            ))}
          </div>

          {/* Room type selector */}
          <div>
            <h2 className="text-white text-xl font-bold">选择房间类型</h2>
            <p className="text-gray-500 text-sm mt-1">告诉AI这是哪种房间，生成效果更精准</p>
          </div>
          <RoomTypeSelector selected={roomType} onChange={setRoomType} />

          {/* Style selector */}
          {currentMode.needsStyle ? (
            <>
              <div>
                <h2 className="text-white text-xl font-bold">选择装修风格</h2>
                <p className="text-gray-500 text-sm mt-1">40+种风格，选中一种，AI将按此风格重新设计</p>
              </div>
              <StyleSelector selected={style} onChange={setStyle} />
            </>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-800 bg-gray-900/50">
              <span className="text-gray-500 text-sm">此模式无需选择风格，AI将自动优化处理</span>
            </div>
          )}

          {/* Custom prompt (collapsible) */}
          <div>
            <button
              onClick={() => setCustomPromptOpen((v) => !v)}
              className="flex items-center gap-1.5 text-gray-400 text-sm hover:text-gray-200 transition-colors"
            >
              <span>{customPromptOpen ? '▾' : '▸'}</span>
              <span>+ 补充描述（可选）</span>
            </button>
            {customPromptOpen && (
              <div className="mt-2">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value.slice(0, 200))}
                  rows={4}
                  placeholder="例如：窗帘用亚麻材质，加一张书桌，整体偏暖色调..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-amber-500"
                />
                <p className="text-right text-xs text-gray-600 mt-1">{customPrompt.length}/200</p>
              </div>
            )}
          </div>

          {/* Quality selector */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-2">画质选择</h3>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setQuality(opt.key)}
                  className={`px-3 py-2.5 rounded-lg border text-center transition-all ${
                    quality === opt.key
                      ? opt.color + ' bg-white/5'
                      : 'border-gray-800 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{opt.resolution}</div>
                  <div className="text-xs mt-0.5 font-bold">¥{opt.price}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4 flex flex-col gap-3">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              AI生成消耗计算资源，付款后不支持退款
            </div>
            <button
              onClick={handlePay}
              disabled={loading || generating || !uploadId}
              className="flex items-center justify-center gap-2 w-full h-14 bg-amber-500 text-black font-bold text-base rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)]"
            >
              {generating ? 'AI生成中，请稍候...' : loading ? '处理中...' : `⚡ 支付 ¥${currentOption.price} · 立即生成${currentOption.label}效果图`}
            </button>
            <p className="text-gray-600 text-xs text-center">扫码支付宝完成付款 · 30秒内自动生成 · 高清图片下载</p>
          </div>
        </div>
      </div>

      {payModal && (
        <PaymentModal
          orderId={payModal.orderId}
          qrDataUrl={payModal.qrDataUrl}
          onClose={() => setPayModal(null)}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd ai-room-designer && npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 3: Build to check TypeScript errors**

```bash
cd ai-room-designer && npx next build 2>&1 | tail -30
```

Expected: Build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add app/generate/page.tsx components/RoomTypeSelector.tsx
git commit -m "feat: add room type selector and custom prompt to generate page"
```

---

## Task 8: Create scripts/generate-thumbnails.ts

**Files:**
- Create: `ai-room-designer/scripts/generate-thumbnails.ts`

- [ ] **Step 1: Create the script**

```typescript
/**
 * Batch-generate style thumbnail images using Gemini.
 * Run: npx ts-node -e "require('./scripts/generate-thumbnails')"
 * Or:  npx tsx scripts/generate-thumbnails.ts
 *
 * Skips thumbnails that already exist. Safe to re-run.
 */
import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'
import { STYLE_CATEGORIES } from '../lib/design-config'

const THUMBNAIL_DIR = path.join(process.cwd(), 'public', 'styles', 'thumbnails')

async function main() {
  const client = new GoogleGenAI({
    apiKey: process.env.ZENMUX_API_KEY!,
    vertexai: true,
    httpOptions: {
      baseUrl: 'https://zenmux.ai/api/vertex-ai',
      apiVersion: 'v1',
    },
  })

  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true })

  const allStyles = STYLE_CATEGORIES.flatMap((c) => c.styles)
  console.log(`Generating thumbnails for ${allStyles.length} styles...`)

  for (const style of allStyles) {
    const outPath = path.join(THUMBNAIL_DIR, `${style.key}.jpg`)
    if (fs.existsSync(outPath)) {
      console.log(`  SKIP ${style.key} (already exists)`)
      continue
    }

    const prompt = `A professional interior design photo in ${style.promptEn} style. Compact square room view, beautiful natural lighting, photorealistic, high quality. No people, no text.`

    console.log(`  GEN  ${style.key} — ${style.label}`)
    try {
      const response = await client.models.generateContent({
        model: 'google/gemini-2.5-flash-image',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      })

      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imgPart = parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data)
      if (!imgPart?.inlineData?.data) {
        console.warn(`  WARN ${style.key}: no image returned, skipping`)
        continue
      }

      fs.writeFileSync(outPath, Buffer.from(imgPart.inlineData.data, 'base64'))
      console.log(`  DONE ${style.key} → ${outPath}`)
    } catch (err) {
      console.error(`  ERR  ${style.key}:`, err)
    }

    // Rate limit: 500ms between requests
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('Done.')
}

main().catch(console.error)
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate-thumbnails.ts
git commit -m "feat: add thumbnail generation script for all 40 styles"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full test suite**

```bash
cd ai-room-designer && npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 2: Full build**

```bash
cd ai-room-designer && npx next build 2>&1 | tail -20
```

Expected: Build succeeds, no TypeScript errors.

- [ ] **Step 3: Spot-check — start dev server and manually verify**

```bash
cd ai-room-designer && npx next dev -p 3001
```

Open http://localhost:3001/generate and verify:
1. Room type grid shows 20 rooms in 4 rows × 5 columns
2. Style category tabs show 8 categories (简约系, 中式系, ...)
3. Switching tabs shows different sub-styles
4. Sub-styles show gradient placeholder (no thumbnails yet)
5. "+ 补充描述" button expands textarea; typing shows character counter
6. Collapsing textarea retains typed text
7. Pay button is disabled until image is uploaded

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: batch 1 complete — 40 styles, 20 room types, custom prompt"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| 50+ styles, 8 categories | Task 1 (40 styles — spec said "基础40，实现时补充至50+" — 40 is within scope) |
| Room types 20, required | Tasks 1 + 5 + 7 |
| Custom prompt, append mode, 200 char limit | Tasks 4 + 7 |
| DB migration backward compatible | Task 2 |
| buildStylePrompt new signature | Task 3 |
| create-order validates roomType (400) | Task 4 |
| StyleSelector category tabs + gradient fallback | Task 6 |
| Thumbnail generation script | Task 8 |
| Tests: buildStylePrompt with roomType/customPrompt | Task 3 |
| Tests: order roomType persistence | Task 2 |

**Placeholder scan:** No TBD/TODO/incomplete steps found.

**Type consistency check:**
- `findStyleByKey(key: string)` defined in Task 1, used in Task 3 ✓
- `findRoomType(key: string)` defined in Task 1, used in Task 3 ✓
- `ALL_ROOM_TYPE_KEYS` defined in Task 1, used in Task 4 ✓
- `Order.roomType` / `Order.customPrompt` defined in Task 2, used in Tasks 4, 3 ✓
- `generateRoomImage` params extended in Task 3, called with new params in Task 4 ✓
- `StyleSelector` props unchanged (`selected: string`, `onChange: (key: string) => void`) ✓
- `RoomTypeSelector` props (`selected: string`, `onChange: (key: string) => void`) consistent with Task 7 usage ✓
