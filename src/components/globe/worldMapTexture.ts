import { CanvasTexture, SRGBColorSpace } from "three";

// Simplified, hand-approximated continent outlines (not real coastline data)
// projected with a plain equirectangular projection. Good enough to make the
// globe read as "Earth" at gamification scale -- not meant for precision.
const CONTINENTS: [number, number][][] = [
  // North America
  [
    [71, -156], [70, -130], [60, -95], [49, -125], [45, -124], [32, -117],
    [23, -106], [15, -92], [9, -83], [7, -78], [10, -85], [18, -95],
    [25, -97], [30, -90], [35, -76], [45, -67], [47, -60], [60, -65],
    [70, -80],
  ],
  // Greenland
  [[83, -35], [76, -20], [70, -25], [65, -40], [70, -55], [78, -65]],
  // South America
  [
    [12, -72], [10, -65], [5, -52], [-5, -35], [-15, -39], [-23, -43],
    [-34, -54], [-40, -62], [-52, -69], [-55, -68], [-45, -73], [-30, -71],
    [-18, -70], [-4, -81], [4, -77],
  ],
  // Africa
  [
    [37, 10], [32, 32], [22, 38], [12, 43], [2, 45], [-5, 40], [-15, 40],
    [-26, 33], [-34, 20], [-29, 17], [-22, 14], [-17, 12], [-6, 12], [4, 9],
    [10, -15], [15, -17], [21, -17], [28, -11], [35, -6],
  ],
  // Europe
  [
    [71, 25], [65, 40], [55, 60], [45, 45], [43, 27], [41, 20], [38, 15],
    [43, 10], [48, 0], [52, -8], [58, 5], [60, 10], [66, 15],
  ],
  // Asia
  [
    [77, 80], [70, 140], [60, 160], [45, 140], [35, 130], [22, 120],
    [10, 105], [1, 104], [8, 80], [20, 70], [25, 60], [35, 50], [40, 45],
    [45, 40], [55, 35], [65, 55], [70, 60],
  ],
  // Australia
  [
    [-11, 131], [-14, 145], [-20, 149], [-27, 153], [-34, 151], [-38, 145],
    [-35, 138], [-32, 128], [-25, 114], [-18, 122],
  ],
];

const OCEAN_COLOR = "#1e3a8a";
const LAND_COLOR = "#3f6212";
const LAND_EDGE_COLOR = "#65a30d";
const ANTARCTICA_COLOR = "#cbd5e1";

function project(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

function drawPolygon(ctx: CanvasRenderingContext2D, points: [number, number][], width: number, height: number) {
  ctx.beginPath();
  points.forEach(([lat, lng], i) => {
    const [x, y] = project(lat, lng, width, height);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function createWorldMapTexture(): CanvasTexture {
  const width = 2048;
  const height = 1024;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = OCEAN_COLOR;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = LAND_COLOR;
  ctx.strokeStyle = LAND_EDGE_COLOR;
  ctx.lineWidth = 2;
  for (const continent of CONTINENTS) {
    drawPolygon(ctx, continent, width, height);
  }

  // Antarctica as a simple ice band across the bottom of the projection.
  ctx.fillStyle = ANTARCTICA_COLOR;
  ctx.fillRect(0, height * 0.94, width, height * 0.06);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}
