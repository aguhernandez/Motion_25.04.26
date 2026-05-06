import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Camera, Upload, Save, RotateCcw, Eye, EyeOff, Layers,
  Sparkles, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react';
import AngleCanvas from '../shared/AngleCanvas';
import AnglePanel from '../shared/AnglePanel';
import type { KeyPoint, BiomechanicsSession, BiomechanicsSnapshot } from '../../lib/types';
import type { ReferenceRange } from '../../lib/types';
import { RUNNING_REAR_ANGLE_CONFIGS, computeAnglesFromPoints } from '../../lib/angleCalculations';
import {
  RUNNING_REAR_KEY_POINTS,
  RUNNING_REAR_POINT_CONNECTIONS,
  RUNNING_REAR_DEMO_IMAGE_URL,
} from '../../data/defaultKeyPoints';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface RunningRearWorkspaceProps {
  session: BiomechanicsSession;
  references: ReferenceRange[];
  snapshots: BiomechanicsSnapshot[];
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
}

const PHASES = [
  'Contacto inicial Der.',
  'Contacto inicial Izq.',
  'Apoyo medio Der.',
  'Apoyo medio Izq.',
  'Despegue Der.',
  'Despegue Izq.',
  'Posición estática posterior',
];

interface RearAlert {
  type: 'hip_drop_r' | 'hip_drop_l' | 'knee_r' | 'knee_l' | 'trunk_lean';
  severity: 'warning' | 'critical';
  message: string;
}

function detectRearAlerts(angles: ReturnType<typeof computeAnglesFromPoints>): RearAlert[] {
  const alerts: RearAlert[] = [];
  const map = new Map(angles.map((a) => [a.name, a.value_deg]));

  const hipDer = map.get('Cadera Lateral Der.');
  const hipIzq = map.get('Cadera Lateral Izq.');

  if (hipDer !== undefined && (hipDer < 155 || hipDer > 185)) {
    alerts.push({
      type: 'hip_drop_r',
      severity: hipDer < 145 ? 'critical' : 'warning',
      message: `Hip drop lateral derecha (${hipDer}°). Posible debilidad de glúteo medio o control pélvico insuficiente.`,
    });
  }
  if (hipIzq !== undefined && (hipIzq < 155 || hipIzq > 185)) {
    alerts.push({
      type: 'hip_drop_l',
      severity: hipIzq < 145 ? 'critical' : 'warning',
      message: `Hip drop lateral izquierda (${hipIzq}°). Evaluar fuerza de abductores y estabilidad de cadera.`,
    });
  }

  const trunk = map.get('Inclinación Tronco Post.');
  if (trunk !== undefined && (trunk < 155 || trunk > 185)) {
    alerts.push({
      type: 'trunk_lean',
      severity: 'warning',
      message: `Inclinación lateral del tronco detectada (${trunk}°). Puede compensar debilidad de cadera o dolor.`,
    });
  }

  const kneeDer = map.get('Rodilla Der. Posterior');
  const kneeIzq = map.get('Rodilla Izq. Posterior');

  if (kneeDer !== undefined && kneeDer < 155) {
    alerts.push({
      type: 'knee_r',
      severity: kneeDer < 140 ? 'critical' : 'warning',
      message: `Flexión de rodilla derecha en apoyo reducida (${kneeDer}°). Evaluar rigidez de cuádriceps o cadena posterior.`,
    });
  }
  if (kneeIzq !== undefined && kneeIzq < 155) {
    alerts.push({
      type: 'knee_l',
      severity: kneeIzq < 140 ? 'critical' : 'warning',
      message: `Flexión de rodilla izquierda en apoyo reducida (${kneeIzq}°). Posible asimetría de amortiguación.`,
    });
  }

  return alerts;
}

function computeProonationIndex(points: KeyPoint[]): { right: string; left: string } | null {
  const pm = new Map(points.map((p) => [p.label, p]));
  const ankleR = pm.get('Tobillo Der.');
  const heelR = pm.get('Talón Der.');
  const ankleL = pm.get('Tobillo Izq.');
  const heelL = pm.get('Talón Izq.');

  if (!ankleR || !heelR || !ankleL || !heelL) return null;

  const offsetR = heelR.x - ankleR.x;
  const offsetL = ankleL.x - heelL.x;

  const classify = (offset: number) => {
    if (offset > 0.03) return 'Pronación';
    if (offset < -0.03) return 'Supinación';
    return 'Neutro';
  };

  return { right: classify(offsetR), left: classify(offsetL) };
}

export default function RunningRearWorkspace({
  session, references, snapshots, onSaveSnapshot,
}: RunningRearWorkspaceProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const [imageData, setImageData] = useState('');
  const [points, setPoints] = useState<KeyPoint[]>(RUNNING_REAR_KEY_POINTS);
  const [showAngles, setShowAngles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [phaseLabel, setPhaseLabel] = useState(PHASES[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const angles = computeAnglesFromPoints(points, RUNNING_REAR_ANGLE_CONFIGS, references);
  const rearAlerts = detectRearAlerts(angles);
  const pronation = computeProonationIndex(points);

  const handlePointsChange = useCallback((pts: KeyPoint[]) => { setPoints(pts); }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImageData(ev.target?.result as string); setPoints(RUNNING_REAR_KEY_POINTS); };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setCameraActive(true); }
    } catch { alert('No se pudo acceder a la cámara.'); }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setImageData(canvas.toDataURL('image/jpeg', 0.85));
    setPoints(RUNNING_REAR_KEY_POINTS);
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  const loadDemo = useCallback(() => {
    setDemoLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      setImageData(canvas.toDataURL('image/jpeg', 0.9));
      setPoints(RUNNING_REAR_KEY_POINTS);
      setDemoLoading(false);
    };
    img.onerror = () => { setImageData(RUNNING_REAR_DEMO_IMAGE_URL); setPoints(RUNNING_REAR_KEY_POINTS); setDemoLoading(false); };
    img.src = RUNNING_REAR_DEMO_IMAGE_URL;
  }, []);

  useEffect(() => { if (!imageData) loadDemo(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSnapshot({
        session_id: session.id,
        image_data: imageData,
        key_points: points,
        angles,
        bike_fitting_data: {},
        gait_data: {},
        phase_label: `[Posterior] ${phaseLabel}`,
        notes,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const iconActive: React.CSSProperties = { background: 'rgba(253,218,54,0.12)', color: '#fdda36', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };
  const iconInactive: React.CSSProperties = { background: 'transparent', color: th.sub, borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };

  const hipDer = angles.find((a) => a.name === 'Cadera Lateral Der.');
  const hipIzq = angles.find((a) => a.name === 'Cadera Lateral Izq.');
  const hipSymDiff = hipDer && hipIzq ? Math.abs(hipDer.value_deg - hipIzq.value_deg) : null;

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="flex-1 space-y-4 min-w-0">
        <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#06b6d4' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#06b6d4' }}>
            <strong>Vista posterior:</strong> Cámara a la altura de la cadera, alineada con el eje de carrera. Útil para detectar hip drop, pronación/supinación de tobillo, valgo de rodilla y asimetría de tronco durante la fase de apoyo.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <div>
              <span className="text-sm font-semibold" style={{ color: th.title }}>Captura Posterior</span>
              <p className="text-xs mt-0.5" style={{ color: th.sub }}>10 puntos bilaterales · Hip Drop · Pronación · Inclinación Tronco</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowLabels((v) => !v)} style={showLabels ? iconActive : iconInactive}>
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowAngles((v) => !v)} style={showAngles ? iconActive : iconInactive}>
                <Layers className="w-4 h-4" />
              </button>
              <button onClick={() => setPoints(RUNNING_REAR_KEY_POINTS)} style={iconInactive}>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {cameraActive ? (
            <div className="relative p-3">
              <video ref={videoRef} className="w-full rounded-xl" autoPlay playsInline muted />
              <button onClick={captureFromCamera} className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 font-semibold rounded-full text-sm shadow-xl" style={{ background: '#fdda36', color: '#514163' }}>
                Capturar
              </button>
            </div>
          ) : (
            <div className="p-3">
              <AngleCanvas
                imageData={imageData}
                keyPoints={points}
                angles={angles}
                connections={RUNNING_REAR_POINT_CONNECTIONS}
                onPointsChange={handlePointsChange}
                showAngles={showAngles}
                showLabels={showLabels}
              />
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-3 border-t flex-wrap" style={{ borderColor: th.panelHeaderBorder }}>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="sr-only" onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
              <Upload className="w-4 h-4" />
              Subir imagen / video
            </button>
            <button onClick={startCamera} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
              <Camera className="w-4 h-4" />
              Cámara
            </button>
            <button onClick={loadDemo} disabled={demoLoading} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg disabled:opacity-50" style={{ background: 'rgba(253,218,54,0.1)', border: '1px solid rgba(253,218,54,0.3)', color: '#fdda36' }}>
              <Sparkles className="w-4 h-4" />
              {demoLoading ? 'Cargando...' : 'Demo'}
            </button>
            <div className="flex-1" />
            <select value={phaseLabel} onChange={(e) => setPhaseLabel(e.target.value)} className="px-2 py-2 text-sm rounded-lg focus:outline-none" style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}>
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50" style={savedFlash ? { background: '#10b981', color: '#fff' } : { background: '#fdda36', color: '#514163' }}>
              <Save className="w-4 h-4" />
              {savedFlash ? 'Guardado!' : saving ? 'Guardando...' : 'Guardar snapshot'}
            </button>
          </div>
        </div>

        {snapshots.filter((s) => s.phase_label?.startsWith('[Posterior]')).length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
              <span className="text-sm font-semibold" style={{ color: th.title }}>Snapshots Posteriores</span>
            </div>
            <div className="p-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {snapshots.filter((s) => s.phase_label?.startsWith('[Posterior]')).map((snap) => (
                <button
                  key={snap.id}
                  onClick={() => {
                    if (snap.image_data) setImageData(snap.image_data);
                    setPoints(snap.key_points as KeyPoint[]);
                    setPhaseLabel(snap.phase_label?.replace('[Posterior] ', '') ?? PHASES[0]);
                    setNotes(snap.notes ?? '');
                  }}
                  className="group relative aspect-video rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${th.snapshotBorder}` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(253,218,54,0.5)'; }}
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
                    <p className="text-xs text-white truncate">{snap.phase_label?.replace('[Posterior] ', '')}</p>
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
            <span className="text-sm font-semibold" style={{ color: th.title }}>Análisis Posterior</span>
          </div>
          <div className="p-3 space-y-3">
            {hipSymDiff !== null && (
              <div className="p-3 rounded-xl" style={{
                background: hipSymDiff <= 5 ? 'rgba(16,185,129,0.08)' : hipSymDiff <= 12 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${hipSymDiff <= 5 ? 'rgba(16,185,129,0.2)' : hipSymDiff <= 12 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <p className="text-xs font-semibold mb-1" style={{ color: hipSymDiff <= 5 ? '#10b981' : hipSymDiff <= 12 ? '#f59e0b' : '#ef4444' }}>
                  Simetría de Cadera Lateral
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black" style={{ color: hipSymDiff <= 5 ? '#10b981' : hipSymDiff <= 12 ? '#f59e0b' : '#ef4444' }}>
                    {hipSymDiff}°
                  </span>
                  <div>
                    <p className="text-xs" style={{ color: th.sub }}>diferencia Der. vs Izq.</p>
                    <p className="text-xs font-medium" style={{ color: hipSymDiff <= 5 ? '#10b981' : hipSymDiff <= 12 ? '#f59e0b' : '#ef4444' }}>
                      {hipSymDiff <= 5 ? 'Simétrico' : hipSymDiff <= 12 ? 'Asimetría leve' : 'Hip drop significativo'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pronation && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: th.sub }}>Patrón de Tobillo</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { side: 'Derecho', value: pronation.right },
                    { side: 'Izquierdo', value: pronation.left },
                  ].map(({ side, value }) => {
                    const color = value === 'Neutro' ? '#10b981' : value === 'Pronación' ? '#f59e0b' : '#06b6d4';
                    return (
                      <div key={side} className="p-2.5 rounded-xl text-center" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
                        <p className="text-xs mb-1" style={{ color: th.sub }}>{side}</p>
                        <p className="text-sm font-bold" style={{ color }}>{value}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs" style={{ color: th.empty }}>Basado en desplazamiento lateral del talón vs tobillo. Requiere confirmación visual.</p>
              </div>
            )}

            {rearAlerts.length > 0 ? (
              <div className="space-y-2">
                {rearAlerts.map((alert, i) => (
                  <div
                    key={i}
                    className="flex gap-2.5 p-2.5 rounded-xl"
                    style={{
                      background: alert.severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b' }} />
                    <p className="text-xs leading-relaxed" style={{ color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b' }}>{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : angles.length > 0 ? (
              <div className="flex gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                <p className="text-xs" style={{ color: '#10b981' }}>Sin alertas de hip drop o asimetría significativa detectadas.</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Ángulos Calculados</span>
          </div>
          <div className="p-3"><AnglePanel angles={angles} /></div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Notas</span>
          </div>
          <div className="p-3">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de hip drop, pronación, compensaciones..."
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
              style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
            />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Guía de evaluación</span>
          </div>
          <div className="p-3 space-y-2">
            {[
              { label: 'Cadera Lateral', range: '155–185°', hint: 'Sin hip drop lateral' },
              { label: 'Inclinación Tronco', range: '155–185°', hint: 'Sin inclinación lateral' },
              { label: 'Rodilla Posterior', range: '160–180°', hint: 'Extensión adecuada en apoyo' },
              { label: 'Patrón Tobillo', range: 'Neutro', hint: 'Sin pronación/supinación excesiva' },
            ].map((ref) => (
              <div key={ref.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: th.tagBg }}>
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: 'rgba(16,185,129,0.4)' }} />
                <div className="flex-1">
                  <p className="text-xs font-medium" style={{ color: th.rowText }}>{ref.label}</p>
                  <p className="text-xs" style={{ color: th.sub }}>{ref.range} · {ref.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
