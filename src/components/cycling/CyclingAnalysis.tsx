import { useState } from 'react';
import { Bike, Plus, ChevronRight, PlayCircle, Camera, AlignCenter, Square } from 'lucide-react';
import type { Athlete, BiomechanicsSession, BiomechanicsSnapshot } from '../../lib/types';
import type { ReferenceRange } from '../../lib/types';
import { CYCLING_ANGLE_CONFIGS } from '../../lib/angleCalculations';
import { CYCLING_KEY_POINTS, CYCLING_POINT_CONNECTIONS, CYCLING_DEMO_IMAGE_URL, CYCLING_DEMO_POINTS } from '../../data/defaultKeyPoints';
import AnalysisWorkspace from '../shared/AnalysisWorkspace';
import BikeFittingPanel from './BikeFittingPanel';
import CyclingFrontalWorkspace from './CyclingFrontalWorkspace';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface CyclingAnalysisProps {
  sessions: BiomechanicsSession[];
  snapshots: BiomechanicsSnapshot[];
  references: ReferenceRange[];
  athletes: Athlete[];
  onNewSession: () => void;
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
  onSelectSession: (session: BiomechanicsSession) => void;
  activeSession: BiomechanicsSession | null;
}

const CYCLING_PHASES = [
  'BDC (Punto Muerto Inferior)',
  'TDC (Punto Muerto Superior)',
  'Posición estática',
  'Potencia',
  'Recuperación',
];

const DEMO_IMAGES = [
  { url: 'https://images.pexels.com/photos/5380651/pexels-photo-5380651.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Posición de pedaleo — vista lateral' },
  { url: 'https://images.pexels.com/photos/3048203/pexels-photo-3048203.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Bike fitting — extensión de rodilla' },
  { url: 'https://images.pexels.com/photos/248547/pexels-photo-248547.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Ciclismo de ruta — postura aerodinámica' },
];

const ANGLE_REFS = [
  { name: 'Rodilla BDC', range: '30–40°' },
  { name: 'Rodilla TDC', range: '100–115°' },
  { name: 'Cadera BDC', range: '45–60°' },
  { name: 'Tobillo BDC', range: '95–110°' },
  { name: 'Codo', range: '155–165°' },
  { name: 'Tronco-Manillar', range: '40–55°' },
];

type CyclingView = 'lateral' | 'frontal';

function EmptyState({ onNewSession, th }: { onNewSession: () => void; th: ReturnType<typeof getTheme> }) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading" style={{ color: th.title }}>Análisis de Ciclismo</h2>
          <p className="text-sm mt-0.5" style={{ color: th.sub }}>Bike fitting · Vista lateral · Vista frontal</p>
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
                <iframe className="w-full h-full" src="https://www.youtube.com/embed/8Zx5s3gR-k0?autoplay=1" title="Bike Fitting" allow="autoplay; encrypted-media" allowFullScreen />
              </div>
            ) : (
              <div className="relative aspect-video cursor-pointer group" onClick={() => setVideoOpen(true)}>
                <img src="https://images.pexels.com/photos/5380651/pexels-photo-5380651.jpeg?auto=compress&cs=tinysrgb&w=800" alt="preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-10 h-10 text-white" />
                    </div>
                    <span className="text-sm text-white font-medium">Ver ejemplo de Bike Fitting</span>
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
        <p className="text-sm mb-4" style={{ color: th.sub }}>Creá tu primera sesión para comenzar el análisis con puntos arrastrables en tiempo real</p>
        <button onClick={onNewSession} className="px-6 py-3 font-semibold rounded-xl transition-all" style={{ background: '#fdda36', color: '#514163' }}>
          Crear primera sesión de ciclismo
        </button>
      </div>
    </div>
  );
}

export default function CyclingAnalysis({ sessions, snapshots, references, onNewSession, onSaveSnapshot, onSelectSession, activeSession }: CyclingAnalysisProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const [cyclingView, setCyclingView] = useState<CyclingView>('lateral');
  const [bikeFittingData, setBikeFittingData] = useState({
    saddle_height_mm: undefined as number | undefined,
    saddle_setback_mm: undefined as number | undefined,
    reach_mm: undefined as number | undefined,
    cadence_rpm: undefined as number | undefined,
  });

  const cyclingSessions = sessions.filter((s) => s.session_type === 'cycling');

  if (!activeSession) {
    if (cyclingSessions.length === 0) return <EmptyState onNewSession={onNewSession} th={th} />;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading" style={{ color: th.title }}>Análisis de Ciclismo</h2>
            <p className="text-sm mt-0.5" style={{ color: th.sub }}>Bike fitting · Vista lateral · Vista frontal</p>
          </div>
          <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all" style={{ background: '#fdda36', color: '#514163' }}>
            <Plus className="w-4 h-4" />
            Nueva sesión
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cyclingSessions.map((session) => (
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
                  <Bike className="w-5 h-5" style={{ color: '#fdda36' }} />
                </div>
                <ChevronRight className="w-4 h-4 transition-colors" style={{ color: th.sub }} />
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

  const sessionRefs = references.filter((r) => [activeSession.discipline, 'road'].includes(r.discipline));

  const VIEW_TABS: { id: CyclingView; label: string; icon: React.ElementType; sub: string }[] = [
    { id: 'lateral', label: 'Vista Lateral', icon: AlignCenter, sub: 'Bike fitting · Pedaleo · Postura' },
    { id: 'frontal', label: 'Vista Frontal', icon: Square, sub: 'Valgo/Varo · Simetría · Drop pélvico' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => onSelectSession(null as unknown as BiomechanicsSession)} className="text-sm transition-colors" style={{ color: th.breadcrumbLink }}>Ciclismo</button>
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
          const active = cyclingView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCyclingView(tab.id)}
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

      {cyclingView === 'lateral' ? (
        <AnalysisWorkspace
          session={activeSession}
          defaultPoints={CYCLING_KEY_POINTS}
          connections={CYCLING_POINT_CONNECTIONS}
          angleConfigs={CYCLING_ANGLE_CONFIGS}
          references={sessionRefs}
          snapshots={snapshots}
          onSaveSnapshot={onSaveSnapshot}
          phaseOptions={CYCLING_PHASES}
          demoImageUrl={CYCLING_DEMO_IMAGE_URL}
          demoPoints={CYCLING_DEMO_POINTS}
          referenceVideoUrl="https://www.youtube.com/embed/8Zx5s3gR-k0"
          referenceVideoTitle="Bike fitting — fundamentos de biomecánica"
          extraPanel={<BikeFittingPanel data={bikeFittingData} onChange={setBikeFittingData} athlete={activeSession.athlete} />}
        />
      ) : (
        <CyclingFrontalWorkspace
          session={activeSession}
          references={sessionRefs}
          snapshots={snapshots}
          onSaveSnapshot={onSaveSnapshot}
        />
      )}
    </div>
  );
}
