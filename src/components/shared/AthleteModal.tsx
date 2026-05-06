import { useState } from 'react';
import { X, User } from 'lucide-react';
import type { Athlete } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface AthleteModalProps {
  athlete?: Athlete | null;
  onSave: (data: Omit<Athlete, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onClose: () => void;
}

const empty: Omit<Athlete, 'id' | 'created_at' | 'updated_at'> = {
  name: '', email: '', date_of_birth: null, height_cm: null, weight_kg: null,
  leg_length_cm: null, arm_length_cm: null, shoulder_width_cm: null,
  torso_length_cm: null, inseam_cm: null, lab_athlete_id: '', notes: '', avatar_url: '',
};

export default function AthleteModal({ athlete, onSave, onClose }: AthleteModalProps) {
  const { t, darkMode } = useT();
  const th = getTheme(darkMode);

  const [form, setForm] = useState<Omit<Athlete, 'id' | 'created_at' | 'updated_at'>>(
    athlete
      ? {
          name: athlete.name, email: athlete.email, date_of_birth: athlete.date_of_birth,
          height_cm: athlete.height_cm, weight_kg: athlete.weight_kg,
          leg_length_cm: athlete.leg_length_cm, arm_length_cm: athlete.arm_length_cm,
          shoulder_width_cm: athlete.shoulder_width_cm, torso_length_cm: athlete.torso_length_cm,
          inseam_cm: athlete.inseam_cm, lab_athlete_id: athlete.lab_athlete_id,
          notes: athlete.notes, avatar_url: athlete.avatar_url,
        }
      : { ...empty }
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, value: string | number | null) =>
    setForm((f) => ({ ...f, [key]: value }));
  const num = (v: string) => (v === '' ? null : parseFloat(v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
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

  const anthropometryFields: { key: keyof typeof form; label: string }[] = [
    { key: 'height_cm', label: t.athlete.heightCm },
    { key: 'weight_kg', label: t.athlete.weightKg },
    { key: 'inseam_cm', label: t.athlete.inseamCm },
    { key: 'leg_length_cm', label: t.athlete.legLengthCm },
    { key: 'arm_length_cm', label: t.athlete.armLengthCm },
    { key: 'shoulder_width_cm', label: t.athlete.shoulderWidthCm },
    { key: 'torso_length_cm', label: t.athlete.torsoLengthCm },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: th.modalBorder }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #514163 0%, #3d3050 100%)' }}>
              <User className="w-5 h-5" style={{ color: '#fdda36' }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: th.title }}>
              {athlete ? t.athlete.editAthlete : t.athlete.newAthlete}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: th.sub }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.title; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.sub; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>{t.athlete.fullName} *</label>
              <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} placeholder="Juan García" onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>{t.athlete.email}</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>{t.athlete.dob}</label>
              <input type="date" value={form.date_of_birth ?? ''} onChange={(e) => set('date_of_birth', e.target.value || null)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: th.sub }}>{t.athlete.anthropometry}</p>
            <div className="grid grid-cols-3 gap-3">
              {anthropometryFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs mb-1" style={{ color: th.sub }}>{label}</label>
                  <input type="number" step="0.1" value={(form[key] as number | null) ?? ''} onChange={(e) => set(key, num(e.target.value))} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>
              {t.athlete.labIdLabel}
              <span className="ml-2 text-xs font-normal" style={{ color: '#fdda36' }}>{t.athlete.labConnect}</span>
            </label>
            <input value={form.lab_athlete_id} onChange={(e) => set('lab_athlete_id', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} placeholder={t.athlete.labPlaceholder} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>{t.athlete.notes}</label>
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{ background: th.cancelBg, border: `1px solid ${th.cancelBorder}`, color: th.cancelText }}>
              {t.athlete.cancel}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50" style={{ background: '#fdda36', color: '#514163' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
            >
              {saving ? t.athlete.saving : t.athlete.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
