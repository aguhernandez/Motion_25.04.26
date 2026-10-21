import { useState, useCallback, useRef } from 'react';
import { Plus, ChevronRight, Camera, Upload, Save, RotateCcw, Eye, EyeOff, Layers, Sparkles, AlertTriangle, CheckCircle2, Info, PlayCircle, Grid3x3 as Grid3X3, Clock, Download, Dumbbell } from 'lucide-react';
import type { Athlete, BiomechanicsSession, BiomechanicsSnapshot, KeyPoint } from '../../lib/types';
import type { ReferenceRange } from '../../lib/types';
import VideoCanvas, { type VideoCanvasHandle } from '../shared/VideoCanvas';
import VideoControls, { type VideoControlsHandle } from '../shared/VideoControls';
import AnglePanel from '../shared/AnglePanel';
import BodyAngleSelector from '../shared/BodyAngleSelector';
import WeightliftingDataPanel, { type LiftData } from './WeightliftingDataPanel';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';
import { computeAnglesFromPoints } from '../../lib/angleCalculations';
import {
  WEIGHTLIFTING_SNATCH_CONFIGS,
  WEIGHTLIFTING_CLEAN_JERK_CONFIGS,
  WEIGHTLIFTING_SQUAT_CONFIGS,
  WEIGHTLIFTING_DEADLIFT_CONFIGS,
  WEIGHTLIFTING_PRESS_CONFIGS,
  WEIGHTLIFTING_BENCH_CONFIGS,
  WEIGHTLIFTING_POWER_CLEAN_CONFIGS,
} from '../../lib/angleCalculations';
import {
  WEIGHTLIFTING_DEMO_IMAGE_URL,
  WEIGHTLIFTING_OLYMPIC_KEY_POINTS,
  WEIGHTLIFTING_OLYMPIC_CONNECTIONS,
  WEIGHTLIFTING_SQUAT_KEY_POINTS,
  WEIGHTLIFTING_SQUAT_CONNECTIONS,
  WEIGHTLIFTING_BENCH_KEY_POINTS,
  WEIGHTLIFTING_BENCH_CONNECTIONS,
} from '../../data/defaultKeyPoints';

type LiftType = 'snatch' | 'clean_jerk' | 'back_squat' | 'front_squat' | 'deadlift' | 'overhead_press' | 'bench_press' | 'power_clean';
type MediaMode = 'image' | 'video';

interface WeightliftingAnalysisProps {
  sessions: BiomechanicsSession[];
  snapshots: BiomechanicsSnapshot[];
  references: ReferenceRange[];
  athletes: Athlete[];
  onNewSession: () => void;
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
  onSelectSession: (session: BiomechanicsSession) => void;
  activeSession: BiomechanicsSession | null;
}

const LIFT_CONFIGS = {
  snatch: {
    label: 'Arranque (Snatch)',
    labelShort: 'Arranque',
    configs: WEIGHTLIFTING_SNATCH_CONFIGS,
    keyPoints: WEIGHTLIFTING_OLYMPIC_KEY_POINTS,
    connections: WEIGHTLIFTING_OLYMPIC_CONNECTIONS,
    color: '#ef4444',
    category: 'olympic' as const,
    phases: ['Posición inicial', 'Primera tracción', 'Transición (DKB)', 'Segunda tracción', 'Volteo', 'Recepción', 'Recuperación'],
    scienceNote: 'Arranque: Triple extensión explosiva (cadera-rodilla-tobillo) en la 2da tracción. Ángulo de tronco 0–10° en el pico de extensión. Codo completamente extendido en recepción (175–180°). Rodilla 50–70° en sentadilla overhead. (Garhammer 1993; Khuyagbaatar et al., 2024)',
  },
  clean_jerk: {
    label: 'Clin y Envión (Clean & Jerk)',
    labelShort: 'Clin y Envión',
    configs: WEIGHTLIFTING_CLEAN_JERK_CONFIGS,
    keyPoints: WEIGHTLIFTING_OLYMPIC_KEY_POINTS,
    connections: WEIGHTLIFTING_OLYMPIC_CONNECTIONS,
    color: '#f97316',
    category: 'olympic' as const,
    phases: ['Posición inicial', 'Primera tracción', 'Transición', 'Segunda tracción', 'Volteo/Rack', 'Recepción clin', 'Dip envión', 'Drive envión', 'Recepción envión', 'Recuperación'],
    scienceNote: 'Clin: Rack frontal con codos a 55–75° sobre la horizontal. Envión: dip de rodilla 15–25° con tronco vertical. Drive explosivo vertical. Recepción split con tronco vertical y codo bloqueado (170–180°). (Storey & Smith, 2012; Garhammer, 1993)',
  },
  back_squat: {
    label: 'Sentadilla Trasera (Back Squat)',
    labelShort: 'Sent. Trasera',
    configs: WEIGHTLIFTING_SQUAT_CONFIGS,
    keyPoints: WEIGHTLIFTING_SQUAT_KEY_POINTS,
    connections: WEIGHTLIFTING_SQUAT_CONNECTIONS,
    color: '#f59e0b',
    category: 'powerlifting' as const,
    phases: ['Desrackeo', 'Descenso excéntrico', 'Punto más bajo', 'Ascenso concéntrico', 'Lockout'],
    scienceNote: 'Sentadilla trasera: Rodilla 90–100° en paralelo. Inclinación de tronco 30–45° (barra alta) o 45–60° (barra baja). Dorsiflexión de tobillo >40°. Cabeza en paralelo con el torso. (Escamilla et al., 2001; Hales et al., 2009)',
  },
  front_squat: {
    label: 'Sentadilla Frontal (Front Squat)',
    labelShort: 'Sent. Frontal',
    configs: WEIGHTLIFTING_SQUAT_CONFIGS,
    keyPoints: WEIGHTLIFTING_SQUAT_KEY_POINTS,
    connections: WEIGHTLIFTING_SQUAT_CONNECTIONS,
    color: '#eab308',
    category: 'powerlifting' as const,
    phases: ['Posición rack frontal', 'Descenso', 'Punto más bajo', 'Ascenso', 'Lockout'],
    scienceNote: 'Sentadilla frontal: Tronco 15–30° (más vertical que barra trasera). Mayor demanda de dorsiflexión (>40°). Codos elevados por encima de la horizontal en rack frontal. Momento de extensión de rodilla mayor vs. barra trasera. (Yavuz et al., 2014)',
  },
  deadlift: {
    label: 'Peso Muerto (Deadlift)',
    labelShort: 'Peso Muerto',
    configs: WEIGHTLIFTING_DEADLIFT_CONFIGS,
    keyPoints: WEIGHTLIFTING_OLYMPIC_KEY_POINTS,
    connections: WEIGHTLIFTING_OLYMPIC_CONNECTIONS,
    color: '#10b981',
    category: 'powerlifting' as const,
    phases: ['Posición inicial', 'Despegue', 'Pasaje de rodillas', 'Fase de cadera', 'Lockout'],
    scienceNote: 'Peso muerto convencional: Cadera 53–92° al despegue, tronco 40–60° adelante. Sumo: tronco más vertical (25–45°), mayor activación de cuádriceps. Lockout: extensión completa de cadera y rodilla con escápulas retraídas. (Hanen et al., 2025; Escamilla et al., 2000)',
  },
  overhead_press: {
    label: 'Press de Hombros (OHP)',
    labelShort: 'Press Hombros',
    configs: WEIGHTLIFTING_PRESS_CONFIGS,
    keyPoints: WEIGHTLIFTING_OLYMPIC_KEY_POINTS,
    connections: WEIGHTLIFTING_OLYMPIC_CONNECTIONS,
    color: '#06b6d4',
    category: 'powerlifting' as const,
    phases: ['Posición inicial', 'Prensa inicial', 'Zona de estancamiento', 'Lockout overhead'],
    scienceNote: 'Press de hombros: Tronco vertical (0–5° atrás). Abducción de codo 30–60° desde el tronco. Hombro en elevación completa (170–180°) en lockout. Evitar hiperlordosis lumbar. (Bird & Casey, 2012; NSCA)',
  },
  bench_press: {
    label: 'Press de Banca (Bench Press)',
    labelShort: 'Press Banca',
    configs: WEIGHTLIFTING_BENCH_CONFIGS,
    keyPoints: WEIGHTLIFTING_BENCH_KEY_POINTS,
    connections: WEIGHTLIFTING_BENCH_CONNECTIONS,
    color: '#8b5cf6',
    category: 'powerlifting' as const,
    phases: ['Setup / Desrackeo', 'Descenso', 'Toque de pecho', 'Press concéntrico', 'Lockout'],
    scienceNote: 'Press de banca: Abducción de codo 45–75° (NO 90°). Escápulas retraídas y deprimidas durante todo el movimiento. Muñecas neutras. Toque en esternón inferior. Agarre 1.5 veces ancho bi-acromial. (Noteboom et al., 2024; Green & Comfort, 2007)',
  },
  power_clean: {
    label: 'Power Clean',
    labelShort: 'Power Clean',
    configs: WEIGHTLIFTING_POWER_CLEAN_CONFIGS,
    keyPoints: WEIGHTLIFTING_OLYMPIC_KEY_POINTS,
    connections: WEIGHTLIFTING_OLYMPIC_CONNECTIONS,
    color: '#0ea5e9',
    category: 'olympic' as const,
    phases: ['Posición inicial', 'Primera tracción', 'Transición (DKB)', 'Segunda tracción', 'Volteo', 'Recepción (quarter squat)', 'Recuperación'],
    scienceNote: 'Power Clean: Recepción en cuarto de sentadilla (rodilla 110–130°, NO sentadilla completa). Triple extensión explosiva idéntica al clin. Mayor transferencia a velocidad y potencia. Mayor RFD en la transición 1ra–2da tracción. (Comfort et al., 2011; Winchester et al., 2005)',
  },
} as const;

const SCIENCE_REFS = [
  { label: 'Rodilla arranque (recep.)', range: '50–70°', stroke: 'Snatch / Power Clean' },
  { label: 'Cadera en 2da tracción', range: '170–180°', stroke: 'Olímpicos' },
  { label: 'Tronco clin (rack)', range: '10–20°', stroke: 'Clean' },
  { label: 'Rodilla sentadilla', range: '90–100°', stroke: 'Squat (paralelo)' },
  { label: 'Tronco barra trasera', range: '30–45°', stroke: 'Back Squat' },
  { label: 'Tronco peso muerto', range: '40–60°', stroke: 'Deadlift' },
  { label: 'Codo press banca', range: '45–75°', stroke: 'Bench Press' },
  { label: 'Hombro lockout', range: '170–180°', stroke: 'OHP / Clean' },
];

interface AlertItem { severity: 'warning' | 'critical'; message: string }

function detectLiftAlerts(
  angles: ReturnType<typeof computeAnglesFromPoints>,
  lift: LiftType
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const map = new Map(angles.map((a) => [a.name, a.value_deg]));

  if (lift === 'snatch' || lift === 'power_clean' || lift === 'clean_jerk') {
    const knee = map.get(lift === 'snatch' ? 'Rodilla (Arranque)' : lift === 'power_clean' ? 'Rodilla (Power Clean)' : 'Rodilla (Clin)');
    if (knee !== undefined && knee > 80 && knee < 140) {
      alerts.push({ severity: 'warning', message: `Flexión de rodilla en posición inicial (${knee}°). Rango recomendado en setup: 50–85°. Ajustar para mejorar trayectoria de barra.` });
    }
    const hip = map.get(lift === 'snatch' ? 'Cadera (Arranque)' : lift === 'power_clean' ? 'Cadera (Power Clean)' : 'Cadera (Clin)');
    if (hip !== undefined && hip < 140) {
      alerts.push({ severity: 'warning', message: `Cadera insuficientemente extendida (${hip}°). La triple extensión completa (cadera >170°) es clave para la altura de barra.` });
    }
  }

  if (lift === 'back_squat' || lift === 'front_squat') {
    const knee = map.get('Rodilla (Sentadilla)');
    if (knee !== undefined && knee > 110) {
      alerts.push({ severity: 'warning', message: `Sentadilla por encima del paralelo (rodilla ${knee}°). Para desarrollo de fuerza máxima, apuntar a rodilla ≤100°.` });
    }
    const trunk = map.get('Tronco (Sentadilla)');
    if (lift === 'front_squat' && trunk !== undefined && trunk < 140) {
      alerts.push({ severity: 'warning', message: `Inclinación de tronco excesiva en sentadilla frontal (${trunk}°). El tronco debe mantenerse más vertical (>150°).` });
    }
  }

  if (lift === 'deadlift') {
    const trunk = map.get('Tronco (Peso Muerto)');
    if (trunk !== undefined && trunk > 160) {
      alerts.push({ severity: 'critical', message: `Tronco excesivamente vertical en peso muerto (${trunk}°). Posición de setup requiere inclinación hacia adelante (tronco 120–140°).` });
    }
    if (trunk !== undefined && trunk < 100) {
      alerts.push({ severity: 'warning', message: `Tronco demasiado inclinado (${trunk}°). Riesgo lumbar aumentado. Elevar la posición de cadera y activar espalda alta.` });
    }
  }

  if (lift === 'bench_press') {
    const elbow = map.get('Hombro Abducción');
    if (elbow !== undefined && elbow < 120) {
      alerts.push({ severity: 'critical', message: `Codo demasiado cerrado (${elbow}°). Aumentar la abducción de codo a 45–75° para activación óptima del pectoral y reducir riesgo en AC.` });
    }
    if (elbow !== undefined && elbow > 155) {
      alerts.push({ severity: 'warning', message: `Codo demasiado abierto (${elbow}°). Abducción >90° aumenta la compresión AC y el riesgo de desgarro pectoral.` });
    }
  }

  if (lift === 'overhead_press') {
    const shoulder = map.get('Hombro (Press)');
    if (shoulder !== undefined && shoulder < 155) {
      alerts.push({ severity: 'warning', message: `Hombro no completamente elevado en lockout (${shoulder}°). Apuntar a 170–180° con rotación escapular ascendente completa.` });
    }
  }

  return alerts;
}

function EmptyState({ onNewSession, th }: { onNewSession: () => void; th: ReturnType<typeof getTheme> }) {
  const [videoOpen, setVideoOpen] = useState(false);
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading" style={{ color: th.title }}>Halterofilia & Levantamiento de Fuerza</h2>
          <p className="text-sm mt-0.5" style={{ color: th.sub }}>Snatch · Clean & Jerk · Squat · Deadlift · Press · Power Clean</p>
        </div>
        <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl" style={{ background: '#ef4444', color: '#fff' }}>
          <Plus className="w-4 h-4" />
          Nueva sesión
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden" style={{ border: `1px solid ${th.panelBorder}` }}>
            {videoOpen ? (
              <div className="aspect-video">
                <iframe className="w-full h-full" src="https://www.youtube.com/embed/4G3RDMGPAHo?autoplay=1" title="Olympic Weightlifting Biomechanics" allow="autoplay; encrypted-media" allowFullScreen />
              </div>
            ) : (
              <div className="relative aspect-video cursor-pointer group" onClick={() => setVideoOpen(true)}>
                <img src={WEIGHTLIFTING_DEMO_IMAGE_URL} alt="Weightlifting preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/55 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-10 h-10 text-white" />
                    </div>
                    <span className="text-sm text-white font-medium">Ver biomecánica del levantamiento</span>
                  </div>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full" style={{ background: '#ef4444', color: '#fff' }}>Demo</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: th.title }}>Referencias biomecánicas</h3>
            <div className="grid grid-cols-2 gap-2">
              {SCIENCE_REFS.map((r) => (
                <div key={r.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: th.tagBg }}>
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: 'rgba(239,68,68,0.4)' }} />
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
            {(['snatch', 'clean_jerk', 'back_squat', 'deadlift', 'bench_press', 'power_clean'] as LiftType[]).map((lift) => {
              const cfg = LIFT_CONFIGS[lift];
              return (
                <div key={lift} className="p-4 rounded-xl" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${cfg.color}18` }}>
                    <Dumbbell className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: th.rowText }}>{cfg.labelShort}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: th.sub }}>{cfg.configs.length} ángulos · {cfg.phases.length} fases</p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                    {cfg.category === 'olympic' ? 'Halterofilia' : 'Powerlifting'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
              <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>Base científica</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: th.sub }}>
              Basado en biomecánica publicada por Garhammer (1980, 1993), Escamilla et al. (2000), Hanes et al. (2025), Comfort et al. (2011), Noteboom et al. (2024), Stone et al. (1998), Storey & Smith (2012). Ángulos de referencia para atletas de nivel competitivo.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Potencia pico (élite)', value: '4000–5100', unit: 'W' },
              { label: 'Vel. barra arranque', value: '1.65–2.28', unit: 'm/s' },
              { label: 'Ratio Squat:Clean', value: '1.3–1.4x', unit: '' },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-xl text-center" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
                <p className="text-base font-bold" style={{ color: th.infoTitle }}>{m.value}</p>
                {m.unit && <p className="text-xs" style={{ color: th.sub }}>{m.unit}</p>}
                <p className="text-xs mt-0.5 leading-tight" style={{ color: th.sub }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6 text-center border-t" style={{ borderColor: th.panelBorder }}>
        <p className="text-sm mb-4" style={{ color: th.sub }}>Creá tu primera sesión para analizar la técnica de levantamiento con video fotograma por fotograma</p>
        <button onClick={onNewSession} className="px-6 py-3 font-semibold rounded-xl" style={{ background: '#ef4444', color: '#fff' }}>
          Crear primera sesión de levantamiento
        </button>
      </div>
    </div>
  );
}

interface LiftWorkspaceProps {
  session: BiomechanicsSession;
  lift: LiftType;
  references: ReferenceRange[];
  snapshots: BiomechanicsSnapshot[];
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
}

function LiftWorkspace({ session, lift, references, snapshots, onSaveSnapshot }: LiftWorkspaceProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const cfg = LIFT_CONFIGS[lift];

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
  const [demoLoading, setDemoLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [liftData, setLiftData] = useState<LiftData>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<VideoCanvasHandle>(null);
  const videoControlsRef = useRef<VideoControlsHandle>(null);
  const sharedVideoRef = useRef<HTMLVideoElement>(null);

  const liftRefs = references.filter((r) =>
    ['snatch', 'clean_jerk', 'back_squat', 'front_squat', 'deadlift', 'overhead_press', 'bench_press', 'power_clean'].includes(r.discipline)
  );
  const [selectedAngleNames, setSelectedAngleNames] = useState<string[]>([]);
  const activeConfigs = cfg.configs.filter((config) => selectedAngleNames.includes(config.name));
  const activeLabels = new Set(activeConfigs.flatMap((config) => [config.labelP1, config.labelVertex, config.labelP2]));
  const activePoints = points.filter((point) => activeLabels.has(point.label));
  const activeConnections = cfg.connections.filter(([a, b]) => activeLabels.has(a) && activeLabels.has(b));
  const liftAngles = computeAnglesFromPoints(activePoints, activeConfigs, liftRefs);
  const alerts = detectLiftAlerts(liftAngles, lift);

  const handlePointsChange = useCallback((pts: KeyPoint[]) => setPoints((previous) => previous.map((point) => pts.find((updated) => updated.id === point.id) ?? point)), []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageData(ev.target?.result as string);
      setMediaMode('image');
      setVideoSrc(null);
      setPoints(cfg.keyPoints as KeyPoint[]);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const handleFrameChange = useCallback((_frameDataUrl: string, timeMs: number) => {
    setClockMs(timeMs);
  }, []);

  const handleDownloadFrame = () => {
    const dataUrl = videoCanvasRef.current?.exportFrame();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `levantamiento-${lift}-${Date.now()}.png`;
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
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(cameraVideoRef.current, 0, 0);
    setImageData(canvas.toDataURL('image/jpeg', 0.85));
    setMediaMode('image');
    setVideoSrc(null);
    setPoints(cfg.keyPoints as KeyPoint[]);
    (cameraVideoRef.current.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  const loadDemo = useCallback(() => {
    setDemoLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      setImageData(canvas.toDataURL('image/jpeg', 0.9));
      setMediaMode('image');
      setVideoSrc(null);
      setPoints(cfg.keyPoints as KeyPoint[]);
      setDemoLoading(false);
    };
    img.onerror = () => {
      setImageData(WEIGHTLIFTING_DEMO_IMAGE_URL);
      setMediaMode('image');
      setPoints(cfg.keyPoints as KeyPoint[]);
      setDemoLoading(false);
    };
    img.src = WEIGHTLIFTING_DEMO_IMAGE_URL;
  }, [cfg]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const exportedData = videoCanvasRef.current?.exportFrame() || imageData;
      await onSaveSnapshot({
        session_id: session.id,
        image_data: exportedData,
        key_points: activePoints,
        angles: liftAngles,
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
  const liftSnapshots = snapshots.filter((s) => s.phase_label?.startsWith(prefix));

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
              Video disponible localmente hasta el {videoExpiresAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}. Descargá el frame para conservar el análisis.
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
                keyPoints={activePoints}
                angles={liftAngles}
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
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
            <input ref={videoInputRef} type="file" accept="video/*" className="sr-only" onChange={handleVideoUpload} />
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
            <button onClick={loadDemo} disabled={demoLoading} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg disabled:opacity-50" style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`, color: cfg.color }}>
              <Sparkles className="w-4 h-4" />
              {demoLoading ? 'Cargando...' : 'Demo'}
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

        {liftSnapshots.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
              <span className="text-sm font-semibold" style={{ color: th.title }}>Snapshots — {cfg.labelShort}</span>
            </div>
            <div className="p-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {liftSnapshots.map((snap) => (
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
            )) : liftAngles.length > 0 ? (
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
          <div className="p-3"><AnglePanel angles={liftAngles} /></div>
        </div>

        <WeightliftingDataPanel data={liftData} onChange={setLiftData} accentColor={cfg.color} />

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Notas</span>
          </div>
          <div className="p-3">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones técnicas, correcciones, cargas, progresiones..."
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

const LIFT_TABS: { id: LiftType; label: string }[] = [
  { id: 'snatch', label: 'Arranque' },
  { id: 'clean_jerk', label: 'Clin y Envión' },
  { id: 'power_clean', label: 'Power Clean' },
  { id: 'back_squat', label: 'S. Trasera' },
  { id: 'front_squat', label: 'S. Frontal' },
  { id: 'deadlift', label: 'Peso Muerto' },
  { id: 'overhead_press', label: 'Press Hombros' },
  { id: 'bench_press', label: 'Press Banca' },
];

export default function WeightliftingAnalysis({
  sessions, snapshots, references, onNewSession, onSaveSnapshot, onSelectSession, activeSession,
}: WeightliftingAnalysisProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const [lift, setLift] = useState<LiftType>('snatch');

  const wlSessions = sessions.filter((s) => s.session_type === 'weightlifting');

  if (!activeSession) {
    if (wlSessions.length === 0) return <EmptyState onNewSession={onNewSession} th={th} />;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading" style={{ color: th.title }}>Halterofilia & Levantamiento de Fuerza</h2>
            <p className="text-sm mt-0.5" style={{ color: th.sub }}>Snatch · Clean & Jerk · Squat · Deadlift · Press · Power Clean</p>
          </div>
          <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl" style={{ background: '#ef4444', color: '#fff' }}>
            <Plus className="w-4 h-4" />
            Nueva sesión
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wlSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session)}
              className="group p-4 rounded-xl text-left transition-all"
              style={{ background: th.rowBg, border: `1px solid ${th.rowBorder}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.rowBorder; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
                  <Dumbbell className="w-5 h-5" style={{ color: '#ef4444' }} />
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

  const wlRefs = references.filter((r) =>
    ['snatch', 'clean_jerk', 'back_squat', 'front_squat', 'deadlift', 'overhead_press', 'bench_press', 'power_clean'].includes(r.discipline)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => onSelectSession(null as unknown as BiomechanicsSession)} className="text-sm transition-colors" style={{ color: th.breadcrumbLink }}>Halterofilia</button>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: th.breadcrumbSep }} />
        <span className="text-sm font-medium truncate" style={{ color: th.rowText }}>{activeSession.title}</span>
        {activeSession.athlete && (
          <>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: th.breadcrumbSep }} />
            <span className="text-sm" style={{ color: '#ef4444' }}>{activeSession.athlete.name}</span>
          </>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
        {LIFT_TABS.map((tab) => {
          const c = LIFT_CONFIGS[tab.id];
          const active = lift === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setLift(tab.id)}
              className="flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={active ? { background: c.color, color: '#fff' } : { color: th.sub }}
            >
              <Dumbbell className="w-3 h-3 flex-shrink-0" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <LiftWorkspace
        key={`${activeSession.id}:${lift}`}
        session={activeSession}
        lift={lift}
        references={wlRefs}
        snapshots={snapshots}
        onSaveSnapshot={onSaveSnapshot}
      />
    </div>
  );
}
