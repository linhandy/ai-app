import type { DesignMode } from './orders'

export interface Style {
  key: string
  label: string
  labelEn: string
  prompt: string      // Chinese — used for premium/ultra quality
  promptEn: string    // English — used for standard quality
  thumbnail: string   // path under /public, e.g. '/styles/thumbnails-sm/nordic_minimal.webp'
}

export interface StyleCategory {
  key: string
  label: string
  labelEn: string
  icon: string
  styles: Style[]
}

export interface RoomType {
  key: string
  label: string
  labelEn: string
  icon: string
  promptHint: string    // English room context appended to AI prompt
  promptHintCn: string  // Chinese room context appended to AI prompt
}

export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    key: 'minimalist',
    label: '简约系',
    labelEn: 'Minimalist',
    icon: '✨',
    styles: [
      {
        key: 'nordic_minimal',
        label: '北欧简约',
        labelEn: 'Scandinavian',
        prompt: '改造成北欧简约风格：白色墙面、浅木色家具、绿植点缀、自然光线、干净利落的线条，整体明亮通透',
        promptEn: 'Nordic minimal style: white walls, light wood furniture, plants, natural light, clean lines, bright and airy',
        thumbnail: '/styles/thumbnails-sm/nordic_minimal.webp',
      },
      {
        key: 'japanese_muji',
        label: '日式无印',
        labelEn: 'Japanese Muji',
        prompt: '改造成日式无印风格：原木色调、功能性设计、棉麻材质、禅意留白、整洁有序的极简空间',
        promptEn: 'Japanese Muji style: natural wood tones, functional design, cotton and linen materials, zen whitespace, clean minimal space',
        thumbnail: '/styles/thumbnails-sm/japanese_muji.webp',
      },
      {
        key: 'minimalism',
        label: '极简主义',
        labelEn: 'Minimalist',
        prompt: '改造成极简主义风格：绝对留白、单色系配色、隐藏收纳、无装饰面、只保留必要家具',
        promptEn: 'Minimalism style: absolute whitespace, monochromatic palette, hidden storage, decoration-free surfaces, only essential furniture',
        thumbnail: '/styles/thumbnails-sm/minimalism.webp',
      },
      {
        key: 'cream_style',
        label: '奶油风',
        labelEn: 'Cream Style',
        prompt: '改造成奶油风格：米白奶油色系、圆润造型、柔软织物、温暖灯光、治愈系氛围',
        promptEn: 'Cream style: milky white cream palette, rounded shapes, soft fabrics, warm lighting, cozy healing atmosphere',
        thumbnail: '/styles/thumbnails-sm/cream_style.webp',
      },
      {
        key: 'raw_wood',
        label: '原木风',
        labelEn: 'Natural Wood',
        prompt: '改造成原木风格：大量天然木材、木纹肌理、温暖米色调、植物绿意、自然材质',
        promptEn: 'Raw wood style: abundant natural wood, wood grain texture, warm beige tones, plant greenery, natural materials',
        thumbnail: '/styles/thumbnails-sm/raw_wood.webp',
      },
      {
        key: 'white_minimal',
        label: '白色极简',
        labelEn: 'White Minimalist',
        prompt: '改造成白色极简风格：全白色调、干净线条、玻璃与金属点缀、高度整洁、强调空间感',
        promptEn: 'White minimalist style: all-white palette, clean lines, glass and metal accents, highly tidy, emphasizing spaciousness',
        thumbnail: '/styles/thumbnails-sm/white_minimal.webp',
      },
    ],
  },
  {
    key: 'chinese',
    label: '中式系',
    labelEn: 'Oriental',
    icon: '🏮',
    styles: [
      {
        key: 'new_chinese',
        label: '新中式',
        labelEn: 'New Chinese',
        prompt: '改造成新中式风格：深色实木、格栅元素、水墨留白、禅意氛围、中国传统美学与现代设计融合',
        promptEn: 'New Chinese style: dark solid wood, lattice elements, ink wash aesthetic, zen atmosphere, Chinese tradition meets modern design',
        thumbnail: '/styles/thumbnails-sm/new_chinese.webp',
      },
      {
        key: 'zen_eastern',
        label: '禅意东方',
        labelEn: 'Zen Eastern',
        prompt: '改造成禅意东方风格：竹木材质、枯山水元素、低矮家具、蜡烛灯光、极简东方禅意美学',
        promptEn: 'Zen Eastern style: bamboo and wood materials, dry garden elements, low furniture, candlelight, minimal Eastern Zen aesthetic',
        thumbnail: '/styles/thumbnails-sm/zen_eastern.webp',
      },
      {
        key: 'chinese_classical',
        label: '中式古典',
        labelEn: 'Chinese Classical',
        prompt: '改造成中式古典风格：红木家具、花鸟屏风、青花瓷器摆件、宫灯元素、传统中国古典审美',
        promptEn: 'Chinese classical style: rosewood furniture, bird-flower screens, blue-white porcelain decor, palace lanterns, traditional Chinese classical aesthetic',
        thumbnail: '/styles/thumbnails-sm/chinese_classical.webp',
      },
      {
        key: 'chinese_luxury',
        label: '中国风轻奢',
        labelEn: 'Chinese Luxury',
        prompt: '改造成中国风轻奢风格：金色与朱砂红点缀、现代造型融合中式图案、丝绒面料、高级精致质感',
        promptEn: 'Chinese luxury style: gold and vermilion red accents, modern forms with Chinese patterns, velvet fabrics, premium refined feel',
        thumbnail: '/styles/thumbnails-sm/chinese_luxury.webp',
      },
    ],
  },
  {
    key: 'european',
    label: '欧式系',
    labelEn: 'European',
    icon: '🏛️',
    styles: [
      {
        key: 'french_romantic',
        label: '法式浪漫',
        labelEn: 'French Romantic',
        prompt: '改造成法式浪漫风格：雕花木线条、粉灰色调、丝绒软装、金色装饰细节、优雅浪漫氛围',
        promptEn: 'French romantic style: carved wood moldings, dusty rose and grey tones, velvet soft furnishings, gold decorative details, elegant romantic atmosphere',
        thumbnail: '/styles/thumbnails-sm/french_romantic.webp',
      },
      {
        key: 'italian_minimal',
        label: '意式极简',
        labelEn: 'Italian Minimal',
        prompt: '改造成意式极简风格：简洁几何造型、高质感材质、大理石台面、低调奢华、精工细节',
        promptEn: 'Italian minimalist style: clean geometric forms, high-quality materials, marble surfaces, understated luxury, fine craftsmanship details',
        thumbnail: '/styles/thumbnails-sm/italian_minimal.webp',
      },
      {
        key: 'mediterranean',
        label: '地中海',
        labelEn: 'Mediterranean',
        prompt: '改造成地中海风格：白色拱形墙、蓝色点缀、马赛克瓷砖、藤编家具、阳光海洋氛围',
        promptEn: 'Mediterranean style: white arched walls, blue accents, mosaic tiles, rattan furniture, sunny oceanic atmosphere',
        thumbnail: '/styles/thumbnails-sm/mediterranean.webp',
      },
      {
        key: 'english_countryside',
        label: '英式田园',
        labelEn: 'English Country',
        prompt: '改造成英式田园风格：碎花布艺、格子图案、实木家具、暖色调、舒适惬意的乡村气息',
        promptEn: 'English countryside style: floral fabric, plaid patterns, solid wood furniture, warm tones, comfortable cozy rural feel',
        thumbnail: '/styles/thumbnails-sm/english_countryside.webp',
      },
      {
        key: 'spanish_colonial',
        label: '西班牙殖民',
        labelEn: 'Spanish Colonial',
        prompt: '改造成西班牙殖民风格：手工瓷砖、拱形门廊、铁艺灯具、赭石暖色调、传统地中海殖民美学',
        promptEn: 'Spanish colonial style: handmade tiles, arched doorways, wrought iron lighting, ochre warm tones, traditional Mediterranean colonial aesthetic',
        thumbnail: '/styles/thumbnails-sm/spanish_colonial.webp',
      },
    ],
  },
  {
    key: 'modern',
    label: '现代系',
    labelEn: 'Modern',
    icon: '🏙️',
    styles: [
      {
        key: 'modern_luxury',
        label: '现代轻奢',
        labelEn: 'Modern Luxury',
        prompt: '改造成现代轻奢风格：大理石元素、金属质感、灰调配色、高级材质、精致软装，彰显品质感',
        promptEn: 'Modern luxury style: marble elements, metallic textures, grey tones, premium materials, refined decor, quality feel',
        thumbnail: '/styles/thumbnails-sm/modern_luxury.webp',
      },
      {
        key: 'modern_simple',
        label: '现代简约',
        labelEn: 'Modern Simple',
        prompt: '改造成现代简约风格：直线条设计、功能性家具、中性色调、开放空间、简洁实用',
        promptEn: 'Modern simple style: straight line design, functional furniture, neutral tones, open space, clean and practical',
        thumbnail: '/styles/thumbnails-sm/modern_simple.webp',
      },
      {
        key: 'urban_modern',
        label: '都市摩登',
        labelEn: 'Urban Modern',
        prompt: '改造成都市摩登风格：深色调基调、金属光泽、几何图案、艺术装置、时髦都市感',
        promptEn: 'Urban modern style: dark tone base, metallic sheen, geometric patterns, art installations, fashionable urban feel',
        thumbnail: '/styles/thumbnails-sm/urban_modern.webp',
      },
      {
        key: 'high_tech',
        label: '高科技风',
        labelEn: 'High-Tech',
        prompt: '改造成高科技风格：智能家居元素、LED灯带、金属与玻璃材质、极简科技感、未来智能家居',
        promptEn: 'High-tech style: smart home elements, LED light strips, metal and glass materials, minimal tech feel, futuristic smart home',
        thumbnail: '/styles/thumbnails-sm/high_tech.webp',
      },
      {
        key: 'futurism',
        label: '未来主义',
        labelEn: 'Futurism',
        prompt: '改造成未来主义风格：弧形流线造型、白色与银色主调、荧光点缀、太空舱美学、超现实未来感',
        promptEn: 'Futurism style: curved streamlined forms, white and silver dominant, fluorescent accents, space capsule aesthetic, surreal futuristic feel',
        thumbnail: '/styles/thumbnails-sm/futurism.webp',
      },
    ],
  },
  {
    key: 'retro',
    label: '复古系',
    labelEn: 'Retro',
    icon: '🎞️',
    styles: [
      {
        key: 'american_retro',
        label: '复古美式',
        labelEn: 'American Retro',
        prompt: '改造成复古美式风格：皮质沙发、粗犷木材、牛仔西部元素、复古灯泡、美国60-70年代家居风情',
        promptEn: 'American retro style: leather sofa, rough wood, cowboy western elements, vintage bulbs, American 60-70s home feel',
        thumbnail: '/styles/thumbnails-sm/american_retro.webp',
      },
      {
        key: 'mid_century',
        label: 'Mid-Century',
        labelEn: 'Mid-Century Modern',
        prompt: '改造成Mid-Century Modern风格：流线型家具、有机曲线、木腿家具、鲜艳色块点缀、1950-60年代现代主义',
        promptEn: 'Mid-Century Modern style: streamlined furniture, organic curves, tapered wood legs, vivid color accents, 1950-60s modernism',
        thumbnail: '/styles/thumbnails-sm/mid_century.webp',
      },
      {
        key: 'art_deco',
        label: 'Art Deco',
        labelEn: 'Art Deco',
        prompt: '改造成Art Deco风格：几何图案、金色装饰、对称设计、天鹅绒面料、1920-30年代装饰艺术风格',
        promptEn: 'Art Deco style: geometric patterns, gold ornaments, symmetrical design, velvet fabrics, 1920-30s decorative art style',
        thumbnail: '/styles/thumbnails-sm/art_deco.webp',
      },
      {
        key: 'bohemian',
        label: '波西米亚',
        labelEn: 'Bohemian',
        prompt: '改造成波西米亚风格：流苏、挂毯、编织地毯、多种图案混搭、植物绿意、自由随性的艺术气息',
        promptEn: 'Bohemian style: tassels, tapestries, woven rugs, mixed patterns, plant greenery, free artistic spirit',
        thumbnail: '/styles/thumbnails-sm/bohemian.webp',
      },
      {
        key: 'vintage',
        label: 'Vintage复古',
        labelEn: 'Vintage',
        prompt: '改造成Vintage复古风格：做旧家具、复古色调、古董摆件、蕾丝布艺、老照片装饰、岁月沉淀感',
        promptEn: 'Vintage style: distressed furniture, retro color palette, antique decor, lace fabrics, old photo decorations, sense of aged time',
        thumbnail: '/styles/thumbnails-sm/vintage.webp',
      },
    ],
  },
  {
    key: 'natural',
    label: '自然系',
    labelEn: 'Natural',
    icon: '🌿',
    styles: [
      {
        key: 'wabi_sabi',
        label: '侘寂风',
        labelEn: 'Wabi-Sabi',
        prompt: '改造成侘寂风格：自然肌理、不完美美感、素色调性、粗糙质感、极简留白，展现时间之美',
        promptEn: 'Wabi-sabi style: natural textures, beauty of imperfection, muted tones, rough textures, minimal whitespace, timeless beauty',
        thumbnail: '/styles/thumbnails-sm/wabi_sabi.webp',
      },
      {
        key: 'organic_modern',
        label: '有机现代',
        labelEn: 'Organic Modern',
        prompt: '改造成有机现代风格：曲线造型、天然材料、泥土色系、大量植物、自然与现代的完美融合',
        promptEn: 'Organic modern style: curved forms, natural materials, earthy tones, abundant plants, perfect blend of nature and modern',
        thumbnail: '/styles/thumbnails-sm/organic_modern.webp',
      },
      {
        key: 'tropical',
        label: '热带度假',
        labelEn: 'Tropical Resort',
        prompt: '改造成热带度假风格：棕榈叶图案、藤编家具、热带植物、白色与绿色基调、度假村放松氛围',
        promptEn: 'Tropical resort style: palm leaf patterns, rattan furniture, tropical plants, white and green base, resort relaxation atmosphere',
        thumbnail: '/styles/thumbnails-sm/tropical.webp',
      },
      {
        key: 'countryside',
        label: '乡村田园',
        labelEn: 'Countryside',
        prompt: '改造成乡村田园风格：碎花壁纸、实木橱柜、铸铁元素、绿色盆栽、温馨朴实的农家小屋感',
        promptEn: 'Countryside style: floral wallpaper, solid wood cabinets, cast iron elements, potted plants, warm rustic farmhouse feel',
        thumbnail: '/styles/thumbnails-sm/countryside.webp',
      },
      {
        key: 'log_cabin',
        label: '木屋风',
        labelEn: 'Log Cabin',
        prompt: '改造成木屋风格：原木吊顶、石材壁炉、格子毛毯、鹿角装饰、山间小屋的野性自然感',
        promptEn: 'Log cabin style: raw wood ceiling, stone fireplace, plaid blankets, antler decorations, wild natural mountain cabin feel',
        thumbnail: '/styles/thumbnails-sm/log_cabin.webp',
      },
    ],
  },
  {
    key: 'industrial',
    label: '工业系',
    labelEn: 'Industrial',
    icon: '🏭',
    styles: [
      {
        key: 'raw_industrial',
        label: '工业风',
        labelEn: 'Industrial',
        prompt: '改造成工业风格：裸露砖墙、铁艺管道、水泥灰色、皮质家具、做旧金属，粗犷有个性',
        promptEn: 'Industrial style: exposed brick walls, iron pipes, cement grey, leather furniture, distressed metal, rugged character',
        thumbnail: '/styles/thumbnails-sm/raw_industrial.webp',
      },
      {
        key: 'loft',
        label: 'Loft风',
        labelEn: 'Loft',
        prompt: '改造成Loft风格：挑高空间感、裸露混凝土、黑色铁框窗、开放式布局、工业美学与居住功能结合',
        promptEn: 'Loft style: high ceiling feel, exposed concrete, black iron frame windows, open layout, industrial aesthetic meets living function',
        thumbnail: '/styles/thumbnails-sm/loft.webp',
      },
      {
        key: 'steampunk',
        label: '蒸汽朋克',
        labelEn: 'Steampunk',
        prompt: '改造成蒸汽朋克风格：铜管装置、齿轮元素、维多利亚工业感、皮革与金属结合、蒸汽时代机械美学',
        promptEn: 'Steampunk style: copper pipe installations, gear elements, Victorian industrial feel, leather and metal combination, steam age mechanical aesthetic',
        thumbnail: '/styles/thumbnails-sm/steampunk.webp',
      },
      {
        key: 'warehouse',
        label: '仓库改造',
        labelEn: 'Warehouse Loft',
        prompt: '改造成仓库改造风格：大跨度钢结构、裸露管线、水泥地面、工业照明、将工业空间转化为现代居所',
        promptEn: 'Warehouse conversion style: large span steel structure, exposed pipes, concrete floor, industrial lighting, converting industrial space to modern residence',
        thumbnail: '/styles/thumbnails-sm/warehouse.webp',
      },
    ],
  },
  {
    key: 'creative',
    label: '创意系',
    labelEn: 'Creative',
    icon: '🎨',
    styles: [
      {
        key: 'memphis',
        label: '孟菲斯',
        labelEn: 'Memphis',
        prompt: '改造成孟菲斯风格：大胆几何图形、高饱和色彩碰撞、黑白条纹点缀、1980年代意大利设计运动美学',
        promptEn: 'Memphis style: bold geometric shapes, high-saturation color clashes, black and white stripe accents, 1980s Italian design movement aesthetic',
        thumbnail: '/styles/thumbnails-sm/memphis.webp',
      },
      {
        key: 'color_clash',
        label: '色彩碰撞',
        labelEn: 'Color Pop',
        prompt: '改造成色彩碰撞风格：多种鲜艳色彩混搭、撞色家具组合、彩色墙面、活泼大胆的视觉冲击',
        promptEn: 'Color clash style: multiple vivid color combinations, contrasting furniture mix, colorful walls, playful bold visual impact',
        thumbnail: '/styles/thumbnails-sm/color_clash.webp',
      },
      {
        key: 'cyberpunk',
        label: '赛博朋克',
        labelEn: 'Cyberpunk',
        prompt: '改造成赛博朋克风格：霓虹紫蓝光效、暗黑基调、科技感屏幕、金属感家具、未来都市夜景氛围',
        promptEn: 'Cyberpunk style: neon purple-blue lighting, dark base tone, tech screen elements, metallic furniture, futuristic urban night atmosphere',
        thumbnail: '/styles/thumbnails-sm/cyberpunk.webp',
      },
      {
        key: 'kids_playful',
        label: '童趣风',
        labelEn: 'Kids Playful',
        prompt: '改造成童趣风格：明亮原色、卡通图案、低矮圆润家具、玩具收纳、欢乐活泼的儿童乐园感',
        promptEn: "Kids playful style: bright primary colors, cartoon patterns, low rounded furniture, toy storage, joyful lively children's paradise feel",
        thumbnail: '/styles/thumbnails-sm/kids_playful.webp',
      },
      {
        key: 'moroccan',
        label: '摩洛哥风',
        labelEn: 'Moroccan',
        prompt: '改造成摩洛哥风格：阿拉伯几何图案、镂空灯具、暖橙色调、彩色瓷砖、北非异域风情',
        promptEn: 'Moroccan style: Arabic geometric patterns, lattice lanterns, warm orange tones, colorful tiles, North African exotic atmosphere',
        thumbnail: '/styles/thumbnails-sm/moroccan.webp',
      },
      {
        key: 'southeast_asian',
        label: '东南亚风',
        labelEn: 'Southeast Asian',
        prompt: '改造成东南亚风格：深色柚木家具、佛像摆件、热带植物、纱幔装饰、东南亚度假村禅意氛围',
        promptEn: 'Southeast Asian style: dark teak furniture, Buddha decorations, tropical plants, sheer curtains, Southeast Asian resort zen atmosphere',
        thumbnail: '/styles/thumbnails-sm/southeast_asian.webp',
      },
    ],
  },
]

export const ROOM_TYPES: RoomType[] = [
  // 居住空间
  { key: 'living_room',    label: '客厅',    labelEn: 'Living Room',     icon: '🛋️', promptHint: 'living room with sofa and seating area',         promptHintCn: '客厅，配有沙发和茶几区域' },
  { key: 'bedroom',        label: '卧室',    labelEn: 'Bedroom',         icon: '🛏️', promptHint: 'bedroom with bed and wardrobe',                  promptHintCn: '卧室，配有床铺和衣柜' },
  { key: 'kids_room',      label: '儿童房',  labelEn: "Kids' Room",      icon: '🧸', promptHint: "children's bedroom with playful elements",        promptHintCn: '儿童房，含玩耍和学习区域' },
  { key: 'study',          label: '书房',    labelEn: 'Home Office',     icon: '📚', promptHint: 'home office or study with desk and bookshelves',  promptHintCn: '书房，配有书桌和书架' },
  { key: 'dressing_room',  label: '衣帽间',  labelEn: 'Walk-in Closet',  icon: '👗', promptHint: 'walk-in closet with wardrobes and storage',       promptHintCn: '衣帽间，配有储衣柜和梳妆台' },
  // 功能空间
  { key: 'kitchen',        label: '厨房',    labelEn: 'Kitchen',         icon: '🍳', promptHint: 'kitchen with countertops and appliances',         promptHintCn: '厨房，配有操作台和厨具' },
  { key: 'dining_room',    label: '餐厅',    labelEn: 'Dining Room',     icon: '🍽️', promptHint: 'dining room with table and chairs',              promptHintCn: '餐厅，配有餐桌椅' },
  { key: 'bathroom',       label: '卫生间',  labelEn: 'Bathroom',        icon: '🛁', promptHint: 'bathroom with sink, toilet and shower',           promptHintCn: '卫生间，配有洗手台和淋浴' },
  { key: 'balcony',        label: '阳台',    labelEn: 'Balcony',         icon: '🌿', promptHint: 'balcony with plants and relaxing seating',        promptHintCn: '阳台，配有绿植和休闲座椅' },
  { key: 'laundry_room',   label: '洗衣房',  labelEn: 'Laundry Room',    icon: '🧺', promptHint: 'laundry room with washer and storage cabinets',   promptHintCn: '洗衣房，配有洗衣机和储物柜' },
  // 公共空间
  { key: 'entrance',       label: '玄关',    labelEn: 'Entryway',        icon: '🚪', promptHint: 'entrance foyer with shoe storage and coat hooks', promptHintCn: '玄关，配有鞋柜和换鞋凳' },
  { key: 'hallway',        label: '走廊',    labelEn: 'Hallway',         icon: '🏃', promptHint: 'corridor or hallway',                             promptHintCn: '走廊过道空间' },
  { key: 'staircase',      label: '楼梯间',  labelEn: 'Staircase',       icon: '🪜', promptHint: 'staircase area with railing',                    promptHintCn: '楼梯间区域' },
  { key: 'elevator_lobby', label: '电梯间',  labelEn: 'Elevator Lobby',  icon: '🔼', promptHint: 'elevator lobby area',                             promptHintCn: '电梯厅区域' },
  // 商业空间
  { key: 'office',         label: '办公室',  labelEn: 'Office',          icon: '💼', promptHint: 'office workspace with desks and meeting area',    promptHintCn: '办公室，配有工位和会议区' },
  { key: 'cafe',           label: '咖啡厅',  labelEn: 'Café',            icon: '☕', promptHint: 'cafe with counter and customer seating',          promptHintCn: '咖啡厅，配有吧台和座位区' },
  { key: 'restaurant',     label: '餐馆',    labelEn: 'Restaurant',      icon: '🍜', promptHint: 'restaurant dining area with tables',              promptHintCn: '餐馆用餐区，配有餐桌椅' },
  { key: 'hotel_room',     label: '酒店客房', labelEn: 'Hotel Room',     icon: '🏨', promptHint: 'hotel room with bed and amenities',              promptHintCn: '酒店客房，配有床铺和设施' },
  { key: 'retail_store',   label: '零售店',  labelEn: 'Retail Store',    icon: '🛍️', promptHint: 'retail shop with display shelves and counter',   promptHintCn: '零售店，配有展示架和收银台' },
  { key: 'gym',            label: '健身房',  labelEn: 'Gym',             icon: '🏋️', promptHint: 'gym with exercise equipment',                    promptHintCn: '健身房，配有健身器械' },
  // 室外空间
  { key: 'garden',     label: '花园',     labelEn: 'Garden',         icon: '🌳', promptHint: 'backyard garden with lawn and plants',           promptHintCn: '花园，有草坪和植物' },
  { key: 'patio',      label: '露台',     labelEn: 'Patio',          icon: '🪑', promptHint: 'patio or terrace outdoor seating area',          promptHintCn: '露台，户外休闲区' },
  { key: 'front_yard', label: '前院',     labelEn: 'Front Yard',     icon: '🏡', promptHint: 'front yard entrance garden',                     promptHintCn: '前院，入口花园' },
  { key: 'rooftop',    label: '屋顶花园', labelEn: 'Rooftop Garden',  icon: '🌇', promptHint: 'rooftop terrace garden with city view',          promptHintCn: '屋顶花园，城市景观' },
  { key: 'pool_area',  label: '泳池区',   labelEn: 'Pool Area',      icon: '🏊', promptHint: 'pool area with surrounding landscape',           promptHintCn: '泳池区，周边景观' },
]

export const DESIGN_MODES: { key: DesignMode; label: string; labelEn: string; icon: string; desc: string; descEn: string; needsStyle: boolean; needsUpload: boolean }[] = [
  { key: 'redesign',         label: '风格改造', labelEn: 'Style Redesign',   icon: '🎨', desc: '改变整体装修风格',   descEn: 'Change the overall interior style',  needsStyle: true,  needsUpload: true  },
  { key: 'virtual_staging',  label: '虚拟家装', labelEn: 'Virtual Staging',  icon: '🛋️', desc: '空房间添加全套家具', descEn: 'Furnish an empty room',              needsStyle: true,  needsUpload: true  },
  { key: 'add_furniture',    label: '添加家具', labelEn: 'Add Furniture',    icon: '🪑', desc: '现有房间增添家具',   descEn: 'Add furniture to existing room',     needsStyle: true,  needsUpload: true  },
  { key: 'paint_walls',      label: '墙面换色', labelEn: 'Paint Walls',      icon: '🖌️', desc: '改变墙面颜色材质',   descEn: 'Change wall color and material',     needsStyle: false, needsUpload: true  },
  { key: 'change_lighting',  label: '灯光优化', labelEn: 'Lighting Upgrade', icon: '💡', desc: '改善房间光照效果',   descEn: 'Improve room lighting',              needsStyle: false, needsUpload: true  },
  { key: 'sketch2render',    label: '草图生成', labelEn: 'Sketch to Render', icon: '✏️', desc: '草图变效果图',       descEn: 'Turn a sketch into a render',        needsStyle: true,  needsUpload: true  },
  { key: 'freestyle',        label: '自由生成', labelEn: 'AI Generate',      icon: '✨', desc: '无需上传照片',       descEn: 'Generate without a photo',           needsStyle: true,  needsUpload: false },
  { key: 'outdoor_redesign', label: '户外设计', labelEn: 'Outdoor Design',   icon: '🌿', desc: '庭院景观改造',       descEn: 'Redesign outdoor / garden space',    needsStyle: false, needsUpload: true  }, // fixed landscaping prompt — interior styles don't apply
  { key: 'style-match',      label: '风格参考', labelEn: 'Match a Style',   icon: '🖼️', desc: '参考图片的风格',    descEn: 'Copy style from a reference photo',  needsStyle: false, needsUpload: true  },
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
export const ALL_STYLE_KEYS: readonly string[] = STYLE_CATEGORIES.flatMap((cat) => cat.styles.map((s) => s.key))

/** Flat list of all valid room type keys — used for validation. */
export const ALL_ROOM_TYPE_KEYS: readonly string[] = ROOM_TYPES.map((r) => r.key)
