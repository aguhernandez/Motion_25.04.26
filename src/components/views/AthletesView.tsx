import { useState } from 'react';
import { User, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import type { Athlete } from '../../lib/types';
import AthleteModal from '../shared/AthleteModal';
import { useT } from '../../lib/LanguageContext';

interface AthletesViewProps {
  athletes: Athlete[];
  onCreate: (data: Omit<Athlete, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Athlete>) => Promise<void>;
  onDelete: (id: string) => void;
}

const dm = {
  title: '#ffffff',
  cardBg: 'rgba(81,65,99,0.08)',
  cardBorder: 'rgba(81,65,99,0.25)',
  cardHoverBorder: 'rgba(253,218,54,0.35)',
  nameText: '#ffffff',
  sub: '#94a3b8',
  statBg: 'rgba(81,65,99,0.2)',
  statText: '#ffffff',
  statSub: '#94a3b8',
  emptyIconBg: 'rgba(81,65,99,0.15)',
  emptyIconBorder: 'rgba(81,65,99,0.3)',
  emptyText: '#ffffff',
  emptySub: '#94a3b8',
};

const lm = {
  title: '#514163',
  cardBg: '#ffffff',
  cardBorder: 'rgba(81,65,99,0.1)',
  cardHoverBorder: 'rgba(253,218,54,0.4)',
  nameText: '#514163',
  sub: 'rgba(81,65,99,0.5)',
  statBg: 'rgba(81,65,99,0.05)',
  statText: '#514163',
  statSub: 'rgba(81,65,99,0.45)',
  emptyIconBg: 'rgba(81,65,99,0.06)',
  emptyIconBorder: 'rgba(81,65,99,0.12)',
  emptyText: '#514163',
  emptySub: 'rgba(81,65,99,0.5)',
};

export default function AthletesView({ athletes, onCreate, onUpdate, onDelete }: AthletesViewProps) {
  const { t, darkMode } = useT();
  const th = darkMode ? dm : lm;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);

  const handleSave = async (data: Omit<Athlete, 'id' | 'created_at' | 'updated_at'>) => {
    if (editing) {
      await onUpdate(editing.id, data);
    } else {
      await onCreate(data);
    }
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading" style={{ color: th.title }}>{t.nav.athletes}</h2>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#fdda36', color: '#514163' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
        >
          <Plus className="w-4 h-4" />
          {t.athlete?.new ?? 'Nuevo atleta'}
        </button>
      </div>

      {athletes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: th.emptyIconBg, border: `1px solid ${th.emptyIconBorder}` }}
          >
            <User className="w-8 h-8" style={{ color: th.sub }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: th.emptyText }}>
            {t.athlete?.empty ?? 'Sin atletas registrados'}
          </h3>
          <p className="text-sm max-w-xs" style={{ color: th.emptySub }}>
            {t.athlete?.emptyDesc ?? 'Registrá atletas con su antropometría para calcular ajustes automáticamente.'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#fdda36', color: '#514163' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
          >
            {t.athlete?.registerFirst ?? 'Registrar primer atleta'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {athletes.map((athlete) => (
            <div
              key={athlete.id}
              className="group p-5 rounded-xl transition-all"
              style={{
                background: th.cardBg,
                border: `1px solid ${th.cardBorder}`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = th.cardHoverBorder; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = th.cardBorder; }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #514163 0%, #3d3050 100%)',
                      color: '#fdda36',
                    }}
                  >
                    {athlete.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: th.nameText }}>{athlete.name}</h3>
                    {athlete.email && <p className="text-xs" style={{ color: th.sub }}>{athlete.email}</p>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditing(athlete); setShowModal(true); }}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ color: th.sub }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#fdda36';
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(253,218,54,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = th.sub;
                      (e.currentTarget as HTMLButtonElement).style.background = '';
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar este atleta?')) onDelete(athlete.id); }}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ color: th.sub }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = th.sub;
                      (e.currentTarget as HTMLButtonElement).style.background = '';
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Altura', value: athlete.height_cm, unit: 'cm' },
                  { label: 'Peso', value: athlete.weight_kg, unit: 'kg' },
                  { label: 'Entrepierna', value: athlete.inseam_cm, unit: 'cm' },
                ].map(({ label, value, unit }) => (
                  <div
                    key={label}
                    className="rounded-lg p-2 text-center"
                    style={{ background: th.statBg }}
                  >
                    <p className="text-sm font-semibold" style={{ color: th.statText }}>
                      {value ? `${value}` : '–'}
                      {value && <span className="text-xs ml-0.5" style={{ color: th.statSub }}>{unit}</span>}
                    </p>
                    <p className="text-xs" style={{ color: th.statSub }}>{label}</p>
                  </div>
                ))}
              </div>

              {athlete.lab_athlete_id && (
                <div
                  className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5"
                  style={{
                    color: '#10b981',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.18)',
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{t.athlete?.linked ?? 'Vinculado a Lab'}: {athlete.lab_athlete_id}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AthleteModal
          athlete={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
