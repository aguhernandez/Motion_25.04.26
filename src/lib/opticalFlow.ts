export interface TrackedPoint {
  id: string;
  x: number;
  y: number;
  lost: boolean;
  confidence: number;
}

const WIN_HALF = 8;
const WIN_SIZE = WIN_HALF * 2 + 1;
const MAX_ITER = 20;
const EPSILON = 0.01;
const MIN_EIGENVALUE = 1e-4;

function buildPyramid(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  levels: number
): { data: Float32Array; w: number; h: number }[] {
  const pyramid: { data: Float32Array; w: number; h: number }[] = [];

  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  pyramid.push({ data: gray, w, h });

  for (let l = 1; l < levels; l++) {
    const prev = pyramid[l - 1];
    const nw = Math.floor(prev.w / 2);
    const nh = Math.floor(prev.h / 2);
    if (nw < 4 || nh < 4) break;
    const downsampled = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const sx = x * 2;
        const sy = y * 2;
        const idx00 = sy * prev.w + sx;
        const idx10 = sy * prev.w + Math.min(sx + 1, prev.w - 1);
        const idx01 = Math.min(sy + 1, prev.h - 1) * prev.w + sx;
        const idx11 = Math.min(sy + 1, prev.h - 1) * prev.w + Math.min(sx + 1, prev.w - 1);
        downsampled[y * nw + x] = (prev.data[idx00] + prev.data[idx10] + prev.data[idx01] + prev.data[idx11]) / 4;
      }
    }
    pyramid.push({ data: downsampled, w: nw, h: nh });
  }

  return pyramid;
}

function pyrLKSingle(
  prevPyr: { data: Float32Array; w: number; h: number }[],
  nextPyr: { data: Float32Array; w: number; h: number }[],
  px: number,
  py: number,
  levels: number
): { x: number; y: number; found: boolean; confidence: number } {
  let vx = 0;
  let vy = 0;

  for (let l = levels - 1; l >= 0; l--) {
    if (l >= prevPyr.length || l >= nextPyr.length) continue;
    const prev = prevPyr[l];
    const next = nextPyr[l];
    const scale = Math.pow(2, l);
    const lx = px / scale;
    const ly = py / scale;

    const Ix: number[] = [];
    const Iy: number[] = [];
    const It: number[] = [];

    for (let dy = -WIN_HALF; dy <= WIN_HALF; dy++) {
      for (let dx = -WIN_HALF; dx <= WIN_HALF; dx++) {
        const wx = lx + dx;
        const wy = ly + dy;
        const ix = (bilinearF(prev, wx + 1, wy) - bilinearF(prev, wx - 1, wy)) / 2;
        const iy = (bilinearF(prev, wx, wy + 1) - bilinearF(prev, wx, wy - 1)) / 2;
        const it = bilinearF(next, wx + vx, wy + vy) - bilinearF(prev, wx, wy);
        Ix.push(ix);
        Iy.push(iy);
        It.push(it);
      }
    }

    let Sxx = 0, Sxy = 0, Syy = 0;
    for (let k = 0; k < Ix.length; k++) {
      Sxx += Ix[k] * Ix[k];
      Sxy += Ix[k] * Iy[k];
      Syy += Iy[k] * Iy[k];
    }

    const det = Sxx * Syy - Sxy * Sxy;
    const trace = Sxx + Syy;
    const minEig = (trace - Math.sqrt(Math.max(0, trace * trace - 4 * det))) / 2;

    if (Math.abs(det) < 1e-6 || minEig < MIN_EIGENVALUE) {
      if (l > 0) { vx *= 2; vy *= 2; continue; }
      return { x: px, y: py, found: false, confidence: 0 };
    }

    let dvx = 0;
    let dvy = 0;

    for (let iter = 0; iter < MAX_ITER; iter++) {
      let Sbx = 0, Sby = 0;
      for (let k = 0; k < Ix.length; k++) {
        const dy2 = Math.floor(k / WIN_SIZE) - WIN_HALF;
        const dx2 = (k % WIN_SIZE) - WIN_HALF;
        const wx = lx + dx2;
        const wy = ly + dy2;
        const it = bilinearF(next, wx + vx + dvx, wy + vy + dvy) - bilinearF(prev, wx, wy);
        Sbx -= Ix[k] * it;
        Sby -= Iy[k] * it;
      }

      const ddx = (Syy * Sbx - Sxy * Sby) / det;
      const ddy = (Sxx * Sby - Sxy * Sbx) / det;
      dvx += ddx;
      dvy += ddy;

      if (Math.sqrt(ddx * ddx + ddy * ddy) < EPSILON) break;
    }

    vx = (vx + dvx) * 2;
    vy = (vy + dvy) * 2;

    if (l === 0) {
      vx /= 2;
      vy /= 2;
    }
  }

  const confidence = Math.min(1, Math.max(0, 1 - Math.sqrt(vx * vx + vy * vy) / 50));

  return {
    x: Math.max(0, Math.min(1, (px + vx) / prevPyr[0].w)),
    y: Math.max(0, Math.min(1, (py + vy) / prevPyr[0].h)),
    found: true,
    confidence,
  };
}

function bilinearF(
  layer: { data: Float32Array; w: number; h: number },
  x: number,
  y: number
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const { w, h, data } = layer;
  const dx = x - x0;
  const dy = y - y0;
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v));
  const p00 = data[clamp(y0, h) * w + clamp(x0, w)];
  const p10 = data[clamp(y0, h) * w + clamp(x1, w)];
  const p01 = data[clamp(y1, h) * w + clamp(x0, w)];
  const p11 = data[clamp(y1, h) * w + clamp(x1, w)];
  return p00 * (1 - dx) * (1 - dy) + p10 * dx * (1 - dy) + p01 * (1 - dx) * dy + p11 * dx * dy;
}

export class OpticalFlowTracker {
  private prevPyramid: { data: Float32Array; w: number; h: number }[] | null = null;
  private pyramidLevels = 4;
  private frameW = 0;
  private frameH = 0;

  setFrame(imageData: ImageData): void {
    this.frameW = imageData.width;
    this.frameH = imageData.height;
    this.prevPyramid = buildPyramid(imageData.data, imageData.width, imageData.height, this.pyramidLevels);
  }

  track(
    nextImageData: ImageData,
    points: { id: string; x: number; y: number }[],
    validate = false
  ): TrackedPoint[] {
    if (!this.prevPyramid) {
      this.setFrame(nextImageData);
      return points.map((p) => ({ ...p, lost: false, confidence: 1 }));
    }

    const nextPyramid = buildPyramid(
      nextImageData.data,
      nextImageData.width,
      nextImageData.height,
      this.pyramidLevels
    );

    const results: TrackedPoint[] = points.map((p) => {
      const px = p.x * this.frameW;
      const py = p.y * this.frameH;

      const result = pyrLKSingle(this.prevPyramid!, nextPyramid, px, py, this.prevPyramid!.length);

      // Reject drift and occlusions by tracking the result back to the source frame.
      const backward = validate && result.found
        ? pyrLKSingle(nextPyramid, this.prevPyramid!, result.x * nextImageData.width, result.y * nextImageData.height, nextPyramid.length)
        : null;
      const consistent = !validate || (backward?.found && Math.hypot(backward.x * this.frameW - px, backward.y * this.frameH - py) <= 2);
      return {
        id: p.id,
        x: result.found ? result.x : p.x,
        y: result.found ? result.y : p.y,
        lost: !result.found || !consistent,
        confidence: consistent ? result.confidence : 0,
      };
    });

    this.prevPyramid = nextPyramid;
    this.frameW = nextImageData.width;
    this.frameH = nextImageData.height;

    return results;
  }

  reset(): void {
    this.prevPyramid = null;
  }
}
