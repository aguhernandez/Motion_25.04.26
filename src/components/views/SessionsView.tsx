import { useState } from 'react';
import { Bike, Activity, Camera, Trash2, Plus, Search, Layers, ChevronDown, ChevronRight, Waves, Dumbbell } from 'lucide-react';
import type { BiomechanicsSession, ActiveView, Athlete } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import SnapshotComparePanel from '../shared/SnapshotComparePanel';

interface SessionsViewProps {
  sessions: BiomechanicsSession[];
  athletes: Athlete[];
  onDelete: (id: string) => void;
  onNewSession: () => void;
  onViewChange: (view: ActiveView, session?: BiomechanicsSession) => void;
}

const dm = {
  title: '#ffffff',
  inputBg: 'rgba(81,65,99,0.15)',
  inputBorder: 'rgba(81,65,99,0.4)',
  inputText: '#cbd5e1',
  filterBg: 'rgba(81,65,99,0.12)',
  filterBorder: 'rgba(81,65,99,0.3)',
  rowBg: 'rgba(81,65,99,0.08)',
  rowBorder: 'rgba(81,65,99,0.2)',
  rowHoverBorder: 'rgba(253,218,54,0.35)',
  rowText: '#ffffff',
  rowSub: '#94a3b8',
  empty: '#475569',
};

const lm = {
  title: '#514163',
  inputBg: '#ffffff',
  inputBorder: 'rgba(81,65,99,0.18)',
  inputText: '#514163',
  filterBg: '#ffffff',
  filterBorder: 'rgba(81,65,99,0.12)',
  rowBg: '#ffffff',
  rowBorder: 'rgba(81,65,99,0.1)',
  rowHoverBorder: 'rgba(253,218,54,0.4)',
  rowText: '#514163',
  rowSub: 'rgba(81,65,99,0.5)',
  empty: 'rgba(81,65,99,0.3)',
};

export default function SessionsView({ sessions, athletes, onDelete, onNewSession, onViewChange }: SessionsViewProps) {
  const { t, darkMode } = useT();
  const th = darkMode ? dm : lm;

  const [filter, setFilter] = useState<'all' | 'cycling' | 'running' | 'custom'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = sessions.filter((s) => {
    if (filter !== 'all' && s.session_type !== filter) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) {
      if (!s.athlete?.name.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const filters = [
    { value: 'all', label: t.common.all ?? 'Todas' },
    { value: 'cycling', label: t.nav.cycling },
    { value: 'running', label: t.nav.running },
    { value: 'custom', label: t.nav.custom },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading" style={{ color: th.title }}>{t.sessions?.title ?? 'Sesiones'}</h2>
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#fdda36', color: '#514163' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
        >
          <Plus className="w-4 h-4" />
          {t.header.newSession}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: th.rowSub }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.header.search}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none transition-all"
            style={{
              background: th.inputBg,
              border: `1px solid ${th.inputBorder}`,
              color: th.inputText,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(253,218,54,0.07)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = th.inputBorder;
              e.currentTarget.style.boxShadow = '';
            }}
          />
        </div>
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: th.filterBg, border: `1px solid ${th.filterBorder}` }}
        >
          {filters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value as typeof filter)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={
                filter === value
                  ? { background: '#fdda36', color: '#514163' }
                  : { color: th.rowSub }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm" style={{ color: th.empty }}>{t.dashboard.noSessions}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => {
            const Icon = session.session_type === 'cycling' ? Bike
              : session.session_type === 'running' ? Activity
              : session.session_type === 'swimming' ? Waves
              : session.session_type === 'weightlifting' ? Dumbbell
              : Layers;
            const analysisView: ActiveView = session.session_type === 'cycling' ? 'cycling-analysis'
              : session.session_type === 'running' ? 'running-analysis'
              : session.session_type === 'swimming' ? 'swimming-analysis'
              : session.session_type === 'weightlifting' ? 'weightlifting-analysis'
              : 'custom-analysis';
            const isExpanded = expandedId === session.id;

            return (
              <div
                key={session.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: th.rowBg,
                  border: `1px solid ${isExpanded ? 'rgba(253,218,54,0.3)' : th.rowBorder}`,
                }}
              >
                <div
                  className="flex items-center gap-4 p-4 group"
                  onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.borderColor = th.rowHoverBorder; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = ''; }}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded transition-colors"
                    style={{ color: th.rowSub }}
                    title={isExpanded ? 'Ocultar detalles' : 'Ver detalles y comparar snapshots'}
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(253,218,54,0.12)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: '#fdda36' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onViewChange(analysisView, session)}
                      className="text-sm font-semibold text-left transition-colors"
                      style={{ color: th.rowText }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#fdda36'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.rowText; }}
                    >
                      {session.title}
                    </button>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs capitalize" style={{ color: th.rowSub }}>
                        {session.discipline.replace(/_/g, ' ')}
                      </span>
                      {session.athlete && (
                        <>
                          <span style={{ color: th.rowSub }}>·</span>
                          <span className="text-xs" style={{ color: th.rowSub }}>{session.athlete.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                    <Camera className="w-3.5 h-3.5" style={{ color: th.rowSub }} />
                    <span className="text-xs" style={{ color: th.rowSub }}>{session.snapshot_count}</span>
                  </div>
                  <p className="hidden md:block text-xs flex-shrink-0" style={{ color: th.rowSub }}>
                    {new Date(session.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </p>
                  <button
                    onClick={() => {
                      if (confirm(t.sessions.deleteConfirm)) {
                        onDelete(session.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                    style={{ color: th.rowSub }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = th.rowSub;
                      (e.currentTarget as HTMLButtonElement).style.background = '';
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    <SnapshotComparePanel
                      session={session}
                      athlete={session.athlete_id ? athletes.find((a) => a.id === session.athlete_id) ?? null : null}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
