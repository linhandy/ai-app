export type Orientation = '东' | '南' | '西' | '北' | '东南' | '东北' | '西南' | '西北';

export type RoomType =
  | '客厅' | '餐厅' | '厨房' | '卧室' | '主卧' | '次卧' | '书房'
  | '卫生间' | '走廊' | '楼梯间' | '阳台' | '储藏室' | '车库'
  | '玄关' | '衣帽间'
  // Rural-specific rooms
  | '堂屋' | '灶房' | '柴房' | '农具间' | '晒台' | '天井' | '院落'
  | '老人房' | '工具房' | '猪圈' | '化粪池间' | '其他';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number;       // meters from top-left
  y: number;
  width: number;   // meters
  height: number;  // meters
}

export interface Door {
  id: string;
  wall: 'north' | 'south' | 'east' | 'west';
  roomId: string;
  position: number;     // 0-1 fraction along wall
  widthMeters: number;  // typically 0.9 or 1.2
  isMain?: boolean;
}

export interface Window {
  id: string;
  wall: 'north' | 'south' | 'east' | 'west';
  roomId: string;
  position: number;
  widthMeters: number;  // typically 1.2 or 1.5
}

export interface FloorPlan {
  floor: number;
  label: string;    // e.g. "一层"
  rooms: Room[];
  doors: Door[];
  windows: Window[];
}

export interface HouseDesign {
  landWidth: number;
  landHeight: number;
  orientation: Orientation;
  buildingWidth: number;
  buildingHeight: number;
  floors: FloorPlan[];
}

export interface DesignInput {
  landWidth: number;
  landHeight: number;
  orientation: Orientation;
  numFloors: number;
  floorRequirements: string[];
}

// ─── Structured per-floor spec ────────────────────────────────────────────────
export interface BedroomSpec {
  area: number;
  hasBath: boolean;
}

export interface FloorSpec {
  bedrooms:   BedroomSpec[];
  livingRoom: { enabled: boolean; area: number };
  diningRoom: { enabled: boolean; area: number };
  kitchen:    { enabled: boolean; area: number };
  bath:       { count: number; area: number };
  balcony:    { enabled: boolean; area: number };
}

export function defaultFloorSpec(isFirst: boolean): FloorSpec {
  return {
    bedrooms:   isFirst ? [] : [{ area: 14, hasBath: false }],
    livingRoom: { enabled: isFirst, area: 20 },
    diningRoom: { enabled: isFirst, area: 10 },
    kitchen:    { enabled: isFirst, area: 10 },
    bath:       { count: 1, area: 5 },
    balcony:    { enabled: false, area: 6 },
  };
}

// ─── Global design options ────────────────────────────────────────────────────
export interface GlobalSpec {
  hasElevator:     boolean;
  elevatorPos:     'left' | 'right' | 'center';
  stairsPos:       'left' | 'right' | 'center';
  style:           string;
  customPrompt:    string;
  province:        string;   // for compliance & cost estimation
  hasCourtyard:    boolean;  // 院子
  courtyardDepth:  number;   // metres
  // 飘出宽度：二楼以上各侧可悬挑出地基的距离（米）
  overhang:        { front: number; back: number; left: number; right: number };
  floorHeight:     number;   // 层高，单位米，默认 3.0
}

export const DEFAULT_GLOBAL_SPEC: GlobalSpec = {
  hasElevator:    false,
  elevatorPos:    'center',
  stairsPos:      'right',
  style:          '',
  customPrompt:   '',
  province:       '',
  hasCourtyard:   false,
  courtyardDepth: 4,
  floorHeight:    3.0,
  overhang:       { front: 0, back: 0, left: 0, right: 0 },
};

// ─── Rural compliance rules (宅基地限制) ────────────────────────────────────
export interface ProvinceRule {
  name:        string;
  maxArea:     number;   // m² per household
  maxFloors:   number;
  maxHeight:   number;   // metres
  costPerM2:   number;   // rough construction cost RMB/m²
  note:        string;
}

export const PROVINCE_RULES: Record<string, ProvinceRule> = {
  '河南': { name: '河南', maxArea: 134, maxFloors: 3, maxHeight: 10, costPerM2: 1800, note: '宅基地≤134m²，不超过3层' },
  '河北': { name: '河北', maxArea: 167, maxFloors: 3, maxHeight: 10, costPerM2: 1900, note: '平原地区167m²，山区134m²' },
  '山东': { name: '山东', maxArea: 167, maxFloors: 3, maxHeight: 10, costPerM2: 2000, note: '城郊134m²，农村167m²' },
  '四川': { name: '四川', maxArea: 120, maxFloors: 3, maxHeight: 10, costPerM2: 1700, note: '平坝120m²，山地可适当放宽' },
  '湖南': { name: '湖南', maxArea: 130, maxFloors: 3, maxHeight: 10, costPerM2: 1800, note: '城郊≤100m²，农村130m²' },
  '湖北': { name: '湖北', maxArea: 120, maxFloors: 3, maxHeight: 10, costPerM2: 1800, note: '人均耕地不足1亩地区≤80m²' },
  '广东': { name: '广东', maxArea: 150, maxFloors: 4, maxHeight: 15, costPerM2: 2200, note: '农村村民每户≤150m²，不超4层' },
  '广西': { name: '广西', maxArea: 100, maxFloors: 3, maxHeight: 11, costPerM2: 1600, note: '每户宅基地≤100m²' },
  '江苏': { name: '江苏', maxArea: 120, maxFloors: 3, maxHeight: 10, costPerM2: 2100, note: '苏南100m²，苏北120m²' },
  '浙江': { name: '浙江', maxArea: 100, maxFloors: 3, maxHeight: 10, costPerM2: 2300, note: '平原≤100m²，山区可放宽' },
  '安徽': { name: '安徽', maxArea: 130, maxFloors: 3, maxHeight: 10, costPerM2: 1700, note: '平原130m²，山丘120m²' },
  '江西': { name: '江西', maxArea: 120, maxFloors: 3, maxHeight: 10, costPerM2: 1600, note: '每户宅基地≤120m²' },
  '福建': { name: '福建', maxArea: 120, maxFloors: 4, maxHeight: 15, costPerM2: 2000, note: '沿海地区可适当提高层数' },
  '云南': { name: '云南', maxArea: 150, maxFloors: 3, maxHeight: 10, costPerM2: 1500, note: '坝区≤150m²，山区可放宽' },
  '贵州': { name: '贵州', maxArea: 120, maxFloors: 3, maxHeight: 10, costPerM2: 1500, note: '山地地区宅基地放宽' },
  '陕西': { name: '陕西', maxArea: 134, maxFloors: 3, maxHeight: 10, costPerM2: 1700, note: '关中134m²，陕南陕北可适当放宽' },
  '甘肃': { name: '甘肃', maxArea: 200, maxFloors: 2, maxHeight: 7,  costPerM2: 1400, note: '农村可达200m²' },
  '山西': { name: '山西', maxArea: 134, maxFloors: 3, maxHeight: 10, costPerM2: 1700, note: '农村≤134m²，院落可适当扩大' },
  '辽宁': { name: '辽宁', maxArea: 200, maxFloors: 2, maxHeight: 7,  costPerM2: 1800, note: '辽宁农村宅基地较宽松' },
  '黑龙江': { name: '黑龙江', maxArea: 250, maxFloors: 2, maxHeight: 7, costPerM2: 1600, note: '东北农村用地充裕' },
  '吉林': { name: '吉林', maxArea: 200, maxFloors: 2, maxHeight: 7,  costPerM2: 1600, note: '农村宅基地较宽松' },
  '其他': { name: '其他', maxArea: 150, maxFloors: 3, maxHeight: 10, costPerM2: 1800, note: '参考当地村镇规划条例' },
};
