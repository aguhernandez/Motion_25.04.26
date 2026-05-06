import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Camera, Upload, Save, RotateCcw, Eye, EyeOff, Layers,
  Sparkles, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react';
import AngleCanvas from '../shared/AngleCanvas';
import AnglePanel from '../shared/AnglePanel';
import type { KeyPoint, BiomechanicsSession, BiomechanicsSnapshot } from '../../lib/types';
import type { ReferenceRange } from '../../lib/types';
import { CYCLING_FRONTAL_ANGLE_CONFIGS, computeAnglesFromPoints } from '../../lib/angleCalculations';
import {
  CYCLING_FRONTAL_KEY_POINTS,
  CYCLING_FRONTAL_POINT_CONNECTIONS,
  CYCLING_FRONTAL_DEMO_IMAGE_URL,
} from '../../data/defaultKeyPoints';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface CyclingFrontalWorkspaceProps {
  session: BiomechanicsSession;
  references: ReferenceRange[];
  snapshots: BiomechanicsSnapshot[];
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
}

const PHASES = [
  'TDC Der. (12h)',
  'BDC Der. (6h)',
  'TDC Izq. (12h)',
  'Posición estática frontal',
];

interface SymmetryAlert {
  type: 'valgus_r' | 'valgus_l' | 'pelvic_drop' | 'shoulder_tilt';
  severity: 'warning' | 'critical';
  message: string;
}

function detectSymmetryAlerts(angles: ReturnType<typeof computeAnglesFromPoints>): SymmetryAlert[] {
  const alerts: SymmetryAlert[] = [];
  const map = new Map(angles.map((a) => [a.name, a.value_deg]));

  const kneeDer = map.get('Rodilla Der. Valgo/Varo');
  const kneeIzq = map.get('Rodilla Izq. Valgo/Varo');

  if (kneeDer !== undefined && kneeDer < 170) {
    alerts.push({
      type: 'valgus_r',
      severity: kneeDer < 160 ? 'critical' : 'warning',
      message: `Rodilla derecha con posible valgo dinámico (${kneeDer}°). Evaluar control de cadera y calzado.`,
    });
  }
  if (kneeIzq !== undefined && kneeIzq < 170) {
    alerts.push({
      type: 'valgus_l',
      severity: kneeIzq < 160 ? 'critical' : 'warning',
      message: `Rodilla izquierda con posible valgo dinámico (${kneeIzq}°). Evaluar control de cadera y calzado.`,
    });
  }

  const pelvis = map.get('Inclinación Pelvis');
  if (pelvis !== undefined && (pelvis < 160 || pelvis > 200)) {
    alerts.push({
      type: 'pelvic_drop',
      severity: 'warning',
      message: `Posible inclinación lateral de pelvis detectada (${pelvis}°). Revisar altura de sillín.`,
    });
  }

  const shoulders = map.get('Simetría Hombros');
  if (shoulders !== undefined && (shoulders < 155 || shoulders > 175)) {
    alerts.push({
      type: 'shoulder_tilt',
      severity: 'warning',
      message: `Asimetría de hombros (${shoulders}°). Puede indicar compensación postural o diferencia de longitud de brazos.`,
    });
  }

  return alerts;
}

export default function CyclingFrontalWorkspace({
  session, references, snapshots, onSaveSnapshot,
}: CyclingFrontalWorkspaceProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const [imageData, setImageData] = useState('');
  const [points, setPoints] = useState<KeyPoint[]>(CYCLING_FRONTAL_KEY_POINTS);
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

  const angles = computeAnglesFromPoints(points, CYCLING_FRONTAL_ANGLE_CONFIGS, references);
  const symmetryAlerts = detectSymmetryAlerts(angles);

  const handlePointsChange = useCallback((pts: KeyPoint[]) => { setPoints(pts); }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImageData(ev.target?.result as string); setPoints(CYCLING_FRONTAL_KEY_POINTS); };
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
    setPoints(CYCLING_FRONTAL_KEY_POINTS);
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
      setPoints(CYCLING_FRONTAL_KEY_POINTS);
      setDemoLoading(false);
    };
    img.onerror = () => { setImageData(CYCLING_FRONTAL_DEMO_IMAGE_URL); setPoints(CYCLING_FRONTAL_KEY_POINTS); setDemoLoading(false); };
    img.src = CYCLING_FRONTAL_DEMO_IMAGE_URL;
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
        phase_label: `[Frontal] ${phaseLabel}`,
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

  const kneeDer = angles.find((a) => a.name === 'Rodilla Der. Valgo/Varo');
  const kneeIzq = angles.find((a) => a.name === 'Rodilla Izq. Valgo/Varo');
  const symmetryDiff = kneeDer && kneeIzq ? Math.abs(kneeDer.value_deg - kneeIzq.value_deg) : null;

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="flex-1 space-y-4 min-w-0">
        <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#06b6d4' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#06b6d4' }}>
            <strong>Vista frontal:</strong> Posicionar cámara a la altura del pedalier, alineada con el centro de la bici. Capturar en TDC de cada pierna para detectar valgo/varo dinámico, drop pélvico y asimetría de hombros.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <div>
              <span className="text-sm font-semibold" style={{ color: th.title }}>Captura Frontal</span>
              <p className="text-xs mt-0.5" style={{ color: th.sub }}>9 puntos bilaterales · Valgo/Varo · Pelvis · Hombros</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowLabels((v) => !v)} style={showLabels ? iconActive : iconInactive}>
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowAngles((v) => !v)} style={showAngles ? iconActive : iconInactive}>
                <Layers className="w-4 h-4" />
              </button>
              <button onClick={() => setPoints(CYCLING_FRONTAL_KEY_POINTS)} style={iconInactive}>
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
                connections={CYCLING_FRONTAL_POINT_CONNECTIONS}
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

        {snapshots.filter((s) => s.phase_label?.startsWith('[Frontal]')).length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
              <span className="text-sm font-semibold" style={{ color: th.title }}>Snapshots Frontales</span>
            </div>
            <div className="p-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {snapshots.filter((s) => s.phase_label?.startsWith('[Frontal]')).map((snap) => (
                <button
                  key={snap.id}
                  onClick={() => {
                    if (snap.image_data) setImageData(snap.image_data);
                    setPoints(snap.key_points as KeyPoint[]);
                    setPhaseLabel(snap.phase_label?.replace('[Frontal] ', '') ?? PHASES[0]);
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
                    <p className="text-xs text-white truncate">{snap.phase_label?.replace('[Frontal] ', '')}</p>
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
            <span className="text-sm font-semibold" style={{ color: th.title }}>Análisis de Simetría Bilateral</span>
          </div>
          <div className="p-3 space-y-3">
            {symmetryDiff !== null && (
              <div className="p-3 rounded-xl" style={{
                background: symmetryDiff <= 3 ? 'rgba(16,185,129,0.08)' : symmetryDiff <= 8 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${symmetryDiff <= 3 ? 'rgba(16,185,129,0.2)' : symmetryDiff <= 8 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <p className="text-xs font-semibold mb-1" style={{ color: symmetryDiff <= 3 ? '#10b981' : symmetryDiff <= 8 ? '#f59e0b' : '#ef4444' }}>
                  Índice de Simetría Rodillas
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black" style={{ color: symmetryDiff <= 3 ? '#10b981' : symmetryDiff <= 8 ? '#f59e0b' : '#ef4444' }}>
                    {symmetryDiff}°
                  </span>
                  <div>
                    <p className="text-xs" style={{ color: th.sub }}>diferencia Der. vs Izq.</p>
                    <p className="text-xs font-medium" style={{ color: symmetryDiff <= 3 ? '#10b981' : symmetryDiff <= 8 ? '#f59e0b' : '#ef4444' }}>
                      {symmetryDiff <= 3 ? 'Simétrico' : symmetryDiff <= 8 ? 'Asimetría leve' : 'Asimetría significativa'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {kneeDer && kneeIzq && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Rodilla Der.', angle: kneeDer, side: 'D' },
                  { label: 'Rodilla Izq.', angle: kneeIzq, side: 'I' },
                ].map(({ label, angle, side }) => {
                  const isValgus = angle.value_deg < 170;
                  return (
                    <div key={side} className="p-2.5 rounded-xl" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
                      <p className="text-xs mb-1" style={{ color: th.sub }}>{label}</p>
                      <p className="text-xl font-bold" style={{ color: isValgus ? '#f59e0b' : '#10b981' }}>{angle.value_deg}°</p>
                      <p className="text-xs mt-0.5" style={{ color: isValgus ? '#f59e0b' : th.empty }}>
                        {isValgus ? (angle.value_deg < 160 ? 'Valgo severo' : 'Valgo leve') : 'Neutro'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {symmetryAlerts.length > 0 ? (
              <div className="space-y-2">
                {symmetryAlerts.map((alert, i) => (
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
                <p className="text-xs" style={{ color: '#10b981' }}>Simetría dentro de rangos normales. Sin asimetrías críticas detectadas.</p>
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
              placeholder="Observaciones de simetría, compensaciones, recomendaciones..."
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
              { label: 'Rodilla Valgo/Varo', range: '170–180°', hint: 'Neutro (sin desviación)' },
              { label: 'Inclinación Pelvis', range: '160–180°', hint: 'Simetría horizontal' },
              { label: 'Simetría Hombros', range: '155–175°', hint: 'Sin rotación compensatoria' },
            ].map((ref) => (
              <div key={ref.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: th.tagBg }}>
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: 'rgba(6,182,212,0.4)' }} />
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
