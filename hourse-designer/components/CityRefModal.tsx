'use client';

import { useState } from 'react';
import type { Orientation } from '@/lib/types';

interface TownRef {
  region: string;
  province: string;
  typical: string;
  landW: number;
  landH: number;
  floors: number;
  orientation: Orientation;
  notes: string[];
}

const TOWN_REFS: TownRef[] = [
  {
    region: '豫中平原', province: '河南', typical: '两层砖混 · 堂屋+四卧', landW: 12, landH: 10, floors: 2, orientation: '南',
    notes: [
      '堂屋必备，面积≥20m²，居中朝南，用于祭祖待客红白喜事',
      '宅基地限制134m²，控制建筑占地面积',
      '北方冬季保温，南向采光面积≥外墙25%',
      '厨房独立，农村多保留柴火灶，面积≥10m²',
      '院落朝南，深度4-6m，用于晒粮、停放农机',
    ],
  },
  {
    region: '川西坝子', province: '四川', typical: '两层穿斗 · 院落格局', landW: 13, landH: 11, floors: 2, orientation: '南',
    notes: [
      '多雨潮湿，屋顶坡度≥30°，挑檐深≥1m防雨水',
      '堂屋与灶房相邻，厨房面积≥12m²，通风排烟重要',
      '底层留农具间或猪圈位置（若需要）',
      '四川宅基地限120m²，建筑面积不超标',
      '院坝（晒台）朝南，面积≥30m²',
    ],
  },
  {
    region: '湘中丘陵', province: '湖南', typical: '两层砖木 · 天井院落', landW: 11, landH: 12, floors: 2, orientation: '南',
    notes: [
      '天井或小院落必备，改善通风采光（湖南夏季闷热）',
      '堂屋居中，两侧对称布卧室（传统对称格局）',
      '厨房分开布置，设独立灶房，避免油烟入室',
      '二楼可设晒台，晾晒腊肉腌菜',
      '宅基地限130m²，3层以内',
    ],
  },
  {
    region: '粤北农村', province: '广东', typical: '三至四层村屋 · 骑楼', landW: 8, landH: 14, floors: 3, orientation: '南',
    notes: [
      '广东允许4层，进深大于宽，南北通透降温',
      '底层可做商铺或车库，二层以上居住',
      '每层需设对流窗，对角通风是核心',
      '屋顶做隔热露台，铺设隔热砖',
      '宅基地限150m²，造价约2200元/m²',
    ],
  },
  {
    region: '苏北农村', province: '江苏', typical: '两层砖混 · 独栋', landW: 12, landH: 10, floors: 2, orientation: '南',
    notes: [
      '苏北宅基地限120m²，布局紧凑高效',
      '客厅朝南，面积≥20m²，北方习惯较大客厅',
      '卧室朝南，主卧≥15m²',
      '卫生间靠北侧，管道集中布置',
      '院落或停车场朝南，南向大门',
    ],
  },
  {
    region: '鄂西山区', province: '湖北', typical: '两层山地建筑', landW: 10, landH: 10, floors: 2, orientation: '南',
    notes: [
      '地形起伏，底层可利用地形做半地下储藏',
      '堂屋（正屋）是生活中心，面积≥18m²',
      '山区通风好，窗户朝多方向开设',
      '宅基地限120m²，人均耕地不足1亩地区限80m²',
      '坡屋顶，前低后高，利于排水采光',
    ],
  },
  {
    region: '皖南徽派', province: '安徽', typical: '两层徽派 · 天井', landW: 12, landH: 11, floors: 2, orientation: '南',
    notes: [
      '天井是徽派必备，采光通风核心，面积约6-9m²',
      '马头墙、白墙黛瓦的徽派外观可融入设计',
      '堂屋居中，天井居前，厢房左右对称',
      '二楼回廊围绕天井，内向式布局',
      '宅基地限130m²',
    ],
  },
  {
    region: '陕关中', province: '陕西', typical: '两层关中民居 · 窄院', landW: 8, landH: 16, floors: 2, orientation: '南',
    notes: [
      '关中传统"窄院"：东西窄（6-9m）、南北深（15-20m）',
      '堂屋居中朝南，北侧布置储藏/厕所',
      '冬季保温优先，墙厚≥37cm，南向大窗采光',
      '院落朝南，深度5-8m，与正房形成轴线',
      '宅基地限134m²，严格遵守',
    ],
  },
  {
    region: '黑龙江农村', province: '黑龙江', typical: '单层大瓦房 · 东北炕', landW: 14, landH: 12, floors: 1, orientation: '南',
    notes: [
      '东北以单层平房为主，宅基地达250m²',
      '南向大窗，窗台高≤0.6m，最大化冬季采光',
      '火炕间（卧室+炕）是东北核心，面积≥20m²',
      '门斗/玄关必备，防冬季冷风直入',
      '车库/仓房必须有，储存农具粮食，面积≥30m²',
    ],
  },
  {
    region: '云南坝区', province: '云南', typical: '两层土木 · 一颗印', landW: 12, landH: 12, floors: 2, orientation: '南',
    notes: [
      '"一颗印"格局：三间两耳，正房居中，耳房两侧，四合小院',
      '正房（堂屋）面积≥22m²，位置最佳',
      '云南冬暖夏凉，通风比保温更重要',
      '宅基地限150m²，坝区地广，可适当放宽',
      '坡屋顶，木结构或砖木混合',
    ],
  },
];

interface Props {
  onApply: (ref: { landW: number; landH: number; orientation: Orientation; floors: number }) => void;
  onClose: () => void;
}

export default function CityRefModal({ onApply, onClose }: Props) {
  const [selected, setSelected] = useState<TownRef | null>(null);
  const [search, setSearch] = useState('');

  const filtered = TOWN_REFS.filter(c =>
    c.region.includes(search) || c.province.includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        style={{ background: 'var(--surface)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>农村地区户型参考</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              基于各地农村建设习惯和宅基地规定推荐参数
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>×</button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <input
            type="text" placeholder="搜索地区或省份（如：河南、四川）" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Region list */}
          <div className="w-44 shrink-0 overflow-y-auto p-3 flex flex-col gap-1"
            style={{ borderRight: '1px solid var(--border)' }}>
            {filtered.map(c => (
              <button key={c.region} onClick={() => setSelected(c)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={selected?.region === c.region
                  ? { background: 'var(--accent)', color: 'white' }
                  : { color: 'var(--text-1)' }}
                onMouseEnter={e => { if (selected?.region !== c.region) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (selected?.region !== c.region) e.currentTarget.style.background = 'transparent'; }}>
                <div className="font-semibold text-xs">{c.region}</div>
                <div className="text-xs opacity-70">{c.province} · {c.typical}</div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {selected ? (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-1)' }}>
                    {selected.region} 典型农村自建房
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {selected.province} · {selected.typical}
                  </span>
                </div>

                {/* Params grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['推荐地块', `${selected.landW} × ${selected.landH} m`],
                    ['大门朝向', `朝${selected.orientation}`],
                    ['楼层数', `${selected.floors} 层`],
                    ['占地面积', `约 ${selected.landW * selected.landH} m²`],
                  ].map(([l, v]) => (
                    <div key={l} className="p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{l}</div>
                      <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-1)' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Design notes */}
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>当地农村建设要点</div>
                  <ul className="flex flex-col gap-2">
                    {selected.notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-relaxed"
                        style={{ color: 'var(--text-2)' }}>
                        <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                          {i + 1}
                        </span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Apply button */}
                <button onClick={() => { onApply(selected); onClose(); }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--accent)', color: 'white' }}>
                  应用 {selected.region} 参考参数
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="text-4xl">🏡</div>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>选择左侧地区查看参考参数</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
