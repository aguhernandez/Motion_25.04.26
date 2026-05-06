import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Camera, Upload, Save, RotateCcw, Eye, EyeOff, Layers,
  Wind, ChevronDown, ChevronUp, Sparkles, BarChart3, Info,
} from 'lucide-react';
import type { Athlete } from '../../lib/types';
import type { AeroInputs, AeroPosition } from '../../lib/aeroCalculations';
import {
  AERO_KEY_POINTS, AERO_POINT_CONNECTIONS,
  computeAeroAngles, computeFrontalAreaIndex, computeCdaEstimate,
  computePowerAtSpeed, computeSpeedAtPower, computeAeroIndex, detectAeroRisks,
  buildPowerCurve,
} from '../../lib/aeroCalculations';
import { useAerodynamics } from '../../hooks/useAerodynamics';
import AngleCanvas from '../shared/AngleCanvas';
import AeroInputPanel from './AeroInputPanel';
import AeroMetricsPanel from './AeroMetricsPanel';
import AeroComparePanel from './AeroComparePanel';
import AeroPowerCurve from './AeroPowerCurve';
import type { KeyPoint } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface AerodynamicsAnalysisProps {
  athletes: Athlete[];
}

const DEMO_IMAGE_URL =
  'https://images.pexels.com/photos/5380651/pexels-photo-5380651.jpeg?auto=compress&cs=tinysrgb&w=960';

type TabId = 'capture' | 'compare' | 'simulation';

export default function AerodynamicsAnalysis({ athletes }: AerodynamicsAnalysisProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const [activeTab, setActiveTab] = useState<TabId>('capture');
  const [imageData, setImageData] = useState('');
  const [points, setPoints] = useState<KeyPoint[]>(AERO_KEY_POINTS);
  const [showAngles, setShowAngles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [positionLabel, setPositionLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [metricsPanelOpen, setMetricsPanelOpen] = useState(true);

  const [inputs, setInputs] = useState<AeroInputs>({
    bikeType: 'road',
    targetSpeedKmh: 40,
    airDensity: 1.225,
    totalMassKg: 80,
    ftpWatts: 250,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId) ?? null;

  const { positions, save, remove } = useAerodynamics(selectedAthleteId || undefined);

  useEffect(() => {
    if (selectedAthlete) {
      if (selectedAthlete.weight_kg) {
        setInputs((prev) => ({ ...prev, totalMassKg: selectedAthlete.weight_kg! + 8 }));
      }
    }
  }, [selectedAthleteId]);

  const angles = computeAeroAngles(points);
  const frontalAreaIndex = computeFrontalAreaIndex(points, inputs.bikeType);
  const cdaEstimate = computeCdaEstimate(frontalAreaIndex, inputs.bikeType);
  const powerAtSpeed = computePowerAtSpeed(inputs.targetSpeedKmh, cdaEstimate, inputs.airDensity, inputs.totalMassKg);
  const speedAtFtp = computeSpeedAtPower(inputs.ftpWatts, cdaEstimate, inputs.airDensity, inputs.totalMassKg);
  const aerodynamicIndex = computeAeroIndex(frontalAreaIndex, positions);
  const risks = detectAeroRisks(angles);

  const currentCurve = buildPowerCurve(cdaEstimate, inputs.airDensity, inputs.totalMassKg);

  const handlePointsChange = useCallback((pts: KeyPoint[]) => { setPoints(pts); }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImageData(ev.target?.result as string); setPoints(AERO_KEY_POINTS); };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setCameraActive(true); }
    } catch { alert('No se pudo acceder a la cámara.'); }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setImageData(canvas.toDataURL('image/jpeg', 0.85));
    setPoints(AERO_KEY_POINTS);
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  const loadDemo = useCallback(() => {
    setDemoLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      setImageData(canvas.toDataURL('image/jpeg', 0.9));
      setPoints(AERO_KEY_POINTS);
      setDemoLoading(false);
    };
    img.onerror = () => { setImageData(DEMO_IMAGE_URL); setPoints(AERO_KEY_POINTS); setDemoLoading(false); };
    img.src = DEMO_IMAGE_URL;
  }, []);

  useEffect(() => { if (!imageData) loadDemo(); }, []);

  const handleSave = async () => {
    if (!positionLabel.trim()) { alert('Ingresá un nombre para esta posición'); return; }
    setSaving(true);
    try {
      const pos: Omit<AeroPosition, 'id' | 'created_at'> = {
        athlete_id: selectedAthleteId || null,
        session_id: null,
        label: positionLabel.trim(),
        image_data: imageData,
        key_points: points,
        bike_type: inputs.bikeType,
        target_speed_kmh: inputs.targetSpeedKmh,
        air_density: inputs.airDensity,
        total_mass_kg: inputs.totalMassKg,
        ftp_watts: inputs.ftpWatts,
        torso_angle_deg: angles.torsoAngle || null,
        hip_angle_tdc_deg: angles.hipAngleTdc || null,
        knee_angle_bdc_deg: angles.kneeAngleBdc || null,
        elbow_angle_deg: angles.elbowAngle || null,
        head_angle_deg: angles.headAngle || null,
        frontal_area_index: frontalAreaIndex,
        aerodynamic_index: aerodynamicIndex,
        power_at_target_speed_w: powerAtSpeed,
        cda_estimate: cdaEstimate,
        notes,
      };
      await save(pos);
      setSavedFlash(true);
      setPositionLabel('');
      setTimeout(() => setSavedFlash(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadPosition = (pos: AeroPosition) => {
    if (pos.image_data) setImageData(pos.image_data);
    if (pos.key_points?.length) setPoints(pos.key_points as KeyPoint[]);
    setInputs({
      bikeType: pos.bike_type,
      targetSpeedKmh: pos.target_speed_kmh,
      airDensity: pos.air_density,
      totalMassKg: pos.total_mass_kg,
      ftpWatts: pos.ftp_watts,
    });
    setPositionLabel(pos.label + ' (copia)');
    setNotes(pos.notes ?? '');
    setActiveTab('capture');
  };

  const iconActive: React.CSSProperties = { background: 'rgba(253,218,54,0.12)', color: '#fdda36', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };
  const iconInactive: React.CSSProperties = { background: 'transparent', color: th.sub, borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'capture', label: 'Captura & Análisis', icon: Wind },
    { id: 'compare', label: `Comparar (${positions.length})`, icon: BarChart3 },
    { id: 'simulation', label: 'Simulación', icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-heading" style={{ color: th.title }}>Aerodynamics</h2>
          <p className="text-xs mt-0.5" style={{ color: th.sub }}>Cycling Position Analysis · Estimación relativa aerodinámica</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}>
            <Info className="w-3 h-3 flex-shrink-0" />
            Relative aerodynamic estimation only
          </div>
          {athletes.length > 0 && (
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg focus:outline-none"
              style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
            >
              <option value="">Sin atleta</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all justify-center"
              style={active ? { background: '#fdda36', color: '#514163' } : { color: th.sub }}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'capture' && (
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1 space-y-4 min-w-0">
            <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
                <div>
                  <span className="text-sm font-semibold" style={{ color: th.title }}>Captura de Posición</span>
                  <p className="text-xs mt-0.5" style={{ color: th.sub }}>Ajustá los puntos sobre la imagen lateral del ciclista</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowLabels((v) => !v)} style={showLabels ? iconActive : iconInactive} title="Etiquetas">
                    {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setShowAngles((v) => !v)} style={showAngles ? iconActive : iconInactive} title="Ángulos">
                    <Layers className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setPoints(AERO_KEY_POINTS); }} style={iconInactive} title="Reset puntos">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {cameraActive ? (
                <div className="relative p-3">
                  <video ref={videoRef} className="w-full rounded-xl" autoPlay playsInline muted />
                  <button onClick={captureFromCamera} className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 font-semibold rounded-full text-sm shadow-xl" style={{ background: '#fdda36', color: '#514163' }}>
                    Capturar
                  </button>
                </div>
              ) : (
                <div className="p-3">
                  <AngleCanvas
                    imageData={imageData}
                    keyPoints={points}
                    angles={[]}
                    connections={AERO_POINT_CONNECTIONS}
                    onPointsChange={handlePointsChange}
                    showAngles={showAngles}
                    showLabels={showLabels}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 px-4 py-3 border-t flex-wrap" style={{ borderColor: th.panelHeaderBorder }}>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="sr-only" onChange={handleImageUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
                  <Upload className="w-4 h-4" />
                  Subir imagen
                </button>
                <button onClick={startCamera} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors" style={{ background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }}>
                  <Camera className="w-4 h-4" />
                  Cámara
                </button>
                <button onClick={loadDemo} disabled={demoLoading} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all disabled:opacity-50" style={{ background: 'rgba(253,218,54,0.1)', border: '1px solid rgba(253,218,54,0.3)', color: '#fdda36' }}>
                  <Sparkles className="w-4 h-4" />
                  {demoLoading ? 'Cargando...' : 'Demo'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
                <span className="text-sm font-semibold" style={{ color: th.title }}>Guardar Posición</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: th.sub }}>Nombre de la posición</label>
                  <input
                    type="text"
                    placeholder="Ej: Posición Race — Etapa 1"
                    value={positionLabel}
                    onChange={(e) => setPositionLabel(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: th.sub }}>Notas</label>
                  <textarea
                    rows={2}
                    placeholder="Observaciones, contexto del análisis..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
                    style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: th.tagBg }}>
                    <p className="text-xs" style={{ color: th.sub }}>AI calculado</p>
                    <p className="text-lg font-bold" style={{ color: '#fdda36' }}>{aerodynamicIndex}<span className="text-xs font-normal ml-1" style={{ color: th.sub }}>/100</span></p>
                  </div>
                  <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: th.tagBg }}>
                    <p className="text-xs" style={{ color: th.sub }}>Potencia {inputs.targetSpeedKmh}km/h</p>
                    <p className="text-lg font-bold" style={{ color: '#06b6d4' }}>{powerAtSpeed}<span className="text-xs font-normal ml-1" style={{ color: th.sub }}>W</span></p>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving || !positionLabel.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                    style={savedFlash ? { background: '#10b981', color: '#fff' } : { background: '#fdda36', color: '#514163' }}
                  >
                    <Save className="w-4 h-4" />
                    {savedFlash ? 'Guardado!' : saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:w-80 space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
                <span className="text-sm font-semibold" style={{ color: th.title }}>Parámetros</span>
              </div>
              <div className="p-3">
                <AeroInputPanel inputs={inputs} onChange={setInputs} athlete={selectedAthlete} />
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
              <button
                onClick={() => setMetricsPanelOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: th.panelHeaderBorder }}
              >
                <span className="text-sm font-semibold" style={{ color: th.title }}>Métricas Aerodinámicas</span>
                {metricsPanelOpen ? <ChevronUp className="w-4 h-4" style={{ color: th.sub }} /> : <ChevronDown className="w-4 h-4" style={{ color: th.sub }} />}
              </button>
              {metricsPanelOpen && (
                <div className="p-3">
                  <AeroMetricsPanel
                    angles={angles}
                    frontalAreaIndex={frontalAreaIndex}
                    aerodynamicIndex={aerodynamicIndex}
                    cdaEstimate={cdaEstimate}
                    powerAtSpeed={powerAtSpeed}
                    speedAtFtp={speedAtFtp}
                    targetSpeedKmh={inputs.targetSpeedKmh}
                    ftpWatts={inputs.ftpWatts}
                    risks={risks}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <p className="text-sm font-semibold" style={{ color: th.title }}>Comparación de posiciones</p>
            <p className="text-xs mt-0.5" style={{ color: th.sub }}>Seleccioná hasta 2 posiciones para comparar</p>
          </div>
          <div className="p-4">
            <AeroComparePanel
              positions={positions}
              onDelete={remove}
              onLoad={handleLoadPosition}
            />
          </div>
        </div>
      )}

      {activeTab === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
              <p className="text-sm font-semibold" style={{ color: th.title }}>Simulación — Posición actual</p>
              <p className="text-xs mt-0.5" style={{ color: th.sub }}>CdA est: {cdaEstimate.toFixed(3)} · {inputs.bikeType.replace('_', ' ')}</p>
            </div>
            <div className="p-4 space-y-4">
              <AeroPowerCurve
                curves={[{ label: 'Posición actual', color: '#fdda36', data: currentCurve }]}
                ftpWatts={inputs.ftpWatts}
                targetSpeedKmh={inputs.targetSpeedKmh}
              />

              <div className="grid grid-cols-3 gap-2">
                {[35, 40, 45].map((spd) => (
                  <div key={spd} className="p-2.5 rounded-xl text-center" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
                    <p className="text-xs mb-1" style={{ color: th.sub }}>{spd} km/h</p>
                    <p className="text-base font-bold" style={{ color: '#fdda36' }}>{computePowerAtSpeed(spd, cdaEstimate, inputs.airDensity, inputs.totalMassKg)}W</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
                <p className="text-xs font-semibold mb-2" style={{ color: th.sub }}>Velocidad estimada a distintas potencias</p>
                <div className="space-y-1.5">
                  {[200, 250, 300, 350, 400].map((pwr) => {
                    const spd = computeSpeedAtPower(pwr, cdaEstimate, inputs.airDensity, inputs.totalMassKg);
                    return (
                      <div key={pwr} className="flex items-center justify-between text-xs">
                        <span style={{ color: th.sub }}>{pwr}W</span>
                        <div className="flex-1 mx-3 h-1 rounded-full overflow-hidden" style={{ background: th.progressTrack }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (spd / 60) * 100)}%`, background: 'rgba(6,182,212,0.5)' }} />
                        </div>
                        <span className="font-bold" style={{ color: '#06b6d4' }}>{spd} km/h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
              <p className="text-sm font-semibold" style={{ color: th.title }}>Comparación de posiciones guardadas</p>
            </div>
            <div className="p-4">
              {positions.length === 0 ? (
                <div className="text-center py-8" style={{ color: th.empty }}>
                  <Wind className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Guardá posiciones en la pestaña "Captura" para ver la comparación aquí</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AeroPowerCurve
                    curves={positions.slice(0, 4).map((pos, i) => ({
                      label: pos.label,
                      color: ['#fdda36', '#06b6d4', '#10b981', '#f97316'][i],
                      data: buildPowerCurve(pos.cda_estimate, pos.air_density, pos.total_mass_kg),
                    }))}
                    ftpWatts={inputs.ftpWatts}
                    targetSpeedKmh={inputs.targetSpeedKmh}
                  />

                  <div className="space-y-2">
                    {positions.slice(0, 6).map((pos) => (
                      <div key={pos.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: th.tagBg }}>
                        <span className="text-xs flex-1 truncate font-medium" style={{ color: th.rowText }}>{pos.label}</span>
                        <span className="text-xs" style={{ color: th.sub }}>AI: <strong style={{ color: '#fdda36' }}>{Math.round(pos.aerodynamic_index)}</strong></span>
                        <span className="text-xs" style={{ color: th.sub }}><strong style={{ color: '#06b6d4' }}>{Math.round(pos.power_at_target_speed_w)}W</strong></span>
                        <span className="text-xs" style={{ color: th.sub }}>CdA: {pos.cda_estimate.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>

                  {positions.length >= 2 && (() => {
                    const sorted = [...positions].sort((a, b) => b.aerodynamic_index - a.aerodynamic_index);
                    const best = sorted[0];
                    const worst = sorted[sorted.length - 1];
                    const powerDiff = Math.abs(Math.round(worst.power_at_target_speed_w - best.power_at_target_speed_w));
                    return (
                      <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#10b981' }}>Potencial de mejora</p>
                        <p className="text-xs" style={{ color: th.sub }}>
                          Pasar de <strong style={{ color: th.rowText }}>{worst.label}</strong> a <strong style={{ color: th.rowText }}>{best.label}</strong> ahorraría aproximadamente{' '}
                          <strong style={{ color: '#10b981' }}>{powerDiff}W</strong> a {best.target_speed_kmh} km/h
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
