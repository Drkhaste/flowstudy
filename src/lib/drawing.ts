import type { InkStroke, PaperStyle } from './types';

export interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

export function normalizePressure(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0.45;
  return Math.max(0.02, Math.min(1, value));
}

function pressureFactor(pressure: number, enabled: boolean): number {
  if (!enabled) return 1;
  const p = Math.max(0.02, Math.min(1, pressure));
  return 0.18 + Math.pow(p, 1.35) * 1.35;
}

function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const points = stroke.points;
  if (points.length === 0) return;

  const scale = canvasWidth / 760;
  const isEraser = stroke.tool === 'eraser';
  ctx.save();
  ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
  ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.27 : 1;
  ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : stroke.color;
  ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : stroke.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const first = points[0];
  if (!first) return;
  const firstWidth = stroke.width * scale * pressureFactor(first.pressure, stroke.pressureSensitive) * (stroke.tool === 'highlighter' ? 2.1 : 1);
  ctx.beginPath();
  ctx.arc(first.x * canvasWidth, first.y * canvasHeight, Math.max(0.35, firstWidth / 2), 0, Math.PI * 2);
  ctx.fill();

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    const averagePressure = (previous.pressure + current.pressure) / 2;
    const width = stroke.width * scale * pressureFactor(averagePressure, stroke.pressureSensitive) * (stroke.tool === 'highlighter' ? 2.1 : 1);

    ctx.lineWidth = Math.max(0.45, width);
    ctx.beginPath();
    ctx.moveTo(previous.x * canvasWidth, previous.y * canvasHeight);
    ctx.lineTo(current.x * canvasWidth, current.y * canvasHeight);
    ctx.stroke();

    // Small endpoint disks hide joins between variable-width segments.
    ctx.beginPath();
    ctx.arc(current.x * canvasWidth, current.y * canvasHeight, Math.max(0.35, width / 2), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function renderInk(
  canvas: HTMLCanvasElement,
  strokes: InkStroke[],
  activeStroke: InkStroke | null,
  size: CanvasSize,
): void {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

  for (const stroke of strokes) renderStroke(ctx, stroke, size.width, size.height);
  if (activeStroke) renderStroke(ctx, activeStroke, size.width, size.height);
}

export function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: PaperStyle,
): void {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  if (style === 'blank') return;

  ctx.save();
  ctx.strokeStyle = style === 'ruled' ? 'rgba(83, 142, 190, 0.20)' : 'rgba(115, 143, 158, 0.16)';
  ctx.fillStyle = 'rgba(115, 143, 158, 0.30)';
  ctx.lineWidth = 1;
  const step = Math.max(22, Math.round(width / 30));

  if (style === 'dots') {
    for (let y = step; y < height; y += step) {
      for (let x = step; x < width; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style === 'grid') {
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = step; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else {
    const lineStep = Math.max(30, Math.round(width / 22));
    for (let y = lineStep; y < height; y += lineStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function exportPaperAsPng(strokes: InkStroke[], paperStyle: PaperStyle): void {
  const width = 1520;
  const height = Math.round(width * 1.4142);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ساخت تصویر خروجی ممکن نشد.');

  drawPaperBackground(ctx, width, height, paperStyle);
  const inkLayer = document.createElement('canvas');
  inkLayer.width = width;
  inkLayer.height = height;
  renderInk(inkLayer, strokes, null, { width, height, dpr: 1 });
  ctx.drawImage(inkLayer, 0, 0);

  const link = document.createElement('a');
  link.download = `studyflow-pen-lab-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
