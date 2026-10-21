import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVideoTracking } from '../src/hooks/useVideoTracking';
import type { TrackingResponse, TrackingSample } from '../src/lib/videoTracking';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: TrackingResponse }) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.instances.push(this); }
  emit(data: TrackingResponse) { this.onmessage?.({ data }); }
}
class FakeVideo extends EventTarget {
  currentTime = 0;
  seeking = false;
  pause = vi.fn();
}
const index = { timestamps: [0, 1 / 30, 2 / 30], duration: 0.1, sourceFps: 30, variableFrameRate: false, width: 1920, height: 1080 };
const sample = (time: number): TrackingSample => ({ time, points: [{ id: 'knee', label: 'Rodilla', x: 0.5, y: 0.5 }], angles: [], confidence: { knee: 1 }, lostIds: [] });

describe('analysis lifecycle and replay', () => {
  let hook: ReturnType<typeof useVideoTracking>;
  let view: ReturnType<typeof create>;
  let video: FakeVideo;
  let review: ReturnType<typeof vi.fn>;
  const file = new Blob(['test']) as File;
  let ref: { current: HTMLVideoElement };
  function Harness({ source = file }: { source?: File }) {
    hook = useVideoTracking(source, ref, review);
    return null;
  }
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    video = new FakeVideo(); ref = { current: video as unknown as HTMLVideoElement }; review = vi.fn();
    act(() => { view = create(React.createElement(Harness)); });
    act(() => { FakeWorker.instances[0].emit({ type: 'metadata', index }); });
  });
  afterEach(() => { act(() => view.unmount()); vi.unstubAllGlobals(); });

  it('collects samples, seeks to the final result and replays recorded positions', () => {
    act(() => hook.start(sample(0).points, [], [], 120));
    const job = FakeWorker.instances[1];
    expect(video.pause).toHaveBeenCalled();
    expect(job.postMessage.mock.calls[0][0]).toMatchObject({ type: 'analyze', limit: 120, startTime: 0 });
    act(() => { job.emit({ type: 'batch', samples: [sample(0), sample(1 / 30)], progress: 1 }); job.emit({ type: 'done', lost: false }); });
    expect(hook.status).toBe('complete');
    expect(hook.sampleCount).toBe(2);
    act(() => hook.applyAtTime(0));
    expect(review).toHaveBeenLastCalledWith(sample(0), 0);
    act(() => hook.applyAtTime(0.101));
    expect(review).toHaveBeenLastCalledWith(null, 0.101);
  });
  it('rejects late results from cancelled jobs', () => {
    act(() => hook.start(sample(0).points, [], [], 60));
    const old = FakeWorker.instances[1];
    act(() => hook.stop());
    act(() => old.emit({ type: 'batch', samples: [sample(0)], progress: 1 }));
    expect(hook.sampleCount).toBe(0);
    expect(hook.status).toBe('cancelled');
    expect(old.terminate).toHaveBeenCalled();
  });
  it('invalidates the corrected frame and future results while preserving prior measurements', () => {
    act(() => hook.start(sample(0).points, [], [], 120));
    act(() => { FakeWorker.instances[1].emit({ type: 'batch', samples: index.timestamps.map(sample), progress: 1 }); FakeWorker.instances[1].emit({ type: 'done', lost: true }); });
    expect(hook.status).toBe('lost');
    act(() => hook.correctAt(1 / 30));
    expect(hook.samples.current.map((item) => item.time)).toEqual([0]);
    video.currentTime = 1 / 30;
    act(() => hook.start(sample(0).points, [], [], 120));
    expect(FakeWorker.instances[2].postMessage.mock.calls[0][0].startTime).toBe(1 / 30);
  });
  it('terminates work and clears results when a new file is selected', () => {
    act(() => hook.start(sample(0).points, [], [], 120));
    const old = FakeWorker.instances[1];
    act(() => view.update(React.createElement(Harness, { source: new Blob(['new']) as File })));
    expect(old.terminate).toHaveBeenCalled();
    expect(hook.index).toBe(null);
    expect(hook.sampleCount).toBe(0);
    expect(hook.status).toBe('inspecting');
  });
  it('reports worker failures without presenting a completed analysis', () => {
    act(() => hook.start(sample(0).points, [], [], 120));
    act(() => FakeWorker.instances[1].emit({ type: 'error', message: 'UNSUPPORTED_CODEC' }));
    expect(hook.status).toBe('error');
    expect(hook.error).toBe('UNSUPPORTED_CODEC');
  });
});
