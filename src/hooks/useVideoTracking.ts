import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { KeyPoint, ReferenceRange } from '../lib/types';
import type { CyclingAngleConfig } from '../lib/angleCalculations';
import { frameIndexAtTime, truncateSamples } from '../lib/videoTracking';
import type { TrackingLimit, TrackingResponse, TrackingSample, VideoFrameIndex } from '../lib/videoTracking';

export type AnalysisStatus = 'empty' | 'inspecting' | 'ready' | 'running' | 'complete' | 'lost' | 'cancelled' | 'error';

export function useVideoTracking(file: File | null, videoRef: RefObject<HTMLVideoElement>, onReview: (sample: TrackingSample | null, time: number) => void) {
  const [index, setIndex] = useState<VideoFrameIndex | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('empty');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [sampleCount, setSampleCount] = useState(0);
  const samples = useRef<TrackingSample[]>([]);
  const sampleTimes = useRef<number[]>([]);
  const completed = useRef(false);
  const worker = useRef<Worker | null>(null);
  const onReviewRef = useRef(onReview);
  onReviewRef.current = onReview;
  const lastReview = useRef<TrackingSample | null>(null);
  const busy = status === 'running' || status === 'inspecting';

  const applyAtTime = useCallback((time: number, force = false) => {
    const records = samples.current;
    const position = frameIndexAtTime(sampleTimes.current, time);
    const last = records[records.length - 1];
    const lastSourceIndex = last && index ? frameIndexAtTime(index.timestamps, last.time) : -1;
    const end = completed.current ? index?.duration ?? 0 : last && index ? index.timestamps[lastSourceIndex + 1] ?? index.duration : 0;
    const sample = position >= 0 && time < end ? records[position] : null;
    if (force || sample !== lastReview.current) {
      lastReview.current = sample;
      onReviewRef.current(sample, time);
    }
  }, [index]);

  const stop = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
    setStatus((current) => current === 'running' ? 'cancelled' : current);
  }, []);

  const clear = useCallback(() => {
    stop();
    completed.current = false;
    samples.current = [];
    sampleTimes.current = [];
    lastReview.current = null;
    setSampleCount(0);
    setProgress(0);
    setError('');
    setStatus(index ? 'ready' : 'empty');
  }, [index, stop]);

  useEffect(() => {
    completed.current = false;
    samples.current = [];
    sampleTimes.current = [];
    lastReview.current = null;
    setIndex(null);
    setSampleCount(0);
    setProgress(0);
    setError('');
    if (!file) { setStatus('empty'); return; }
    setStatus('inspecting');
    const instance = new Worker(new URL('../workers/frameAnalysis.worker.ts', import.meta.url), { type: 'module' });
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<TrackingResponse>) => {
      if (worker.current !== instance) return;
      if (event.data.type === 'metadata') {
        setIndex(event.data.index);
        setStatus('ready');
        instance.terminate();
        worker.current = null;
      } else if (event.data.type === 'error') {
        setError(event.data.message);
        setStatus('error');
        instance.terminate();
        worker.current = null;
      }
    };
    instance.onerror = () => { setError('WORKER_ERROR'); setStatus('error'); instance.terminate(); worker.current = null; };
    instance.postMessage({ type: 'inspect', file });
    return () => { worker.current?.terminate(); worker.current = null; };
  }, [file]);

  const start = useCallback((points: KeyPoint[], configs: CyclingAngleConfig[], references: ReferenceRange[], limit: TrackingLimit) => {
    const video = videoRef.current;
    if (!file || !index || !video || !points.length) return;
    worker.current?.terminate();
    video.pause();
    const frameIndex = Math.max(0, frameIndexAtTime(index.timestamps, video.currentTime));
    const startTime = index.timestamps[frameIndex];
    completed.current = false;
    samples.current = truncateSamples(samples.current, startTime);
    sampleTimes.current = samples.current.map((sample) => sample.time);
    setSampleCount(samples.current.length);
    lastReview.current = null;
    setProgress(0);
    setError('');
    setStatus('running');
    const instance = new Worker(new URL('../workers/frameAnalysis.worker.ts', import.meta.url), { type: 'module' });
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<TrackingResponse>) => {
      if (worker.current !== instance) return;
      const message = event.data;
      if (message.type === 'batch') {
        samples.current.push(...message.samples);
        sampleTimes.current.push(...message.samples.map((sample) => sample.time));
        setSampleCount(samples.current.length);
        setProgress(message.progress);
      } else if (message.type === 'done') {
        completed.current = !message.lost;
        const last = samples.current[samples.current.length - 1];
        if (last) {
          video.currentTime = last.time + 1e-7;
          onReviewRef.current(last, last.time);
          lastReview.current = last;
        }
        setStatus(message.lost ? 'lost' : 'complete');
        instance.terminate();
        worker.current = null;
      } else if (message.type === 'error') {
        setError(message.message);
        setStatus('error');
        instance.terminate();
        worker.current = null;
      }
    };
    instance.onerror = () => { setError('WORKER_ERROR'); setStatus('error'); instance.terminate(); worker.current = null; };
    instance.postMessage({ type: 'analyze', file, limit, startTime, points, configs, references });
  }, [file, index, videoRef]);

  const correctAt = useCallback((time: number) => {
    stop();
    completed.current = false;
    samples.current = truncateSamples(samples.current, time);
    sampleTimes.current = samples.current.map((sample) => sample.time);
    lastReview.current = null;
    setSampleCount(samples.current.length);
    setStatus(index ? 'ready' : 'empty');
  }, [index, stop]);

  // Review stored measurements at decoded media times, without running optical flow again.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !file) return;
    let frameId = 0;
    let animationId = 0;
    let disposed = false;
    const review = () => { if (!busy && !video.seeking) applyAtTime(video.currentTime); };
    const onSeeked = () => { if (!busy) applyAtTime(video.currentTime, true); };
    const frameLoop: VideoFrameRequestCallback = (_now, metadata) => {
      if (disposed) return;
      if (!busy) applyAtTime(metadata.mediaTime);
      frameId = video.requestVideoFrameCallback(frameLoop);
    };
    const fallback = () => { review(); animationId = requestAnimationFrame(fallback); };
    if (typeof video.requestVideoFrameCallback === 'function') frameId = video.requestVideoFrameCallback(frameLoop);
    else animationId = requestAnimationFrame(fallback);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', review);
    return () => {
      disposed = true;
      if (frameId) video.cancelVideoFrameCallback(frameId);
      cancelAnimationFrame(animationId);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', review);
    };
  }, [file, busy, applyAtTime, videoRef]);

  return { index, status, busy, progress, error, sampleCount, samples, sampleTimes, start, stop, clear, correctAt, applyAtTime };
}
