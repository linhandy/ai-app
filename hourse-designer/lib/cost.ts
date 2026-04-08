import type { HouseDesign } from './types';
import { PROVINCE_RULES } from './types';

export interface CostResult {
  buildingArea: number;   // m²
  floorHeight: number;    // metres
  roughPerM2: number;     // RMB/m²
  renovationPerM2: number;
  roughCost: number;      // RMB
  renovationCost: number;
  totalCost: number;
}

/**
 * Calculate construction cost estimate.
 * @param design       generated house design
 * @param province     province key from PROVINCE_RULES (empty = use default)
 * @param floorHeight  floor-to-floor height in metres (default 3.0)
 * @param renovationPerM2  装修单价 RMB/m² (default 800)
 */
export function calcCost(
  design: HouseDesign,
  province: string,
  floorHeight = 3.0,
  renovationPerM2 = 800,
): CostResult {
  const rule = PROVINCE_RULES[province];
  const baseRoughPerM2 = rule?.costPerM2 ?? 1800;

  // 层高系数：超过 3.3m 材料略增（约 5%）
  const heightFactor = floorHeight > 3.3 ? 1.05 : 1.0;
  const roughPerM2 = Math.round(baseRoughPerM2 * heightFactor);

  const buildingArea = design.buildingWidth * design.buildingHeight * design.floors.length;
  const roughCost = Math.round(buildingArea * roughPerM2);
  const renovationCost = Math.round(buildingArea * renovationPerM2);

  return {
    buildingArea: Math.round(buildingArea * 10) / 10,
    floorHeight,
    roughPerM2,
    renovationPerM2,
    roughCost,
    renovationCost,
    totalCost: roughCost + renovationCost,
  };
}

/** Format RMB amount to 万元 string, e.g. 216000 → "21.6 万" */
export function fmtWan(rmb: number): string {
  return (rmb / 10000).toFixed(1) + ' 万';
}
