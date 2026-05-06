import { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import type { ReferenceRange } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';

interface ReferencesViewProps {
  ranges: ReferenceRange[];
  onCreate: (range: Omit<ReferenceRange, 'id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<ReferenceRange>) => Promise<void>;
  onDelete: (id: string) => void;
}

const DISCIPLINES = [
  { value: 'road', label: 'Ciclismo Ruta' },
  { value: 'mtb', label: 'MTB' },
  { value: 'triathlon', label: 'Triatlón' },
  { value: 'road_running', label: 'Running Asfalto' },
  { value: 'trail_run', label: 'Trail Running' },
  { value: 'track', label: 'Atletismo Pista' },
];

const emptyForm: Omit<ReferenceRange, 'id' | 'created_at'> = {
  discipline: 'road',
  angle_name: '',
  min_deg: 0,
  optimal_min_deg: 0,
  optimal_max_deg: 0,
  max_deg: 0,
  description: '',
  is_custom: true,
  created_by: '',
};

const dm = {
  title: '#ffffff',
  pillActiveBg: 'rgba(253,218,54,0.15)',
  pillActiveBorder: 'rgba(253,218,54,0.35)',
  pillActiveText: '#fdda36',
  pillBg: 'rgba(81,65,99,0.12)',
  pillBorder: 'rgba(81,65,99,0.3)',
  pillText: '#94a3b8',
  rowBg: 'rgba(81,65,99,0.08)',
  rowBorder: 'rgba(81,65,99,0.2)',
  rowHoverBorder: 'rgba(253,218,54,0.3)',
  rowText: '#ffffff',
  rowSub: '#94a3b8',
  optimalText: '#10b981',
  emptyIcon: '#475569',
  modalBg: '#1a1528',
  modalBorder: 'rgba(81,65,99,0.4)',
  labelText: '#94a3b8',
  inputBg: 'rgba(81,65,99,0.15)',
  inputBorder: 'rgba(81,65,99,0.35)',
  inputText: '#ffffff',
  cancelBg: 'rgba(81,65,99,0.15)',
  cancelBorder: 'rgba(81,65,99,0.35)',
  cancelText: '#94a3b8',
};

const lm = {
  title: '#514163',
  pillActiveBg: '#fdda36',
  pillActiveBorder: 'rgba(253,218,54,0.5)',
  pillActiveText: '#514163',
  pillBg: '#ffffff',
  pillBorder: 'rgba(81,65,99,0.12)',
  pillText: 'rgba(81,65,99,0.6)',
  rowBg: '#ffffff',
  rowBorder: 'rgba(81,65,99,0.1)',
  rowHoverBorder: 'rgba(253,218,54,0.4)',
  rowText: '#514163',
  rowSub: 'rgba(81,65,99,0.5)',
  optimalText: '#059669',
  emptyIcon: 'rgba(81,65,99,0.3)',
  modalBg: '#ffffff',
  modalBorder: 'rgba(81,65,99,0.15)',
  labelText: 'rgba(81,65,99,0.55)',
  inputBg: '#f5f3f0',
  inputBorder: 'rgba(81,65,99,0.15)',
  inputText: '#514163',
  cancelBg: '#f5f3f0',
  cancelBorder: 'rgba(81,65,99,0.12)',
  cancelText: 'rgba(81,65,99,0.6)',
};

export default function ReferencesView({ ranges, onCreate, onUpdate, onDelete }: ReferencesViewProps) {
  const { t, darkMode } = useT();
  const th = darkMode ? dm : lm;

  const [filterDisc, setFilterDisc] = useState('road');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ReferenceRange | null>(null);
  const [form, setForm] = useState<Omit<ReferenceRange, 'id' | 'created_at'>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const filtered = ranges.filter((r) => r.discipline === filterDisc);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, discipline: filterDisc });
    setShowForm(true);
  };

  const openEdit = (range: ReferenceRange) => {
    setEditing(range);
    setForm({
      discipline: range.discipline,
      angle_name: range.angle_name,
      min_deg: range.min_deg,
      optimal_min_deg: range.optimal_min_deg,
      optimal_max_deg: range.optimal_max_deg,
      max_deg: range.max_deg,
      description: range.description,
      is_custom: range.is_custom,
      created_by: range.created_by,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await onUpdate(editing.id, form);
      } else {
        await onCreate(form);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form, value: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inputStyle = {
    background: th.inputBg,
    border: `1px solid ${th.inputBorder}`,
    color: th.inputText,
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading" style={{ color: th.title }}>{t.nav.references}</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#fdda36', color: '#514163' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
        >
          <Plus className="w-4 h-4" />
          Nuevo rango
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {DISCIPLINES.map((d) => (
          <button
            key={d.value}
            onClick={() => setFilterDisc(d.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              filterDisc === d.value
                ? { background: th.pillActiveBg, border: `1px solid ${th.pillActiveBorder}`, color: th.pillActiveText }
                : { background: th.pillBg, border: `1px solid ${th.pillBorder}`, color: th.pillText }
            }
          >
            {d.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-8 h-8 mb-3" style={{ color: th.emptyIcon }} />
          <p className="text-sm" style={{ color: th.rowSub }}>Sin rangos para esta disciplina</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((range) => (
            <div
              key={range.id}
              className="group flex items-center gap-4 p-4 rounded-xl transition-all"
              style={{ background: th.rowBg, border: `1px solid ${th.rowBorder}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = th.rowHoverBorder; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = th.rowBorder; }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold" style={{ color: th.rowText }}>{range.angle_name}</h3>
                  {range.is_custom && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(253,218,54,0.1)',
                        color: darkMode ? '#fdda36' : '#514163',
                        border: '1px solid rgba(253,218,54,0.2)',
                      }}
                    >
                      Personalizado
                    </span>
                  )}
                </div>
                {range.description && (
                  <p className="text-xs" style={{ color: th.rowSub }}>{range.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-center">
                  <p style={{ color: th.rowSub }}>Mín</p>
                  <p className="font-medium" style={{ color: th.rowText }}>{range.min_deg}°</p>
                </div>
                <div className="text-center">
                  <p style={{ color: th.optimalText }}>Óptimo</p>
                  <p className="font-semibold" style={{ color: th.optimalText }}>
                    {range.optimal_min_deg}°–{range.optimal_max_deg}°
                  </p>
                </div>
                <div className="text-center">
                  <p style={{ color: th.rowSub }}>Máx</p>
                  <p className="font-medium" style={{ color: th.rowText }}>{range.max_deg}°</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(range)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: th.rowSub }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#fdda36';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(253,218,54,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = th.rowSub;
                    (e.currentTarget as HTMLButtonElement).style.background = '';
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {range.is_custom && (
                  <button
                    onClick={() => { if (confirm('¿Eliminar este rango?')) onDelete(range.id); }}
                    className="p-1.5 rounded-lg transition-all"
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
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: th.modalBorder }}
            >
              <h2 className="text-base font-heading" style={{ color: th.title }}>
                {editing ? 'Editar rango' : 'Nuevo rango de referencia'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                style={{ color: th.rowSub }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.title; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.rowSub; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: th.labelText }}>Disciplina</label>
                <select
                  value={form.discipline}
                  onChange={(e) => set('discipline', e.target.value)}
                  style={{ ...inputStyle }}
                >
                  {DISCIPLINES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: th.labelText }}>Nombre del ángulo</label>
                <input
                  value={form.angle_name}
                  onChange={(e) => set('angle_name', e.target.value)}
                  style={{ ...inputStyle }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'min_deg', label: 'Mínimo (°)' },
                  { key: 'optimal_min_deg', label: 'Óptimo mín (°)' },
                  { key: 'optimal_max_deg', label: 'Óptimo máx (°)' },
                  { key: 'max_deg', label: 'Máximo (°)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs mb-1" style={{ color: th.labelText }}>{label}</label>
                    <input
                      type="number"
                      value={form[key as keyof typeof form] as number}
                      onChange={(e) => set(key as keyof typeof form, parseFloat(e.target.value) || 0)}
                      style={{ ...inputStyle }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: th.labelText }}>Descripción</label>
                <input
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  style={{ ...inputStyle }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: th.cancelBg, border: `1px solid ${th.cancelBorder}`, color: th.cancelText }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: '#fdda36', color: '#514163' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
