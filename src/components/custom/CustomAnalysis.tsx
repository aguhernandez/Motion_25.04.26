import { useState, useCallback, useRef } from 'react';
import {
  Layers, Plus, ChevronRight, Camera, Upload, Save, RotateCcw,
  Eye, EyeOff, Settings, ChevronDown, ChevronUp,
} from 'lucide-react';
import AngleCanvas from '../shared/AngleCanvas';
import AnglePanel from '../shared/AnglePanel';
import PointManager from './PointManager';
import AngleConfigurator from './AngleConfigurator';
import type { KeyPoint, AngleData, BiomechanicsSession, BiomechanicsSnapshot, CustomAngleConfig } from '../../lib/types';
import { computeAnglesFromPoints } from '../../lib/angleCalculations';
import type { CyclingAngleConfig } from '../../lib/angleCalculations';
import type { ReferenceRange } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface CustomAnalysisProps {
  sessions: BiomechanicsSession[];
  snapshots: BiomechanicsSnapshot[];
  onNewSession: () => void;
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
  onSelectSession: (session: BiomechanicsSession) => void;
  activeSession: BiomechanicsSession | null;
}

const DEFAULT_POINTS: KeyPoint[] = [];

function CustomWorkspace({
  session,
  snapshots,
  onSaveSnapshot,
}: {
  session: BiomechanicsSession;
  snapshots: BiomechanicsSnapshot[];
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
}) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const [imageData, setImageData] = useState('');
  const [points, setPoints] = useState<KeyPoint[]>(DEFAULT_POINTS);
  const [angleConfigs, setAngleConfigs] = useState<CustomAngleConfig[]>([]);
  const [connections, setConnections] = useState<[string, string][]>([]);
  const [angles, setAngles] = useState<AngleData[]>([]);
  const [showAngles, setShowAngles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [activeTab, setActiveTab] = useState<'points' | 'angles' | 'connections'>('points');
  const [phaseLabel, setPhaseLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [snapshotsPanelOpen, setSnapshotsPanelOpen] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const recomputeAngles = useCallback(
    (pts: KeyPoint[], cfgs: CustomAngleConfig[]) => {
      const asCyclingConfigs: CyclingAngleConfig[] = cfgs.map((c) => ({
        name: c.name,
        labelP1: c.labelP1,
        labelVertex: c.labelVertex,
        labelP2: c.labelP2,
      }));
      const computed = computeAnglesFromPoints(pts, asCyclingConfigs, [] as ReferenceRange[]);
      setAngles(computed);
    },
    []
  );

  const handlePointsChange = useCallback(
    (pts: KeyPoint[]) => {
      setPoints(pts);
      recomputeAngles(pts, angleConfigs);
    },
    [angleConfigs, recomputeAngles]
  );

  const handleAngleConfigsChange = (cfgs: CustomAngleConfig[]) => {
    setAngleConfigs(cfgs);
    recomputeAngles(points, cfgs);
  };

  const handleConnectionToggle = (labelA: string, labelB: string) => {
    const exists = connections.find(([a, b]) => (a === labelA && b === labelB) || (a === labelB && b === labelA));
    if (exists) {
      setConnections((prev) => prev.filter(([a, b]) => !((a === labelA && b === labelB) || (a === labelB && b === labelA))));
    } else {
      setConnections((prev) => [...prev, [labelA, labelB]]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      alert('No se pudo acceder a la cámara.');
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setImageData(canvas.toDataURL('image/jpeg', 0.85));
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSnapshot({
        session_id: session.id,
        image_data: imageData,
        key_points: points,
        angles,
        bike_fitting_data: { custom_angle_configs: angleConfigs as unknown as number } as never,
        gait_data: {},
        phase_label: phaseLabel,
        notes,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const labels = points.map((p) => p.label);
  const iconActive: React.CSSProperties = { background: 'rgba(253,218,54,0.12)', color: '#fdda36', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };
  const iconInactive: React.CSSProperties = { background: 'transparent', color: th.sub, borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="flex-1 space-y-4 min-w-0">
        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>Canvas — Análisis Libre</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowLabels((v) => !v)} style={showLabels ? iconActive : iconInactive}>
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowAngles((v) => !v)} style={showAngles ? iconActive : iconInactive}>
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={() => setPoints(DEFAULT_POINTS)} style={iconInactive}>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {cameraActive ? (
            <div className="relative">
              <video ref={videoRef} className="w-full" autoPlay playsInline muted />
              <button onClick={captureFromCamera} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2.5 font-medium rounded-full text-sm" style={{ background: '#fdda36', color: '#514163' }}>
                Capturar foto
              </button>
            </div>
          ) : (
            <div className="p-3">
              <AngleCanvas imageData={imageData} keyPoints={points} angles={showAngles ? angles : []} connections={connections} onPointsChange={handlePointsChange} showAngles={showAngles} showLabels={showLabels} />
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-3 border-t flex-wrap" style={{ borderColor: th.panelHeaderBorder }}>
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
              <Upload className="w-4 h-4" />
              Subir imagen
            </button>
            <button onClick={startCamera} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
              <Camera className="w-4 h-4" />
              Cámara
            </button>
            <div className="flex-1" />
            <input
              value={phaseLabel}
              onChange={(e) => setPhaseLabel(e.target.value)}
              placeholder="Etiqueta / fase"
              className="w-32 px-2.5 py-2 text-xs rounded-lg focus:outline-none"
              style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
            />
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-50" style={savedFlash ? { background: '#10b981', color: '#ffffff' } : { background: '#fdda36', color: '#514163' }}>
              <Save className="w-4 h-4" />
              {savedFlash ? 'Guardado!' : saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <button onClick={() => setSnapshotsPanelOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: th.title }}>
              Historial de Snapshots
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: th.tagBg, color: th.sub }}>{snapshots.length}</span>
            </span>
            {snapshotsPanelOpen ? <ChevronUp className="w-4 h-4" style={{ color: th.sub }} /> : <ChevronDown className="w-4 h-4" style={{ color: th.sub }} />}
          </button>
          {snapshotsPanelOpen && (
            <div className="p-3">
              {snapshots.length === 0 ? (
                <p className="text-center text-sm py-6" style={{ color: th.empty }}>Sin snapshots aún</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      onClick={() => {
                        if (snap.image_data) setImageData(snap.image_data);
                        setPoints(snap.key_points);
                        recomputeAngles(snap.key_points, angleConfigs);
                        setPhaseLabel(snap.phase_label ?? '');
                        setNotes(snap.notes ?? '');
                      }}
                      className="group relative aspect-video rounded-lg overflow-hidden transition-all"
                      style={{ border: `1px solid ${th.snapshotBorder}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(253,218,54,0.5)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.snapshotBorder; }}
                    >
                      {snap.image_data ? (
                        <img src={snap.image_data} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: th.tagBg }}>
                          <Layers className="w-4 h-4" style={{ color: th.sub }} />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white truncate">{snap.phase_label || '–'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="xl:w-80 space-y-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="flex border-b" style={{ borderColor: th.panelHeaderBorder }}>
            {(['points', 'angles', 'connections'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 text-xs font-medium transition-colors"
                style={
                  activeTab === tab
                    ? { color: '#fdda36', borderBottom: '2px solid #fdda36', background: 'rgba(253,218,54,0.05)' }
                    : { color: th.sub }
                }
              >
                {tab === 'points' ? 'Puntos' : tab === 'angles' ? 'Ángulos' : 'Líneas'}
              </button>
            ))}
          </div>
          <div className="p-3">
            {activeTab === 'points' && <PointManager points={points} onChange={handlePointsChange} />}
            {activeTab === 'angles' && <AngleConfigurator points={points} configs={angleConfigs} onChange={handleAngleConfigsChange} />}
            {activeTab === 'connections' && (
              <div className="space-y-2">
                {labels.length < 2 ? (
                  <p className="text-xs text-center py-4" style={{ color: th.empty }}>Necesitás al menos 2 puntos para trazar líneas</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {labels.map((a, i) =>
                      labels.slice(i + 1).map((b) => {
                        const active = connections.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
                        return (
                          <button
                            key={`${a}-${b}`}
                            onClick={() => handleConnectionToggle(a, b)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all"
                            style={
                              active
                                ? { background: 'rgba(253,218,54,0.1)', border: '1px solid rgba(253,218,54,0.3)', color: th.rowText }
                                : { background: th.tagBg, border: `1px solid ${th.rowBorder}`, color: th.sub }
                            }
                          >
                            <span>{a} — {b}</span>
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={active ? { background: '#fdda36', border: '1px solid #fdda36' } : { border: `1px solid ${th.sub}` }}
                            />
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
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
              placeholder="Observaciones del análisis..."
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
              style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(253,218,54,0.07)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomAnalysis({ sessions, snapshots, onNewSession, onSaveSnapshot, onSelectSession, activeSession }: CustomAnalysisProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const customSessions = sessions.filter((s) => s.session_type === 'custom');

  const FEATURES = [
    { icon: Layers, title: 'Puntos libres', desc: 'Nombrá y colocá cualquier punto articular u de referencia sobre la imagen', highlight: false },
    { icon: Settings, title: 'Ángulos a medida', desc: 'Definí qué 3 puntos forman cada ángulo y asignale un nombre propio', highlight: false },
    { icon: Save, title: 'Guardado completo', desc: 'Los snapshots guardan imagen, puntos y configuración de ángulos', highlight: false },
  ];

  const SPORTS = ['Natación', 'Tenis', 'Golf', 'Levantamiento', 'Escalada', 'Surf', 'Esquí', 'Fútbol'];

  if (!activeSession) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading" style={{ color: th.title }}>Análisis Libre</h2>
            <p className="text-sm mt-0.5" style={{ color: th.sub }}>Puntos y ángulos personalizados · Cualquier deporte o movimiento</p>
          </div>
          <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all" style={{ background: '#fdda36', color: '#514163' }}>
            <Plus className="w-4 h-4" />
            Nueva sesión
          </button>
        </div>

        <div className="p-5 rounded-2xl" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(253,218,54,0.15)', border: '1px solid rgba(253,218,54,0.25)' }}>
              <Layers className="w-6 h-6" style={{ color: '#fdda36' }} />
            </div>
            <div>
              <h3 className="text-base font-bold mb-2" style={{ color: th.infoTitle }}>Análisis Biomecánico Libre</h3>
              <p className="text-sm mb-3" style={{ color: th.infoText }}>
                Diseñá tu propio esquema de análisis. Agregás los puntos articulares que quieras, definís las conexiones entre ellos y configurás los ángulos a medir. Funciona para cualquier deporte.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPORTS.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg text-xs text-center" style={{ background: th.tagBg, color: th.sub, border: `1px solid ${th.rowBorder}` }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-4 rounded-xl" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(253,218,54,0.12)' }}>
                <Icon className="w-4 h-4" style={{ color: '#fdda36' }} />
              </div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: th.rowText }}>{title}</h4>
              <p className="text-xs" style={{ color: th.sub }}>{desc}</p>
            </div>
          ))}
        </div>

        {customSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm mb-4" style={{ color: th.sub }}>No hay sesiones de análisis libre todavía</p>
            <button onClick={onNewSession} className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all" style={{ background: '#fdda36', color: '#514163' }}>
              Crear primera sesión libre
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session)}
                className="group p-4 rounded-xl text-left transition-all"
                style={{ background: th.rowBg, border: `1px solid ${th.rowBorder}` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.rowHoverBorder; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.rowBorder; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #514163 0%, #3d3050 100%)' }}>
                    <Layers className="w-5 h-5" style={{ color: '#fdda36' }} />
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: th.sub }} />
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: th.rowText }}>{session.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs" style={{ color: th.sub }}>{session.athlete?.name ?? 'Sin atleta'}</span>
                  <span className="text-xs" style={{ color: th.empty }}>{new Date(session.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => onSelectSession(null as unknown as BiomechanicsSession)} className="text-sm transition-colors" style={{ color: th.breadcrumbLink }}>Análisis Libre</button>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: th.breadcrumbSep }} />
        <span className="text-sm font-medium truncate" style={{ color: th.rowText }}>{activeSession.title}</span>
        {activeSession.athlete && (
          <>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: th.breadcrumbSep }} />
            <span className="text-sm" style={{ color: '#fdda36' }}>{activeSession.athlete.name}</span>
          </>
        )}
      </div>
      <CustomWorkspace session={activeSession} snapshots={snapshots} onSaveSnapshot={onSaveSnapshot} />
    </div>
  );
}
