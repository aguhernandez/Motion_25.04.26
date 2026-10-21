import { fixture } from './videoFixture';
import type { TrackingRequest, TrackingResponse, TrackingSample } from '../src/lib/videoTracking';

const results = document.querySelector<HTMLPreElement>('#results')!;
const runButton = document.querySelector<HTMLButtonElement>('#run')!;

function analyze(request: TrackingRequest): Promise<TrackingSample[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../src/workers/frameAnalysis.worker.ts', import.meta.url), { type: 'module' });
    const records: TrackingSample[] = [];
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Analysis timed out')); }, 60000);
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    worker.onerror = (event) => { finish(); reject(new Error(event.message)); };
    worker.onmessage = (event: MessageEvent<TrackingResponse>) => {
      const message = event.data;
      if (message.type === 'batch') records.push(...message.samples);
      if (message.type === 'error') { finish(); reject(new Error(message.message)); }
      if (message.type === 'done') { finish(); if (message.lost) reject(new Error(`Tracking lost after ${records.length} frames`)); else resolve(records); }
    };
    worker.postMessage(request);
  });
}
runButton.onclick = async () => {
  runButton.disabled = true; results.textContent = 'Iniciando…\n';
  try {
    for (const fps of [30, 60, 120, 240]) {
      results.textContent += `Creando MP4 de ${fps} FPS…\n`;
      const file = await fixture(fps);
      if (fps === 240) document.querySelector<HTMLAnchorElement>('#fixture')!.href = URL.createObjectURL(file);
      for (const limit of [60, 120] as const) {
        const samples = await analyze({ type: 'analyze', file, limit, startTime: 0, points: [{ id: 'marker', label: 'Marker', x: 0.5, y: 0.5 }], configs: [], references: [] });
        const expected = Math.min(fps, limit);
        if (samples.length !== expected) throw new Error(`Expected ${expected}, got ${samples.length}`);
        const last = samples[samples.length - 1];
        const expectedX = 64 + last.time * 4;
        if (Math.abs(last.points[0].x * 128 - expectedX) > 1) throw new Error('Unexpected point trajectory');
        results.textContent += `PASS ${fps} → ${limit}: ${samples.length} muestras reales, trayectoria verificada\n`;
      }
    }
    results.textContent += 'TODAS LAS PRUEBAS PASARON';
  } catch (error) { results.textContent += `ERROR: ${error instanceof Error ? error.stack : String(error)}`; }
  finally { runButton.disabled = false; }
};
