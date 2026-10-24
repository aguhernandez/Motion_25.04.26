import { useState, useCallback, useRef } from 'react';
import { Plus, ChevronRight, Camera, Waves, Upload, Save, RotateCcw, Eye, EyeOff, Layers, AlertTriangle, CheckCircle2, Info, PlayCircle, Grid3x3 as Grid3X3, Clock, Download } from 'lucide-react';
import type { Athlete, BiomechanicsSession, BiomechanicsSnapshot, KeyPoint } from '../../lib/types';
import type { ReferenceRange } from '../../lib/types';
import VideoCanvas, { type VideoCanvasHandle } from '../shared/VideoCanvas';
import VideoControls, { type VideoControlsHandle } from '../shared/VideoControls';
import AnglePanel from '../shared/AnglePanel';
import BodyAngleSelector from '../shared/BodyAngleSelector';
import SwimDataPanel, { type SwimData } from './SwimDataPanel';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';
import { IMAGE_ACCEPT, VIDEO_ACCEPT, mediaKind, mediaFileError } from '../../lib/mediaFiles';
import MediaUploadArea from '../shared/MediaUploadArea';
import { computeAnglesFromPoints } from '../../lib/angleCalculations';
import {
  SWIMMING_FREESTYLE_ANGLE_CONFIGS,
  SWIMMING_BACKSTROKE_ANGLE_CONFIGS,
  SWIMMING_BREASTSTROKE_ANGLE_CONFIGS,
  SWIMMING_BUTTERFLY_ANGLE_CONFIGS,
} from '../../lib/angleCalculations';
import {
  SWIMMING_FREESTYLE_KEY_POINTS,
  SWIMMING_FREESTYLE_CONNECTIONS,
  SWIMMING_BREASTSTROKE_KEY_POINTS,
  SWIMMING_BREASTSTROKE_CONNECTIONS,
} from '../../data/defaultKeyPoints';

type StrokeStyle = 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly';

interface SwimmingAnalysisProps {
  sessions: BiomechanicsSession[];
  snapshots: BiomechanicsSnapshot[];
  references: ReferenceRange[];
  athletes: Athlete[];
  onNewSession: () => void;
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
  onSelectSession: (session: BiomechanicsSession) => void;
  activeSession: BiomechanicsSession | null;
}

const STROKE_CONFIGS = {
  freestyle: {
    label: 'Crol (Freestyle)',
    labelShort: 'Crol',
    configs: SWIMMING_FREESTYLE_ANGLE_CONFIGS,
    keyPoints: SWIMMING_FREESTYLE_KEY_POINTS,
    connections: SWIMMING_FREESTYLE_CONNECTIONS,
    phases: ['Entrada', 'Agarre', 'Tirón', 'Empuje', 'Recuperación aérea', 'Patada descendente', 'Patada ascendente'],
    color: '#06b6d4',
    scienceNote: 'Crol: El "Early Vertical Forearm" (codo alto) permite maximizar la superficie de propulsión. Rotación corporal 40–50° mejora el alcance y reduce la resistencia frontal. Patada de 6 tiempos en élite, 2 tiempos en fondistas.',
  },
  backstroke: {
    label: 'Espalda (Backstroke)',
    labelShort: 'Espalda',
    configs: SWIMMING_BACKSTROKE_ANGLE_CONFIGS,
    keyPoints: SWIMMING_FREESTYLE_KEY_POINTS,
    connections: SWIMMING_FREESTYLE_CONNECTIONS,
    phases: ['Entrada dorsal', 'Tirón dorsal', 'Empuje dorsal', 'Recuperación', 'Patada dorsal', 'Rotación dorsal'],
    color: '#8b5cf6',
    scienceNote: 'Espalda: Rotación de cadera 40–50° (similar al crol). Cabeza neutra, orejas en el agua. Entrada de mano por encima del hombro (no línea media). Codo flexionado 90° en la fase de tirón.',
  },
  breaststroke: {
    label: 'Pecho (Breaststroke)',
    labelShort: 'Pecho',
    configs: SWIMMING_BREASTSTROKE_ANGLE_CONFIGS,
    keyPoints: SWIMMING_BREASTSTROKE_KEY_POINTS,
    connections: SWIMMING_BREASTSTROKE_CONNECTIONS,
    phases: ['Deslizamiento', 'Apertura de brazos', 'Tirón', 'Respiración', 'Recuperación brazos', 'Patada de rana', 'Cierre de piernas'],
    color: '#10b981',
    scienceNote: 'Pecho: Rodillas no más anchas que caderas en recuperación. Dorsiflexión máxima de tobillo crítica para la propulsión. Ángulo de apertura de brazos: 90–110°. Cuello en extensión breve solo para respirar (no elongado).',
  },
  butterfly: {
    label: 'Mariposa (Butterfly)',
    labelShort: 'Mariposa',
    configs: SWIMMING_BUTTERFLY_ANGLE_CONFIGS,
    keyPoints: SWIMMING_FREESTYLE_KEY_POINTS,
    connections: SWIMMING_FREESTYLE_CONNECTIONS,
    phases: ['Entrada mariposa', 'Agarre mariposa', 'Tirón mariposa', 'Empuje mariposa', 'Recuperación aérea', 'Patada 1ª', 'Patada 2ª'],
    color: '#f59e0b',
    scienceNote: 'Mariposa: Dos patadas de delfín por ciclo (1ª en entrada, 2ª en empuje). Undulación lumbar mínima — la propulsión sale desde la cadera y rodillas. Recuperación de brazos rasante al agua para reducir resistencia.',
  },
} as const;

const SCIENCE_REFS = [
  { label: 'Codo alto (EVF)', range: '70–90°', hint: 'Ángulo codo en tirón', stroke: 'Crol/Mariposa' },
  { label: 'Rotación corporal', range: '40–50°', hint: 'Eje longitudinal', stroke: 'Crol/Espalda' },
  { label: 'Rodilla pechada', range: '100–130°', hint: 'Recuperación patada', stroke: 'Pecho' },
  { label: 'Entrada de mano', range: '140–160°', hint: 'Ángulo hombro-cadera', stroke: 'Todos' },
  { label: 'Patada de rodilla', range: '140–170°', hint: 'Extensión en patada', stroke: 'Crol/Espalda' },
  { label: 'Dorsiflexión tobillo', range: '80–100°', hint: 'Posición pie en patada', stroke: 'Pecho' },
];

interface AlertItem { severity: 'warning' | 'critical'; message: string }

function detectSwimAlerts(
  angles: ReturnType<typeof computeAnglesFromPoints>,
  stroke: StrokeStyle
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const map = new Map(angles.map((a) => [a.name, a.value_deg]));

  if (stroke === 'freestyle' || stroke === 'backstroke') {
    const evf = map.get(stroke === 'freestyle' ? 'Codo Alto (Early VB)' : 'Tirón Dorsal');
    if (evf !== undefined && evf > 110) {
      alerts.push({ severity: 'warning', message: `Codo bajo en tirón (${evf}°). Elevar el codo mejora el "Early Vertical Forearm" y la propulsión.` });
    }
    const rot = map.get(stroke === 'freestyle' ? 'Rotación de Cadera' : 'Rotación Dorsal');
    if (rot !== undefined && rot < 130) {
      alerts.push({ severity: 'warning', message: `Rotación corporal insuficiente (${rot}°). El rango óptimo es 40–50° sobre el eje longitudinal.` });
    }
    const kick = map.get(stroke === 'freestyle' ? 'Rodilla Patada' : 'Patada Dorsal');
    if (kick !== undefined && kick < 140) {
      alerts.push({ severity: 'warning', message: `Exceso de flexión de rodilla en patada (${kick}°). La patada debe originarse desde la cadera con rodilla casi extendida.` });
    }
  }

  if (stroke === 'breaststroke') {
    const knee = map.get('Flexión de Rodilla (Pechada)');
    if (knee !== undefined && knee < 80) {
      alerts.push({ severity: 'critical', message: `Flexión excesiva de rodilla en pechada (${knee}°). Rodillas no deben superar el ancho de cadera.` });
    }
    if (knee !== undefined && knee > 145) {
      alerts.push({ severity: 'warning', message: `Insuficiente flexión de rodilla en pechada (${knee}°). Reducir rango limita la propulsión de patada.` });
    }
    const dors = map.get('Dorsiflexión Tobillo');
    if (dors !== undefined && dors < 70) {
      alerts.push({ severity: 'warning', message: `Dorsiflexión de tobillo limitada (${dors}°). La dorsiflexión máxima es clave para la superficie de propulsión en pechada.` });
    }
  }

  if (stroke === 'butterfly') {
    const evf = map.get('Codo Alto Mariposa');
    if (evf !== undefined && evf > 110) {
      alerts.push({ severity: 'warning', message: `Codo bajo en tirón de mariposa (${evf}°). Mantener codo alto para maximizar propulsión bilateral.` });
    }
    const undulation = map.get('Undulación Cadera');
    if (undulation !== undefined && undulation < 150) {
      alerts.push({ severity: 'warning', message: `Undulación de cadera excesiva (${undulation}°). La energía debe venir de cadera→rodilla, no de la espalda lumbar.` });
    }
  }

  return alerts;
}

function EmptyState({ onNewSession, th }: { onNewSession: () => void; th: ReturnType<typeof getTheme> }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading" style={{ color: th.title }}>Análisis de Natación</h2>
          <p className="text-sm mt-0.5" style={{ color: th.sub }}>Stroke analysis · Crol · Espalda · Pecho · Mariposa</p>
        </div>
        <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl" style={{ background: '#06b6d4', color: '#fff' }}>
          <Plus className="w-4 h-4" />
          Nueva sesión
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <MediaUploadArea allowVideo onStartSession={onNewSession} />

          <div className="p-4 rounded-xl" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: th.title }}>Referencias biomecánicas</h3>
            <div className="grid grid-cols-2 gap-2">
              {SCIENCE_REFS.map((r) => (
                <div key={r.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: th.tagBg }}>
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: 'rgba(6,182,212,0.4)' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: th.rowText }}>{r.label}</p>
                    <p className="text-xs" style={{ color: th.sub }}>{r.range} · {r.stroke}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(STROKE_CONFIGS) as StrokeStyle[]).map((stroke) => {
              const cfg = STROKE_CONFIGS[stroke];
              return (
                <div key={stroke} className="p-4 rounded-xl" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${cfg.color}18` }}>
                    <Waves className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: th.rowText }}>{cfg.labelShort}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: th.sub }}>{cfg.configs.length} ángulos · {cfg.phases.length} fases</p>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" style={{ color: '#06b6d4' }} />
              <p className="text-sm font-semibold" style={{ color: '#06b6d4' }}>Análisis científico</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: th.sub }}>
              Basado en biomecánica publicada por Maglischo (2003), Toussaint & Beek (1992) y estudios de análisis cinemático de nado. Los ángulos de referencia corresponden a nadadores de nivel competitivo.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Índice de nado élite', value: '>3.0', unit: 'm²/s' },
              { label: 'SWOLF objetivo', value: '≤30', unit: 'pts/50m' },
              { label: 'Frecuencia crol', value: '44–60', unit: 'brazadas/min' },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-xl text-center" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
                <p className="text-base font-bold" style={{ color: th.infoTitle }}>{m.value}</p>
                <p className="text-xs" style={{ color: th.sub }}>{m.unit}</p>
                <p className="text-xs mt-0.5 leading-tight" style={{ color: th.sub }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6 text-center border-t" style={{ borderColor: th.panelBorder }}>
        <p className="text-sm mb-4" style={{ color: th.sub }}>Creá tu primera sesión para analizar la técnica de nado con puntos arrastrables en tiempo real</p>
        <button onClick={onNewSession} className="px-6 py-3 font-semibold rounded-xl" style={{ background: '#06b6d4', color: '#fff' }}>
          Crear primera sesión de natación
        </button>
      </div>
    </div>
  );
}

interface StrokeWorkspaceProps {
  session: BiomechanicsSession;
  stroke: StrokeStyle;
  references: ReferenceRange[];
  snapshots: BiomechanicsSnapshot[];
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
}

type MediaMode = 'image' | 'video';

function StrokeWorkspace({ session, stroke, references, snapshots, onSaveSnapshot }: StrokeWorkspaceProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const cfg = STROKE_CONFIGS[stroke];

  const [imageData, setImageData] = useState('');
  const [mediaMode, setMediaMode] = useState<MediaMode>('image');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoExpiresAt, setVideoExpiresAt] = useState<Date | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showClock, setShowClock] = useState(false);
  const [clockMs, setClockMs] = useState(0);
  const [points, setPoints] = useState<KeyPoint[]>(cfg.keyPoints as KeyPoint[]);
  const [showAngles, setShowAngles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [phaseLabel, setPhaseLabel] = useState<string>(cfg.phases[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [swimData, setSwimData] = useState<SwimData>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<VideoCanvasHandle>(null);
  const videoControlsRef = useRef<VideoControlsHandle>(null);
  const sharedVideoRef = useRef<HTMLVideoElement>(null);

  const strokeRefs = references.filter((r) =>
    ['freestyle', 'backstroke', 'breaststroke', 'butterfly'].includes(r.discipline)
  );
  const [selectedAngleNames, setSelectedAngleNames] = useState<string[]>([]);
  const activeConfigs = cfg.configs.filter((config) => selectedAngleNames.includes(config.name));
  const activeLabels = new Set(activeConfigs.flatMap((config) => [config.labelP1, config.labelVertex, config.labelP2]));
  const activePoints = points.filter((point) => activeLabels.has(point.label));
  const activeConnections = cfg.connections.filter(([a, b]) => activeLabels.has(a) && activeLabels.has(b));
  const strokeAngles = computeAnglesFromPoints(activePoints, activeConfigs, strokeRefs);
  const alerts = detectSwimAlerts(strokeAngles, stroke);

  const handlePointsChange = useCallback((pts: KeyPoint[]) => setPoints((previous) => previous.map((point) => pts.find((updated) => updated.id === point.id) ?? point)), []);

  const loadImageFile = (file: File) => {
    const error = mediaFileError(file, false);
    if (error) { alert(error); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageData(ev.target?.result as string);
      setMediaMode('image');
      setVideoSrc(null);
      setPoints(cfg.keyPoints as KeyPoint[]);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) loadImageFile(file);
    event.target.value = '';
  };

  const loadVideoFile = (file: File) => {
    const error = mediaFileError(file, true);
    if (error) { alert(error); return; }
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setMediaMode('video');
    setImageData('');
    setPoints(cfg.keyPoints as KeyPoint[]);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 10);
    setVideoExpiresAt(expiry);
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) loadVideoFile(file);
    event.target.value = '';
  };

  const handleFrameChange = useCallback((_frameDataUrl: string, timeMs: number) => {
    setClockMs(timeMs);
  }, []);

  const handleDownloadFrame = () => {
    const dataUrl = videoCanvasRef.current?.exportFrame();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `natacion-${stroke}-${Date.now()}.png`;
    a.click();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (cameraVideoRef.current) { cameraVideoRef.current.srcObject = stream; cameraVideoRef.current.play(); setCameraActive(true); }
    } catch { alert('No se pudo acceder a la cámara.'); }
  };

  const captureFromCamera = () => {
    if (!cameraVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoRef.current.videoWidth; canvas.height = cameraVideoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(cameraVideoRef.current, 0, 0);
    setImageData(canvas.toDataURL('image/jpeg', 0.85));
    setMediaMode('image');
    setVideoSrc(null);
    setPoints(cfg.keyPoints as KeyPoint[]);
    (cameraVideoRef.current.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };



  const handleSave = async () => {
    setSaving(true);
    try {
      const exportedData = videoCanvasRef.current?.exportFrame() || imageData;
      await onSaveSnapshot({
        session_id: session.id,
        image_data: exportedData,
        key_points: activePoints,
        angles: strokeAngles,
        bike_fitting_data: {},
        gait_data: {},
        phase_label: `[${cfg.labelShort}] ${phaseLabel}`,
        notes,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const iconActive: React.CSSProperties = { background: `${cfg.color}18`, color: cfg.color, borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };
  const iconInactive: React.CSSProperties = { background: 'transparent', color: th.sub, borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };

  const prefix = `[${cfg.labelShort}]`;
  const strokeSnapshots = snapshots.filter((s) => s.phase_label?.startsWith(prefix));

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="flex-1 space-y-4 min-w-0">
        <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: `${cfg.color}0d`, border: `1px solid ${cfg.color}30` }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
          <p className="text-xs leading-relaxed" style={{ color: cfg.color }}>{cfg.scienceNote}</p>
        </div>

        {videoExpiresAt && mediaMode === 'video' && (
          <div className="px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <p className="text-xs" style={{ color: '#f59e0b' }}>
              Video disponible localmente hasta el {videoExpiresAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}. Descargá el frame con los overlays para conservar el análisis.
            </p>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <div>
              <span className="text-sm font-semibold" style={{ color: th.title }}>{cfg.label}</span>
              <p className="text-xs mt-0.5" style={{ color: th.sub }}>{cfg.configs.length} ángulos · Vista lateral</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowGrid((v) => !v)} style={showGrid ? iconActive : iconInactive} title="Cuadrícula">
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setShowClock((v) => !v)} style={showClock ? iconActive : iconInactive} title="Reloj">
                <Clock className="w-4 h-4" />
              </button>
              <button onClick={() => setShowLabels((v) => !v)} style={showLabels ? iconActive : iconInactive}>
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowAngles((v) => !v)} style={showAngles ? iconActive : iconInactive}>
                <Layers className="w-4 h-4" />
              </button>
              <button onClick={handleDownloadFrame} style={iconInactive} title="Descargar frame">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => setPoints(cfg.keyPoints as KeyPoint[])} style={iconInactive}>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {cameraActive ? (
            <div className="relative p-3">
              <video ref={cameraVideoRef} className="w-full rounded-xl" autoPlay playsInline muted />
              <button onClick={captureFromCamera} className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 font-semibold rounded-full text-sm shadow-xl" style={{ background: cfg.color, color: '#fff' }}>
                Capturar
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <VideoCanvas
                ref={videoCanvasRef}
                videoUrl={mediaMode === 'video' ? videoSrc : null}
                videoRef={sharedVideoRef}
                imageData={imageData}
                onFileSelect={(file) => mediaKind(file) === 'video' ? loadVideoFile(file) : loadImageFile(file)}
                keyPoints={activePoints}
                angles={strokeAngles}
                connections={activeConnections}
                onPointsChange={handlePointsChange}
                showAngles={showAngles}
                showLabels={showLabels}
                showGrid={showGrid}
                showClock={showClock}
                clockMs={clockMs}
              />
              {mediaMode === 'video' && videoSrc && (
                <VideoControls
                  ref={videoControlsRef}
                  videoRef={sharedVideoRef}
                  onFrameChange={handleFrameChange}
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-3 border-t flex-wrap" style={{ borderColor: th.panelHeaderBorder }}>
            <input ref={fileInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={handleImageUpload} />
            <input ref={videoInputRef} type="file" accept={VIDEO_ACCEPT} className="sr-only" onChange={handleVideoUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
              <Upload className="w-4 h-4" />
              Imagen
            </button>
            <button onClick={() => videoInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
              <PlayCircle className="w-4 h-4" />
              Video
            </button>
            <button onClick={startCamera} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
              <Camera className="w-4 h-4" />
              Cámara
            </button>
            <div className="flex-1" />
            <select value={phaseLabel} onChange={(e) => setPhaseLabel(e.target.value)} className="px-2 py-2 text-sm rounded-lg focus:outline-none" style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}>
              {cfg.phases.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50" style={savedFlash ? { background: '#10b981', color: '#fff' } : { background: cfg.color, color: '#fff' }}>
              <Save className="w-4 h-4" />
              {savedFlash ? 'Guardado!' : saving ? 'Guardando...' : 'Guardar snapshot'}
            </button>
          </div>
          <BodyAngleSelector angleConfigs={cfg.configs} defaultPoints={cfg.keyPoints} selectedAngleNames={selectedAngleNames} onChange={setSelectedAngleNames} />
        </div>

        {strokeSnapshots.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
              <span className="text-sm font-semibold" style={{ color: th.title }}>Snapshots — {cfg.labelShort}</span>
            </div>
            <div className="p-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {strokeSnapshots.map((snap) => (
                <button
                  key={snap.id}
                  onClick={() => {
                    if (snap.image_data) { setImageData(snap.image_data); setMediaMode('image'); setVideoSrc(null); }
                    setSelectedAngleNames(snap.angles.map((angle) => angle.name));
                    setPoints(cfg.keyPoints.map((point) => snap.key_points.find((saved) => saved.id === point.id) ?? point));
                    setPhaseLabel(snap.phase_label?.replace(`${prefix} `, '') ?? cfg.phases[0]);
                    setNotes(snap.notes ?? '');
                  }}
                  className="group relative aspect-video rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${th.snapshotBorder}` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${cfg.color}70`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.snapshotBorder; }}
                >
                  {snap.image_data ? (
                    <img src={snap.image_data} alt={snap.phase_label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: th.tagBg }}>
                      <Layers className="w-4 h-4" style={{ color: th.sub }} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{snap.phase_label?.replace(`${prefix} `, '')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="xl:w-80 space-y-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Alertas biomecánicas</span>
          </div>
          <div className="p-3 space-y-2">
            {alerts.length > 0 ? alerts.map((alert, i) => (
              <div key={i} className="flex gap-2.5 p-2.5 rounded-xl" style={{
                background: alert.severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b' }} />
                <p className="text-xs leading-relaxed" style={{ color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b' }}>{alert.message}</p>
              </div>
            )) : strokeAngles.length > 0 ? (
              <div className="flex gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                <p className="text-xs" style={{ color: '#10b981' }}>Sin alertas técnicas detectadas en esta posición.</p>
              </div>
            ) : (
              <p className="text-xs text-center py-2" style={{ color: th.empty }}>Ajustá los puntos para calcular ángulos</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Ángulos calculados</span>
          </div>
          <div className="p-3"><AnglePanel angles={strokeAngles} /></div>
        </div>

        <SwimDataPanel data={swimData} onChange={setSwimData} athlete={session.athlete} />

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Notas</span>
          </div>
          <div className="p-3">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones técnicas, correcciones, progreso..."
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
              style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${cfg.color}60`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
            />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Guía de referencia</span>
          </div>
          <div className="p-3 space-y-2">
            {cfg.configs.map((c) => {
              const ref = references.find((r) => r.angle_name === c.name);
              return (
                <div key={c.name} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: th.tagBg }}>
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: `${cfg.color}60` }} />
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: th.rowText }}>{c.name}</p>
                    <p className="text-xs" style={{ color: th.sub }}>
                      {ref ? `${ref.optimal_min_deg}–${ref.optimal_max_deg}° óptimo` : 'Sin referencia cargada'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SwimmingAnalysis({
  sessions, snapshots, references, onNewSession, onSaveSnapshot, onSelectSession, activeSession,
}: SwimmingAnalysisProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const [stroke, setStroke] = useState<StrokeStyle>('freestyle');

  const swimmingSessions = sessions.filter((s) => s.session_type === 'swimming');

  if (!activeSession) {
    if (swimmingSessions.length === 0) return <EmptyState onNewSession={onNewSession} th={th} />;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading" style={{ color: th.title }}>Análisis de Natación</h2>
            <p className="text-sm mt-0.5" style={{ color: th.sub }}>Stroke analysis · Crol · Espalda · Pecho · Mariposa</p>
          </div>
          <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl" style={{ background: '#06b6d4', color: '#fff' }}>
            <Plus className="w-4 h-4" />
            Nueva sesión
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {swimmingSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session)}
              className="group p-4 rounded-xl text-left transition-all"
              style={{ background: th.rowBg, border: `1px solid ${th.rowBorder}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(6,182,212,0.4)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.rowBorder; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.12)' }}>
                  <Waves className="w-5 h-5" style={{ color: '#06b6d4' }} />
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: th.sub }} />
              </div>
              <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: th.rowText }}>{session.title}</h3>
              <p className="text-xs capitalize mb-3" style={{ color: th.sub }}>{session.discipline.replace('_', ' ')}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: th.sub }}>{session.athlete?.name ?? 'Sin atleta'}</span>
                <div className="flex items-center gap-1">
                  <Camera className="w-3 h-3" style={{ color: th.sub }} />
                  <span className="text-xs" style={{ color: th.sub }}>{session.snapshot_count}</span>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: th.empty }}>{new Date(session.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const swimRefs = references.filter((r) => ['freestyle', 'backstroke', 'breaststroke', 'butterfly'].includes(r.discipline));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => onSelectSession(null as unknown as BiomechanicsSession)} className="text-sm transition-colors" style={{ color: th.breadcrumbLink }}>Natación</button>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: th.breadcrumbSep }} />
        <span className="text-sm font-medium truncate" style={{ color: th.rowText }}>{activeSession.title}</span>
        {activeSession.athlete && (
          <>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: th.breadcrumbSep }} />
            <span className="text-sm" style={{ color: '#06b6d4' }}>{activeSession.athlete.name}</span>
          </>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
        {(Object.keys(STROKE_CONFIGS) as StrokeStyle[]).map((s) => {
          const c = STROKE_CONFIGS[s];
          const active = stroke === s;
          return (
            <button
              key={s}
              onClick={() => setStroke(s)}
              className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={active ? { background: c.color, color: '#fff' } : { color: th.sub }}
            >
              <Waves className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-semibold hidden sm:block">{c.labelShort}</span>
            </button>
          );
        })}
      </div>

      <StrokeWorkspace
        key={`${activeSession.id}:${stroke}`}
        session={activeSession}
        stroke={stroke}
        references={swimRefs}
        snapshots={snapshots}
        onSaveSnapshot={onSaveSnapshot}
      />
    </div>
  );
}
