import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { KeyPoint } from '../../lib/types';

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#ec4899', '#f97316', '#a3e635',
  '#e879f9', '#94a3b8',
];

interface PointManagerProps {
  points: KeyPoint[];
  onChange: (points: KeyPoint[]) => void;
}

export default function PointManager({ points, onChange }: PointManagerProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[points.length % PRESET_COLORS.length]);

  const addPoint = () => {
    const label = newLabel.trim();
    if (!label || points.find((p) => p.label === label)) return;
    const id = `custom_${Date.now()}`;
    onChange([
      ...points,
      { id, label, x: 0.3 + Math.random() * 0.4, y: 0.2 + Math.random() * 0.6, color: newColor },
    ]);
    setNewLabel('');
    setNewColor(PRESET_COLORS[(points.length + 1) % PRESET_COLORS.length]);
  };

  const removePoint = (id: string) => {
    onChange(points.filter((p) => p.id !== id));
  };

  const updateColor = (id: string, color: string) => {
    onChange(points.map((p) => (p.id === id ? { ...p, color } : p)));
  };

  const updateLabel = (id: string, label: string) => {
    if (!label.trim()) return;
    onChange(points.map((p) => (p.id === id ? { ...p, label: label.trim() } : p)));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPoint()}
          placeholder="Nombre del punto..."
          className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500/50"
        />
        <div className="relative">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div
            className="w-8 h-8 rounded-lg border-2 border-slate-600 cursor-pointer"
            style={{ backgroundColor: newColor }}
          />
        </div>
        <button
          onClick={addPoint}
          disabled={!newLabel.trim()}
          className="w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {points.length === 0 ? (
        <p className="text-center text-xs text-slate-500 py-4">
          Agregá puntos para comenzar a trazar el análisis
        </p>
      ) : (
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {points.map((point) => (
            <div
              key={point.id}
              className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/60 rounded-lg group"
            >
              <GripVertical className="w-3 h-3 text-slate-600 flex-shrink-0" />
              <div className="relative flex-shrink-0">
                <input
                  type="color"
                  value={point.color ?? '#06b6d4'}
                  onChange={(e) => updateColor(point.id, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div
                  className="w-4 h-4 rounded-full border border-slate-600 cursor-pointer"
                  style={{ backgroundColor: point.color ?? '#06b6d4' }}
                />
              </div>
              <input
                defaultValue={point.label}
                onBlur={(e) => updateLabel(point.id, e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-300 focus:outline-none focus:text-white min-w-0"
              />
              <button
                onClick={() => removePoint(point.id)}
                className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
