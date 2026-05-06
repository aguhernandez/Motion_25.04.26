import { Bike, Activity, Users, Camera, TrendingUp, ArrowRight, BarChart2, Layers } from 'lucide-react';
import type { BiomechanicsSession, Athlete, ActiveView } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';

interface DashboardProps {
  sessions: BiomechanicsSession[];
  athletes: Athlete[];
  onViewChange: (view: ActiveView) => void;
  onNewSession: () => void;
}

const dm = {
  title: '#ffffff',
  subtitle: '#94a3b8',
  cardBg: 'rgba(81,65,99,0.08)',
  cardBorder: 'rgba(81,65,99,0.25)',
  cardHeaderBorder: 'rgba(81,65,99,0.25)',
  rowBorder: 'rgba(81,65,99,0.15)',
  rowHover: 'rgba(253,218,54,0.04)',
  panelText: '#ffffff',
  panelSub: '#94a3b8',
  empty: '#475569',
  statLabel: '#94a3b8',
  quickBtnBg: (accent: string) => `rgba(${accent},0.12)`,
  quickBtnBorder: (accent: string) => `rgba(${accent},0.25)`,
  tipBg: 'linear-gradient(135deg, rgba(253,218,54,0.08) 0%, rgba(81,65,99,0.12) 100%)',
  tipBorder: 'rgba(253,218,54,0.2)',
  tipTitle: '#ffffff',
  tipSub: '#94a3b8',
};

const lm = {
  title: '#514163',
  subtitle: 'rgba(81,65,99,0.55)',
  cardBg: '#ffffff',
  cardBorder: 'rgba(81,65,99,0.12)',
  cardHeaderBorder: 'rgba(81,65,99,0.1)',
  rowBorder: 'rgba(81,65,99,0.07)',
  rowHover: 'rgba(81,65,99,0.03)',
  panelText: '#514163',
  panelSub: 'rgba(81,65,99,0.5)',
  empty: 'rgba(81,65,99,0.3)',
  statLabel: 'rgba(81,65,99,0.55)',
  quickBtnBg: () => 'rgba(81,65,99,0.04)',
  quickBtnBorder: () => 'rgba(81,65,99,0.12)',
  tipBg: 'linear-gradient(135deg, rgba(253,218,54,0.08) 0%, rgba(81,65,99,0.06) 100%)',
  tipBorder: 'rgba(253,218,54,0.3)',
  tipTitle: '#514163',
  tipSub: 'rgba(81,65,99,0.55)',
};

export default function Dashboard({ sessions, athletes, onViewChange, onNewSession }: DashboardProps) {
  const { t, darkMode } = useT();
  const th = darkMode ? dm : lm;

  const cyclingSessions = sessions.filter((s) => s.session_type === 'cycling');
  const runningSessions = sessions.filter((s) => s.session_type === 'running');
  const customSessions = sessions.filter((s) => s.session_type === 'custom');
  const totalSnapshots = sessions.reduce((acc, s) => acc + (s.snapshot_count ?? 0), 0);
  const recentSessions = sessions.slice(0, 5);

  const stats = [
    { label: t.dashboard.totalSessions, value: sessions.length, icon: BarChart2 },
    { label: t.dashboard.cycling, value: cyclingSessions.length, icon: Bike },
    { label: t.dashboard.running, value: runningSessions.length, icon: Activity },
    { label: t.dashboard.freeAnalysis, value: customSessions.length, icon: Layers },
    { label: t.dashboard.athletes, value: athletes.length, icon: Users },
    { label: t.dashboard.snapshots, value: totalSnapshots, icon: Camera },
  ];

  const quickCards = [
    {
      view: 'cycling-analysis' as ActiveView,
      title: t.dashboard.cycling,
      desc: t.dashboard.cyclingDesc,
      icon: Bike,
      count: cyclingSessions.length,
      accent: '81,65,99',
      img: 'https://images.pexels.com/photos/5380651/pexels-photo-5380651.jpeg?auto=compress&cs=tinysrgb&w=400',
      tags: ['Ruta', 'MTB', 'Triatlón'],
    },
    {
      view: 'running-analysis' as ActiveView,
      title: 'Gait Analysis',
      desc: t.dashboard.runningDesc,
      icon: Activity,
      count: runningSessions.length,
      accent: '81,65,99',
      img: 'https://images.pexels.com/photos/2168292/pexels-photo-2168292.jpeg?auto=compress&cs=tinysrgb&w=400',
      tags: ['Running', 'Trail', 'Pista'],
    },
    {
      view: 'custom-analysis' as ActiveView,
      title: t.dashboard.freeAnalysis,
      desc: t.dashboard.customDesc,
      icon: Layers,
      count: customSessions.length,
      accent: '81,65,99',
      img: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=400',
      tags: ['Natación', 'Golf', '+ deporte'],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-heading mb-1" style={{ color: th.title }}>{t.dashboard.welcome}</h2>
        <p className="text-sm" style={{ color: th.subtitle }}>{t.dashboard.welcomeSub}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="p-4 rounded-xl border transition-all duration-200"
            style={{ background: th.cardBg, borderColor: th.cardBorder }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: 'rgba(253,218,54,0.12)', border: '1px solid rgba(253,218,54,0.2)' }}
            >
              <Icon className="w-4 h-4" style={{ color: '#fdda36' }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: th.panelText }}>{value}</p>
            <p className="text-xs mt-0.5 leading-tight" style={{ color: th.statLabel }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickCards.map(({ view, title, desc, icon: Icon, count, img, tags }) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className="group relative p-6 rounded-2xl text-left transition-all duration-200 overflow-hidden"
            style={{
              background: darkMode
                ? 'linear-gradient(135deg, rgba(81,65,99,0.25) 0%, rgba(81,65,99,0.15) 100%)'
                : '#ffffff',
              border: darkMode ? '1px solid rgba(81,65,99,0.35)' : '1px solid rgba(81,65,99,0.12)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(253,218,54,0.5)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(81,65,99,0.12)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = darkMode ? 'rgba(81,65,99,0.35)' : 'rgba(81,65,99,0.12)';
              (e.currentTarget as HTMLButtonElement).style.transform = '';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
            }}
          >
            {darkMode && (
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-slate-900/70" />
              </div>
            )}
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, #514163 0%, #3d3050 100%)' }}
                >
                  <Icon className="w-6 h-6" style={{ color: '#fdda36' }} />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(253,218,54,0.12)',
                      color: darkMode ? '#fdda36' : '#514163',
                    }}
                  >
                    {count} {t.dashboard.sessions}
                  </span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    style={{ color: th.panelSub }}
                  />
                </div>
              </div>
              <h3 className="text-lg font-heading mb-1" style={{ color: th.panelText }}>{title}</h3>
              <p className="text-sm mb-4" style={{ color: th.panelSub }}>{desc}</p>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-full"
                    style={{
                      background: 'rgba(81,65,99,0.08)',
                      color: th.panelSub,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: th.cardHeaderBorder }}
          >
            <h3 className="font-heading text-sm" style={{ color: th.panelText }}>{t.dashboard.recentSessions}</h3>
            <button
              onClick={() => onViewChange('sessions')}
              className="text-xs flex items-center gap-1 transition-opacity"
              style={{ color: '#fdda36' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {t.dashboard.viewAll} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <TrendingUp className="w-8 h-8 mb-3" style={{ color: th.empty }} />
              <p className="text-sm" style={{ color: th.panelSub }}>{t.dashboard.noSessions}</p>
              <button
                onClick={onNewSession}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: '#fdda36', color: '#514163' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
              >
                {t.dashboard.createFirst}
              </button>
            </div>
          ) : (
            <div>
              {recentSessions.map((session) => {
                const Icon = session.session_type === 'cycling' ? Bike : session.session_type === 'running' ? Activity : Layers;
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                    style={{ borderBottom: `1px solid ${th.rowBorder}` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = th.rowHover; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(253,218,54,0.12)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: '#fdda36' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: th.panelText }}>{session.title}</p>
                      <p className="text-xs" style={{ color: th.panelSub }}>
                        {session.athlete?.name ?? t.dashboard.noAthlete} ·{' '}
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Camera className="w-3.5 h-3.5" style={{ color: th.panelSub }} />
                      <span className="text-xs" style={{ color: th.panelSub }}>{session.snapshot_count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: th.cardHeaderBorder }}
          >
            <h3 className="font-heading text-sm" style={{ color: th.panelText }}>{t.dashboard.athletes}</h3>
            <button
              onClick={() => onViewChange('athletes')}
              className="text-xs flex items-center gap-1 transition-opacity"
              style={{ color: '#fdda36' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {t.dashboard.viewAllAthletes} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {athletes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Users className="w-8 h-8 mb-3" style={{ color: th.empty }} />
              <p className="text-sm" style={{ color: th.panelSub }}>{t.dashboard.noAthletes}</p>
            </div>
          ) : (
            <div>
              {athletes.slice(0, 6).map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{ borderBottom: `1px solid ${th.rowBorder}` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = th.rowHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #514163 0%, #3d3050 100%)',
                      border: '2px solid rgba(253,218,54,0.3)',
                      color: '#fdda36',
                    }}
                  >
                    {athlete.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: th.panelText }}>{athlete.name}</p>
                    {athlete.height_cm && (
                      <p className="text-xs" style={{ color: th.panelSub }}>
                        {athlete.height_cm}cm · {athlete.weight_kg}kg
                      </p>
                    )}
                  </div>
                  {athlete.lab_athlete_id && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title={t.athlete.linked} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="p-4 rounded-2xl"
        style={{ background: th.tipBg, border: `1px solid ${th.tipBorder}` }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(253,218,54,0.15)', border: '1px solid rgba(253,218,54,0.25)' }}
          >
            <TrendingUp className="w-5 h-5" style={{ color: '#fdda36' }} />
          </div>
          <div>
            <h3 className="font-heading text-sm mb-1" style={{ color: th.tipTitle }}>{t.dashboard.labIntegration}</h3>
            <p className="text-sm" style={{ color: th.tipSub }}>{t.dashboard.labIntegrationDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
