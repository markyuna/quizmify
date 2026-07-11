import { CanvasTexture, SRGBColorSpace } from "three";

// Simplified, hand-approximated continent outlines (not real coastline data)
// projected with a plain equirectangular projection. Good enough to make the
// globe read as "Earth" at gamification scale -- not meant for precision.
type ContinentDef = { points: [number, number][]; color: string; edge: string };

const CONTINENTS: ContinentDef[] = [
  {
    color: "#4d7c0f",
    edge: "#365314",
    points: [
      [71, -156], [70, -130], [60, -95], [49, -125], [45, -124], [32, -117],
      [23, -106], [15, -92], [9, -83], [7, -78], [10, -85], [18, -95],
      [25, -97], [30, -90], [35, -76], [45, -67], [47, -60], [60, -65],
      [70, -80],
    ],
  },
  {
    color: "#e0f2fe",
    edge: "#bae6fd",
    points: [[83, -35], [76, -20], [70, -25], [65, -40], [70, -55], [78, -65]],
  },
  {
    color: "#3f6212",
    edge: "#1a2e05",
    points: [
      [12, -72], [10, -65], [5, -52], [-5, -35], [-15, -39], [-23, -43],
      [-34, -54], [-40, -62], [-52, -69], [-55, -68], [-45, -73], [-30, -71],
      [-18, -70], [-4, -81], [4, -77],
    ],
  },
  {
    color: "#b45309",
    edge: "#78350f",
    points: [
      [37, 10], [32, 32], [22, 38], [12, 43], [2, 45], [-5, 40], [-15, 40],
      [-26, 33], [-34, 20], [-29, 17], [-22, 14], [-17, 12], [-6, 12], [4, 9],
      [10, -15], [15, -17], [21, -17], [28, -11], [35, -6],
    ],
  },
  {
    color: "#65a30d",
    edge: "#365314",
    points: [
      [71, 25], [65, 40], [55, 60], [45, 45], [43, 27], [41, 20], [38, 15],
      [43, 10], [48, 0], [52, -8], [58, 5], [60, 10], [66, 15],
    ],
  },
  {
    color: "#4d7c0f",
    edge: "#365314",
    points: [
      [77, 80], [70, 140], [60, 160], [45, 140], [35, 130], [22, 120],
      [10, 105], [1, 104], [8, 80], [20, 70], [25, 60], [35, 50], [40, 45],
      [45, 40], [55, 35], [65, 55], [70, 60],
    ],
  },
  {
    color: "#b45309",
    edge: "#78350f",
    points: [
      [-11, 131], [-14, 145], [-20, 149], [-27, 153], [-34, 151], [-38, 145],
      [-35, 138], [-32, 128], [-25, 114], [-18, 122],
    ],
  },
];

const OCEAN_COLOR = "#1e3a8a";
const ANTARCTICA_COLOR = "#e2e8f0";

function project(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

// Draws a rounded, organic coastline instead of a jagged straight-edge
// polygon by curving through the midpoint of each consecutive pair of
// points -- no extra coastline data needed, just smoother interpolation.
function drawSmoothPolygon(ctx: CanvasRenderingContext2D, points: [number, number][], width: number, height: number) {
  const pts = points.map(([lat, lng]) => project(lat, lng, width, height));
  const midpoint = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];

  ctx.beginPath();
  const start = midpoint(pts[pts.length - 1], pts[0]);
  ctx.moveTo(start[0], start[1]);

  for (let i = 0; i < pts.length; i++) {
    const current = pts[i];
    const next = pts[(i + 1) % pts.length];
    const mid = midpoint(current, next);
    ctx.quadraticCurveTo(current[0], current[1], mid[0], mid[1]);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawOceanShading(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = OCEAN_COLOR;
  ctx.fillRect(0, 0, width, height);

  // A couple of large, soft radial patches to break up the flat fill and
  // hint at ocean currents/depth without fighting the real scene lighting.
  const patches: [number, number, number, string][] = [
    [width * 0.25, height * 0.35, width * 0.35, "#2563eb"],
    [width * 0.75, height * 0.6, width * 0.3, "#1e40af"],
    [width * 0.5, height * 0.1, width * 0.25, "#3b82f6"],
  ];

  for (const [cx, cy, radius, color] of patches) {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalAlpha = 1;
}

function drawGrain(ctx: CanvasRenderingContext2D, width: number, height: number) {
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 1.4 + 0.3;
    ctx.globalAlpha = Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function createWorldMapTexture(maxAnisotropy = 1): CanvasTexture {
  const width = 2048;
  const height = 1024;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  drawOceanShading(ctx, width, height);

  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  for (const continent of CONTINENTS) {
    ctx.fillStyle = continent.color;
    ctx.strokeStyle = continent.edge;
    drawSmoothPolygon(ctx, continent.points, width, height);
  }

  // Antarctica as a simple ice band across the bottom of the projection.
  const iceGradient = ctx.createLinearGradient(0, height * 0.92, 0, height);
  iceGradient.addColorStop(0, "transparent");
  iceGradient.addColorStop(0.3, ANTARCTICA_COLOR);
  ctx.fillStyle = iceGradient;
  ctx.fillRect(0, height * 0.92, width, height * 0.08);

  drawGrain(ctx, width, height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;

  return texture;
}
