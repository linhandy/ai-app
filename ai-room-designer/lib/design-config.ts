import type { DesignMode } from './orders'

export interface Style {
  key: string
  label: string
  labelEn: string
  prompt: string      // Chinese — used for premium/ultra quality
  promptEn: string    // English — used for standard quality
  thumbnail: string   // path under /public, e.g. '/styles/thumbnails-sm/nordic_minimal.webp'
  seoDescription: string
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
  seoDescription: string
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
        seoDescription: 'Scandinavian interior design combines functionality with beauty through clean lines, natural light, and a muted palette of whites, grays, and light woods. This Nordic-inspired style transforms any room into a calm, clutter-free space that feels both modern and timeless. Perfect for those who love a bright, airy home without excess ornamentation.',
      },
      {
        key: 'japanese_muji',
        label: '日式无印',
        labelEn: 'Japanese Muji',
        prompt: '改造成日式无印风格：原木色调、功能性设计、棉麻材质、禅意留白、整洁有序的极简空间',
        promptEn: 'Japanese Muji style: natural wood tones, functional design, cotton and linen materials, zen whitespace, clean minimal space',
        thumbnail: '/styles/thumbnails-sm/japanese_muji.webp',
        seoDescription: 'Japanese Muji style is the art of refined simplicity — warm natural wood tones, functional design, and deliberate negative space create a sense of peaceful order. Every element serves a purpose, with cotton and linen textures adding warmth to the minimal forms. This style is ideal for creating a serene, mindful living space.',
      },
      {
        key: 'minimalism',
        label: '极简主义',
        labelEn: 'Minimalist',
        prompt: '改造成极简主义风格：绝对留白、单色系配色、隐藏收纳、无装饰面、只保留必要家具',
        promptEn: 'Minimalism style: absolute whitespace, monochromatic palette, hidden storage, decoration-free surfaces, only essential furniture',
        thumbnail: '/styles/thumbnails-sm/minimalism.webp',
        seoDescription: 'Pure minimalism strips a room down to its absolute essentials — monochromatic palettes, flawless surfaces, and hidden storage that eliminates visual clutter. The result is a space that feels expansive, calm, and almost meditative. Ideal for those who believe less is genuinely more.',
      },
      {
        key: 'cream_style',
        label: '奶油风',
        labelEn: 'Cream Style',
        prompt: '改造成奶油风格：米白奶油色系、圆润造型、柔软织物、温暖灯光、治愈系氛围',
        promptEn: 'Cream style: milky white cream palette, rounded shapes, soft fabrics, warm lighting, cozy healing atmosphere',
        thumbnail: '/styles/thumbnails-sm/cream_style.webp',
        seoDescription: 'The Cream Style embraces softness and comfort through milky white and beige tones, rounded furniture silhouettes, and plush textiles that invite relaxation. Warm lighting enhances the cozy, healing atmosphere that makes every room feel like a personal sanctuary. This trend has become a social media favorite for its soothing, photogenic quality.',
      },
      {
        key: 'raw_wood',
        label: '原木风',
        labelEn: 'Natural Wood',
        prompt: '改造成原木风格：大量天然木材、木纹肌理、温暖米色调、植物绿意、自然材质',
        promptEn: 'Raw wood style: abundant natural wood, wood grain texture, warm beige tones, plant greenery, natural materials',
        thumbnail: '/styles/thumbnails-sm/raw_wood.webp',
        seoDescription: 'Natural Wood style celebrates the warmth and character of real timber — wood grain textures, honey-toned finishes, and organic forms that bring the outdoors inside. Paired with warm neutrals and live plants, this style creates spaces that feel grounded and genuinely welcoming. It is a sustainable aesthetic that only improves with age.',
      },
      {
        key: 'white_minimal',
        label: '白色极简',
        labelEn: 'White Minimalist',
        prompt: '改造成白色极简风格：全白色调、干净线条、玻璃与金属点缀、高度整洁、强调空间感',
        promptEn: 'White minimalist style: all-white palette, clean lines, glass and metal accents, highly tidy, emphasizing spaciousness',
        thumbnail: '/styles/thumbnails-sm/white_minimal.webp',
        seoDescription: 'White Minimalist design maximizes the sense of space through an all-white palette, precise geometric lines, and strategic use of glass and polished metal. Every surface is immaculate, and every shadow becomes a design element. This style is particularly effective in smaller rooms, making them feel dramatically larger and more refined.',
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
        seoDescription: 'New Chinese style masterfully bridges classical Chinese aesthetics with contemporary living — dark lacquered wood, lattice screens, ink-wash color palettes, and traditional decorative motifs reinterpreted through a modern lens. The result is a sophisticated, culturally rich space that feels distinctly luxurious without being heavy or dated.',
      },
      {
        key: 'zen_eastern',
        label: '禅意东方',
        labelEn: 'Zen Eastern',
        prompt: '改造成禅意东方风格：竹木材质、枯山水元素、低矮家具、蜡烛灯光、极简东方禅意美学',
        promptEn: 'Zen Eastern style: bamboo and wood materials, dry garden elements, low furniture, candlelight, minimal Eastern Zen aesthetic',
        thumbnail: '/styles/thumbnails-sm/zen_eastern.webp',
        seoDescription: 'Zen Eastern design draws from the East Asian tradition of mindful simplicity — bamboo, natural stone, candlelight, and low-lying furniture create a contemplative atmosphere. The carefully composed negative space is as important as the objects within it. This style transforms a room into a true retreat from the noise of daily life.',
      },
      {
        key: 'chinese_classical',
        label: '中式古典',
        labelEn: 'Chinese Classical',
        prompt: '改造成中式古典风格：红木家具、花鸟屏风、青花瓷器摆件、宫灯元素、传统中国古典审美',
        promptEn: 'Chinese classical style: rosewood furniture, bird-flower screens, blue-white porcelain decor, palace lanterns, traditional Chinese classical aesthetic',
        thumbnail: '/styles/thumbnails-sm/chinese_classical.webp',
        seoDescription: 'Chinese Classical style is bold and ceremonial, featuring rosewood furniture with intricate carved details, hand-painted bird-and-flower screens, blue-and-white porcelain accents, and gold palace lanterns. It evokes the grandeur of China\'s imperial era in a deeply authentic way. Best suited for formal living rooms or dining spaces that celebrate heritage.',
      },
      {
        key: 'chinese_luxury',
        label: '中国风轻奢',
        labelEn: 'Chinese Luxury',
        prompt: '改造成中国风轻奢风格：金色与朱砂红点缀、现代造型融合中式图案、丝绒面料、高级精致质感',
        promptEn: 'Chinese luxury style: gold and vermilion red accents, modern forms with Chinese patterns, velvet fabrics, premium refined feel',
        thumbnail: '/styles/thumbnails-sm/chinese_luxury.webp',
        seoDescription: 'Chinese Luxury merges contemporary high-end design with distinctly Chinese decorative elements — gold accents, vermilion red highlights, silk and velvet upholstery, and modern silhouettes adorned with traditional Chinese patterns. The effect is opulent, globally sophisticated, and unmistakably Chinese in character.',
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
        seoDescription: 'French Romantic style envelopes a room in old-world elegance — ornate carved wood moldings, dusty rose and pale grey color palettes, velvet draperies, and gilded accessories that evoke Parisian boudoir sophistication. The atmosphere is deliberately soft, feminine, and poetically beautiful. Ideal for bedrooms, sitting rooms, or any space meant to feel like a retreat.',
      },
      {
        key: 'italian_minimal',
        label: '意式极简',
        labelEn: 'Italian Minimal',
        prompt: '改造成意式极简风格：简洁几何造型、高质感材质、大理石台面、低调奢华、精工细节',
        promptEn: 'Italian minimalist style: clean geometric forms, high-quality materials, marble surfaces, understated luxury, fine craftsmanship details',
        thumbnail: '/styles/thumbnails-sm/italian_minimal.webp',
        seoDescription: 'Italian Minimalism brings the quiet luxury of Milanese design to any room — clean geometric forms executed in flawless materials like marble, travertine, and fine leather. The restraint is what makes it feel so expensive: no superfluous detail, only considered choices made with impeccable taste. This style elevates everyday spaces to gallery-level refinement.',
      },
      {
        key: 'mediterranean',
        label: '地中海',
        labelEn: 'Mediterranean',
        prompt: '改造成地中海风格：白色拱形墙、蓝色点缀、马赛克瓷砖、藤编家具、阳光海洋氛围',
        promptEn: 'Mediterranean style: white arched walls, blue accents, mosaic tiles, rattan furniture, sunny oceanic atmosphere',
        thumbnail: '/styles/thumbnails-sm/mediterranean.webp',
        seoDescription: 'Mediterranean style captures the sun-drenched warmth of the Greek Isles and Southern Italy through whitewashed walls, arched doorways, vivid blue accents, handmade terracotta tiles, and natural rattan. The combination creates an effortlessly cheerful interior that feels like a perpetual summer holiday. Perfect for kitchens, bathrooms, and living areas.',
      },
      {
        key: 'english_countryside',
        label: '英式田园',
        labelEn: 'English Country',
        prompt: '改造成英式田园风格：碎花布艺、格子图案、实木家具、暖色调、舒适惬意的乡村气息',
        promptEn: 'English countryside style: floral fabric, plaid patterns, solid wood furniture, warm tones, comfortable cozy rural feel',
        thumbnail: '/styles/thumbnails-sm/english_countryside.webp',
        seoDescription: 'English Country style wraps a room in comforting familiarity — floral fabric patterns, plaid wool throws, solid antique-style furniture, aged brass hardware, and warm cream-and-rose tones. It feels like an interior that has accumulated character over generations, exuding a sense of cozy permanence and British charm.',
      },
      {
        key: 'spanish_colonial',
        label: '西班牙殖民',
        labelEn: 'Spanish Colonial',
        prompt: '改造成西班牙殖民风格：手工瓷砖、拱形门廊、铁艺灯具、赭石暖色调、传统地中海殖民美学',
        promptEn: 'Spanish colonial style: handmade tiles, arched doorways, wrought iron lighting, ochre warm tones, traditional Mediterranean colonial aesthetic',
        thumbnail: '/styles/thumbnails-sm/spanish_colonial.webp',
        seoDescription: 'Spanish Colonial style blends the architectural traditions of Spain with the warmth of the Americas — handcrafted ceramic tiles, arched colonnades, wrought iron light fixtures, and ochre-toned plaster walls create interiors of authentic craft and historic character. This style works beautifully in both traditional and transitional homes.',
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
        seoDescription: 'Modern Luxury elevates the contemporary home with premium materials — veined marble surfaces, brushed gold fixtures, deep neutral palettes in charcoal and greige, and tailored upholstery that signals effortless wealth. The restraint of the forms is offset by the extravagance of the materials, creating spaces that are as calm as they are impressive.',
      },
      {
        key: 'modern_simple',
        label: '现代简约',
        labelEn: 'Modern Simple',
        prompt: '改造成现代简约风格：直线条设计、功能性家具、中性色调、开放空间、简洁实用',
        promptEn: 'Modern simple style: straight line design, functional furniture, neutral tones, open space, clean and practical',
        thumbnail: '/styles/thumbnails-sm/modern_simple.webp',
        seoDescription: 'Modern Simple style is the everyday workhorse of interior design — clean horizontal lines, functional furniture with no ornamentation, open floor plans, and a neutral palette that never tires. It works in virtually any space and any budget, creating rooms that feel organized, livable, and quietly contemporary.',
      },
      {
        key: 'urban_modern',
        label: '都市摩登',
        labelEn: 'Urban Modern',
        prompt: '改造成都市摩登风格：深色调基调、金属光泽、几何图案、艺术装置、时髦都市感',
        promptEn: 'Urban modern style: dark tone base, metallic sheen, geometric patterns, art installations, fashionable urban feel',
        thumbnail: '/styles/thumbnails-sm/urban_modern.webp',
        seoDescription: 'Urban Modern design channels the energy of the city through dark base tones, metallic reflective surfaces, graphic geometric patterns, and statement art installations. It is a style for those who want their home to feel as dynamic and culturally engaged as the urban environments they inhabit. Bold, cinematic, and unmistakably metropolitan.',
      },
      {
        key: 'high_tech',
        label: '高科技风',
        labelEn: 'High-Tech',
        prompt: '改造成高科技风格：智能家居元素、LED灯带、金属与玻璃材质、极简科技感、未来智能家居',
        promptEn: 'High-tech style: smart home elements, LED light strips, metal and glass materials, minimal tech feel, futuristic smart home',
        thumbnail: '/styles/thumbnails-sm/high_tech.webp',
        seoDescription: 'High-Tech style embraces the smart home of the future with integrated LED ambient systems, glass and matte metal surfaces, and a spare aesthetic that puts the technology itself on display. The design feels like living inside a concept car — precise, forward-looking, and deeply satisfying for technology enthusiasts.',
      },
      {
        key: 'futurism',
        label: '未来主义',
        labelEn: 'Futurism',
        prompt: '改造成未来主义风格：弧形流线造型、白色与银色主调、荧光点缀、太空舱美学、超现实未来感',
        promptEn: 'Futurism style: curved streamlined forms, white and silver dominant, fluorescent accents, space capsule aesthetic, surreal futuristic feel',
        thumbnail: '/styles/thumbnails-sm/futurism.webp',
        seoDescription: 'Futurist interior design takes cues from science fiction in the best possible way — sweeping curved forms, a palette of white, silver, and fluorescent accents, and furniture that appears to float or defy gravity. This style creates rooms that feel genuinely ahead of their time, equal parts art installation and functional living space.',
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
        seoDescription: 'American Retro captures the warm nostalgia of mid-20th-century American living — distressed leather chesterfields, rough-hewn reclaimed wood, Edison bulb pendants, and rugged western or diner-inspired details that feel genuinely lived-in. This style has an unpretentious, masculine warmth that makes it enduringly popular in lofts and family rooms alike.',
      },
      {
        key: 'mid_century',
        label: 'Mid-Century',
        labelEn: 'Mid-Century Modern',
        prompt: '改造成Mid-Century Modern风格：流线型家具、有机曲线、木腿家具、鲜艳色块点缀、1950-60年代现代主义',
        promptEn: 'Mid-Century Modern style: streamlined furniture, organic curves, tapered wood legs, vivid color accents, 1950-60s modernism',
        thumbnail: '/styles/thumbnails-sm/mid_century.webp',
        seoDescription: 'Mid-Century Modern design remains one of history\'s most beloved styles — organic curves, tapered wood legs, vivid upholstery in teal or mustard, and a relaxed confidence that makes every room feel both retro and perpetually stylish. The style bridges the optimism of the 1950s with an enduring design sophistication that never goes out of fashion.',
      },
      {
        key: 'art_deco',
        label: 'Art Deco',
        labelEn: 'Art Deco',
        prompt: '改造成Art Deco风格：几何图案、金色装饰、对称设计、天鹅绒面料、1920-30年代装饰艺术风格',
        promptEn: 'Art Deco style: geometric patterns, gold ornaments, symmetrical design, velvet fabrics, 1920-30s decorative art style',
        thumbnail: '/styles/thumbnails-sm/art_deco.webp',
        seoDescription: 'Art Deco interiors bring the glamour of the 1920s to life through bold geometric patterns, gilded surfaces, mirrored furniture, rich jewel tones, and the deep indulgence of black lacquer and velvet. It is a theatrical style that commands attention and elevates any room into something genuinely spectacular.',
      },
      {
        key: 'bohemian',
        label: '波西米亚',
        labelEn: 'Bohemian',
        prompt: '改造成波西米亚风格：流苏、挂毯、编织地毯、多种图案混搭、植物绿意、自由随性的艺术气息',
        promptEn: 'Bohemian style: tassels, tapestries, woven rugs, mixed patterns, plant greenery, free artistic spirit',
        thumbnail: '/styles/thumbnails-sm/bohemian.webp',
        seoDescription: 'Bohemian style is the most personal of all interior aesthetics — layered textiles, macramé wall hangings, kilim rugs, trailing indoor plants, and an eclectic mix of global influences that reflect the unique character of the inhabitant. There are no strict rules, which is the point: every Bohemian room is one-of-a-kind.',
      },
      {
        key: 'vintage',
        label: 'Vintage复古',
        labelEn: 'Vintage',
        prompt: '改造成Vintage复古风格：做旧家具、复古色调、古董摆件、蕾丝布艺、老照片装饰、岁月沉淀感',
        promptEn: 'Vintage style: distressed furniture, retro color palette, antique decor, lace fabrics, old photo decorations, sense of aged time',
        thumbnail: '/styles/thumbnails-sm/vintage.webp',
        seoDescription: 'Vintage style finds beauty in the patina of age — distressed furniture with chalky paint finishes, antique mirrors, lace curtains, worn floorboards, and collections of old books and photographs that make a room feel layered with personal history. It is a deeply romantic aesthetic that values authenticity over perfection.',
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
        seoDescription: 'Wabi-Sabi is the Japanese philosophy of finding beauty in imperfection and transience — expressed through raw linen, aged ceramics, bare plaster walls, and irregular natural forms that carry the marks of time and use. This aesthetic creates spaces of extraordinary quiet and depth that are impossible to stage or fake.',
      },
      {
        key: 'organic_modern',
        label: '有机现代',
        labelEn: 'Organic Modern',
        prompt: '改造成有机现代风格：曲线造型、天然材料、泥土色系、大量植物、自然与现代的完美融合',
        promptEn: 'Organic modern style: curved forms, natural materials, earthy tones, abundant plants, perfect blend of nature and modern',
        thumbnail: '/styles/thumbnails-sm/organic_modern.webp',
        seoDescription: 'Organic Modern design fuses the clean lines of contemporary architecture with an abundance of natural materials — curved furniture silhouettes, terracotta and sand tones, handcrafted pottery, live-edge wood, and generous plant life that blurs the boundary between interior and exterior. It is both sophisticated and deeply human.',
      },
      {
        key: 'tropical',
        label: '热带度假',
        labelEn: 'Tropical Resort',
        prompt: '改造成热带度假风格：棕榈叶图案、藤编家具、热带植物、白色与绿色基调、度假村放松氛围',
        promptEn: 'Tropical resort style: palm leaf patterns, rattan furniture, tropical plants, white and green base, resort relaxation atmosphere',
        thumbnail: '/styles/thumbnails-sm/tropical.webp',
        seoDescription: 'Tropical Resort style transforms any room into an escape — palm leaf motifs, natural rattan and cane furniture, crisp white linen, lush indoor plants, and a palette of seafoam, coral, and sun-bleached neutrals. This style is especially transformative in warm climates where it feels native rather than decorative.',
      },
      {
        key: 'countryside',
        label: '乡村田园',
        labelEn: 'Countryside',
        prompt: '改造成乡村田园风格：碎花壁纸、实木橱柜、铸铁元素、绿色盆栽、温馨朴实的农家小屋感',
        promptEn: 'Countryside style: floral wallpaper, solid wood cabinets, cast iron elements, potted plants, warm rustic farmhouse feel',
        thumbnail: '/styles/thumbnails-sm/countryside.webp',
        seoDescription: 'Countryside style celebrates the honest simplicity of rural living — floral wallpapers, scrubbed wooden floors, open farmhouse kitchens with butcher block countertops, cast-iron elements, and garden flowers in earthenware jugs. This aesthetic has universal warmth and the rare quality of making guests feel instantly at home.',
      },
      {
        key: 'log_cabin',
        label: '木屋风',
        labelEn: 'Log Cabin',
        prompt: '改造成木屋风格：原木吊顶、石材壁炉、格子毛毯、鹿角装饰、山间小屋的野性自然感',
        promptEn: 'Log cabin style: raw wood ceiling, stone fireplace, plaid blankets, antler decorations, wild natural mountain cabin feel',
        thumbnail: '/styles/thumbnails-sm/log_cabin.webp',
        seoDescription: 'Log Cabin style captures the drama of mountain wilderness — exposed timber ceilings, rough-cut stone fireplaces, hunting-lodge artifacts, plaid wool blankets, and a warm palette of brown, rust, and forest green. This style transforms an interior into a cozy winter refuge, filled with the romance of remote wilderness and crackling fires.',
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
        seoDescription: 'Industrial style transforms raw architecture into aesthetic character — exposed brick walls, unfinished concrete floors, iron pipe shelving, distressed leather seating, and salvaged wood all contribute to a rugged visual language that celebrates structure over decoration. Particularly powerful in converted urban spaces.',
      },
      {
        key: 'loft',
        label: 'Loft风',
        labelEn: 'Loft',
        prompt: '改造成Loft风格：挑高空间感、裸露混凝土、黑色铁框窗、开放式布局、工业美学与居住功能结合',
        promptEn: 'Loft style: high ceiling feel, exposed concrete, black iron frame windows, open layout, industrial aesthetic meets living function',
        thumbnail: '/styles/thumbnails-sm/loft.webp',
        seoDescription: 'Loft style celebrates the grandeur of repurposed industrial space — soaring ceilings, vast open floors, black steel window frames, exposed mechanical systems, and a layout that refuses conventional room division. The tension between raw industrial bones and comfortable modern furnishings is what makes this style so compelling.',
      },
      {
        key: 'steampunk',
        label: '蒸汽朋克',
        labelEn: 'Steampunk',
        prompt: '改造成蒸汽朋克风格：铜管装置、齿轮元素、维多利亚工业感、皮革与金属结合、蒸汽时代机械美学',
        promptEn: 'Steampunk style: copper pipe installations, gear elements, Victorian industrial feel, leather and metal combination, steam age mechanical aesthetic',
        thumbnail: '/styles/thumbnails-sm/steampunk.webp',
        seoDescription: 'Steampunk interior design is Victorian engineering as fantasy art — ornate copper pipe installations, brass gear mechanisms, riveted leather, dirigible-inspired lighting fixtures, and a sepia-tinted palette of mahogany, copper, and aged brass. It is one of the most imaginative interior styles, rewarding detail exploration at every turn.',
      },
      {
        key: 'warehouse',
        label: '仓库改造',
        labelEn: 'Warehouse Loft',
        prompt: '改造成仓库改造风格：大跨度钢结构、裸露管线、水泥地面、工业照明、将工业空间转化为现代居所',
        promptEn: 'Warehouse conversion style: large span steel structure, exposed pipes, concrete floor, industrial lighting, converting industrial space to modern residence',
        thumbnail: '/styles/thumbnails-sm/warehouse.webp',
        seoDescription: 'Warehouse conversion style takes the scale and honesty of industrial architecture as a design asset — steel trusses, poured concrete floors, exposed ducting, industrial pendant lighting, and large factory windows create a backdrop of impressive authenticity against which contemporary furniture reads as boldly curated.',
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
        seoDescription: 'Memphis design is the graphic art movement of the 1980s applied to interiors — jagged zigzag patterns, high-contrast polychromatic combinations, quirky asymmetric furniture, and a complete rejection of conventional good taste. It is deliberately challenging, joyfully absurd, and impossible to ignore.',
      },
      {
        key: 'color_clash',
        label: '色彩碰撞',
        labelEn: 'Color Pop',
        prompt: '改造成色彩碰撞风格：多种鲜艳色彩混搭、撞色家具组合、彩色墙面、活泼大胆的视觉冲击',
        promptEn: 'Color clash style: multiple vivid color combinations, contrasting furniture mix, colorful walls, playful bold visual impact',
        thumbnail: '/styles/thumbnails-sm/color_clash.webp',
        seoDescription: 'Color Clash design throws conventional color theory out the window — saturated primary and secondary colors are combined in deliberate opposition, creating interiors of explosive visual energy. When done well, the result transcends decoration to become genuinely electrifying modern art.',
      },
      {
        key: 'cyberpunk',
        label: '赛博朋克',
        labelEn: 'Cyberpunk',
        prompt: '改造成赛博朋克风格：霓虹紫蓝光效、暗黑基调、科技感屏幕、金属感家具、未来都市夜景氛围',
        promptEn: 'Cyberpunk style: neon purple-blue lighting, dark base tone, tech screen elements, metallic furniture, futuristic urban night atmosphere',
        thumbnail: '/styles/thumbnails-sm/cyberpunk.webp',
        seoDescription: 'Cyberpunk interior design imagines the domestic life of a high-tech dystopian future — neon blue and purple lighting against dark charcoal walls, glowing LED strip accents, matte black metallic surfaces, and technology as decorative element rather than concealed utility. Dramatic, immersive, and unlike anything else.',
      },
      {
        key: 'kids_playful',
        label: '童趣风',
        labelEn: 'Kids Playful',
        prompt: '改造成童趣风格：明亮原色、卡通图案、低矮圆润家具、玩具收纳、欢乐活泼的儿童乐园感',
        promptEn: "Kids playful style: bright primary colors, cartoon patterns, low rounded furniture, toy storage, joyful lively children's paradise feel",
        thumbnail: '/styles/thumbnails-sm/kids_playful.webp',
        seoDescription: 'Kids Playful style creates the ideal environment for a child\'s imagination — primary colors in vivid finishes, low rounded furniture designed for small bodies, themed wall murals, accessible toy storage, and safety-conscious construction that parents can relax around. This style balances stimulation for children with livability for adults.',
      },
      {
        key: 'moroccan',
        label: '摩洛哥风',
        labelEn: 'Moroccan',
        prompt: '改造成摩洛哥风格：阿拉伯几何图案、镂空灯具、暖橙色调、彩色瓷砖、北非异域风情',
        promptEn: 'Moroccan style: Arabic geometric patterns, lattice lanterns, warm orange tones, colorful tiles, North African exotic atmosphere',
        thumbnail: '/styles/thumbnails-sm/moroccan.webp',
        seoDescription: 'Moroccan interior design is one of the world\'s great decorative traditions — intricate geometric tilework in vivid turquoise, saffron, and terracotta; latticed lanterns that cast star-shaped shadows; low-lying cushioned seating; and hand-woven rugs that bring centuries of North African craft into contemporary homes.',
      },
      {
        key: 'southeast_asian',
        label: '东南亚风',
        labelEn: 'Southeast Asian',
        prompt: '改造成东南亚风格：深色柚木家具、佛像摆件、热带植物、纱幔装饰、东南亚度假村禅意氛围',
        promptEn: 'Southeast Asian style: dark teak furniture, Buddha decorations, tropical plants, sheer curtains, Southeast Asian resort zen atmosphere',
        thumbnail: '/styles/thumbnails-sm/southeast_asian.webp',
        seoDescription: 'Southeast Asian style creates resort-like serenity in any interior — dark teak furniture with carved details, recumbent Buddha statues, diaphanous white linen drapes, tropical plants in hand-thrown pots, and candlelight that evokes the spa-like atmosphere of Balinese and Thai luxury hotels.',
      },
    ],
  },
]

export const ROOM_TYPES: RoomType[] = [
  // 居住空间
  {
    key: 'living_room', label: '客厅', labelEn: 'Living Room', icon: '🛋️',
    promptHint: 'living room with sofa and seating area',
    promptHintCn: '客厅，配有沙发和茶几区域',
    seoDescription: 'The living room is the heart of any home — the space for gathering, relaxing, and expressing personal style. AI Room Designer can transform your living room in any of 40+ aesthetic directions, from dramatic contemporary overhauls to gentle style refreshes, all from a single photo upload.',
  },
  {
    key: 'bedroom', label: '卧室', labelEn: 'Bedroom', icon: '🛏️',
    promptHint: 'bedroom with bed and wardrobe',
    promptHintCn: '卧室，配有床铺和衣柜',
    seoDescription: 'The bedroom is your most personal space — its design profoundly affects sleep quality and daily mood. Whether you want a serene sanctuary, a glamorous boudoir, or a cozy cocoon, AI Room Designer generates a photorealistic preview of your new bedroom in under 30 seconds.',
  },
  {
    key: 'kids_room', label: '儿童房', labelEn: "Kids' Room", icon: '🧸',
    promptHint: "children's bedroom with playful elements",
    promptHintCn: '儿童房，含玩耍和学习区域',
    seoDescription: 'A child\'s bedroom should grow with them — stimulating enough for play, calming enough for sleep, and easy for parents to maintain. AI Room Designer helps you visualize everything from jungle-themed adventure rooms to cozy minimalist retreats tailored perfectly for children.',
  },
  {
    key: 'study', label: '书房', labelEn: 'Home Office', icon: '📚',
    promptHint: 'home office or study with desk and bookshelves',
    promptHintCn: '书房，配有书桌和书架',
    seoDescription: 'The home office or study has become one of the most important rooms in any home. AI Room Designer helps you visualize a workspace that is both functional and inspiring — from sleek executive setups to cozy scholar\'s dens stacked with books and character.',
  },
  {
    key: 'dressing_room', label: '衣帽间', labelEn: 'Walk-in Closet', icon: '👗',
    promptHint: 'walk-in closet with wardrobes and storage',
    promptHintCn: '衣帽间，配有储衣柜和梳妆台',
    seoDescription: 'A well-designed walk-in closet turns getting dressed into a luxury ritual. AI Room Designer visualizes your ideal wardrobe space — from boutique-inspired glam to clean-lined minimalist organization systems — so you can plan with confidence before committing.',
  },
  // 功能空间
  {
    key: 'kitchen', label: '厨房', labelEn: 'Kitchen', icon: '🍳',
    promptHint: 'kitchen with countertops and appliances',
    promptHintCn: '厨房，配有操作台和厨具',
    seoDescription: 'The kitchen is where design and function must coexist perfectly. AI Room Designer helps you visualize everything from Shaker farmhouse kitchens to sleek all-matte-black contemporary designs, letting you explore major decisions before any cabinets are ordered.',
  },
  {
    key: 'dining_room', label: '餐厅', labelEn: 'Dining Room', icon: '🍽️',
    promptHint: 'dining room with table and chairs',
    promptHintCn: '餐厅，配有餐桌椅',
    seoDescription: 'The dining room sets the tone for how you gather and entertain. AI Room Designer helps you envision your ideal dining space — whether a dramatic statement room with a sculptural chandelier or a warm, intimate space for everyday family meals.',
  },
  {
    key: 'bathroom', label: '卫生间', labelEn: 'Bathroom', icon: '🛁',
    promptHint: 'bathroom with sink, toilet and shower',
    promptHintCn: '卫生间，配有洗手台和淋浴',
    seoDescription: 'The bathroom is one of the highest-impact rooms for design investment. AI Room Designer helps you visualize transformations from dated tile and fixtures to stunning spa-like retreats with marble, rainfall showers, and artisan craftsmanship.',
  },
  {
    key: 'balcony', label: '阳台', labelEn: 'Balcony', icon: '🌿',
    promptHint: 'balcony with plants and relaxing seating',
    promptHintCn: '阳台，配有绿植和休闲座椅',
    seoDescription: 'Even a small balcony can become a treasured outdoor room with the right design. AI Room Designer helps you visualize your balcony transformed into an urban garden, a serene meditation space, or a stylish alfresco dining area.',
  },
  {
    key: 'laundry_room', label: '洗衣房', labelEn: 'Laundry Room', icon: '🧺',
    promptHint: 'laundry room with washer and storage cabinets',
    promptHintCn: '洗衣房，配有洗衣机和储物柜',
    seoDescription: 'The laundry room does not have to be purely utilitarian. AI Room Designer shows how smart storage, quality cabinetry, and thoughtful finishes can transform this overlooked room into a space that is actually pleasant to spend time in.',
  },
  // 公共空间
  {
    key: 'entrance', label: '玄关', labelEn: 'Entryway', icon: '🚪',
    promptHint: 'entrance foyer with shoe storage and coat hooks',
    promptHintCn: '玄关，配有鞋柜和换鞋凳',
    seoDescription: 'The entryway sets the first impression of your entire home. AI Room Designer helps you design an entry that is both functional — with smart shoe and coat storage — and stylistically welcoming, establishing the character of your home from the moment guests arrive.',
  },
  {
    key: 'hallway', label: '走廊', labelEn: 'Hallway', icon: '🏃',
    promptHint: 'corridor or hallway',
    promptHintCn: '走廊过道空间',
    seoDescription: 'Hallways and corridors are often neglected, but they represent significant square footage. AI Room Designer shows how thoughtful lighting, gallery walls, and strategic furniture can transform a functional passage into a design feature.',
  },
  {
    key: 'staircase', label: '楼梯间', labelEn: 'Staircase', icon: '🪜',
    promptHint: 'staircase area with railing',
    promptHintCn: '楼梯间区域',
    seoDescription: 'A staircase is an architectural opportunity that many homes underutilize. AI Room Designer visualizes how different baluster designs, handrail materials, stair treads, and lighting strategies can transform your staircase into a genuine showpiece.',
  },
  {
    key: 'elevator_lobby', label: '电梯间', labelEn: 'Elevator Lobby', icon: '🔼',
    promptHint: 'elevator lobby area',
    promptHintCn: '电梯厅区域',
    seoDescription: 'Building common areas and elevator lobbies set the tone for any multi-unit property. AI Room Designer helps property managers and developers visualize lobby upgrades that maximize perceived value and resident satisfaction.',
  },
  // 商业空间
  {
    key: 'office', label: '办公室', labelEn: 'Office', icon: '💼',
    promptHint: 'office workspace with desks and meeting area',
    promptHintCn: '办公室，配有工位和会议区',
    seoDescription: 'A commercial office environment profoundly affects productivity, creativity, and talent retention. AI Room Designer helps teams and managers visualize new workplace configurations — from collaborative open plans to private executive offices — before committing to expensive renovations.',
  },
  {
    key: 'cafe', label: '咖啡厅', labelEn: 'Café', icon: '☕',
    promptHint: 'cafe with counter and customer seating',
    promptHintCn: '咖啡厅，配有吧台和座位区',
    seoDescription: 'Café design is a critical success factor in the competitive hospitality market. AI Room Designer lets café owners rapidly visualize different aesthetic directions — from Scandinavian minimalism to retro American diners — helping identify the concept that will resonate with their target customers.',
  },
  {
    key: 'restaurant', label: '餐馆', labelEn: 'Restaurant', icon: '🍜',
    promptHint: 'restaurant dining area with tables',
    promptHintCn: '餐馆用餐区，配有餐桌椅',
    seoDescription: 'Restaurant interior design directly influences dining experience, table turnover, and brand perception. AI Room Designer gives restaurateurs a rapid visualization tool for testing different atmospheres before major capital investment in refurbishment.',
  },
  {
    key: 'hotel_room', label: '酒店客房', labelEn: 'Hotel Room', icon: '🏨',
    promptHint: 'hotel room with bed and amenities',
    promptHintCn: '酒店客房，配有床铺和设施',
    seoDescription: 'Hotel room design determines guest ratings, repeat bookings, and brand positioning. AI Room Designer gives hoteliers a fast and affordable way to visualize room renovation concepts across multiple style directions before committing to specification and procurement.',
  },
  {
    key: 'retail_store', label: '零售店', labelEn: 'Retail Store', icon: '🛍️',
    promptHint: 'retail shop with display shelves and counter',
    promptHintCn: '零售店，配有展示架和收银台',
    seoDescription: 'Retail environment design influences dwell time, purchase behavior, and brand perception. AI Room Designer helps store designers and retailers rapidly visualize merchandising layouts and aesthetic concepts before committing to fixtures and fit-out.',
  },
  {
    key: 'gym', label: '健身房', labelEn: 'Gym', icon: '🏋️',
    promptHint: 'gym with exercise equipment',
    promptHintCn: '健身房，配有健身器械',
    seoDescription: 'The gym or home workout space needs to balance practical function with motivational energy. AI Room Designer helps you visualize everything from professional-grade home gym setups to stylish boutique fitness studio concepts.',
  },
  // 室外空间
  {
    key: 'garden', label: '花园', labelEn: 'Garden', icon: '🌳',
    promptHint: 'backyard garden with lawn and plants',
    promptHintCn: '花园，有草坪和植物',
    seoDescription: 'Garden and outdoor space design can dramatically extend a home\'s usable living area and increase property value. AI Room Designer helps homeowners and designers visualize landscape concepts, outdoor furniture arrangements, and hardscaping ideas.',
  },
  {
    key: 'patio', label: '露台', labelEn: 'Patio', icon: '🪑',
    promptHint: 'patio or terrace outdoor seating area',
    promptHintCn: '露台，户外休闲区',
    seoDescription: 'A patio or terrace is an investment in outdoor living — a space that extends the home into the open air. AI Room Designer helps visualize different outdoor furniture arrangements, surface finishes, and planting schemes so you can plan with confidence.',
  },
  {
    key: 'front_yard', label: '前院', labelEn: 'Front Yard', icon: '🏡',
    promptHint: 'front yard entrance garden',
    promptHintCn: '前院，入口花园',
    seoDescription: 'The front yard creates the first impression of any property. AI Room Designer helps homeowners visualize curb appeal improvements — from classic formal gardens to contemporary landscaping with geometric planting and clean hardscaping.',
  },
  {
    key: 'rooftop', label: '屋顶花园', labelEn: 'Rooftop Garden', icon: '🌇',
    promptHint: 'rooftop terrace garden with city view',
    promptHintCn: '屋顶花园，城市景观',
    seoDescription: 'Rooftop spaces are some of urban living\'s most coveted amenities. AI Room Designer helps visualize rooftop garden and entertaining space concepts — from minimal seating terraces with city views to lush planted roof gardens and outdoor kitchen setups.',
  },
  {
    key: 'pool_area', label: '泳池区', labelEn: 'Pool Area', icon: '🏊',
    promptHint: 'pool area with surrounding landscape',
    promptHintCn: '泳池区，周边景观',
    seoDescription: 'Pool and outdoor living area design is one of the highest-value additions to any residential property. AI Room Designer helps visualize pool surrounds, outdoor furniture groupings, shade structures, and planting schemes that maximize both beauty and function.',
  },
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
  { key: 'inpaint',          label: '局部修改', labelEn: 'Inpaint',          icon: '🎯', desc: '涂抹区域局部替换',  descEn: 'Paint an area — AI replaces only that part', needsStyle: false, needsUpload: true  },
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
