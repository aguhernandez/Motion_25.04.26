import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart2, FileDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BiomechanicsSnapshot, BiomechanicsSession, Athlete } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';
import { exportSessionPDF } from '../../lib/pdfExport';

interface SnapshotComparePanelProps {
  session: BiomechanicsSession;
  athlete?: Athlete | null;
}

export default function SnapshotComparePanel({ session, athlete }: SnapshotComparePanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const [snapshots, setSnapshots] = useState<BiomechanicsSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [baseIdx, setBaseIdx] = useState(0);
  const [compareIdx, setCompareIdx] = useState(1);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('biomechanics_snapshots')
      .select('id, phase_label, angles, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setSnapshots((data ?? []) as BiomechanicsSnapshot[]);
        setBaseIdx(0);
        setCompareIdx(Math.min(1, (data?.length ?? 1) - 1));
        setLoading(false);
      });
  }, [open, session.id]);

  const base = snapshots[baseIdx];
  const compare = snapshots[compareIdx];

  const getDeltas = () => {
    if (!base || !compare) return [];
    const baseAngles = base.angles ?? [];
    const compareAngles = compare.angles ?? [];
    return baseAngles.map((a) => {
      const matching = compareAngles.find((ca) => ca.name === a.name);
      const delta = matching ? matching.value_deg - a.value_deg : null;
      return {
        name: a.name,
        baseValue: a.value_deg,
        compareValue: matching?.value_deg ?? null,
        delta,
        baseStatus: a.status,
        compareStatus: matching?.status ?? null,
      };
    });
  };

  const deltas = getDeltas();

  const formatLabel = (snap: BiomechanicsSnapshot, idx: number) => {
    return snap.phase_label || `${t.compare.snapshot} ${idx + 1} — ${new Date(snap.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
  };

  const statusBg: Record<string, string> = {
    optimal: 'rgba(16,185,129,0.12)',
    acceptable: 'rgba(6,182,212,0.12)',
    warning: 'rgba(245,158,11,0.12)',
    critical: 'rgba(239,68,68,0.12)',
  };
  const statusColor: Record<string, string> = {
    optimal: '#10b981',
    acceptable: '#06b6d4',
    warning: '#f59e0b',
    critical: '#ef4444',
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: th.panelHeaderBorder }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 transition-colors"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          <BarChart2 className="w-4 h-4 flex-shrink-0" style={{ color: '#fdda36' }} />
          <span className="text-sm font-semibold" style={{ color: th.title }}>
            {t.compare.title}
          </span>
          {session.snapshot_count > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: th.tagBg, color: th.sub }}>
              {session.snapshot_count}
            </span>
          )}
          <span className="ml-auto mr-2">
            {open
              ? <ChevronUp className="w-4 h-4" style={{ color: th.sub }} />
              : <ChevronDown className="w-4 h-4" style={{ color: th.sub }} />}
          </span>
        </button>
        <button
          onClick={() => exportSessionPDF(session, snapshots, athlete)}
          title={t.compare.exportPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
          style={{ background: 'rgba(253,218,54,0.12)', border: '1px solid rgba(253,218,54,0.3)', color: '#fdda36' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(253,218,54,0.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(253,218,54,0.12)'; }}
        >
          <FileDown className="w-3.5 h-3.5" />
          {t.compare.pdf}
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm" style={{ color: th.sub }}>
              {t.compare.loading}
            </div>
          ) : snapshots.length < 2 ? (
            <div className="flex items-center justify-center py-6 text-sm" style={{ color: th.empty }}>
              {t.compare.needMore}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>{t.compare.base}</label>
                  <select
                    value={baseIdx}
                    onChange={(e) => setBaseIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                    style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
                  >
                    {snapshots.map((s, i) => (
                      <option key={s.id} value={i} disabled={i === compareIdx}>
                        {formatLabel(s, i)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>{t.compare.compareWith}</label>
                  <select
                    value={compareIdx}
                    onChange={(e) => setCompareIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                    style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
                  >
                    {snapshots.map((s, i) => (
                      <option key={s.id} value={i} disabled={i === baseIdx}>
                        {formatLabel(s, i)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {deltas.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: th.empty }}>
                  {t.compare.noAngles}
                </p>
              ) : (
                <div className="space-y-2">
                  {deltas.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: th.tagBg, border: `1px solid ${th.panelBorder}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: th.rowText }}>{d.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: d.baseStatus ? statusBg[d.baseStatus] : th.tagBg, color: d.baseStatus ? statusColor[d.baseStatus] : th.sub }}>
                            {d.baseValue}°
                          </span>
                          <span className="text-xs" style={{ color: th.empty }}>→</span>
                          {d.compareValue !== null && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: d.compareStatus ? statusBg[d.compareStatus] : th.tagBg, color: d.compareStatus ? statusColor[d.compareStatus] : th.sub }}>
                              {d.compareValue}°
                            </span>
                          )}
                        </div>
                      </div>
                      {d.delta !== null && (
                        <div
                          className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
                          style={{
                            background: d.delta > 0 ? 'rgba(16,185,129,0.12)' : d.delta < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.1)',
                            color: d.delta > 0 ? '#10b981' : d.delta < 0 ? '#ef4444' : th.sub,
                          }}
                        >
                          {d.delta > 0
                            ? <TrendingUp className="w-3.5 h-3.5" />
                            : d.delta < 0
                            ? <TrendingDown className="w-3.5 h-3.5" />
                            : <Minus className="w-3.5 h-3.5" />}
                          <span className="text-xs font-bold">
                            {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}°
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
