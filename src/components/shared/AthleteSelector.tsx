import { useState } from 'react';
import { ChevronDown, User, Plus } from 'lucide-react';
import type { Athlete } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface AthleteSelectorProps {
  athletes: Athlete[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreateNew?: () => void;
}

export default function AthleteSelector({ athletes, selectedId, onSelect, onCreateNew }: AthleteSelectorProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const [open, setOpen] = useState(false);
  const selected = athletes.find((a) => a.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors"
        style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: th.tagBg }}>
          <User className="w-3.5 h-3.5" style={{ color: th.sub }} />
        </div>
        <span className="flex-1 truncate" style={{ color: selected ? th.rowText : th.sub }}>
          {selected ? selected.name : 'Seleccionar atleta...'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: th.sub }} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{ color: th.sub }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = th.tagBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ''; }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: th.tagBg }}>
                <User className="w-3.5 h-3.5" style={{ color: th.sub }} />
              </div>
              Sin atleta asignado
            </button>
            {athletes.map((a) => {
              const isSelected = a.id === selectedId;
              return (
                <button
                  key={a.id}
                  onClick={() => { onSelect(a.id); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                  style={isSelected ? { background: 'rgba(253,218,54,0.1)', color: '#fdda36' } : { color: th.rowText }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = th.tagBg; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = ''; }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #514163 0%, #3d3050 100%)', color: '#fdda36' }}>
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.name}</p>
                    {a.height_cm && <p className="text-xs" style={{ color: th.sub }}>{a.height_cm}cm</p>}
                  </div>
                </button>
              );
            })}
          </div>
          {onCreateNew && (
            <button
              onClick={() => { onCreateNew(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors border-t"
              style={{ color: '#fdda36', borderColor: th.panelBorder }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(253,218,54,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ''; }}
            >
              <Plus className="w-4 h-4" />
              Nuevo atleta
            </button>
          )}
        </div>
      )}
    </div>
  );
}
