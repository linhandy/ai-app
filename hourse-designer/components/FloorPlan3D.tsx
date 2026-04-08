'use client';

import React, { forwardRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { HouseDesign, Room, Door, Window as Win, FloorPlan } from '@/lib/types';

// ─── Geometry constants ──────────────────────────────────────────────────────
const EXT_WALL  = 0.24;  // exterior wall thickness (m)
const INT_WALL  = 0.12;  // interior wall thickness (m)
const FLOOR_T   = 0.15;  // floor slab thickness (m)
const ROOF_RISE = 1.5;   // gable roof ridge height (m)

// ─── Colour palette ─────────────────────────────────────────────────────────
const COLORS = {
  extWall:  '#D4CBC4',
  intWall:  '#E8E0D8',
  wallEdge: '#B8AFA5',
  floor:    '#F0EDE8',
  roof:     '#6B7280',
  roofEdge: '#4B5563',
  ground:   '#C8E6C0',
  window:   '#A5D8FF',
  door:     '#8B6F47',
};

const ROOM_COLORS: Record<string, string> = {
  '客厅': '#FFF8DC', '餐厅': '#FFF3E0', '厨房': '#F1F8E9',
  '主卧': '#E3F2FD', '次卧': '#EDE7F6', '卧室': '#EDE7F6',
  '书房': '#F3E5F5', '卫生间': '#E0F7FA', '楼梯间': '#FAFAFA',
  '走廊': '#F5F5F5', '阳台': '#E8F5E9', '玄关': '#FFF8E1',
  '车库': '#ECEFF1', '储藏室': '#EFEBE9', '衣帽间': '#FCE4EC',
  '老人房': '#FDE8D8', '其他': '#F5F5F5',
};

// ─── Wall segment builder (skip door/window openings) ────────────────────────
interface WallSeg { x: number; z: number; w: number; d: number; h: number; y: number; }

function buildWallSegments(
  wallX: number, wallZ: number,
  wallLen: number, wallThick: number,
  wallH: number, baseY: number,
  axis: 'x' | 'z',
  openings: { pos: number; width: number }[],
): WallSeg[] {
  // Sort openings by position along the wall
  const sorted = [...openings].sort((a, b) => a.pos - b.pos);
  const segs: WallSeg[] = [];
  let cursor = 0;

  for (const op of sorted) {
    const start = op.pos - op.width / 2;
    const end = op.pos + op.width / 2;
    if (start > cursor + 0.01) {
      const len = start - cursor;
      if (axis === 'x') {
        segs.push({ x: wallX + cursor + len / 2, z: wallZ, w: len, d: wallThick, h: wallH, y: baseY });
      } else {
        segs.push({ x: wallX, z: wallZ + cursor + len / 2, w: wallThick, d: len, h: wallH, y: baseY });
      }
    }
    cursor = Math.max(cursor, end);
  }

  // Remaining segment after last opening
  if (cursor < wallLen - 0.01) {
    const len = wallLen - cursor;
    if (axis === 'x') {
      segs.push({ x: wallX + cursor + len / 2, z: wallZ, w: len, d: wallThick, h: wallH, y: baseY });
    } else {
      segs.push({ x: wallX, z: wallZ + cursor + len / 2, w: wallThick, d: len, h: wallH, y: baseY });
    }
  }

  return segs;
}

// ─── Collect openings on a wall edge ─────────────────────────────────────────
function getOpenings(
  room: Room,
  wall: 'north' | 'south' | 'east' | 'west',
  doors: Door[],
  windows: Win[],
): { pos: number; width: number; type: 'door' | 'window' }[] {
  const result: { pos: number; width: number; type: 'door' | 'window' }[] = [];
  const len = (wall === 'north' || wall === 'south') ? room.width : room.height;
  for (const d of doors) {
    if (d.roomId === room.id && d.wall === wall) {
      result.push({ pos: len * d.position, width: d.widthMeters, type: 'door' });
    }
  }
  for (const w of windows) {
    if (w.roomId === room.id && w.wall === wall) {
      result.push({ pos: len * w.position, width: w.widthMeters, type: 'window' });
    }
  }
  return result;
}

// ─── WallMesh ────────────────────────────────────────────────────────────────
function WallMesh({ seg, color, edgeColor }: { seg: WallSeg; color: string; edgeColor: string }) {
  const geo = useMemo(() => new THREE.BoxGeometry(seg.w, seg.h, seg.d), [seg.w, seg.h, seg.d]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  return (
    <group position={[seg.x, seg.y + seg.h / 2, seg.z]}>
      <mesh castShadow receiveShadow geometry={geo}>
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>
    </group>
  );
}

// ─── Window fill (glass panel in opening) ────────────────────────────────────
function WindowFill({ x, y, z, w, h, axis }: { x: number; y: number; z: number; w: number; h: number; axis: 'x' | 'z' }) {
  return (
    <mesh position={[x, y + h / 2, z]}>
      <boxGeometry args={axis === 'x' ? [w, h * 0.7, 0.03] : [0.03, h * 0.7, w]} />
      <meshStandardMaterial color={COLORS.window} transparent opacity={0.5} roughness={0.1} metalness={0.1} />
    </mesh>
  );
}

// ─── Single floor assembly ───────────────────────────────────────────────────
function FloorAssembly({ floor, floorIdx, bw, bh, floorH }: {
  floor: FloorPlan; floorIdx: number; bw: number; bh: number; floorH: number;
}) {
  const baseY = floorIdx * floorH;
  const wallH = floorH - FLOOR_T;
  const rooms = floor.rooms ?? [];
  const doors = floor.doors ?? [];
  const windows = floor.windows ?? [];

  // ── Floor slab
  const slabElements = (
    <mesh position={[bw / 2, baseY - FLOOR_T / 2, bh / 2]} receiveShadow>
      <boxGeometry args={[bw, FLOOR_T, bh]} />
      <meshStandardMaterial color={COLORS.floor} roughness={0.9} />
    </mesh>
  );

  // ── Room floor color patches
  const roomPatches = rooms.map(room => (
    <mesh key={room.id + '-patch'} position={[room.x + room.width / 2, baseY + 0.005, room.y + room.height / 2]} receiveShadow>
      <boxGeometry args={[room.width - 0.02, 0.01, room.height - 0.02]} />
      <meshStandardMaterial color={ROOM_COLORS[room.type] ?? ROOM_COLORS['其他']} roughness={0.95} />
    </mesh>
  ));

  // ── Room labels (Billboard)
  const roomLabels = rooms.map(room => {
    const area = (room.width * room.height).toFixed(0);
    return (
      <Billboard key={room.id + '-label'} position={[room.x + room.width / 2, baseY + wallH * 0.3, room.y + room.height / 2]}>
        <Text fontSize={0.3} color="#374151" anchorX="center" anchorY="bottom" font="/fonts/NotoSansSC-Regular.otf">
          {room.name}
        </Text>
        <Text fontSize={0.22} color="#9CA3AF" anchorX="center" anchorY="top" position={[0, -0.05, 0]} font="/fonts/NotoSansSC-Regular.otf">
          {area}㎡
        </Text>
      </Billboard>
    );
  });

  // ── Walls with door/window openings
  const wallElements: React.ReactElement[] = [];
  const windowFills: React.ReactElement[] = [];

  for (const room of rooms) {
    // Determine which edges are exterior
    const isNorthExt = room.y < 0.01;
    const isSouthExt = Math.abs(room.y + room.height - bh) < 0.01;
    const isWestExt  = room.x < 0.01;
    const isEastExt  = Math.abs(room.x + room.width - bw) < 0.01;

    // For each wall of the room, build segments with openings cut out
    const wallConfigs: {
      wall: 'north' | 'south' | 'east' | 'west';
      startX: number; startZ: number;
      len: number; thick: number;
      axis: 'x' | 'z'; isExt: boolean;
    }[] = [
      { wall: 'north', startX: room.x, startZ: room.y, len: room.width, thick: isNorthExt ? EXT_WALL : INT_WALL, axis: 'x', isExt: isNorthExt },
      { wall: 'south', startX: room.x, startZ: room.y + room.height, len: room.width, thick: isSouthExt ? EXT_WALL : INT_WALL, axis: 'x', isExt: isSouthExt },
      { wall: 'west', startX: room.x, startZ: room.y, len: room.height, thick: isWestExt ? EXT_WALL : INT_WALL, axis: 'z', isExt: isWestExt },
      { wall: 'east', startX: room.x + room.width, startZ: room.y, len: room.height, thick: isEastExt ? EXT_WALL : INT_WALL, axis: 'z', isExt: isEastExt },
    ];

    for (const wc of wallConfigs) {
      const ops = getOpenings(room, wc.wall, doors, windows);
      const segs = buildWallSegments(
        wc.startX, wc.startZ,
        wc.len, wc.thick,
        wallH, baseY,
        wc.axis,
        ops.map(o => ({ pos: o.pos, width: o.width })),
      );

      for (let si = 0; si < segs.length; si++) {
        wallElements.push(
          <WallMesh
            key={`${room.id}-${wc.wall}-${si}`}
            seg={segs[si]}
            color={wc.isExt ? COLORS.extWall : COLORS.intWall}
            edgeColor={COLORS.wallEdge}
          />
        );
      }

      // Window glass fills
      for (const op of ops) {
        if (op.type === 'window') {
          const pos = op.pos;
          if (wc.axis === 'x') {
            windowFills.push(
              <WindowFill key={`wf-${room.id}-${wc.wall}-${pos}`}
                x={wc.startX + pos} y={baseY + wallH * 0.3} z={wc.startZ}
                w={op.width} h={wallH * 0.5} axis="x" />
            );
          } else {
            windowFills.push(
              <WindowFill key={`wf-${room.id}-${wc.wall}-${pos}`}
                x={wc.startX} y={baseY + wallH * 0.3} z={wc.startZ + pos}
                w={op.width} h={wallH * 0.5} axis="z" />
            );
          }
        }
      }
    }
  }

  return (
    <group>
      {slabElements}
      {roomPatches}
      {wallElements}
      {windowFills}
      {roomLabels}
    </group>
  );
}

// ─── Gable roof ──────────────────────────────────────────────────────────────
function GableRoof({ bw, bh, numFloors, floorH }: { bw: number; bh: number; numFloors: number; floorH: number }) {
  const baseY = numFloors * floorH;
  const ridgeY = baseY + ROOF_RISE;

  // Two triangular prism sides
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, baseY);
    s.lineTo(bw / 2, ridgeY);
    s.lineTo(bw, baseY);
    s.closePath();
    return s;
  }, [bw, baseY, ridgeY]);

  const extrudeSettings = useMemo(() => ({
    depth: bh + 0.3, // slight overhang
    bevelEnabled: false,
  }), [bh]);

  return (
    <group position={[-0.15, 0, -0.15]}>
      <mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY, bh + 0.15]}>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial color={COLORS.roof} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Auto camera ─────────────────────────────────────────────────────────────
function AutoCamera({ bw, bh, numFloors, floorH }: { bw: number; bh: number; numFloors: number; floorH: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const totalH = numFloors * floorH + ROOF_RISE;
    const maxDim = Math.max(bw, bh, totalH);
    const dist = maxDim * 2.0;
    const cx = bw / 2, cz = bh / 2;
    camera.position.set(cx + dist * 0.6, dist * 0.55, cz + dist * 0.5);
    camera.lookAt(cx, totalH * 0.35, cz);
  }, [bw, bh, numFloors, floorH, camera]);
  return null;
}

// ─── Scene ───────────────────────────────────────────────────────────────────
function Scene({ design, floorH }: { design: HouseDesign; floorH: number }) {
  const { buildingWidth: bw, buildingHeight: bh, floors } = design;
  const numFloors = floors.length;
  const totalH = numFloors * floorH + ROOF_RISE;

  return (
    <>
      <AutoCamera bw={bw} bh={bh} numFloors={numFloors} floorH={floorH} />

      {/* Lighting — 3-point + ambient */}
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#D6EAFF', '#BFD4A0', 0.5]} />
      <directionalLight
        position={[bw * 2, totalH * 2, bh * 1.5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={bw * 6}
        shadow-camera-left={-bw * 2}
        shadow-camera-right={bw * 2}
        shadow-camera-top={totalH * 2}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[-bw, totalH, -bh]} intensity={0.3} />
      <directionalLight position={[0, totalH * 0.5, bh * 2]} intensity={0.15} />

      {/* Ground plane (grass) */}
      <mesh position={[bw / 2, -0.02, bh / 2]} receiveShadow>
        <boxGeometry args={[bw + 10, 0.04, bh + 10]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.95} />
      </mesh>

      {/* Contact shadow for realistic grounding */}
      <ContactShadows
        position={[bw / 2, 0, bh / 2]}
        width={bw + 6} height={bh + 6}
        far={totalH + 5}
        opacity={0.35}
        blur={2}
      />

      {/* Per-floor assembly */}
      {floors.map((floor, fi) => (
        <FloorAssembly key={floor.floor} floor={floor} floorIdx={fi} bw={bw} bh={bh} floorH={floorH} />
      ))}

      {/* Roof slab (top floor ceiling) */}
      <mesh position={[bw / 2, numFloors * floorH - FLOOR_T / 2, bh / 2]} receiveShadow>
        <boxGeometry args={[bw, FLOOR_T, bh]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.9} />
      </mesh>

      {/* Gable roof */}
      <GableRoof bw={bw} bh={bh} numFloors={numFloors} floorH={floorH} />

      <OrbitControls
        target={[bw / 2, (numFloors * floorH) * 0.4, bh / 2]}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={100}
        maxPolarAngle={Math.PI * 0.85}
      />
    </>
  );
}

// ─── Public component ────────────────────────────────────────────────────────
interface Props {
  design: HouseDesign;
  floorHeight?: number;
}

const FloorPlan3D = forwardRef<SVGSVGElement, Props>(({ design, floorHeight = 3.0 }, _ref) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500, background: '#F3F4F6', position: 'relative' }}>
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Scene design={design} floorH={floorHeight} />
        </Suspense>
      </Canvas>
      <div style={{
        position: 'absolute', bottom: 12, right: 16,
        fontSize: 11, color: 'rgba(55,65,81,0.5)',
        fontFamily: 'monospace', pointerEvents: 'none',
        userSelect: 'none',
      }}>
        拖拽旋转 · 滚轮缩放 · 右键平移
      </div>
    </div>
  );
});

FloorPlan3D.displayName = 'FloorPlan3D';
export default FloorPlan3D;
