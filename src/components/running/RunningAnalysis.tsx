import { useState } from 'react';
import { Activity, Plus, ChevronRight, PlayCircle, Camera, AlignCenter, MoveVertical } from 'lucide-react';
import type { Athlete, BiomechanicsSession, BiomechanicsSnapshot } from '../../lib/types';
import type { ReferenceRange } from '../../lib/types';
import { RUNNING_ANGLE_CONFIGS } from '../../lib/angleCalculations';
import { RUNNING_KEY_POINTS, RUNNING_POINT_CONNECTIONS, RUNNING_DEMO_IMAGE_URL, RUNNING_DEMO_POINTS } from '../../data/defaultKeyPoints';
import AnalysisWorkspace from '../shared/AnalysisWorkspace';
import GaitDataPanel from './GaitDataPanel';
import RunningRearWorkspace from './RunningRearWorkspace';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

type RunningView = 'lateral' | 'posterior';

interface RunningAnalysisProps {
  sessions: BiomechanicsSession[];
  snapshots: BiomechanicsSnapshot[];
  references: ReferenceRange[];
  athletes: Athlete[];
  onNewSession: () => void;
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
  onSelectSession: (session: BiomechanicsSession) => void;
  activeSession: BiomechanicsSession | null;
}

const RUNNING_PHASES = [
  'Apoyo inicial', 'Apoyo medio', 'Despegue', 'Vuelo', 'Oscilación inicial', 'Oscilación terminal',
];

const DEMO_IMAGES = [
  { url: 'https://images.pexels.com/photos/2168292/pexels-photo-2168292.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Gait analysis — fase de apoyo' },
  { url: 'https://images.pexels.com/photos/1571939/pexels-photo-1571939.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Running — vista lateral de zancada' },
  { url: 'https://images.pexels.com/photos/3621185/pexels-photo-3621185.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Trail running — inclinación de tronco' },
];

const ANGLE_REFS = [
  { name: 'Rodilla Apoyo', range: '15–25°' },
  { name: 'Rodilla Despegue', range: '95–110°' },
  { name: 'Cadera Apoyo', range: '165–175°' },
  { name: 'Tobillo Apoyo', range: '75–90°' },
  { name: 'Inc. Tronco', range: '8–15°' },
  { name: 'Cadencia', range: '170–185 spm' },
];

const METRICS = [
  { label: 'Cadencia óptima', value: '170–185', unit: 'spm' },
  { label: 'Contacto élite', value: '160–200', unit: 'ms' },
  { label: 'Osc. vertical', value: '6–8', unit: 'cm' },
];

function EmptyState({ onNewSession, th }: { onNewSession: () => void; th: ReturnType<typeof getTheme> }) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading" style={{ color: th.title }}>Gait Analysis — Running</h2>
          <p className="text-sm mt-0.5" style={{ color: th.sub }}>Ángulos de carrera · Tipo de pisada · Cadencia</p>
        </div>
        <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all" style={{ background: '#fdda36', color: '#514163' }}>
          <Plus className="w-4 h-4" />
          Nueva sesión
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden" style={{ border: `1px solid ${th.panelBorder}` }}>
            {videoOpen ? (
              <div className="aspect-video">
                <iframe className="w-full h-full" src="https://www.youtube.com/embed/6b5ioJVG7zs?autoplay=1" title="Gait Analysis" allow="autoplay; encrypted-media" allowFullScreen />
              </div>
            ) : (
              <div className="relative aspect-video cursor-pointer group" onClick={() => setVideoOpen(true)}>
                <img src="https://images.pexels.com/photos/2168292/pexels-photo-2168292.jpeg?auto=compress&cs=tinysrgb&w=800" alt="preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-10 h-10 text-white" />
                    </div>
                    <span className="text-sm text-white font-medium">Ver ejemplo de Gait Analysis</span>
                  </div>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full" style={{ background: '#fdda36', color: '#514163' }}>Demo</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: th.title }}>Ángulos predefinidos</h3>
            <div className="grid grid-cols-2 gap-2">
              {ANGLE_REFS.map((a) => (
                <div key={a.name} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: th.tagBg }}>
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: 'rgba(253,218,54,0.4)' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: th.rowText }}>{a.name}</p>
                    <p className="text-xs" style={{ color: th.sub }}>{a.range}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {METRICS.map((m) => (
              <div key={m.label} className="p-3 rounded-xl text-center" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
                <p className="text-base font-bold" style={{ color: th.infoTitle }}>{m.value}</p>
                <p className="text-xs" style={{ color: th.sub }}>{m.unit}</p>
                <p className="text-xs mt-0.5 leading-tight" style={{ color: th.sub }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: th.title }}>Ejemplos de análisis</h3>
          {DEMO_IMAGES.map((img) => (
            <div key={img.url} className="relative rounded-xl overflow-hidden group" style={{ border: `1px solid ${th.panelBorder}` }}>
              <img src={img.url} alt={img.caption} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-2 left-3 text-xs text-white/90 font-medium">{img.caption}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6 text-center border-t" style={{ borderColor: th.panelBorder }}>
        <p className="text-sm mb-4" style={{ color: th.sub }}>Creá tu primera sesión para analizar la técnica de carrera con puntos arrastrables en tiempo real</p>
        <button onClick={onNewSession} className="px-6 py-3 font-semibold rounded-xl transition-all" style={{ background: '#fdda36', color: '#514163' }}>
          Crear primera sesión de running
        </button>
      </div>
    </div>
  );
}

export default function RunningAnalysis({ sessions, snapshots, references, onNewSession, onSaveSnapshot, onSelectSession, activeSession }: RunningAnalysisProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const [runningView, setRunningView] = useState<RunningView>('lateral');
  const [gaitData, setGaitData] = useState({
    cadence_spm: undefined as number | undefined,
    stride_length_cm: undefined as number | undefined,
    contact_time_ms: undefined as number | undefined,
    vertical_oscillation_cm: undefined as number | undefined,
    foot_strike: undefined as 'heel' | 'midfoot' | 'forefoot' | null | undefined,
  });

  const runningSessions = sessions.filter((s) => s.session_type === 'running');

  if (!activeSession) {
    if (runningSessions.length === 0) return <EmptyState onNewSession={onNewSession} th={th} />;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading" style={{ color: th.title }}>Análisis de Running</h2>
            <p className="text-sm mt-0.5" style={{ color: th.sub }}>Gait analysis · Ángulos de carrera · Biomecánica</p>
          </div>
          <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all" style={{ background: '#fdda36', color: '#514163' }}>
            <Plus className="w-4 h-4" />
            Nueva sesión
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runningSessions.map((session) => (
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
                  <Activity className="w-5 h-5" style={{ color: '#fdda36' }} />
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

  const sessionRefs = references.filter((r) => ['road_running', 'trail_run', 'track'].includes(r.discipline));

  const VIEW_TABS: { id: RunningView; label: string; icon: React.ElementType; sub: string }[] = [
    { id: 'lateral', label: 'Vista Lateral', icon: AlignCenter, sub: 'Ángulos · Cadencia · Técnica' },
    { id: 'posterior', label: 'Vista Posterior', icon: MoveVertical, sub: 'Hip Drop · Pronación · Tronco' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => onSelectSession(null as unknown as BiomechanicsSession)} className="text-sm transition-colors" style={{ color: th.breadcrumbLink }}>Running</button>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: th.breadcrumbSep }} />
        <span className="text-sm font-medium truncate" style={{ color: th.rowText }}>{activeSession.title}</span>
        {activeSession.athlete && (
          <>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: th.breadcrumbSep }} />
            <span className="text-sm" style={{ color: '#fdda36' }}>{activeSession.athlete.name}</span>
          </>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = runningView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setRunningView(tab.id)}
              className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={active ? { background: '#fdda36', color: '#514163' } : { color: th.sub }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <span className="block text-xs font-semibold">{tab.label}</span>
                <span className="block text-xs opacity-70 hidden sm:block">{tab.sub}</span>
              </div>
            </button>
          );
        })}
      </div>

      {runningView === 'lateral' ? (
        <AnalysisWorkspace
          session={activeSession}
          defaultPoints={RUNNING_KEY_POINTS}
          connections={RUNNING_POINT_CONNECTIONS}
          angleConfigs={RUNNING_ANGLE_CONFIGS}
          references={sessionRefs}
          snapshots={snapshots}
          onSaveSnapshot={onSaveSnapshot}
          phaseOptions={RUNNING_PHASES}
          demoImageUrl={RUNNING_DEMO_IMAGE_URL}
          demoPoints={RUNNING_DEMO_POINTS}
          referenceVideoUrl="https://www.youtube.com/embed/6b5ioJVG7zs"
          referenceVideoTitle="Gait analysis — técnica de carrera y biomecánica"
          extraPanel={<GaitDataPanel data={gaitData} onChange={setGaitData} athlete={activeSession.athlete} />}
        />
      ) : (
        <RunningRearWorkspace
          session={activeSession}
          references={sessionRefs}
          snapshots={snapshots}
          onSaveSnapshot={onSaveSnapshot}
        />
      )}
    </div>
  );
}
