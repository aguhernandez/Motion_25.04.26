import { useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { KeyPoint, ReferenceRange } from '../../lib/types';
import type { CyclingAngleConfig } from '../../lib/angleCalculations';
import type { TrackingLimit } from '../../lib/videoTracking';
import { frameIndexAtTime, trackingCsv } from '../../lib/videoTracking';
import type { useVideoTracking } from '../../hooks/useVideoTracking';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

type Tracking = ReturnType<typeof useVideoTracking>;
interface Props {
  tracking: Tracking;
  videoRef: RefObject<HTMLVideoElement>;
  points: KeyPoint[];
  configs: CyclingAngleConfig[];
  references: ReferenceRange[];
  limit: TrackingLimit;
  onLimitChange: (limit: TrackingLimit) => void;
  onStart: () => void;
  onTrajectoryChange: (pointId: string) => void;
  lostPointIds: string[];
  fileName: string;
}

const errorText: Record<string, [string, string]> = {
  NO_VIDEO: ['El archivo no contiene una pista de video.', 'The file contains no video track.'],
  UNSUPPORTED_CODEC: ['Este navegador no permite decodificar este video. Prueba MP4 H.264 o WebM en un navegador compatible con WebCodecs.', 'This browser cannot decode this video. Try H.264 MP4 or WebM in a WebCodecs-compatible browser.'],
  TOO_LONG: ['El video supera un millón de fotogramas. Recorta el tramo que quieras analizar.', 'The video exceeds one million frames. Trim the segment you want to analyze.'],
  NO_FRAMES: ['No se encontraron fotogramas para analizar.', 'No frames were found to analyze.'],
};

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function VideoTrackingPanel({ tracking, videoRef, points, configs, references, limit, onLimitChange, onStart, onTrajectoryChange, lostPointIds, fileName }: Props) {
  const { language, darkMode } = useT();
  const es = language === 'es';
  const th = getTheme(darkMode);
  const [metric, setMetric] = useState('');

  const samples = tracking.samples.current;
  const choices = [...configs.map((config) => ({ value: `angle:${config.name}`, label: `${config.name} (°)` })), ...points.flatMap((point) => [
    { value: `x:${point.id}`, label: `${point.label} X (px)` }, { value: `y:${point.id}`, label: `${point.label} Y (px)` },
  ])];
  const selectedMetric = choices.some((choice) => choice.value === metric) ? metric : choices[0]?.value ?? '';
  const series = useMemo(() => {
    const [type, ...rest] = selectedMetric.split(':');
    const id = rest.join(':');
    const values = tracking.samples.current.slice(0, tracking.sampleCount).map((sample) => {
      if (type === 'angle') return sample.angles.find((angle) => angle.name === id)?.value_deg;
      if (sample.lostIds.includes(id)) return undefined;
      const point = sample.points.find((item) => item.id === id);
      return point ? (type === 'x' ? point.x * (tracking.index?.width ?? 1) : point.y * (tracking.index?.height ?? 1)) : undefined;
    });
    const finite = values.filter((value): value is number => value !== undefined);
    return { values, min: finite.reduce((min, value) => Math.min(min, value), Infinity), max: finite.reduce((max, value) => Math.max(max, value), -Infinity) };
  }, [selectedMetric, tracking.samples, tracking.sampleCount, tracking.index]);
  const firstTime = samples[0]?.time ?? 0;
  const endTime = samples[samples.length - 1]?.time ?? firstTime;
  const segments: string[] = [];
  let segment = '';
  const stride = Math.max(1, Math.ceil(samples.length / 1000));
  for (let i = 0; i < samples.length; i++) {
    const value = series.values[i];
    if (value === undefined) { if (segment) segments.push(segment); segment = ''; continue; }
    if (i % stride && i !== samples.length - 1) continue;
    const x = 10 + (samples[i].time - firstTime) / (endTime - firstTime || 1) * 580;
    const y = 130 - (value - series.min) / (series.max - series.min || 1) * 110;
    segment += `${x},${y} `;
  }
  if (segment) segments.push(segment);
  const seekSample = (index: number) => {
    const sample = samples[index];
    if (sample && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = sample.time + 1e-7;
      tracking.applyAtTime(sample.time, true);
    }
  };
  const statuses = {
    empty: es ? 'Selecciona un video' : 'Select a video',
    inspecting: es ? 'Leyendo los fotogramas del archivo…' : 'Reading file frames…',
    ready: es ? 'Listo para analizar' : 'Ready to analyze',
    running: es ? 'Analizando…' : 'Analyzing…',
    complete: es ? 'Análisis completado' : 'Analysis complete',
    lost: es ? 'Seguimiento perdido: corrige los puntos y continúa desde este fotograma.' : 'Tracking lost: correct the points and continue from this frame.',
    cancelled: es ? 'Detenido. Se conservan las muestras procesadas.' : 'Stopped. Processed samples are retained.',
    error: es ? 'No se pudo completar el análisis.' : 'The analysis could not be completed.',
  };
  const inputStyle = { background: th.inputBg, color: th.inputText, border: `1px solid ${th.inputBorder}` };
  return <section className="space-y-3 p-3 rounded-xl" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
    <h3 className="text-sm font-semibold" style={{ color: th.title }}>{es ? 'Seguimiento por fotogramas' : 'Frame-by-frame tracking'}</h3>
    <p className="text-xs" style={{ color: th.sub }}>{es ? 'Coloca los puntos, pausa en el fotograma inicial y analiza desde allí hasta el final. El video permanece en tu dispositivo.' : 'Place the points, pause at the starting frame and analyze from there to the end. The video stays on your device.'}</p>
    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: th.rowText }}>
      <label>{es ? 'Límite de análisis ' : 'Analysis limit '}<select aria-label={es ? 'Límite de análisis FPS' : 'Analysis FPS limit'} value={limit} disabled={tracking.busy} onChange={(event) => onLimitChange(Number(event.target.value) as TrackingLimit)} className="rounded px-2 py-1" style={inputStyle}>
        <option value={60}>60 FPS</option><option value={120}>120 FPS</option>
      </select></label>
      {tracking.index && <span>{es ? 'Original' : 'Source'}: {tracking.index.sourceFps.toFixed(2)} FPS{tracking.index.variableFrameRate ? ' (VFR)' : ''} · {es ? 'Análisis' : 'Analysis'}: ≤ {Math.min(limit, tracking.index.sourceFps).toFixed(2)} FPS</span>}
      <button type="button" disabled={tracking.busy || !tracking.index || !points.length || lostPointIds.length > 0} onClick={onStart} className="rounded-lg px-3 py-2 font-semibold disabled:opacity-40" style={{ background: '#fdda36', color: '#514163' }}>{es ? 'Analizar desde este fotograma' : 'Analyze from this frame'}</button>
      {tracking.status === 'running' && <button type="button" onClick={tracking.stop} className="rounded-lg px-3 py-2" style={inputStyle}>{es ? 'Detener' : 'Stop'}</button>}
    </div>
    <p role="status" className="text-xs" style={{ color: tracking.status === 'lost' || tracking.status === 'error' ? '#f59e0b' : th.sub }}>{statuses[tracking.status]} · {tracking.sampleCount} {es ? 'muestras' : 'samples'}{tracking.status === 'running' ? ` · ${Math.round(tracking.progress * 100)}%` : ''}</p>
    {tracking.status === 'running' && <progress aria-label={es ? 'Progreso del análisis' : 'Analysis progress'} value={tracking.progress} max={1} className="w-full" />}
    {tracking.error && <p role="alert" className="text-xs text-red-400">{errorText[tracking.error]?.[es ? 0 : 1] ?? (es ? 'No se pudo decodificar el video. Prueba otro formato o navegador compatible con WebCodecs.' : 'Could not decode the video. Try another format or a WebCodecs-compatible browser.')}</p>}
    {lostPointIds.length ? <p className="text-xs text-amber-400">{es ? 'Revisar' : 'Review'}: {points.filter((point) => lostPointIds.includes(point.id)).map((point) => point.label).join(', ')}. {es ? 'Los ángulos que dependen de estos puntos no se registran como válidos.' : 'Angles depending on these points are not recorded as valid.'}</p> : null}
    <p className="text-xs" style={{ color: th.sub }}>{es ? '30 FPS se conserva; 240 FPS se muestrea hasta 120. No se interpolan imágenes. El análisis puede tardar más que la duración del video. Descarga los resultados antes de cerrar la página.' : '30 FPS is preserved; 240 FPS is sampled up to 120. No frames are interpolated. Analysis may take longer than the video duration. Download results before closing the page.'}</p>
    {samples.length > 0 && <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center text-xs">
        <button disabled={tracking.busy} className="disabled:opacity-40" style={{ color: '#06b6d4' }} onClick={() => download(trackingCsv(samples, tracking.index?.width ?? 1, tracking.index?.height ?? 1), 'motion-tracking.csv', 'text/csv;charset=utf-8')}>{es ? 'Descargar CSV' : 'Download CSV'}</button>
        <button disabled={tracking.busy} className="disabled:opacity-40" style={{ color: '#06b6d4' }} onClick={() => download(JSON.stringify({ version: 1, source: { name: fileName, width: tracking.index?.width, height: tracking.index?.height, fps: tracking.index?.sourceFps }, limit, angleConfigs: configs, references, samples }, null, 2), 'motion-tracking.json', 'application/json')}>{es ? 'Descargar JSON' : 'Download JSON'}</button>
        <label style={{ color: th.rowText }}>{es ? 'Trayectoria ' : 'Trajectory '}<select aria-label={es ? 'Punto de trayectoria' : 'Trajectory point'} onChange={(event) => onTrajectoryChange(event.target.value)} className="rounded p-1" style={inputStyle}><option value="">{es ? 'Oculta' : 'Hidden'}</option>{points.map((point) => <option key={point.id} value={point.id}>{point.label}</option>)}</select></label>
      </div>
      <label className="block text-xs" style={{ color: th.sub }}>{es ? 'Recorrer muestras analizadas' : 'Review analyzed samples'}
        <input aria-label={es ? 'Muestra analizada' : 'Analyzed sample'} type="range" min={0} max={Math.max(0, samples.length - 1)} value={Math.max(0, frameIndexAtTime(tracking.sampleTimes.current, videoRef.current?.currentTime ?? 0))} disabled={tracking.busy} onChange={(event) => seekSample(Number(event.target.value))} className="w-full" />
      </label>
      <select aria-label={es ? 'Medición de la gráfica' : 'Chart measurement'} value={selectedMetric} onChange={(event) => setMetric(event.target.value)} className="text-xs rounded p-1 max-w-full" style={inputStyle}>{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select>
      <svg role="img" aria-label={es ? 'Medición a lo largo del tiempo' : 'Measurement over time'} viewBox="0 0 600 160" className="w-full" style={{ background: th.tagBg }}>
        <path d="M10 10V140H590" fill="none" stroke={th.sub} />
        {segments.map((line, i) => <polyline key={i} points={line} fill="none" stroke="#06b6d4" strokeWidth="2" />)}
        <text x="12" y="155" fill={th.sub} fontSize="10">{firstTime.toFixed(3)} s</text><text x="540" y="155" fill={th.sub} fontSize="10">{endTime.toFixed(3)} s</text>
        {Number.isFinite(series.min) && <><text x="12" y="24" fill={th.sub} fontSize="10">{series.max.toFixed(1)}</text><text x="12" y="130" fill={th.sub} fontSize="10">{series.min.toFixed(1)}</text></>}
      </svg>
    </div>}
  </section>;
}
