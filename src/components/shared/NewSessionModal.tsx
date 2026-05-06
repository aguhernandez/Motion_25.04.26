import { useState } from 'react';
import { X, Bike, Activity, Layers, Waves, Dumbbell } from 'lucide-react';
import type { Athlete, SessionType, Discipline } from '../../lib/types';
import AthleteSelector from './AthleteSelector';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface NewSessionModalProps {
  athletes: Athlete[];
  defaultType?: SessionType;
  onSave: (params: {
    athlete_id?: string;
    session_type: SessionType;
    discipline: Discipline;
    title: string;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
  onCreateAthlete?: () => void;
}

export default function NewSessionModal({ athletes, defaultType = 'cycling', onSave, onClose, onCreateAthlete }: NewSessionModalProps) {
  const { t, darkMode } = useT();
  const th = getTheme(darkMode);

  const [sessionType, setSessionType] = useState<SessionType>(defaultType);
  const [discipline, setDiscipline] = useState<Discipline>(
    defaultType === 'cycling' ? 'road'
    : defaultType === 'running' ? 'road_running'
    : defaultType === 'swimming' ? 'freestyle'
    : defaultType === 'weightlifting' ? 'snatch'
    : 'custom'
  );
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const SESSION_TYPES: { type: SessionType; label: string; sub: string; icon: React.ElementType }[] = [
    { type: 'cycling', label: t.session.cycling.label, sub: t.session.cycling.sub, icon: Bike },
    { type: 'running', label: t.session.running.label, sub: t.session.running.sub, icon: Activity },
    { type: 'swimming', label: t.session.swimming.label, sub: t.session.swimming.sub, icon: Waves },
    { type: 'weightlifting', label: t.session.weightlifting.label, sub: t.session.weightlifting.sub, icon: Dumbbell },
    { type: 'custom', label: t.session.custom.label, sub: t.session.custom.sub, icon: Layers },
  ];

  const CYCLING_DISCIPLINES: { value: Discipline; label: string }[] = [
    { value: 'road', label: t.session.disciplines.road },
    { value: 'mtb', label: t.session.disciplines.mtb },
    { value: 'triathlon', label: t.session.disciplines.triathlon },
  ];

  const RUNNING_DISCIPLINES: { value: Discipline; label: string }[] = [
    { value: 'road_running', label: t.session.disciplines.road_running },
    { value: 'trail_run', label: t.session.disciplines.trail_run },
    { value: 'track', label: t.session.disciplines.track },
  ];

  const SWIMMING_DISCIPLINES: { value: Discipline; label: string }[] = [
    { value: 'freestyle', label: t.session.disciplines.freestyle },
    { value: 'backstroke', label: t.session.disciplines.backstroke },
    { value: 'breaststroke', label: t.session.disciplines.breaststroke },
    { value: 'butterfly', label: t.session.disciplines.butterfly },
  ];

  const WEIGHTLIFTING_DISCIPLINES: { value: Discipline; label: string }[] = [
    { value: 'snatch', label: t.session.disciplines.snatch },
    { value: 'clean_jerk', label: t.session.disciplines.clean_jerk },
    { value: 'power_clean', label: t.session.disciplines.power_clean },
    { value: 'back_squat', label: t.session.disciplines.back_squat },
    { value: 'front_squat', label: t.session.disciplines.front_squat },
    { value: 'deadlift', label: t.session.disciplines.deadlift },
    { value: 'overhead_press', label: t.session.disciplines.overhead_press },
    { value: 'bench_press', label: t.session.disciplines.bench_press },
  ];

  const CUSTOM_DISCIPLINES: { value: Discipline; label: string }[] = [
    { value: 'custom', label: t.session.disciplines.custom },
  ];

  const getDisciplines = (type: SessionType) => {
    if (type === 'cycling') return CYCLING_DISCIPLINES;
    if (type === 'running') return RUNNING_DISCIPLINES;
    if (type === 'swimming') return SWIMMING_DISCIPLINES;
    if (type === 'weightlifting') return WEIGHTLIFTING_DISCIPLINES;
    return CUSTOM_DISCIPLINES;
  };

  const handleTypeChange = (type: SessionType) => {
    setSessionType(type);
    setDiscipline(getDisciplines(type)[0].value);
  };

  const disciplines = getDisciplines(sessionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.length > 255) return;
    setSaving(true);
    try {
      const defaultTitle = sessionType === 'custom'
        ? `${t.session.defaultTitleFree} - ${new Date().toLocaleDateString()}`
        : `${disciplines.find((d) => d.value === discipline)?.label} - ${new Date().toLocaleDateString()}`;
      await onSave({ athlete_id: athleteId ?? undefined, session_type: sessionType, discipline, title: title.trim() || defaultTitle, notes: notes.trim() });
      onClose();
    } finally { setSaving(false); }
  };

  const inputStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(253,218,54,0.07)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = th.inputBorder;
    e.currentTarget.style.boxShadow = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: th.modalBorder }}>
          <h2 className="text-lg font-bold" style={{ color: th.title }}>{t.session.newSession}</h2>
          <button onClick={onClose} style={{ color: th.sub }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.title; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.sub; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: th.sub }}>{t.session.analysisType}</label>
            <div className="grid grid-cols-5 gap-2">
              {SESSION_TYPES.map(({ type, label, sub, icon: Icon }) => {
                const active = sessionType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium transition-all"
                    style={
                      active
                        ? { background: '#fdda36', border: '1px solid rgba(253,218,54,0.6)', color: '#514163' }
                        : { background: th.tagBg, border: `1px solid ${th.rowBorder}`, color: th.sub }
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-xs opacity-60 leading-tight text-center">{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {sessionType !== 'custom' && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: th.sub }}>{t.session.discipline}</label>
              <div className="space-y-1.5">
                {disciplines.map((d) => {
                  const active = discipline === d.value;
                  return (
                    <label
                      key={d.value}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                      style={
                        active
                          ? { background: 'rgba(253,218,54,0.08)', border: '1px solid rgba(253,218,54,0.3)', color: th.rowText }
                          : { background: th.tagBg, border: `1px solid ${th.rowBorder}`, color: th.sub }
                      }
                    >
                      <input type="radio" name="discipline" value={d.value} checked={active} onChange={() => setDiscipline(d.value)} className="sr-only" />
                      <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: active ? '#fdda36' : th.sub }}>
                        {active && <div className="w-2 h-2 rounded-full" style={{ background: '#fdda36' }} />}
                      </div>
                      <span className="text-sm">{d.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {sessionType === 'custom' && (
            <div className="p-3 rounded-xl text-sm" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
              <p className="font-semibold mb-1" style={{ color: th.infoTitle }}>{t.session.custom.label}</p>
              <p className="text-xs leading-relaxed" style={{ color: th.infoText }}>{t.session.customInfo}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: th.sub }}>{t.session.athlete}</label>
            <AthleteSelector athletes={athletes} selectedId={athleteId} onSelect={setAthleteId} onCreateNew={onCreateAthlete} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>
              {t.session.title} <span className="font-normal" style={{ color: th.empty }}>({t.session.titleOptional.replace('Título ', '').replace('Title ', '')})</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} placeholder={t.session.titlePlaceholder} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>{t.session.notes}</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{ background: th.cancelBg, border: `1px solid ${th.cancelBorder}`, color: th.cancelText }}>
              {t.session.cancel}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50" style={{ background: '#fdda36', color: '#514163' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
            >
              {saving ? t.session.creating : t.session.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
