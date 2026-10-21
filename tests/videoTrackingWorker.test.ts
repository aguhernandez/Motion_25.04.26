import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackingRequest, TrackingResponse } from '../src/lib/videoTracking';
const fixture = vi.hoisted(() => ({ fps: 240, unsupported: false, failAt: -1, disposed: 0 }));
vi.mock('mediabunny', () => ({
  ALL_FORMATS: [],
  BlobSource: class {},
  Input: class {
    async getPrimaryVideoTrack() { return { canDecode: async () => !fixture.unsupported, getDisplayWidth: async () => 128, getDisplayHeight: async () => 128 }; }
    dispose() { fixture.disposed++; }
  },
  EncodedPacketSink: class {
    async *packets() {
      // Deliberately out of presentation order (as with B frames).
      for (let i = fixture.fps - 1; i >= 0; i--) yield { timestamp: i / fixture.fps, duration: 1 / fixture.fps };
    }
  },
  CanvasSink: class {
    async *canvasesAtTimestamps(times: number[]) {
      for (let i = 0; i < times.length; i++) {
        const data = new Uint8ClampedArray(128 * 128 * 4);
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
          const at = (y * 128 + x) * 4;
          const value = i === fixture.failAt ? 128 : 128 + 40 * Math.sin(x * 0.31) + 35 * Math.cos(y * 0.27) + 20 * Math.sin((x + y) * 0.17);
          data[at] = data[at + 1] = data[at + 2] = value; data[at + 3] = 255;
        }
        yield { timestamp: times[i] - 1e-7, canvas: { width: 128, height: 128, getContext: () => ({ getImageData: () => ({ data, width: 128, height: 128 }) }) } };
      }
    }
  },
}));

describe('sequential video analysis worker', () => {
  let messages: TrackingResponse[];
  let scope: { onmessage: (event: { data: TrackingRequest }) => Promise<void>; postMessage: (message: TrackingResponse) => void };
  beforeEach(async () => {
    messages = [];
    fixture.fps = 240; fixture.unsupported = false; fixture.failAt = -1; fixture.disposed = 0;
    scope = { onmessage: async () => {}, postMessage: (message) => messages.push(message) };
    vi.stubGlobal('self', scope);
    vi.resetModules();
    await import('../src/workers/frameAnalysis.worker');
  });
  const request = (limit: 60 | 120): TrackingRequest => ({ type: 'analyze', file: new Blob(['test']) as File, limit, startTime: 0, points: [{ id: 'a', label: 'a', x: 0.4, y: 0.4 }, { id: 'v', label: 'v', x: 0.5, y: 0.5 }, { id: 'b', label: 'b', x: 0.6, y: 0.4 }], configs: [{ name: 'angle', labelP1: 'a', labelVertex: 'v', labelP2: 'b' }], references: [] });
  it.each([60, 120])('processes every selected source frame at a %s FPS limit', async (limit) => {
    await scope.onmessage({ data: request(limit) });
    const samples = messages.flatMap((message) => message.type === 'batch' ? message.samples : []);
    expect(samples).toHaveLength(limit);
    expect(samples[0].time).toBe(0);
    expect(samples[1].time).toBeCloseTo(1 / limit);
    expect(samples.every((sample) => sample.angles.length === 1)).toBe(true);
    expect(messages.at(-1)).toEqual({ type: 'done', lost: false });
    expect(fixture.disposed).toBe(1);
  });
  it('preserves all 30 FPS frames even when 120 is requested', async () => {
    fixture.fps = 30;
    await scope.onmessage({ data: request(120) });
    expect(messages.flatMap((message) => message.type === 'batch' ? message.samples : [])).toHaveLength(30);
  });
  it('stops at an occlusion and excludes dependent angles from the failed sample', async () => {
    fixture.failAt = 3;
    await scope.onmessage({ data: request(120) });
    const samples = messages.flatMap((message) => message.type === 'batch' ? message.samples : []);
    expect(samples).toHaveLength(4);
    expect(samples[3].lostIds.length).toBeGreaterThan(0);
    expect(samples[3].angles).toEqual([]);
    expect(messages.at(-1)).toEqual({ type: 'done', lost: true });
  });
  it('reports unsupported codecs and disposes input resources', async () => {
    fixture.unsupported = true;
    await scope.onmessage({ data: request(120) });
    expect(messages).toEqual([{ type: 'error', message: 'UNSUPPORTED_CODEC' }]);
    expect(fixture.disposed).toBe(1);
  });
});
