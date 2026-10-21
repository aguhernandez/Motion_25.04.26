import type { KeyPoint } from '../../lib/types';
import type { CyclingAngleConfig } from '../../lib/angleCalculations';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

const BODY_REGIONS = [
  { id: 'legs', es: 'Piernas', en: 'Legs' },
  { id: 'trunk', es: 'Tronco', en: 'Trunk' },
  { id: 'arms', es: 'Brazos', en: 'Arms' },
  { id: 'head', es: 'Cabeza y cuello', en: 'Head and neck' },
] as const;

function angleRegion(config: CyclingAngleConfig): string {
  if (/Tronco|Pelvis|Rotación|Undulación/.test(config.name)) return 'trunk';
  if (/Hombros|Brazos/.test(config.name)) return 'arms';
  if (/Cabeza|Cuello/.test(config.name)) return 'head';
  if (/Hombro|Codo|Muñeca|Brazo|Mano/.test(config.labelVertex)) return 'arms';
  return 'legs';
}

interface Props {
  angleConfigs: CyclingAngleConfig[];
  defaultPoints: KeyPoint[];
  selectedAngleNames: string[];
  onChange: (names: string[]) => void;
}

export default function BodyAngleSelector({ angleConfigs, defaultPoints, selectedAngleNames, onChange: changeSelection }: Props) {
  const { language, darkMode } = useT();
  const th = getTheme(darkMode);
  const activeConfigs = angleConfigs.filter((config) => selectedAngleNames.includes(config.name));
  return (
    <div className="px-4 py-3 border-t space-y-3" style={{ borderColor: th.panelHeaderBorder }}>
      <p className="text-sm font-semibold" style={{ color: th.title }}>{language === 'es' ? 'Ángulos a analizar' : 'Angles to analyze'}</p>
      <p className="text-xs" style={{ color: th.sub }}>{language === 'es' ? 'Agrega una zona y selecciona los ángulos que necesitas. Solo se muestran sus puntos de referencia; por ejemplo, la cadera puede necesitar un punto del hombro.' : 'Add a region and select the angles you need. Only their reference points are shown; for example, a hip angle may require a shoulder point.'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BODY_REGIONS.map((region) => {
          const configs = angleConfigs.filter((config) => angleRegion(config) === region.id && defaultPoints.some((p) => p.label === config.labelP1) && defaultPoints.some((p) => p.label === config.labelVertex) && defaultPoints.some((p) => p.label === config.labelP2));
          const selected = configs.some((config) => selectedAngleNames.includes(config.name));
          return (
            <div key={region.id} className="rounded-lg p-3 space-y-2" style={{ background: th.tagBg }}>
              <button type="button" disabled={configs.length === 0} aria-pressed={selected} onClick={() => changeSelection(selected ? selectedAngleNames.filter((name) => !configs.some((config) => config.name === name)) : [...new Set([...selectedAngleNames, ...configs.map((config) => config.name)])])} className="text-sm font-medium disabled:opacity-40" style={{ color: selected ? '#06b6d4' : th.title }}>
                {selected ? '−' : '+'} {language === 'es' ? 'Ángulos de ' : 'Angles for '}{region[language]}
              </button>
              {configs.length === 0 && <p className="text-xs" style={{ color: th.sub }}>{language === 'es' ? 'Sin ángulos disponibles en esta vista' : 'No angles available in this view'}</p>}
              {configs.map((config) => <label key={config.name} className="flex items-center gap-2 text-xs" style={{ color: th.rowText }}>
                <input type="checkbox" checked={selectedAngleNames.includes(config.name)} onChange={(event) => changeSelection(event.target.checked ? [...selectedAngleNames, config.name] : selectedAngleNames.filter((name) => name !== config.name))} />
                {config.name}
              </label>)}
            </div>
          );
        })}
      </div>
      {activeConfigs.length === 0 && <p className="text-xs" style={{ color: th.sub }}>{language === 'es' ? 'Selecciona al menos un ángulo para colocar sus puntos sobre la imagen o el video.' : 'Select at least one angle to place its points on the image or video.'}</p>}
    </div>
  );
}
