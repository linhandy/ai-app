'use client';

import { forwardRef, type ReactElement } from 'react';
import type { FloorPlan, Orientation, Room, Door, Window } from '@/lib/types';

// ─── Layout constants ─────────────────────────────────────────────────────────
const PX        = 50;    // pixels per metre
const MARGIN    = 90;    // canvas margin for dimension chains
const EXT_WALL  = 8;     // exterior wall stroke px
const INT_WALL  = 3;     // interior partition stroke px
const DOOR_CLR  = 6;     // extra clear on door gap

// ─── Colours ─────────────────────────────────────────────────────────────────
const BG        = '#FFFFFF';
const WALL_EXT  = '#1A1A1A';   // black exterior walls
const WALL_INT  = '#4B5563';   // dark-gray partitions
const DIM       = '#2563EB';   // blue dimension lines (standard CAD)
const WIN_CLR   = '#06B6D4';   // cyan windows
const DOOR_CLR2 = '#1A1A1A';   // door leaf
const MAIN_DOOR = '#DC2626';   // main entrance red
const TXT1      = '#1A1A1A';
const TXT2      = '#6B7280';
const GRID_DOT  = '#E5E7EB';

// ─── Pastel room fills ────────────────────────────────────────────────────────
const ROOM_FILL: Record<string, string> = {
  '客厅':   '#FFFBEB', '餐厅':   '#FFF7ED', '厨房':   '#F0FDF4',
  '主卧':   '#EFF6FF', '次卧':   '#F5F3FF', '卧室':   '#F5F3FF',
  '书房':   '#FAF5FF', '卫生间': '#ECFEFF', '楼梯间': '#F9FAFB',
  '走廊':   '#F9FAFB', '阳台':   '#F0FDF4', '玄关':   '#FFFBEB',
  '车库':   '#F8FAFC', '储藏室': '#F8FAFC', '衣帽间': '#FDF4FF',
  '其他':   '#F9FAFB',
};
const roomFill = (t: string) => ROOM_FILL[t] ?? ROOM_FILL['其他'];

// ─── Coordinate helpers ───────────────────────────────────────────────────────
const tx = (m: number) => MARGIN + m * PX;
const ty = (m: number) => MARGIN + m * PX;

// ─── Main SVG component ───────────────────────────────────────────────────────
interface Props {
  floor: FloorPlan;
  buildingWidth: number;
  buildingHeight: number;
  orientation: Orientation;
}

const FloorPlanSVG = forwardRef<SVGSVGElement, Props>(
  ({ floor, buildingWidth, buildingHeight, orientation }, ref) => {
    const svgW = buildingWidth * PX + MARGIN * 2;
    const svgH = buildingHeight * PX + MARGIN * 2;
    const bx = tx(0), by = ty(0);
    const bw = buildingWidth * PX, bh = buildingHeight * PX;

    return (
      <svg
        ref={ref}
        width={svgW} height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ background: BG, display: 'block' }}
      >
        {/* Faint grid */}
        <GridDots svgW={svgW} svgH={svgH} />

        {/* Room fills */}
        {floor.rooms.map(r => (
          <rect key={`f${r.id}`}
            x={tx(r.x) + INT_WALL / 2} y={ty(r.y) + INT_WALL / 2}
            width={r.width * PX - INT_WALL} height={r.height * PX - INT_WALL}
            fill={roomFill(r.type)} />
        ))}

        {/* Interior partition walls */}
        {floor.rooms.map(r => (
          <rect key={`w${r.id}`}
            x={tx(r.x)} y={ty(r.y)}
            width={r.width * PX} height={r.height * PX}
            fill="none" stroke={WALL_INT} strokeWidth={INT_WALL} strokeLinejoin="miter" />
        ))}

        {/* Exterior boundary (drawn over interior for clean corners) */}
        <rect x={bx} y={by} width={bw} height={bh}
          fill="none" stroke={WALL_EXT} strokeWidth={EXT_WALL} strokeLinejoin="miter" />

        {/* Windows */}
        {floor.windows.map(w => <WindowSymbol key={w.id} win={w} rooms={floor.rooms} />)}

        {/* Doors */}
        {floor.doors.map(d => <DoorSymbol key={d.id} door={d} rooms={floor.rooms} />)}

        {/* Room labels + areas */}
        {floor.rooms.map(r => <RoomLabel key={`l${r.id}`} room={r} />)}

        {/* ── Dimension chains ── */}
        {/* Top: overall + per-room widths for top-row rooms */}
        <DimChainH rooms={floor.rooms} buildingWidth={buildingWidth} bx={bx} by={by} top />
        {/* Bottom: overall + per-room widths for bottom-row rooms */}
        <DimChainH rooms={floor.rooms} buildingWidth={buildingWidth} bx={bx} by={by + bh} top={false} />
        {/* Left: overall + per-room heights for left-column rooms */}
        <DimChainV rooms={floor.rooms} buildingHeight={buildingHeight} bx={bx} by={by} left />
        {/* Right: overall + per-room heights for right-column rooms */}
        <DimChainV rooms={floor.rooms} buildingHeight={buildingHeight} bx={bx + bw} by={by} left={false} />

        {/* Compass */}
        <Compass x={svgW - 46} y={44} orientation={orientation} />

        {/* Floor label */}
        <text x={bx + 8} y={by + 20} fontSize={11} fontWeight={700} fill={WALL_EXT} fontFamily="monospace">
          {floor.label}
        </text>
      </svg>
    );
  }
);
FloorPlanSVG.displayName = 'FloorPlanSVG';
export default FloorPlanSVG;

// ─── Grid dots ────────────────────────────────────────────────────────────────
function GridDots({ svgW, svgH }: { svgW: number; svgH: number }) {
  const els: ReactElement[] = [];
  const step = 25;
  for (let x = step; x < svgW; x += step)
    for (let y = step; y < svgH; y += step)
      els.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} fill={GRID_DOT} />);
  return <g>{els}</g>;
}

// ─── Room label ───────────────────────────────────────────────────────────────
function RoomLabel({ room }: { room: Room }) {
  const cx = tx(room.x + room.width / 2);
  const cy = ty(room.y + room.height / 2);
  return (
    <g>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fontWeight={700}
        fill={TXT1} fontFamily="'PingFang SC','Microsoft YaHei',sans-serif">{room.name}</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9} fill={TXT2} fontFamily="monospace">
        {(room.width * room.height).toFixed(1)} m²
      </text>
    </g>
  );
}

// ─── Door symbol ──────────────────────────────────────────────────────────────
function DoorSymbol({ door, rooms }: { door: Door; rooms: Room[] }) {
  const room = rooms.find(r => r.id === door.roomId);
  if (!room) return null;
  const dpx = door.widthMeters * PX;
  const rx = tx(room.x), ry = ty(room.y);
  const rw = room.width * PX, rh = room.height * PX;
  const color = door.isMain ? MAIN_DOOR : DOOR_CLR2;

  let x1: number, y1: number, x2: number, y2: number, arcPath: string;

  if (door.wall === 'south' || door.wall === 'north') {
    const wy = door.wall === 'south' ? ry + rh : ry;
    const cx = rx + rw * door.position;
    x1 = cx - dpx / 2; x2 = cx + dpx / 2;
    y1 = y2 = wy;
    const sd = door.wall === 'south' ? 0 : 1;
    arcPath = `M ${x1} ${wy} A ${dpx} ${dpx} 0 0 ${sd} ${x2} ${wy}`;
    return (
      <g>
        <line x1={x1} y1={wy} x2={x2} y2={wy} stroke={BG} strokeWidth={EXT_WALL + DOOR_CLR} />
        <line x1={x1} y1={wy} x2={x2} y2={wy} stroke={color} strokeWidth={2} />
        <path d={arcPath} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity={0.8} />
      </g>
    );
  } else {
    const wx = door.wall === 'east' ? rx + rw : rx;
    const cy = ry + rh * door.position;
    y1 = cy - dpx / 2; y2 = cy + dpx / 2;
    x1 = x2 = wx;
    const sd = door.wall === 'east' ? 0 : 1;
    arcPath = `M ${wx} ${y1} A ${dpx} ${dpx} 0 0 ${sd} ${wx} ${y2}`;
    return (
      <g>
        <line x1={wx} y1={y1} x2={wx} y2={y2} stroke={BG} strokeWidth={EXT_WALL + DOOR_CLR} />
        <line x1={wx} y1={y1} x2={wx} y2={y2} stroke={color} strokeWidth={2} />
        <path d={arcPath} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity={0.8} />
      </g>
    );
  }
}

// ─── Window symbol (3 parallel lines) ────────────────────────────────────────
function WindowSymbol({ win, rooms }: { win: Window; rooms: Room[] }) {
  const room = rooms.find(r => r.id === win.roomId);
  if (!room) return null;
  const wpx = win.widthMeters * PX;
  const rx = tx(room.x), ry = ty(room.y);
  const rw = room.width * PX, rh = room.height * PX;
  const off = 3;

  if (win.wall === 'north' || win.wall === 'south') {
    const wy = win.wall === 'north' ? ry : ry + rh;
    const x1 = rx + rw * win.position - wpx / 2;
    const x2 = x1 + wpx;
    return (
      <g>
        <line x1={x1} y1={wy} x2={x2} y2={wy} stroke={BG} strokeWidth={INT_WALL + 4} />
        <line x1={x1} y1={wy - off} x2={x2} y2={wy - off} stroke={WIN_CLR} strokeWidth={1.5} />
        <line x1={x1} y1={wy}       x2={x2} y2={wy}       stroke={WIN_CLR} strokeWidth={3} />
        <line x1={x1} y1={wy + off} x2={x2} y2={wy + off} stroke={WIN_CLR} strokeWidth={1.5} />
      </g>
    );
  } else {
    const wx = win.wall === 'west' ? rx : rx + rw;
    const y1 = ry + rh * win.position - wpx / 2;
    const y2 = y1 + wpx;
    return (
      <g>
        <line x1={wx} y1={y1} x2={wx} y2={y2} stroke={BG} strokeWidth={INT_WALL + 4} />
        <line x1={wx - off} y1={y1} x2={wx - off} y2={y2} stroke={WIN_CLR} strokeWidth={1.5} />
        <line x1={wx}       y1={y1} x2={wx}       y2={y2} stroke={WIN_CLR} strokeWidth={3} />
        <line x1={wx + off} y1={y1} x2={wx + off} y2={y2} stroke={WIN_CLR} strokeWidth={1.5} />
      </g>
    );
  }
}

// ─── Dimension chain helpers ──────────────────────────────────────────────────

// Arrow-terminated dimension segment
function DimSeg({ x1, y1, x2, y2, label, perpOffset, vertical = false }:
  { x1: number; y1: number; x2: number; y2: number; label: string; perpOffset: number; vertical?: boolean }) {
  // perpOffset is how far from the reference edge (negative = outward above/left)
  const mid = vertical
    ? { x: x1 + perpOffset, y: (y1 + y2) / 2 }
    : { x: (x1 + x2) / 2,  y: y1 + perpOffset };
  const ax = vertical ? x1 + perpOffset : x1;
  const ay = vertical ? y1 : y1 + perpOffset;
  const bx = vertical ? x2 + perpOffset : x2;
  const by = vertical ? y2 : y2 + perpOffset;

  // Extension lines from edge to dim line
  const ext = 4;
  const exSign = perpOffset < 0 ? -1 : 1;

  return (
    <g>
      {/* Extension lines */}
      {!vertical && <>
        <line x1={x1} y1={y1} x2={x1} y2={ay + exSign * ext} stroke={DIM} strokeWidth={0.7} opacity={0.7} />
        <line x1={x2} y1={y2} x2={x2} y2={by + exSign * ext} stroke={DIM} strokeWidth={0.7} opacity={0.7} />
      </>}
      {vertical && <>
        <line x1={x1} y1={y1} x2={ax + exSign * ext} y2={y1} stroke={DIM} strokeWidth={0.7} opacity={0.7} />
        <line x1={x2} y1={y2} x2={bx + exSign * ext} y2={y2} stroke={DIM} strokeWidth={0.7} opacity={0.7} />
      </>}
      {/* Dim line */}
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={DIM} strokeWidth={0.8} />
      {/* Arrowheads */}
      {!vertical && <>
        <polygon points={`${ax},${ay} ${ax+6},${ay-2.5} ${ax+6},${ay+2.5}`} fill={DIM} />
        <polygon points={`${bx},${by} ${bx-6},${by-2.5} ${bx-6},${by+2.5}`} fill={DIM} />
      </>}
      {vertical && <>
        <polygon points={`${ax},${ay} ${ax-2.5},${ay+6} ${ax+2.5},${ay+6}`} fill={DIM} />
        <polygon points={`${bx},${by} ${bx-2.5},${by-6} ${bx+2.5},${by-6}`} fill={DIM} />
      </>}
      {/* Label */}
      <rect x={mid.x - 17} y={mid.y - 7} width={34} height={12} fill={BG} opacity={0.9} />
      <text x={mid.x} y={mid.y + 3.5} textAnchor="middle" fontSize={8} fill={DIM}
        fontFamily="monospace" fontWeight={600}>{label}</text>
    </g>
  );
}

function fmtM(m: number) { return `${m.toFixed(2)}m`; }

// Horizontal dimension chain (top or bottom)
function DimChainH({ rooms, buildingWidth, bx, by, top }:
  { rooms: Room[]; buildingWidth: number; bx: number; by: number; top: boolean }) {
  const baseY = by;
  const innerOff = top ? -16 : 16;   // inner chain (per-room)
  const outerOff = top ? -30 : 30;   // outer chain (total)

  // Rooms touching this edge
  const edgeRooms = top
    ? rooms.filter(r => r.y === 0).sort((a, b) => a.x - b.x)
    : rooms.filter(r => Math.abs(r.y + r.height - rooms.reduce((max, rr) => Math.max(max, rr.y + rr.height), 0)) < 0.01).sort((a, b) => a.x - b.x);

  return (
    <g>
      {/* Per-room widths */}
      {edgeRooms.map(r => (
        <DimSeg key={r.id}
          x1={bx + r.x * PX} y1={baseY}
          x2={bx + (r.x + r.width) * PX} y2={baseY}
          label={fmtM(r.width)} perpOffset={innerOff} />
      ))}
      {/* Total width */}
      <DimSeg
        x1={bx} y1={baseY} x2={bx + buildingWidth * PX} y2={baseY}
        label={fmtM(buildingWidth)} perpOffset={outerOff} />
    </g>
  );
}

// Vertical dimension chain (left or right)
function DimChainV({ rooms, buildingHeight, bx, by, left }:
  { rooms: Room[]; buildingHeight: number; bx: number; by: number; left: boolean }) {
  const baseX = bx;
  const innerOff = left ? -16 : 16;
  const outerOff = left ? -30 : 30;

  const maxX = rooms.reduce((max, r) => Math.max(max, r.x + r.width), 0);
  const edgeRooms = left
    ? rooms.filter(r => r.x === 0).sort((a, b) => a.y - b.y)
    : rooms.filter(r => Math.abs(r.x + r.width - maxX) < 0.01).sort((a, b) => a.y - b.y);

  return (
    <g>
      {edgeRooms.map(r => (
        <DimSeg key={r.id} vertical
          x1={baseX} y1={by + r.y * PX}
          x2={baseX} y2={by + (r.y + r.height) * PX}
          label={fmtM(r.height)} perpOffset={innerOff} />
      ))}
      <DimSeg vertical
        x1={baseX} y1={by} x2={baseX} y2={by + buildingHeight * PX}
        label={fmtM(buildingHeight)} perpOffset={outerOff} />
    </g>
  );
}

// ─── Compass ─────────────────────────────────────────────────────────────────
function Compass({ x, y, orientation }: { x: number; y: number; orientation: Orientation }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={20} fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1} />
      <text x={0} y={-8} textAnchor="middle" fontSize={8} fill={DIM} fontFamily="monospace" fontWeight={700}>N</text>
      <polygon points="0,-15 -3,-6 3,-6" fill={DIM} />
      <polygon points="0,15 -3,6 3,6" fill="#CBD5E1" />
      <text x={0} y={29} textAnchor="middle" fontSize={7.5} fill={TXT2} fontFamily="'PingFang SC',sans-serif">
        门朝{orientation}
      </text>
    </g>
  );
}
