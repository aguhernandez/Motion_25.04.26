import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Camera, Save, RotateCcw, Eye, EyeOff, Layers,
  ChevronDown, ChevronUp, Sparkles, Grid3x3, Clock, Download,
  Video, Image as ImageIcon, Crosshair, StopCircle,
  AlertTriangle, Undo2, Redo2, Loader2,
} from 'lucide-react';
import VideoCanvas, { type VideoCanvasHandle } from './VideoCanvas';
import VideoControls, { type VideoControlsHandle } from './VideoControls';
import LiveCameraTracker from './LiveCameraTracker';
import AnglePanel from './AnglePanel';
import BodyAngleSelector from './BodyAngleSelector';
import VideoTrackingPanel from './VideoTrackingPanel';
import { useVideoTracking } from '../../hooks/useVideoTracking';
import { adjacentFrameTime, frameIndexAtTime } from '../../lib/videoTracking';
import type { TrackingLimit } from '../../lib/videoTracking';
import type { KeyPoint, AngleData, BiomechanicsSession, BiomechanicsSnapshot, Athlete } from '../../lib/types';
import type { CyclingAngleConfig } from '../../lib/angleCalculations';
import { computeAnglesFromPoints } from '../../lib/angleCalculations';
import type { ReferenceRange } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

const MAX_IMAGE_SIZE_MB = 20;
const MAX_VIDEO_SIZE_MB = 500;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-msvideo'];

interface AnalysisWorkspaceProps {
  session: BiomechanicsSession;
  defaultPoints: KeyPoint[];
  connections: [string, string][];
  angleConfigs: CyclingAngleConfig[];
  references: ReferenceRange[];
  snapshots: BiomechanicsSnapshot[];
  onSaveSnapshot: (snap: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => Promise<void>;
  extraPanel?: React.ReactNode;
  phaseOptions?: string[];
  demoImageUrl?: string;
  demoPoints?: KeyPoint[];
  referenceVideoUrl?: string;
  referenceVideoTitle?: string;
  athlete?: Athlete | null;
}

type MediaMode = 'image' | 'video' | 'live';

const MAX_UNDO = 30;

export default function AnalysisWorkspace({
  session,
  defaultPoints,
  connections,
  angleConfigs,
  references,
  snapshots,
  onSaveSnapshot,
  extraPanel,
  phaseOptions = [],
  demoImageUrl,
  demoPoints,
  referenceVideoUrl,
  referenceVideoTitle,
  athlete,
}: AnalysisWorkspaceProps) {
  const { t, darkMode, language } = useT();
  const th = getTheme(darkMode);

  const [mediaMode, setMediaMode] = useState<MediaMode>('image');
  const [imageData, setImageData] = useState('');
  const [videoSrc, setVideoSrc] = useState('');
  const [selectedAngleNames, setSelectedAngleNames] = useState<string[]>([]);
  const activeConfigs = useMemo(() => angleConfigs.filter((config) => selectedAngleNames.includes(config.name)), [angleConfigs, selectedAngleNames]);
  const [points, setPoints] = useState<KeyPoint[]>(defaultPoints);
  const [angles, setAngles] = useState<AngleData[]>([]);
  const [showAngles, setShowAngles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showClock, setShowClock] = useState(false);
  const [clockMs, setClockMs] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState(phaseOptions[0] ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [snapshotsPanelOpen, setSnapshotsPanelOpen] = useState(true);
  const [refVideoPanelOpen, setRefVideoPanelOpen] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [trackingLimit, setTrackingLimit] = useState<TrackingLimit>(120);
  const [independentPointIds, setIndependentPointIds] = useState<string[]>([]);
  const [lostPointIds, setLostPointIds] = useState<string[]>([]);
  const [trajectoryPointId, setTrajectoryPointId] = useState('');
  const [hasReviewSample, setHasReviewSample] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const activeLabels = new Set(activeConfigs.flatMap((config) => [config.labelP1, config.labelVertex, config.labelP2]));
  const activePoints = points.filter((point) => activeLabels.has(point.label) || independentPointIds.includes(point.id));
  const activeConnections = connections.filter(([a, b]) => activeLabels.has(a) && activeLabels.has(b));

  useEffect(() => {
    return () => { if (videoSrc) URL.revokeObjectURL(videoSrc); };
  }, [videoSrc]);

  const undoStack = useRef<KeyPoint[][]>([]);
  const redoStack = useRef<KeyPoint[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<VideoCanvasHandle>(null);
  const videoControlsRef = useRef<VideoControlsHandle>(null);
  const sharedVideoRef = useRef<HTMLVideoElement>(null);
  const tracking = useVideoTracking(mediaMode === 'video' ? videoFile : null, sharedVideoRef, (sample, time) => {
    setClockMs(time * 1000);
    setHasReviewSample(!!sample);
    setLostPointIds(sample?.lostIds ?? []);
    if (!sample) setAngles([]);
    if (sample) {
      setPoints((previous) => previous.map((point) => sample.points.find((item) => item.id === point.id) ?? point));
      setAngles(sample.angles);
    }
  });
  const videoDimensions = tracking.index ? { width: tracking.index.width, height: tracking.index.height } : undefined;
  const dimensionsRef = useRef(videoDimensions);
  dimensionsRef.current = videoDimensions;
  const changeSelection = (names: string[]) => {
    tracking.clear();
    setHasReviewSample(false);
    setLostPointIds([]);
    setSelectedAngleNames(names);
  };
  const markCorrection = (clearLost = true) => {
    tracking.correctAt(sharedVideoRef.current?.currentTime ?? 0);
    setHasReviewSample(false);
    if (clearLost) setLostPointIds([]);
  };

  useEffect(() => {
    if (mediaMode === 'video' && (hasReviewSample || tracking.sampleCount > 0)) return;
    const dimensions = tracking.index ? { width: tracking.index.width, height: tracking.index.height } : undefined;
    setAngles(computeAnglesFromPoints(points.filter((point) => !lostPointIds.includes(point.id)), activeConfigs, references, dimensions));
  }, [points, activeConfigs, references, hasReviewSample, mediaMode, lostPointIds, tracking.sampleCount, tracking.index]);


  const pushUndo = useCallback((prevPoints: KeyPoint[]) => {
    undoStack.current = [...undoStack.current.slice(-MAX_UNDO + 1), prevPoints];
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const handleUndo = () => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [points, ...redoStack.current.slice(0, MAX_UNDO - 1)];
    markCorrection();
    setPoints(prev);
    const computed = computeAnglesFromPoints(prev, activeConfigs, references, dimensionsRef.current);
    setAngles(computed);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current[0];
    redoStack.current = redoStack.current.slice(1);
    undoStack.current = [...undoStack.current.slice(-MAX_UNDO + 1), points];
    markCorrection();
    setPoints(next);
    const computed = computeAnglesFromPoints(next, activeConfigs, references, dimensionsRef.current);
    setAngles(computed);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  };

  const recomputeAngles = useCallback(
    (pts: KeyPoint[]) => {
      const computed = computeAnglesFromPoints(pts, activeConfigs, references, dimensionsRef.current);
      setAngles(computed);
    },
    [activeConfigs, references]
  );

  const handlePointsChange = (pts: KeyPoint[]) => {
      markCorrection(false);
      const movedIds = pts.filter((point) => points.some((previous) => previous.id === point.id && (previous.x !== point.x || previous.y !== point.y))).map((point) => point.id);
      setLostPointIds((previous) => previous.filter((id) => !movedIds.includes(id)));
      pushUndo(points);
      const merged = points.map((point) => pts.find((updated) => updated.id === point.id) ?? point);
      setPoints(merged);
      recomputeAngles(merged);
    };

  const validateImageFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return t.workspace.errorImageFormat;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return t.workspace.errorImageSize.replace('{max}', String(MAX_IMAGE_SIZE_MB));
    }
    return null;
  };

  const validateVideoFile = (file: File): string | null => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return t.workspace.errorVideoFormat;
    }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      return t.workspace.errorVideoSize.replace('{max}', String(MAX_VIDEO_SIZE_MB));
    }
    return null;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const err = validateImageFile(file);
    if (err) { setUploadError(err); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setImageData(data);
      setMediaMode('image');
      undoStack.current = [];
      redoStack.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setPoints(defaultPoints);
      recomputeAngles(defaultPoints);
      setImageLoading(false);
    };
    reader.onerror = () => {
      setUploadError(t.workspace.errorFileRead);
      setImageLoading(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const err = validateVideoFile(file);
    if (err) { setUploadError(err); if (videoInputRef.current) videoInputRef.current.value = ''; return; }
    setVideoLoading(true);
    tracking.clear();
    setHasReviewSample(false);
    setLostPointIds([]);
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setMediaMode('video');
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setPoints(defaultPoints);
    recomputeAngles(defaultPoints);


    setTimeout(() => setVideoLoading(false), 800);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleFrameChange = useCallback((_frameDataUrl: string, timeMs: number) => {
    setClockMs(timeMs);
  }, []);

  const startTracking = () => {
    if (lostPointIds.length) return;
    setLostPointIds([]);
    setHasReviewSample(false);
    tracking.start(activePoints, activeConfigs, references, trackingLimit);
  };

  const captureFromCamera = () => {
    if (!cameraVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(cameraVideoRef.current, 0, 0);
    setImageData(canvas.toDataURL('image/jpeg', 0.85));
    setMediaMode('image');
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setPoints(defaultPoints);
    recomputeAngles(defaultPoints);
    (cameraVideoRef.current.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
    setCameraError(null);
  };

  const handleReset = () => {
    markCorrection();
    pushUndo(points);
    setPoints(defaultPoints);
    recomputeAngles(defaultPoints);
  };

  const loadDemo = useCallback(() => {
    if (!demoImageUrl) return;
    setDemoLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      const pts = demoPoints ?? defaultPoints;
      setImageData(canvas.toDataURL('image/jpeg', 0.9));
      setMediaMode('image');
      undoStack.current = [];
      redoStack.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setPoints(pts);
      recomputeAngles(pts);
      setDemoLoading(false);
    };
    img.onerror = () => {
      setImageData(demoImageUrl);
      setMediaMode('image');
      const pts = demoPoints ?? defaultPoints;
      setPoints(pts);
      recomputeAngles(pts);
      setDemoLoading(false);
    };
    img.src = demoImageUrl;
  }, [demoImageUrl, demoPoints, defaultPoints, recomputeAngles]);

  useEffect(() => {
    if (demoImageUrl && !imageData) loadDemo();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mediaMode !== 'video' || !videoSrc || tracking.busy) return;
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const ctrl = videoControlsRef.current;
        if (!ctrl) return;
        const v = ctrl.getVideoElement();
        if (!v || isNaN(v.duration)) return;
        if (!v.paused || !tracking.index) return;
        e.preventDefault();
        v.currentTime = adjacentFrameTime(tracking.index.timestamps, v.currentTime, e.key === 'ArrowRight' ? 1 : -1) + 1e-7;

      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mediaMode, videoSrc, handleFrameChange, tracking.busy, tracking.index]);

  const handleDownloadFrame = () => {
    const dataUrl = videoCanvasRef.current?.exportFrame() ?? imageData;
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    const fname = `biomechanic_${session.title.replace(/\s+/g, '_')}_${phaseLabel || 'frame'}_${Date.now()}.png`;
    a.download = fname;
    a.click();
  };

  const handleSave = async () => {
    const frameData = mediaMode === 'video'
      ? (videoCanvasRef.current?.exportFrame() ?? imageData)
      : imageData;
    setSaving(true);
    setSaveError(null);
    try {
      await onSaveSnapshot({
        session_id: session.id,
        image_data: frameData,
        key_points: activePoints,
        angles,
        bike_fitting_data: {},
        gait_data: {},
        phase_label: phaseLabel,
        notes,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t.workspace.errorSave);
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const trajectory = useMemo(() => {
    const records = tracking.samples.current;
    const lastIndex = Math.min(tracking.sampleCount - 1, frameIndexAtTime(tracking.sampleTimes.current, clockMs / 1000));
    const path: ({ x: number; y: number } | null)[] = [];
    const start = Math.max(0, lastIndex - 600);
    for (let i = start; i <= lastIndex; i++) {
      const sample = records[i];
      const point = sample.points.find((item) => item.id === trajectoryPointId);
      path.push(point && !sample.lostIds.includes(point.id) ? point : null);
    }
    return path;
  }, [trajectoryPointId, clockMs, tracking.sampleCount, tracking.samples, tracking.sampleTimes]);

  const missingMeasurements = athlete && (!athlete.height_cm || !athlete.weight_kg);

  const iconActive: React.CSSProperties = { background: 'rgba(253,218,54,0.12)', color: '#fdda36', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };
  const iconInactive: React.CSSProperties = { background: 'transparent', color: th.sub, borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };
  const iconCyan = (on: boolean): React.CSSProperties => on
    ? { background: 'rgba(6,182,212,0.15)', color: '#06b6d4', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer', border: '1px solid rgba(6,182,212,0.3)' }
    : { background: 'transparent', color: th.sub, borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full">
      <div className="flex-1 space-y-4 min-w-0">

        {uploadError && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <p className="text-sm" style={{ color: '#ef4444' }}>{uploadError as string}</p>
            <button className="ml-auto text-xs opacity-60 hover:opacity-100" style={{ color: '#ef4444' }} onClick={() => setUploadError(null)}>✕</button>
          </div>
        )}

        {missingMeasurements && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <p className="text-sm" style={{ color: '#f59e0b' }}>
              {t.athlete.missingMeasurements}
            </p>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: th.title }}>
                {mediaMode === 'live' ? t.workspace.modeLive : mediaMode === 'video' ? t.workspace.modeVideo : t.workspace.modeImage}
              </span>
              {mediaMode === 'live' && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  {t.workspace.modeLiveBadge}
                </span>
              )}

            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={!canUndo || tracking.busy}
                title={t.workspace.undo}
                style={canUndo ? { ...iconInactive, color: th.title } : { ...iconInactive, opacity: 0.3, cursor: 'not-allowed' }}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo || tracking.busy}
                title={t.workspace.redo}
                style={canRedo ? { ...iconInactive, color: th.title } : { ...iconInactive, opacity: 0.3, cursor: 'not-allowed' }}
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <div style={{ width: 1, height: '1.25rem', background: th.panelBorder, margin: '0 2px' }} />
              <button onClick={() => setShowLabels((v) => !v)} title={t.workspace.labels} style={showLabels ? iconActive : iconInactive}>
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowAngles((v) => !v)} title={t.workspace.anglesOverlay} style={showAngles ? iconActive : iconInactive}>
                <Layers className="w-4 h-4" />
              </button>
              <button onClick={() => setShowGrid((v) => !v)} title={t.workspace.grid} style={iconCyan(showGrid)}>
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button onClick={() => setShowClock((v) => !v)} title={t.workspace.clockMs} style={iconCyan(showClock)}>
                <Clock className="w-4 h-4" />
              </button>
              <button disabled={tracking.busy} onClick={handleReset} title={t.workspace.resetPoints} style={iconInactive}>
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={handleDownloadFrame} title={t.workspace.downloadFrame} style={iconInactive}>
                <Download className="w-4 h-4" />
              </button>
              {mediaMode === 'video' && videoSrc && (
                <button
                  disabled={activePoints.length === 0 || !tracking.index || tracking.status === 'inspecting' || lostPointIds.length > 0}
                  onClick={tracking.status === 'running' ? tracking.stop : startTracking}
                  title={tracking.status === 'running' ? t.workspace.trackingStop : t.workspace.trackingStart}
                  style={tracking.status === 'running'
                    ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer', border: '1px solid rgba(16,185,129,0.35)' }
                    : { background: 'transparent', color: th.sub, borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer' }
                  }
                >
                  {tracking.status === 'running' ? <StopCircle className="w-4 h-4" /> : <Crosshair className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {mediaMode === 'live' ? (
            <div className="p-3">
              <LiveCameraTracker
                key={selectedAngleNames.join("|")}
                keyPoints={activePoints}
                angles={angles}
                connections={activeConnections}
                onPointsChange={handlePointsChange}
                onFrame={(frameDataUrl) => setImageData(frameDataUrl)}
              />
            </div>
          ) : cameraActive ? (
            <div className="relative p-3">
              {cameraError && (
                <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  <span className="text-xs" style={{ color: '#ef4444' }}>{cameraError}</span>
                </div>
              )}
              <video ref={cameraVideoRef} className="w-full rounded-xl" autoPlay playsInline muted />
              <button onClick={captureFromCamera} className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 font-medium rounded-full text-sm shadow-lg" style={{ background: '#fdda36', color: '#514163' }}>
                {t.workspace.capturePhoto}
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {(imageLoading || videoLoading) && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm" style={{ color: th.sub }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {videoLoading ? t.workspace.loadingVideo : t.workspace.loadingImage}
                </div>
              )}
              <VideoCanvas
                ref={videoCanvasRef}
                videoUrl={mediaMode === 'video' ? videoSrc || null : null}
                videoRef={sharedVideoRef}
                imageData={imageData}
                keyPoints={activePoints}
                angles={angles}
                connections={activeConnections}
                onPointsChange={handlePointsChange}
                showAngles={showAngles}
                showLabels={showLabels}
                showGrid={showGrid}
                showClock={showClock}
                clockMs={clockMs}
                readonly={tracking.busy || (mediaMode === 'video' && !(sharedVideoRef.current?.paused ?? true))}
                lostPointIds={lostPointIds}
                trajectory={trajectory}
                hideMeasurements={mediaMode === 'video' && tracking.sampleCount > 0 && !hasReviewSample}
              />
              {mediaMode === 'video' && videoSrc && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <VideoControls
                    ref={videoControlsRef}
                    videoRef={sharedVideoRef}
                    onFrameChange={handleFrameChange}
                    frameTimes={tracking.index?.timestamps}
                    disabled={tracking.busy}
                    mutedDefault
                    onTimeUpdate={(ms) => setClockMs(ms)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-3 border-t flex-wrap" style={{ borderColor: th.panelHeaderBorder }}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handleImageUpload} />
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/avi" className="sr-only" onChange={handleVideoUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: mediaMode === 'image' ? 'rgba(253,218,54,0.12)' : th.btnBg, border: `1px solid ${mediaMode === 'image' ? 'rgba(253,218,54,0.3)' : th.btnBorder}`, color: mediaMode === 'image' ? '#fdda36' : th.btnText }}>
              <ImageIcon className="w-4 h-4" />
              {t.workspace.image}
            </button>
            <button onClick={() => videoInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ background: mediaMode === 'video' ? 'rgba(6,182,212,0.1)' : th.btnBg, border: `1px solid ${mediaMode === 'video' ? 'rgba(6,182,212,0.4)' : th.btnBorder}`, color: mediaMode === 'video' ? '#06b6d4' : th.btnText }}>
              <Video className="w-4 h-4" />
              {t.workspace.video}
            </button>
            <button
              onClick={() => { setCameraError(null); setMediaMode('live' as MediaMode); }}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg"
              style={{
                background: mediaMode === 'live' ? 'rgba(16,185,129,0.12)' : th.btnBg,
                border: `1px solid ${mediaMode === 'live' ? 'rgba(16,185,129,0.4)' : th.btnBorder}`,
                color: mediaMode === 'live' ? '#10b981' : th.btnText,
              }}
            >
              <Camera className="w-4 h-4" />
              {t.workspace.live}
              {mediaMode === 'live' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
            {demoImageUrl && (
              <button onClick={loadDemo} disabled={demoLoading} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg disabled:opacity-50" style={{ background: 'rgba(253,218,54,0.12)', border: '1px solid rgba(253,218,54,0.3)', color: '#fdda36' }}>
                <Sparkles className="w-4 h-4" />
                {demoLoading ? t.workspace.demoLoading : t.workspace.demo}
              </button>
            )}
            <div className="flex-1" />
            {phaseOptions.length > 0 && (
              <select value={phaseLabel} onChange={(e) => setPhaseLabel(e.target.value)} className="px-2 py-2 text-sm rounded-lg focus:outline-none" style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}>
                {phaseOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <div className="flex flex-col items-end gap-1">
              {saveError && (
                <span className="text-xs" style={{ color: '#ef4444' }}>{saveError}</span>
              )}
              <button onClick={handleSave} disabled={saving || tracking.busy} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50" style={savedFlash ? { background: '#10b981', color: '#fff' } : saveError ? { background: '#ef4444', color: '#fff' } : { background: '#fdda36', color: '#514163' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savedFlash ? t.workspace.saved : saving ? t.workspace.saving : saveError ? t.workspace.saveError : t.workspace.saveSnapshot}
              </button>
            </div>
          </div>
          <fieldset disabled={tracking.busy}>
          <BodyAngleSelector angleConfigs={angleConfigs} defaultPoints={defaultPoints} selectedAngleNames={selectedAngleNames} onChange={changeSelection} />
          <details className="px-4 py-3 text-xs" style={{ color: th.rowText }}>
            <summary className="cursor-pointer">{language === 'es' ? 'Puntos independientes (sin crear un ángulo)' : 'Independent points (without an angle)'}</summary>
            <div className="grid grid-cols-2 gap-2 mt-3">{defaultPoints.map((point) => <label key={point.id} className="flex gap-2 items-center">
              <input type="checkbox" checked={independentPointIds.includes(point.id)} onChange={(event) => {
                tracking.clear(); setHasReviewSample(false); setLostPointIds([]);
                setIndependentPointIds(event.target.checked ? [...independentPointIds, point.id] : independentPointIds.filter((id) => id !== point.id));
              }} />{point.label}
            </label>)}</div>
          </details>
          </fieldset>
        </div>

        {mediaMode === 'video' && videoFile && <VideoTrackingPanel tracking={tracking} videoRef={sharedVideoRef} points={activePoints} configs={activeConfigs} references={references} limit={trackingLimit} onLimitChange={(limit) => { tracking.clear(); setHasReviewSample(false); setLostPointIds([]); setTrackingLimit(limit); }} onStart={startTracking} onTrajectoryChange={setTrajectoryPointId} lostPointIds={lostPointIds} fileName={videoFile.name} />}

        {mediaMode === 'video' && videoSrc && (
          <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <div>
              <p className="text-xs font-medium" style={{ color: '#f59e0b' }}>{t.workspace.videoRetentionTitle}</p>
              <p className="text-xs mt-0.5" style={{ color: th.sub }}>
                {t.workspace.videoRetentionDesc}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <button onClick={() => setSnapshotsPanelOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: th.title }}>
              {t.workspace.snapshotsHistory}
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: th.tagBg, color: th.sub }}>{snapshots.length}</span>
            </span>
            {snapshotsPanelOpen ? <ChevronUp className="w-4 h-4" style={{ color: th.sub }} /> : <ChevronDown className="w-4 h-4" style={{ color: th.sub }} />}
          </button>
          {snapshotsPanelOpen && (
            <div className="p-3">
              {snapshots.length === 0 ? (
                <p className="text-center text-sm py-6" style={{ color: th.empty }}>{t.workspace.noSnapshots}</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      onClick={() => {
                        if (snap.image_data) setImageData(snap.image_data);
                        setMediaMode('image');
                        undoStack.current = [];
                        redoStack.current = [];
                        setCanUndo(false);
                        setCanRedo(false);
                        changeSelection(snap.angles.map((angle) => angle.name));
                        setPoints(defaultPoints.map((point) => snap.key_points.find((saved) => saved.id === point.id) ?? point));
                        recomputeAngles(snap.key_points);
                        setPhaseLabel(snap.phase_label ?? '');
                        setNotes(snap.notes ?? '');
                      }}
                      className="group relative aspect-video rounded-lg overflow-hidden"
                      style={{ border: `1px solid ${th.snapshotBorder}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(253,218,54,0.5)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.snapshotBorder; }}
                    >
                      {snap.image_data ? (
                        <img src={snap.image_data} alt={snap.phase_label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: th.tagBg }}>
                          <Layers className="w-4 h-4" style={{ color: th.sub }} />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white truncate">{snap.phase_label || new Date(snap.created_at).toLocaleDateString('es-AR')}</p>
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (!snap.image_data) return;
                            const a = document.createElement('a');
                            a.href = snap.image_data;
                            a.download = `snapshot_${snap.phase_label || snap.id}.png`;
                            a.click();
                          }}
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.7)' }}
                          title={t.common.download}
                        >
                          <Download className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="xl:w-80 space-y-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>{t.workspace.calculatedAngles}</span>
          </div>
          <div className="p-3"><AnglePanel angles={angles} /></div>
        </div>

        {extraPanel && (
          <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
              <span className="text-sm font-semibold" style={{ color: th.title }}>{t.common.additionalData}</span>
            </div>
            <div className="p-3">{extraPanel}</div>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>{t.workspace.keyPoints}</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-1.5">
            {activePoints.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs" style={{ background: th.tagBg }}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color ?? '#514163' }} />
                <span style={{ color: th.rowText }}>{p.label}</span>
                <span className="ml-auto" style={{ color: th.sub }}>{Math.round(p.x * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
            <span className="text-sm font-semibold" style={{ color: th.title }}>{t.workspace.snapshotNotes}</span>
          </div>
          <div className="p-3">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.workspace.notesPlaceholder}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
              style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(253,218,54,0.07)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
        </div>

        {referenceVideoUrl && (
          <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
            <button onClick={() => setRefVideoPanelOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
              <span className="text-sm font-semibold" style={{ color: th.title }}>{t.workspace.refVideo}</span>
              {refVideoPanelOpen ? <ChevronUp className="w-4 h-4" style={{ color: th.sub }} /> : <ChevronDown className="w-4 h-4" style={{ color: th.sub }} />}
            </button>
            {refVideoPanelOpen && (
              <div className="p-3 space-y-2">
                {referenceVideoTitle && <p className="text-xs" style={{ color: th.sub }}>{referenceVideoTitle}</p>}
                <div className="relative rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={referenceVideoUrl}
                    title={referenceVideoTitle ?? 'Video de referencia'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
