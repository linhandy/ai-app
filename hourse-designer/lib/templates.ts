import type { FloorSpec, GlobalSpec } from './types';

export interface DesignTemplate {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tag: string;
  tagColor: string;
  numFloors: number;
  landWidth: number;
  landHeight: number;
  orientation: '南' | '北' | '东' | '西' | '东南' | '东北' | '西南' | '西北';
  floors: FloorSpec[];
  globalSpec: Partial<GlobalSpec>;
}

export const TEMPLATES: DesignTemplate[] = [
  {
    id: 'rural-standard-2f',
    name: '农村标准两层',
    desc: '一楼客厅餐厅厨房，二楼卧室，最常见的自建房格局',
    icon: '🏠',
    tag: '最热门',
    tagColor: '#EF4444',
    numFloors: 2,
    landWidth: 12,
    landHeight: 10,
    orientation: '南',
    floors: [
      {
        bedrooms: [{ area: 14, hasBath: false }],
        livingRoom: { enabled: true, area: 20 },
        diningRoom: { enabled: true, area: 10 },
        kitchen:    { enabled: true, area: 10 },
        bath:       { count: 1, area: 5 },
        balcony:    { enabled: false, area: 6 },
      },
      {
        bedrooms: [
          { area: 16, hasBath: false },
          { area: 13, hasBath: false },
          { area: 12, hasBath: false },
        ],
        livingRoom: { enabled: false, area: 0 },
        diningRoom: { enabled: false, area: 0 },
        kitchen:    { enabled: false, area: 0 },
        bath:       { count: 1, area: 5 },
        balcony:    { enabled: true, area: 6 },
      },
    ],
    globalSpec: { style: '实用经济', stairsPos: 'right', hasElevator: false, hasCourtyard: true, courtyardDepth: 4 },
  },

  {
    id: 'three-gen',
    name: '三代同堂 · 老人房一楼',
    desc: '一楼老人房+客厅，二楼主卧，三楼子女，分代而居又共享生活',
    icon: '👨‍👩‍👧‍👦',
    tag: '三代同堂',
    tagColor: '#2563EB',
    numFloors: 3,
    landWidth: 13,
    landHeight: 11,
    orientation: '南',
    floors: [
      {
        bedrooms: [{ area: 14, hasBath: false }],
        livingRoom: { enabled: true, area: 20 },
        diningRoom: { enabled: true, area: 12 },
        kitchen:    { enabled: true, area: 10 },
        bath:       { count: 1, area: 5 },
        balcony:    { enabled: false, area: 0 },
      },
      {
        bedrooms: [
          { area: 18, hasBath: false },
          { area: 13, hasBath: false },
        ],
        livingRoom: { enabled: false, area: 0 },
        diningRoom: { enabled: false, area: 0 },
        kitchen:    { enabled: false, area: 0 },
        bath:       { count: 1, area: 5 },
        balcony:    { enabled: true, area: 6 },
      },
      {
        bedrooms: [
          { area: 13, hasBath: false },
          { area: 12, hasBath: false },
        ],
        livingRoom: { enabled: false, area: 0 },
        diningRoom: { enabled: false, area: 0 },
        kitchen:    { enabled: false, area: 0 },
        bath:       { count: 1, area: 5 },
        balcony:    { enabled: true, area: 8 },
      },
    ],
    globalSpec: { style: '实用经济', stairsPos: 'right', hasElevator: false },
  },

  {
    id: 'economy-single',
    name: '经济单层',
    desc: '紧凑单层，控制建筑面积，适合宅基地限制严格地区或老年人居住',
    icon: '🏘️',
    tag: '经济实用',
    tagColor: '#059669',
    numFloors: 1,
    landWidth: 12,
    landHeight: 10,
    orientation: '南',
    floors: [
      {
        bedrooms: [
          { area: 14, hasBath: false },
          { area: 12, hasBath: false },
          { area: 10, hasBath: false },
        ],
        livingRoom: { enabled: true, area: 18 },
        diningRoom: { enabled: true, area: 8 },
        kitchen:    { enabled: true, area: 8 },
        bath:       { count: 1, area: 4 },
        balcony:    { enabled: false, area: 0 },
      },
    ],
    globalSpec: { style: '实用经济，紧凑布局', hasElevator: false },
  },
];
