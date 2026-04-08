import type { HouseDesign, FloorPlan } from './types';

// Simple DXF R12 generator — lines, rectangles, text
// Units: meters

function dxfHeader(): string {
  return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n`;
}

function dxfEntityLayer(layer: string): string {
  return `8\n${layer}\n`;
}

function dxfLine(x1: number, y1: number, x2: number, y2: number, layer = '0'): string {
  return `0\nLINE\n${dxfEntityLayer(layer)}10\n${x1.toFixed(4)}\n20\n${y1.toFixed(4)}\n30\n0.0\n11\n${x2.toFixed(4)}\n21\n${y2.toFixed(4)}\n31\n0.0\n`;
}

function dxfText(x: number, y: number, text: string, height = 0.3, layer = 'TEXT'): string {
  return `0\nTEXT\n${dxfEntityLayer(layer)}10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n40\n${height.toFixed(4)}\n1\n${text}\n72\n1\n11\n${x.toFixed(4)}\n21\n${y.toFixed(4)}\n31\n0.0\n`;
}

function dxfRect(x: number, y: number, w: number, h: number, layer = '0'): string {
  // DXF Y is inverted (positive up), so we flip: y → -y
  const fy = -y;
  return (
    dxfLine(x, fy, x + w, fy, layer) +
    dxfLine(x + w, fy, x + w, fy - h, layer) +
    dxfLine(x + w, fy - h, x, fy - h, layer) +
    dxfLine(x, fy - h, x, fy, layer)
  );
}

function floorToDXF(floor: FloorPlan, yOffset: number): string {
  let entities = '';

  // Building outline (rooms provide the envelope; draw each room)
  for (const room of floor.rooms) {
    entities += dxfRect(room.x, room.y + yOffset, room.width, room.height, 'WALLS');
    // Room label
    entities += dxfText(
      room.x + room.width / 2,
      -(room.y + yOffset + room.height / 2),
      `${room.name}(${(room.width * room.height).toFixed(1)}m²)`,
      0.25,
      'TEXT',
    );
  }

  // Floor label
  entities += dxfText(-1, -(yOffset + 5), floor.label, 0.5, 'LABELS');

  return entities;
}

export function generateDXF(design: HouseDesign): string {
  let entities = '';

  // Stack floors vertically with gap
  const gap = 3; // meters gap between floors in DXF layout
  let yOffset = 0;
  for (const floor of design.floors) {
    entities += floorToDXF(floor, yOffset);
    yOffset += design.buildingHeight + gap;
  }

  const dxf =
    dxfHeader() +
    `0\nSECTION\n2\nTABLES\n` +
    `0\nTABLE\n2\nLAYER\n70\n3\n` +
    `0\nLAYER\n2\nWALLS\n70\n0\n62\n7\n6\nCONTINUOUS\n` +
    `0\nLAYER\n2\nTEXT\n70\n0\n62\n3\n6\nCONTINUOUS\n` +
    `0\nLAYER\n2\nLABELS\n70\n0\n62\n5\n6\nCONTINUOUS\n` +
    `0\nENDTAB\n0\nENDSEC\n` +
    `0\nSECTION\n2\nENTITIES\n` +
    entities +
    `0\nENDSEC\n0\nEOF\n`;

  return dxf;
}

export function downloadDXF(design: HouseDesign, filename: string) {
  const content = generateDXF(design);
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
