import { Plus, Trash2 } from 'lucide-react';
import type { KeyPoint, CustomAngleConfig } from '../../lib/types';

interface AngleConfiguratorProps {
  points: KeyPoint[];
  configs: CustomAngleConfig[];
  onChange: (configs: CustomAngleConfig[]) => void;
}

export default function AngleConfigurator({ points, configs, onChange }: AngleConfiguratorProps) {
  const labels = points.map((p) => p.label);

  const addConfig = () => {
    if (labels.length < 3) return;
    const id = `angle_${Date.now()}`;
    onChange([
      ...configs,
      {
        id,
        name: `Ángulo ${configs.length + 1}`,
        labelP1: labels[0],
        labelVertex: labels[1],
        labelP2: labels[2],
      },
    ]);
  };

  const removeConfig = (id: string) => {
    onChange(configs.filter((c) => c.id !== id));
  };

  const updateConfig = (id: string, updates: Partial<CustomAngleConfig>) => {
    onChange(configs.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  return (
    <div className="space-y-3">
      {labels.length < 3 ? (
        <p className="text-center text-xs text-slate-500 py-4">
          Necesitás al menos 3 puntos para definir ángulos
        </p>
      ) : (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {configs.map((cfg) => (
              <div key={cfg.id} className="bg-slate-800/60 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={cfg.name}
                    onChange={(e) => updateConfig(cfg.id, { name: e.target.value })}
                    className="flex-1 bg-transparent text-xs font-medium text-white focus:outline-none"
                    placeholder="Nombre del ángulo"
                  />
                  <button
                    onClick={() => removeConfig(cfg.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { key: 'labelP1', label: 'Punto 1' },
                    { key: 'labelVertex', label: 'Vértice' },
                    { key: 'labelP2', label: 'Punto 2' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                      <select
                        value={cfg[key as keyof CustomAngleConfig] as string}
                        onChange={(e) => updateConfig(cfg.id, { [key]: e.target.value })}
                        className="w-full px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-cyan-500/50"
                      >
                        {labels.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addConfig}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-cyan-400 hover:text-cyan-300 border border-dashed border-cyan-500/30 hover:border-cyan-500/50 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar ángulo
          </button>
        </>
      )}
    </div>
  );
}
