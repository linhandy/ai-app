import type { HouseDesign, DesignInput, FloorPlan, Room, GlobalSpec } from './types';

export function validateAndFix(design: HouseDesign, input: DesignInput, globalSpec?: Partial<GlobalSpec>): HouseDesign {
  // Ensure building fits within land
  design.buildingWidth = Math.min(design.buildingWidth, input.landWidth - 1);
  design.buildingHeight = Math.min(design.buildingHeight, input.landHeight - 1);

  // Guard: floors must be an array
  if (!Array.isArray(design.floors)) design.floors = [];

  if (design.floors.length !== input.numFloors) {
    console.warn(`[validate] Expected ${input.numFloors} floors, got ${design.floors.length}`);
  }

  const oh = globalSpec?.overhang;

  for (let i = 0; i < design.floors.length; i++) {
    const isUpper = i > 0 && oh;
    const effectiveBw = isUpper ? design.buildingWidth + (oh!.left + oh!.right) : design.buildingWidth;
    const effectiveBh = isUpper ? design.buildingHeight + (oh!.front + oh!.back) : design.buildingHeight;
    const xOffset    = isUpper ? -oh!.left : 0;
    const yOffset    = isUpper ? -oh!.back : 0;
    validateFloor(design.floors[i], effectiveBw, effectiveBh, xOffset, yOffset);
  }

  return design;
}

function validateFloor(floor: FloorPlan, bw: number, bh: number, xMin = 0, yMin = 0) {
  // Guard: ensure all arrays exist before touching them
  if (!Array.isArray(floor.rooms))   floor.rooms   = [];
  if (!Array.isArray(floor.doors))   floor.doors   = [];
  if (!Array.isArray(floor.windows)) floor.windows = [];

  const seenIds = new Set<string>();

  for (const room of floor.rooms) {
    // Unique IDs
    if (seenIds.has(room.id)) {
      room.id = `${room.id}_dup${Math.random().toString(36).slice(2, 5)}`;
    }
    seenIds.add(room.id);

    // Sanitize NaN / negative / absurd values
    if (!isFinite(room.x) || room.x < xMin) room.x = xMin;
    if (!isFinite(room.y) || room.y < yMin) room.y = yMin;
    if (!isFinite(room.width) || room.width <= 0) room.width = 2;
    if (!isFinite(room.height) || room.height <= 0) room.height = 2;

    // Clamp rooms within effective building bounds (accounting for overhang)
    room.x = Math.max(xMin, room.x);
    room.y = Math.max(yMin, room.y);
    const maxW = bw + Math.abs(xMin);
    const maxH = bh + Math.abs(yMin);
    if (room.x + room.width > maxW) {
      room.width = maxW - room.x;
    }
    if (room.y + room.height > maxH) {
      room.height = maxH - room.y;
    }

    // Minimum room size
    room.width = Math.max(room.width, 1.5);
    room.height = Math.max(room.height, 1.5);

    // If minimum size pushes past building bounds, pull position back
    if (room.x + room.width > maxW) room.x = Math.max(xMin, maxW - room.width);
    if (room.y + room.height > maxH) room.y = Math.max(yMin, maxH - room.height);

    // Round to 0.1m precision (CAD standard)
    room.x      = Math.round(room.x * 10) / 10;
    room.y      = Math.round(room.y * 10) / 10;
    room.width  = Math.round(room.width * 10) / 10;
    room.height = Math.round(room.height * 10) / 10;
  }

  // Validate door/window references and positions
  const roomIds = new Set(floor.rooms.map(r => r.id));
  floor.doors = floor.doors.filter(d => roomIds.has(d.roomId));
  floor.windows = floor.windows.filter(w => roomIds.has(w.roomId));

  // Clamp door/window position to valid range [0.1, 0.9]
  for (const d of floor.doors) {
    d.position = Math.max(0.1, Math.min(0.9, d.position || 0.5));
    d.widthMeters = Math.max(0.6, Math.min(2.0, d.widthMeters || 0.9));
  }
  for (const w of floor.windows) {
    w.position = Math.max(0.1, Math.min(0.9, w.position || 0.5));
    w.widthMeters = Math.max(0.6, Math.min(2.0, w.widthMeters || 1.2));
  }

  // Check for overlaps
  const overlaps = findOverlaps(floor.rooms);
  if (overlaps.length > 0) {
    console.warn(`[validate] Floor ${floor.floor} has ${overlaps.length} overlapping room pairs`);
  }
}

// ─── Lighting compliance ──────────────────────────────────────────────────────
export function getUnlitRooms(floor: FloorPlan): Set<string> {
  const windows = floor.windows ?? [];
  const rooms   = floor.rooms   ?? [];
  const litIds = new Set(windows.map(w => w.roomId));
  // Corridors, stairs, storage don't need natural light warnings
  const exemptTypes = new Set(['走廊', '楼梯间', '储藏室', '衣帽间', '玄关', '化粪池间']);
  return new Set(
    rooms
      .filter(r => !litIds.has(r.id) && !exemptTypes.has(r.type))
      .map(r => r.id)
  );
}

function findOverlaps(rooms: Room[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      if (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      ) {
        pairs.push([a.id, b.id]);
      }
    }
  }
  return pairs;
}
