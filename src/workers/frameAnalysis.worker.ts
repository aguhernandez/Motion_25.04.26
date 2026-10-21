import { Input, BlobSource, ALL_FORMATS, EncodedPacketSink, CanvasSink } from 'mediabunny';
import { OpticalFlowTracker } from '../lib/opticalFlow';
import { computeAnglesFromPoints } from '../lib/angleCalculations';
import { describeFrameRate, sampleFrameTimes } from '../lib/videoTracking';
import type { TrackingRequest, TrackingResponse, TrackingSample, VideoFrameIndex } from '../lib/videoTracking';

const send = (message: TrackingResponse) => self.postMessage(message);

self.onmessage = async (event: MessageEvent<TrackingRequest>) => {
  const request = event.data;
  const input = new Input({ source: new BlobSource(request.file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('NO_VIDEO');
    if (!(await track.canDecode())) throw new Error('UNSUPPORTED_CODEC');
    const timestamps: number[] = [];
    let duration = 0;
    for await (const packet of new EncodedPacketSink(track).packets(undefined, undefined, { metadataOnly: true })) {
      if (packet.timestamp >= 0) timestamps.push(packet.timestamp);
      duration = Math.max(duration, packet.timestamp + packet.duration);
      if (timestamps.length > 1_000_000) throw new Error('TOO_LONG');
    }
    const times = [...new Set(timestamps)].sort((a, b) => a - b);
    if (!times.length) throw new Error('NO_FRAMES');
    const width = await track.getDisplayWidth();
    const height = await track.getDisplayHeight();
    const index: VideoFrameIndex = { timestamps: times, duration, width, height, ...describeFrameRate(times) };
    send({ type: 'metadata', index });
    if (request.type === 'inspect') return;
    if (!request.points.length) throw new Error('NO_POINTS');
    const selectedTimes = sampleFrameTimes(times, request.limit, request.startTime);
    if (!selectedTimes.length) throw new Error('NO_FRAMES');
    const scale = Math.min(1, 1280 / Math.max(width, height));
    const sink = new CanvasSink(track, { width: Math.round(width * scale), height: Math.round(height * scale), poolSize: 2, fit: 'fill' });
    const tracker = new OpticalFlowTracker();
    let points = request.points.map((point) => ({ ...point }));
    let batch: TrackingSample[] = [];
    let count = 0;
    let previousTimestamp = -Infinity;
    let lastFlush = performance.now();
    // Sequential decoding is independent of playback speed or the monitor refresh rate.
    for await (const frame of sink.canvasesAtTimestamps(selectedTimes.map((time) => time + 1e-7))) {
      if (!frame || frame.timestamp <= previousTimestamp || Math.abs(frame.timestamp - selectedTimes[count]) > 1e-4) throw new Error('MISSING_FRAME');
      previousTimestamp = frame.timestamp;
      const context = frame.canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (!context) throw new Error('NO_CANVAS');
      const image = context.getImageData(0, 0, frame.canvas.width, frame.canvas.height);
      const results = tracker.track(image, points, true);
      const lostIds = results.filter((point) => point.lost || point.confidence < 0.05).map((point) => point.id);
      points = points.map((point) => {
        const result = results.find((item) => item.id === point.id);
        return result && !lostIds.includes(point.id) ? { ...point, x: result.x, y: result.y } : point;
      });
      const validPoints = points.filter((point) => !lostIds.includes(point.id));
      batch.push({ time: frame.timestamp, points, angles: computeAnglesFromPoints(validPoints, request.configs, request.references, { width, height }), confidence: Object.fromEntries(results.map((point) => [point.id, point.confidence])), lostIds });
      count++;
      if (lostIds.length || performance.now() - lastFlush > 100 || count === selectedTimes.length) {
        send({ type: 'batch', samples: batch, progress: count / selectedTimes.length });
        batch = [];
        lastFlush = performance.now();
      }
      if (lostIds.length) {
        send({ type: 'done', lost: true });
        return;
      }
    }
    if (count !== selectedTimes.length) throw new Error('MISSING_FRAME');
    if (batch.length) send({ type: 'batch', samples: batch, progress: 1 });
    send({ type: 'done', lost: false });
  } catch (error) {
    console.error('Video analysis failed:', error);
    send({ type: 'error', message: error instanceof Error ? error.message : 'DECODE_ERROR' });
  } finally {
    input.dispose();
  }
};
