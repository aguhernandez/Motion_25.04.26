import { describe, expect, it } from 'vitest';
import { OpticalFlowTracker } from '../src/lib/opticalFlow';

// A textured planar surface translated by a known number of pixels.
export function texturedFrame(shiftX = 0, shiftY = 0, blank = false): ImageData {
  const width = 128, height = 128;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = x - shiftX, sy = y - shiftY;
    const value = blank ? 128 : 128 + 40 * Math.sin(sx * 0.31) + 35 * Math.cos(sy * 0.27) + 20 * Math.sin((sx + sy) * 0.17);
    const i = (y * width + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

describe('continuous optical flow', () => {
  it('follows a point through a sequence with forward/backward validation', () => {
    const tracker = new OpticalFlowTracker();
    let point = { id: 'marker', x: 0.5, y: 0.5 };
    tracker.setFrame(texturedFrame());
    for (let frame = 1; frame <= 12; frame++) {
      const result = tracker.track(texturedFrame(frame, frame / 2), [point], true)[0];
      expect(result.lost).toBe(false);
      expect(result.x * 128).toBeCloseTo(64 + frame, 0);
      expect(result.y * 128).toBeCloseTo(64 + frame / 2, 0);
      point = result;
    }
  });
  it('marks a featureless or occluded region as lost', () => {
    const tracker = new OpticalFlowTracker();
    tracker.setFrame(texturedFrame());
    expect(tracker.track(texturedFrame(0, 0, true), [{ id: 'marker', x: 0.5, y: 0.5 }], true)[0].lost).toBe(true);
  });
  it('isolates independent tracking jobs and can restart after correction', () => {
    const first = new OpticalFlowTracker(), second = new OpticalFlowTracker();
    first.setFrame(texturedFrame()); second.setFrame(texturedFrame(10));
    expect(first.track(texturedFrame(1), [{ id: 'a', x: 0.5, y: 0.5 }], true)[0].x * 128).toBeCloseTo(65, 0);
    second.reset();
    expect(second.track(texturedFrame(), [{ id: 'b', x: 0.2, y: 0.3 }], true)[0]).toMatchObject({ x: 0.2, y: 0.3, lost: false });
  });
});
