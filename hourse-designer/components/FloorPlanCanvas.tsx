'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { FloorPlan, Room, Door, Window as Win } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const PX = 50;          // pixels per metre
const MARGIN = 100;     // canvas margin for grid axes + dimension chains
const WALL_EXT = 5;     // exterior wall line width (px)
const WALL_INT = 2;     // interior wall/partition line width (px)
const DIM_INNER = 18;   // inner dim chain offset from building edge (px)
const DIM_OUTER = 34;   // outer dim chain offset from building edge (px)
const AXIS_OFFSET = 60; // grid axis circle centre offset from building edge (px)
const AXIS_R = 11;      // grid axis circle radius (px)

const tx = (m: number) => MARGIN + m * PX;
const ty = (m: number) => MARGIN + m * PX;
/** metres → mm string (e.g. 3.6 → "3600") */
const mm = (m: number) => String(Math.round(m * 1000));

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  floor: FloorPlan;
  buildingWidth: number;
  buildingHeight: number;
  orientation: string;
  scale?: number;
  unlitRooms?: Set<string>;
  onRoomsChange?: (rooms: Room[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const FloorPlanCanvas = forwardRef<HTMLCanvasElement, Props>(function FloorPlanCanvas(
  { floor, buildingWidth, buildingHeight, orientation, scale = 1, unlitRooms, onRoomsChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(ref, () => canvasRef.current!);

  const [localRooms, setLocalRooms] = useState<Room[]>(floor.rooms ?? []);
  const dragging = useRef<{ roomId: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => { setLocalRooms(floor.rooms ?? []); }, [floor]);

  const mtX = (px: number) => (px - MARGIN) / PX;
  const mtY = (px: number) => (px - MARGIN) / PX;

  // ─── Draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback((rooms: Room[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !rooms?.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = buildingWidth * PX + MARGIN * 2;
    const H = buildingHeight * PX + MARGIN * 2;
    canvas.width = W;
    canvas.height = H;

    // 1. White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // 2. Grid lines (thin dashed, behind everything)
    const { xs, ys } = getGridAxes(rooms, buildingWidth, buildingHeight);
    drawGridLines(ctx, xs, ys, buildingWidth, buildingHeight);

    // 3. Room fills (white, covers grid lines)
    ctx.fillStyle = '#FFFFFF';
    for (const room of rooms) {
      ctx.fillRect(tx(room.x), ty(room.y), room.width * PX, room.height * PX);
    }

    // 4. Furniture / fixture symbols
    drawFurniture(ctx, rooms);

    // 5. Walls (exterior thick, interior thin)
    drawWalls(ctx, rooms, buildingWidth, buildingHeight);

    // 6. Windows (CAD symbol: gap + 3-line)
    drawWindows(ctx, floor.windows ?? [], rooms);

    // 7. Doors (CAD symbol: gap + panel + arc)
    drawDoors(ctx, floor.doors ?? [], rooms);

    // 8. Unlit warnings
    if (unlitRooms?.size) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      for (const room of rooms) {
        if (unlitRooms.has(room.id)) {
          ctx.strokeRect(tx(room.x) + 3, ty(room.y) + 3,
            room.width * PX - 6, room.height * PX - 6);
        }
      }
      ctx.setLineDash([]);
    }

    // 9. Room labels
    drawRoomLabels(ctx, rooms);

    // 10. Grid axis circles
    drawGridAxes(ctx, xs, ys, buildingWidth, buildingHeight);

    // 11. Dimension chains (mm)
    drawDimensions(ctx, rooms, buildingWidth, buildingHeight);

    // 12. Compass
    drawCompass(ctx, orientation, W - 45, 45, 24);

  }, [floor.doors, floor.windows, buildingWidth, buildingHeight, orientation, unlitRooms]);

  useEffect(() => { draw(localRooms); }, [draw, localRooms]);

  // ─── Drag-and-drop ────────────────────────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { px: (e.clientX - rect.left) / scale, py: (e.clientY - rect.top) / scale };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { px, py } = getCanvasPos(e);
    const mx = mtX(px), my = mtY(py);
    const room = [...localRooms].reverse().find(
      r => mx >= r.x && mx <= r.x + r.width && my >= r.y && my <= r.y + r.height
    );
    if (room) {
      dragging.current = { roomId: room.id, offsetX: mx - room.x, offsetY: my - room.y };
      e.currentTarget.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const { px, py } = getCanvasPos(e);
    const raw = dragging.current;
    const sx = Math.round((mtX(px) - raw.offsetX) * 10) / 10;
    const sy = Math.round((mtY(py) - raw.offsetY) * 10) / 10;
    setLocalRooms(prev => prev.map(r => {
      if (r.id !== raw.roomId) return r;
      return {
        ...r,
        x: Math.max(0, Math.min(sx, buildingWidth - r.width)),
        y: Math.max(0, Math.min(sy, buildingHeight - r.height)),
      };
    }));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging.current) {
      dragging.current = null;
      e.currentTarget.style.cursor = 'default';
      onRoomsChange?.(localRooms);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={buildingWidth * PX + MARGIN * 2}
      height={buildingHeight * PX + MARGIN * 2}
      style={{ cursor: 'default', display: 'block' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
});

export default FloorPlanCanvas;

// ─── Helper: collect unique grid line positions ───────────────────────────────
function getGridAxes(rooms: Room[], bw: number, bh: number) {
  const xSet = new Set<number>([0, bw]);
  const ySet = new Set<number>([0, bh]);
  for (const r of rooms) {
    xSet.add(r.x);           xSet.add(r.x + r.width);
    ySet.add(r.y);           ySet.add(r.y + r.height);
  }
  return {
    xs: [...xSet].sort((a, b) => a - b),
    ys: [...ySet].sort((a, b) => a - b),
  };
}

// ─── Grid lines (background, dashed) ─────────────────────────────────────────
function drawGridLines(
  ctx: CanvasRenderingContext2D,
  xs: number[], ys: number[],
  bw: number, bh: number,
) {
  const ext = AXIS_OFFSET + AXIS_R + 4;
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);

  for (const x of xs) {
    const px = tx(x);
    ctx.beginPath();
    ctx.moveTo(px, ty(0) - ext);
    ctx.lineTo(px, ty(bh) + ext);
    ctx.stroke();
  }
  for (const y of ys) {
    const py = ty(y);
    ctx.beginPath();
    ctx.moveTo(tx(0) - ext, py);
    ctx.lineTo(tx(bw) + ext, py);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// ─── Walls ────────────────────────────────────────────────────────────────────
function drawWalls(ctx: CanvasRenderingContext2D, rooms: Room[], bw: number, bh: number) {
  ctx.strokeStyle = '#111111';

  for (const room of rooms) {
    const rx = tx(room.x), ry = ty(room.y);
    const rw = room.width * PX, rh = room.height * PX;

    const isNorthExt = room.y < 0.01;
    const isSouthExt = Math.abs(room.y + room.height - bh) < 0.01;
    const isWestExt  = room.x < 0.01;
    const isEastExt  = Math.abs(room.x + room.width - bw) < 0.01;

    // North
    ctx.lineWidth = isNorthExt ? WALL_EXT : WALL_INT;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rw, ry); ctx.stroke();
    // South
    ctx.lineWidth = isSouthExt ? WALL_EXT : WALL_INT;
    ctx.beginPath(); ctx.moveTo(rx, ry + rh); ctx.lineTo(rx + rw, ry + rh); ctx.stroke();
    // West
    ctx.lineWidth = isWestExt ? WALL_EXT : WALL_INT;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry + rh); ctx.stroke();
    // East
    ctx.lineWidth = isEastExt ? WALL_EXT : WALL_INT;
    ctx.beginPath(); ctx.moveTo(rx + rw, ry); ctx.lineTo(rx + rw, ry + rh); ctx.stroke();
  }
}

// ─── Windows (CAD: gap + 3 parallel lines + end-caps) ────────────────────────
function drawWindows(ctx: CanvasRenderingContext2D, windows: Win[], rooms: Room[]) {
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1;

  for (const w of windows) {
    const room = roomMap.get(w.roomId);
    if (!room) continue;
    const wpx = w.widthMeters * PX;

    if (w.wall === 'south' || w.wall === 'north') {
      const wy = w.wall === 'south' ? ty(room.y + room.height) : ty(room.y);
      const cx = tx(room.x) + room.width * PX * w.position;
      const x1 = cx - wpx / 2, x2 = cx + wpx / 2;

      // Erase wall line
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x1, wy - 5, wpx, 10);

      // 3 parallel lines (representing glass)
      ctx.lineWidth = 1;
      for (const o of [-3, 0, 3]) {
        ctx.beginPath(); ctx.moveTo(x1, wy + o); ctx.lineTo(x2, wy + o); ctx.stroke();
      }
      // End-caps
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, wy - 5); ctx.lineTo(x1, wy + 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, wy - 5); ctx.lineTo(x2, wy + 5); ctx.stroke();

    } else {
      const wx = w.wall === 'east' ? tx(room.x + room.width) : tx(room.x);
      const cy = ty(room.y) + room.height * PX * w.position;
      const y1 = cy - wpx / 2, y2 = cy + wpx / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wx - 5, y1, 10, wpx);

      ctx.lineWidth = 1;
      for (const o of [-3, 0, 3]) {
        ctx.beginPath(); ctx.moveTo(wx + o, y1); ctx.lineTo(wx + o, y2); ctx.stroke();
      }
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(wx - 5, y1); ctx.lineTo(wx + 5, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx - 5, y2); ctx.lineTo(wx + 5, y2); ctx.stroke();
    }
  }
}

// ─── Doors (CAD: gap + panel line + quarter-circle arc) ──────────────────────
function drawDoors(ctx: CanvasRenderingContext2D, doors: Door[], rooms: Room[]) {
  const roomMap = new Map(rooms.map(r => [r.id, r]));

  for (const d of doors) {
    const room = roomMap.get(d.roomId);
    if (!room) continue;
    const dpx = d.widthMeters * PX;

    ctx.strokeStyle = '#111111';

    if (d.wall === 'south' || d.wall === 'north') {
      const wy = d.wall === 'south' ? ty(room.y + room.height) : ty(room.y);
      const cx = tx(room.x) + room.width * PX * d.position;
      const x1 = cx - dpx / 2, x2 = cx + dpx / 2;

      // Erase wall
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x1, wy - 6, dpx, 12);

      // Opening tick marks
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, wy - 5); ctx.lineTo(x1, wy + 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, wy - 5); ctx.lineTo(x2, wy + 5); ctx.stroke();

      // Door panel + arc (hinge at x1, swing into room)
      const swingUp = d.wall === 'south'; // south wall → swing north (up)
      ctx.lineWidth = 1;
      const tipY = wy + (swingUp ? -dpx : dpx);
      ctx.beginPath(); ctx.moveTo(x1, wy); ctx.lineTo(x1, tipY); ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(x1, wy, dpx,
        swingUp ? -Math.PI / 2 : Math.PI / 2,
        swingUp ? 0 : Math.PI,
        !swingUp);
      ctx.stroke();
      ctx.setLineDash([]);

    } else {
      const wx = d.wall === 'east' ? tx(room.x + room.width) : tx(room.x);
      const cy = ty(room.y) + room.height * PX * d.position;
      const y1 = cy - dpx / 2, y2 = cy + dpx / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wx - 6, y1, 12, dpx);

      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wx - 5, y1); ctx.lineTo(wx + 5, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx - 5, y2); ctx.lineTo(wx + 5, y2); ctx.stroke();

      // Hinge at y1, swing into room
      const swingLeft = d.wall === 'east'; // east wall → swing west (left)
      ctx.lineWidth = 1;
      const tipX = wx + (swingLeft ? -dpx : dpx);
      ctx.beginPath(); ctx.moveTo(wx, y1); ctx.lineTo(tipX, y1); ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(wx, y1, dpx,
        swingLeft ? Math.PI : 0,
        swingLeft ? Math.PI / 2 : -Math.PI / 2,
        swingLeft);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ─── Room labels ──────────────────────────────────────────────────────────────
function drawRoomLabels(ctx: CanvasRenderingContext2D, rooms: Room[]) {
  for (const room of rooms) {
    const cx = tx(room.x + room.width / 2);
    const cy = ty(room.y + room.height / 2);
    const minDim = Math.min(room.width, room.height) * PX;
    const fontSize = Math.max(9, Math.min(13, minDim / 4.5));

    ctx.fillStyle = '#111111';
    ctx.font = `${fontSize}px "SimSun", "宋体", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.name, cx, cy - 5);

    const area = (room.width * room.height).toFixed(0);
    ctx.font = `${Math.max(8, fontSize - 2)}px sans-serif`;
    ctx.fillStyle = '#555555';
    ctx.fillText(`${area}㎡`, cx, cy + 7);
  }
}

// ─── Grid axis circles (numbers top/bottom, letters left/right) ───────────────
function drawGridAxes(
  ctx: CanvasRenderingContext2D,
  xs: number[], ys: number[],
  bw: number, bh: number,
) {
  // Columns: 1, 2, 3 … (left → right)
  xs.forEach((x, i) => {
    const px = tx(x);
    drawAxisCircle(ctx, px, ty(0) - AXIS_OFFSET, AXIS_R, String(i + 1));
    drawAxisCircle(ctx, px, ty(bh) + AXIS_OFFSET, AXIS_R, String(i + 1));
  });

  // Rows: A at bottom → last letter at top (CAD convention)
  ys.forEach((y, i) => {
    const py = ty(y);
    const letter = String.fromCharCode(65 + (ys.length - 1 - i)); // A = bottom
    drawAxisCircle(ctx, tx(0) - AXIS_OFFSET, py, AXIS_R, letter);
    drawAxisCircle(ctx, tx(bw) + AXIS_OFFSET, py, AXIS_R, letter);
  });
}

function drawAxisCircle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, label: string,
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#111111';
  ctx.font = `bold 9px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
}

// ─── Dimension chains (CAD style: oblique tick marks, mm values) ──────────────
function drawDimensions(
  ctx: CanvasRenderingContext2D,
  rooms: Room[],
  bw: number, bh: number,
) {
  const bx = MARGIN, by = MARGIN;

  // Top inner
  const topRooms = rooms.filter(r => r.y < 0.01).sort((a, b) => a.x - b.x);
  for (const r of topRooms) {
    dimSeg(ctx, bx + r.x * PX, bx + (r.x + r.width) * PX, by - DIM_INNER, 'h', mm(r.width));
  }
  dimSeg(ctx, bx, bx + bw * PX, by - DIM_OUTER, 'h', mm(bw));

  // Bottom inner
  const btmRooms = rooms.filter(r => Math.abs(r.y + r.height - bh) < 0.01).sort((a, b) => a.x - b.x);
  for (const r of btmRooms) {
    dimSeg(ctx, bx + r.x * PX, bx + (r.x + r.width) * PX, by + bh * PX + DIM_INNER, 'h', mm(r.width));
  }
  dimSeg(ctx, bx, bx + bw * PX, by + bh * PX + DIM_OUTER, 'h', mm(bw));

  // Left inner
  const leftRooms = rooms.filter(r => r.x < 0.01).sort((a, b) => a.y - b.y);
  for (const r of leftRooms) {
    dimSeg(ctx, by + r.y * PX, by + (r.y + r.height) * PX, bx - DIM_INNER, 'v', mm(r.height));
  }
  dimSeg(ctx, by, by + bh * PX, bx - DIM_OUTER, 'v', mm(bh));

  // Right inner
  const rightRooms = rooms.filter(r => Math.abs(r.x + r.width - bw) < 0.01).sort((a, b) => a.y - b.y);
  for (const r of rightRooms) {
    dimSeg(ctx, by + r.y * PX, by + (r.y + r.height) * PX, bx + bw * PX + DIM_INNER, 'v', mm(r.height));
  }
  dimSeg(ctx, by, by + bh * PX, bx + bw * PX + DIM_OUTER, 'v', mm(bh));
}

function dimSeg(
  ctx: CanvasRenderingContext2D,
  a: number, b: number,
  offset: number,
  dir: 'h' | 'v',
  label: string,
) {
  const mid = (a + b) / 2;
  const TICK = 4;
  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';

  if (dir === 'h') {
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(a, offset); ctx.lineTo(b, offset); ctx.stroke();
    // Oblique tick marks (45°)
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(a - TICK, offset + TICK); ctx.lineTo(a + TICK, offset - TICK); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b - TICK, offset + TICK); ctx.lineTo(b + TICK, offset - TICK); ctx.stroke();
    // Label
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(mid - tw / 2 - 2, offset - 12, tw + 4, 11);
    ctx.fillStyle = '#333333';
    ctx.fillText(label, mid, offset - 1);

  } else {
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(offset, a); ctx.lineTo(offset, b); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(offset + TICK, a - TICK); ctx.lineTo(offset - TICK, a + TICK); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(offset + TICK, b - TICK); ctx.lineTo(offset - TICK, b + TICK); ctx.stroke();
    ctx.save();
    ctx.translate(offset, mid);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-tw / 2 - 2, -12, tw + 4, 11);
    ctx.fillStyle = '#333333';
    ctx.fillText(label, 0, -1);
    ctx.restore();
  }
}

// ─── Compass ──────────────────────────────────────────────────────────────────
function drawCompass(
  ctx: CanvasRenderingContext2D,
  orientation: string,
  cx: number, cy: number, r: number,
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.stroke();

  // North arrow (solid black)
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 4);
  ctx.lineTo(cx - 5, cy + 4);
  ctx.lineTo(cx + 5, cy + 4);
  ctx.closePath();
  ctx.fill();

  // South arrow (light gray)
  ctx.fillStyle = '#BBBBBB';
  ctx.beginPath();
  ctx.moveTo(cx, cy + r - 4);
  ctx.lineTo(cx - 5, cy - 4);
  ctx.lineTo(cx + 5, cy - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#111111';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r - 9);
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText(`朝${orientation}`, cx, cy + r + 9);
}

// ─── Furniture / fixture symbols (CAD linework style) ────────────────────────
function drawFurniture(ctx: CanvasRenderingContext2D, rooms: Room[]) {
  for (const room of rooms) {
    const rx = tx(room.x), ry = ty(room.y);
    const rw = room.width * PX, rh = room.height * PX;
    const t: string = room.type || room.name;
    ctx.save();
    ctx.strokeStyle = '#777777';
    ctx.lineWidth = 0.8;
    if (t.includes('卧') || t === '老人房')                          drawBed(ctx, rx, ry, rw, rh);
    else if (t.includes('卫') || t.includes('厕') || t.includes('浴')) drawToiletSymbol(ctx, rx, ry, rw, rh);
    else if (t.includes('厨') || t.includes('灶'))                   drawStoveSymbol(ctx, rx, ry, rw, rh);
    else if (t.includes('楼梯'))                                     drawStairsSymbol(ctx, rx, ry, rw, rh);
    ctx.restore();
  }
}

function drawBed(ctx: CanvasRenderingContext2D, rx: number, ry: number, rw: number, rh: number) {
  const pad = 0.1;
  const bx = rx + rw * pad, by = ry + rh * pad;
  const bw = rw * (1 - pad * 2), bh = rh * (1 - pad * 2);
  // Bed outline
  ctx.strokeRect(bx, by, bw, bh);
  // Headboard
  ctx.strokeRect(bx, by, bw, Math.min(bh * 0.18, 14));
  // Diagonal hatching on mattress
  ctx.save();
  ctx.rect(bx, by, bw, bh);
  ctx.clip();
  const hatchSpacing = 12;
  for (let i = -bh; i < bw + bh; i += hatchSpacing) {
    ctx.beginPath();
    ctx.moveTo(bx + i, by);
    ctx.lineTo(bx + i - bh, by + bh);
    ctx.stroke();
  }
  ctx.restore();
}

function drawToiletSymbol(ctx: CanvasRenderingContext2D, rx: number, ry: number, rw: number, rh: number) {
  const tw = Math.min(rw * 0.45, 30);
  const th = Math.min(rh * 0.6, 44);
  const ox = rx + rw * 0.12, oy = ry + (rh - th) / 2;
  // Tank
  ctx.strokeRect(ox, oy, tw, th * 0.28);
  // Bowl (ellipse)
  ctx.beginPath();
  ctx.ellipse(ox + tw / 2, oy + th * 0.65, tw * 0.48, th * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Seat ring
  ctx.beginPath();
  ctx.ellipse(ox + tw / 2, oy + th * 0.65, tw * 0.33, th * 0.24, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Sink (simple rectangle)
  const sx = rx + rw * 0.6, sy = ry + rh * 0.1;
  const sw = rw * 0.3, sh = Math.min(rh * 0.3, 28);
  ctx.strokeRect(sx, sy, sw, sh);
  ctx.beginPath();
  ctx.arc(sx + sw / 2, sy + sh / 2, Math.min(sw, sh) * 0.28, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStoveSymbol(ctx: CanvasRenderingContext2D, rx: number, ry: number, rw: number, rh: number) {
  const sw = rw * 0.65, sh = Math.min(rh * 0.28, 38);
  const sx = rx + (rw - sw) / 2, sy = ry + rh * 0.60;
  ctx.strokeRect(sx, sy, sw, sh);
  const br = Math.min(sw * 0.13, sh * 0.32, 8);
  [[sx + sw * 0.22, sy + sh * 0.35], [sx + sw * 0.78, sy + sh * 0.35],
   [sx + sw * 0.22, sy + sh * 0.75], [sx + sw * 0.78, sy + sh * 0.75]].forEach(([bx, by]) => {
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, br * 0.4, 0, Math.PI * 2); ctx.stroke();
  });
}

function drawStairsSymbol(ctx: CanvasRenderingContext2D, rx: number, ry: number, rw: number, rh: number) {
  const pad = 5;
  const steps = Math.max(5, Math.min(12, Math.floor(rh / 12)));
  // Horizontal step lines
  for (let i = 0; i <= steps; i++) {
    const y = ry + pad + (i / steps) * (rh - pad * 2);
    ctx.beginPath(); ctx.moveTo(rx + pad, y); ctx.lineTo(rx + rw - pad, y); ctx.stroke();
  }
  // Direction arrow (pointing up = ascending)
  const ax = rx + rw / 2;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(ax, ry + rh - 14); ctx.lineTo(ax, ry + 16); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ax - 5, ry + 24); ctx.lineTo(ax, ry + 14); ctx.lineTo(ax + 5, ry + 24);
  ctx.stroke();
  // "上" label
  ctx.fillStyle = '#555555';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('上', ax + 8, ry + rh / 2);
}
