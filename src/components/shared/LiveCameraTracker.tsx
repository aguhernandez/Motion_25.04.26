import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera, CameraOff, Crosshair, StopCircle, RotateCcw,
  Maximize2, Minimize2, Wifi, WifiOff, FlipHorizontal,
} from 'lucide-react';
import type { KeyPoint, AngleData } from '../../lib/types';
import { getStatusColor } from '../../lib/angleCalculations';
import { OpticalFlowTracker } from '../../lib/opticalFlow';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface LiveCameraTrackerProps {
  keyPoints: KeyPoint[];
  angles: AngleData[];
  connections: [string, string][];
  onPointsChange: (points: KeyPoint[]) => void;
  onFrame?: (frameDataUrl: string) => void;
}

type LivePhase = 'idle' | 'streaming' | 'placing' | 'tracking';

const POINT_RADIUS = 11;
const HIT_RADIUS = 28;
const liveTracker = new OpticalFlowTracker();

export default function LiveCameraTracker({
  keyPoints,
  angles,
  connections,
  onPointsChange,
  onFrame,
}: LiveCameraTrackerProps) {
  const { t, darkMode } = useT();
  const th = getTheme(darkMode);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<LivePhase>('idle');
  const [fps, setFps] = useState(0);
  const [points, setPoints] = useState<KeyPoint[]>(keyPoints);
  const [lostPoints, setLostPoints] = useState<Set<string>>(new Set());
  const [canvasSize, setCanvasSize] = useState({ w: 640, h: 360 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovering, setHovering] = useState<string | null>(null);
  const [mirrored, setMirrored] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const lastFrameTime = useRef(0);
  const frameCount = useRef(0);
  const fpsInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setPoints(keyPoints);
  }, [keyPoints]);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setCanvasSize({ w: Math.floor(width), h: Math.floor(width * 0.5625) });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(fpsInterval.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    liveTracker.reset();
    setPhase('idle');
    setFps(0);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setPhase('streaming');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.camera.errorUnknown;
      setCameraError(t.camera.errorAccess.replace('{msg}', msg));
    }
  }, []);

  const captureOffscreen = useCallback((): ImageData | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const offscreen = offscreenRef.current;
    offscreen.width = video.videoWidth || 640;
    offscreen.height = video.videoHeight || 360;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    if (mirrored) {
      ctx.save();
      ctx.translate(offscreen.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    if (mirrored) ctx.restore();
    return ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  }, [mirrored]);

  const drawOverlay = useCallback(
    (pts: KeyPoint[], lost: Set<string>) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

      const toCanvas = (nx: number, ny: number) => ({
        x: nx * canvasSize.w,
        y: ny * canvasSize.h,
      });

      const pointMap = new Map(pts.map((p) => [p.label, p]));

      for (const [labelA, labelB] of connections) {
        const pa = pointMap.get(labelA);
        const pb = pointMap.get(labelB);
        if (!pa || !pb) continue;
        const a = toCanvas(pa.x, pa.y);
        const b = toCanvas(pb.x, pb.y);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      for (const angle of angles) {
        const [labelP1, labelVertex, labelP2] = angle.point_ids;
        const p1 = pointMap.get(labelP1);
        const vertex = pointMap.get(labelVertex);
        const p2 = pointMap.get(labelP2);
        if (!p1 || !vertex || !p2) continue;

        const vx = toCanvas(vertex.x, vertex.y);
        const c1 = toCanvas(p1.x, p1.y);
        const c2 = toCanvas(p2.x, p2.y);
        const color = getStatusColor(angle.status);
        const a1 = Math.atan2(c1.y - vx.y, c1.x - vx.x);
        const a2 = Math.atan2(c2.y - vx.y, c2.x - vx.x);

        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(vx.x, vx.y, 30, a1, a2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(vx.x, vx.y, 30, a1, a2);
        ctx.strokeStyle = `${color}35`;
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();

        const midAngle = (a1 + a2) / 2;
        const lx = vx.x + Math.cos(midAngle) * 54;
        const ly = vx.y + Math.sin(midAngle) * 54;
        const lbl = `${angle.value_deg}°`;
        ctx.save();
        ctx.font = 'bold 13px Inter, sans-serif';
        const tw = ctx.measureText(lbl).width;
        ctx.fillStyle = 'rgba(10,15,30,0.85)';
        ctx.beginPath();
        ctx.roundRect(lx - tw / 2 - 7, ly - 11, tw + 14, 22, 5);
        ctx.fill();
        ctx.strokeStyle = `${color}60`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, lx, ly);
        ctx.restore();
      }

      for (const point of pts) {
        const { x, y } = toCanvas(point.x, point.y);
        const isDragging = dragging === point.id;
        const isHovering = hovering === point.id;
        const isLost = lost.has(point.id);
        const color = isLost ? '#ef4444' : (point.color ?? '#06b6d4');
        const active = isDragging;

        ctx.save();

        if (!isLost) {
          ctx.beginPath();
          ctx.arc(x, y, POINT_RADIUS + 11, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}45`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (isLost) {
          ctx.beginPath();
          ctx.arc(x, y, POINT_RADIUS + 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef444455';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (isHovering && !isDragging) {
          ctx.beginPath();
          ctx.arc(x, y, POINT_RADIUS + 10, 0, Math.PI * 2);
          ctx.fillStyle = `${color}20`;
          ctx.fill();
        }

        if (active) {
          ctx.beginPath();
          ctx.arc(x, y, POINT_RADIUS + 7, 0, Math.PI * 2);
          ctx.fillStyle = `${color}35`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#fff' : color;
        ctx.fill();
        ctx.strokeStyle = active ? color : 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = active ? color : 'rgba(255,255,255,0.95)';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.font = '11px Inter, sans-serif';
        const tw2 = ctx.measureText(point.label).width;
        const ox = x + POINT_RADIUS + 8;
        const oy = y - POINT_RADIUS - 2;
        ctx.fillStyle = 'rgba(10,15,30,0.82)';
        ctx.beginPath();
        ctx.roundRect(ox - 4, oy - 10, tw2 + 8, 19, 4);
        ctx.fill();
        ctx.fillStyle = isLost ? '#ef4444' : 'rgba(255,255,255,0.92)';
        ctx.textBaseline = 'middle';
        ctx.fillText(point.label, ox, oy - 1);
        ctx.restore();
      }
    },
    [canvasSize, connections, angles, dragging, hovering]
  );

  const TARGET_FPS = 30;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  const lastRenderTime = useRef(0);

  const trackingLoop = useCallback(
    (currentPoints: KeyPoint[]) => {
      const now = performance.now();
      const elapsed = now - lastRenderTime.current;

      if (elapsed < FRAME_INTERVAL) {
        rafRef.current = requestAnimationFrame(() => trackingLoop(currentPoints));
        return;
      }
      lastRenderTime.current = now - (elapsed % FRAME_INTERVAL);

      const imgData = captureOffscreen();
      if (!imgData) {
        rafRef.current = requestAnimationFrame(() => trackingLoop(currentPoints));
        return;
      }

      const results = liveTracker.track(imgData, currentPoints);
      const newLost = new Set<string>();
      const updated = currentPoints.map((kp) => {
        const r = results.find((x) => x.id === kp.id);
        if (!r || r.lost || r.confidence < 0.05) {
          newLost.add(kp.id);
          return kp;
        }
        return { ...kp, x: r.x, y: r.y };
      });

      setLostPoints(newLost);
      setPoints(updated);
      onPointsChange(updated);
      drawOverlay(updated, newLost);

      frameCount.current++;
      if (now - lastFrameTime.current >= 1000) {
        setFps(Math.round(frameCount.current * 1000 / (now - lastFrameTime.current)));
        frameCount.current = 0;
        lastFrameTime.current = now;
      }

      if (onFrame) {
        const offscreen = offscreenRef.current;
        onFrame(offscreen.toDataURL('image/jpeg', 0.85));
      }

      rafRef.current = requestAnimationFrame(() => trackingLoop(updated));
    },
    [captureOffscreen, drawOverlay, onPointsChange, onFrame]
  );

  const streamingLoop = useCallback(() => {
    const now = performance.now();
    const elapsed = now - lastRenderTime.current;

    if (elapsed < FRAME_INTERVAL) {
      rafRef.current = requestAnimationFrame(streamingLoop);
      return;
    }
    lastRenderTime.current = now - (elapsed % FRAME_INTERVAL);

    const imgData = captureOffscreen();
    if (!imgData) {
      rafRef.current = requestAnimationFrame(streamingLoop);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (mirrored) {
          ctx.save();
          ctx.translate(canvasSize.w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvasSize.w, canvasSize.h);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, 0, canvasSize.w, canvasSize.h);
        }
      }
    }

    frameCount.current++;
    if (now - lastFrameTime.current >= 1000) {
      setFps(Math.round(frameCount.current * 1000 / (now - lastFrameTime.current)));
      frameCount.current = 0;
      lastFrameTime.current = now;
    }

    rafRef.current = requestAnimationFrame(streamingLoop);
  }, [captureOffscreen, canvasSize, mirrored]);

  useEffect(() => {
    if (phase === 'streaming' || phase === 'placing') {
      cancelAnimationFrame(rafRef.current);
      lastFrameTime.current = performance.now();
      frameCount.current = 0;
      rafRef.current = requestAnimationFrame(streamingLoop);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, streamingLoop]);

  const beginTracking = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    liveTracker.reset();
    setLostPoints(new Set());
    setPhase('tracking');
    lastFrameTime.current = performance.now();
    frameCount.current = 0;
    const currentPoints = [...points];
    rafRef.current = requestAnimationFrame(() => trackingLoop(currentPoints));
  }, [points, trackingLoop]);

  const stopTracking = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    liveTracker.reset();
    setLostPoints(new Set());
    setPhase('placing');
    lastFrameTime.current = performance.now();
    frameCount.current = 0;
    rafRef.current = requestAnimationFrame(streamingLoop);
  }, [streamingLoop]);

  const resetPoints = useCallback(() => {
    setPoints(keyPoints);
    onPointsChange(keyPoints);
    liveTracker.reset();
    setLostPoints(new Set());
  }, [keyPoints, onPointsChange]);

  const toNorm = useCallback(
    (cx: number, cy: number) => ({ x: cx / canvasSize.w, y: cy / canvasSize.h }),
    [canvasSize]
  );

  const toCanvas = useCallback(
    (nx: number, ny: number) => ({ x: nx * canvasSize.w, y: ny * canvasSize.h }),
    [canvasSize]
  );

  const findClosest = useCallback(
    (cx: number, cy: number): string | null => {
      let closest: string | null = null;
      let minDist = HIT_RADIUS;
      for (const p of points) {
        const { x, y } = toCanvas(p.x, p.y);
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d < minDist) { minDist = d; closest = p.id; }
      }
      return closest;
    },
    [points, toCanvas]
  );

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const overlay = overlayRef.current;
      if (!overlay) return null;
      const rect = overlay.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        clientX = t.clientX; clientY = t.clientY;
      } else {
        clientX = e.clientX; clientY = e.clientY;
      }
      return {
        x: (clientX - rect.left) * (canvasSize.w / rect.width),
        y: (clientY - rect.top) * (canvasSize.h / rect.height),
      };
    },
    [canvasSize]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (phase !== 'placing' && phase !== 'tracking') return;
    const pos = getPos(e);
    if (!pos) return;
    const id = findClosest(pos.x, pos.y);
    if (id) setDragging(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getPos(e);
    if (!pos) return;
    if (dragging && (phase === 'placing' || phase === 'tracking')) {
      const n = toNorm(pos.x, pos.y);
      const updated = points.map((p) =>
        p.id === dragging ? { ...p, x: Math.max(0, Math.min(1, n.x)), y: Math.max(0, Math.min(1, n.y)) } : p
      );
      setPoints(updated);
      onPointsChange(updated);
      drawOverlay(updated, lostPoints);
    } else {
      setHovering(findClosest(pos.x, pos.y));
    }
  };

  const handleMouseUp = () => {
    if (dragging && phase === 'tracking') {
      liveTracker.reset();
    }
    setDragging(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (phase !== 'placing' && phase !== 'tracking') return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    const id = findClosest(pos.x, pos.y);
    if (id) setDragging(id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!dragging) return;
    const pos = getPos(e);
    if (!pos) return;
    const n = toNorm(pos.x, pos.y);
    const updated = points.map((p) =>
      p.id === dragging ? { ...p, x: Math.max(0, Math.min(1, n.x)), y: Math.max(0, Math.min(1, n.y)) } : p
    );
    setPoints(updated);
    onPointsChange(updated);
    drawOverlay(updated, lostPoints);
  };

  useEffect(() => {
    if (phase === 'placing') {
      drawOverlay(points, lostPoints);
    }
  }, [phase, points, lostPoints, drawOverlay]);

  const phaseBadge = () => {
    if (phase === 'idle') return null;
    if (phase === 'streaming') return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(0,0,0,0.65)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        {t.camera.streamingBadge}
      </div>
    );
    if (phase === 'placing') return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(0,0,0,0.65)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        {t.camera.placingBadge}
      </div>
    );
    if (phase === 'tracking') return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(0,0,0,0.65)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)' }}>
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        {t.camera.trackingBadge.replace('{fps}', String(fps))}
        {lostPoints.size > 0 && <span className="ml-1 text-red-400">· {lostPoints.size} {t.camera.lost}</span>}
      </div>
    );
  };

  return (
    <div className={`flex flex-col gap-3 ${fullscreen ? 'fixed inset-0 z-50 p-4' : ''}`} style={fullscreen ? { background: '#050b14' } : {}}>
      {phase === 'idle' ? (
        <div
          className="w-full flex flex-col items-center justify-center gap-6 rounded-2xl"
          style={{ minHeight: '280px', background: th.panelBg, border: `2px dashed ${th.panelBorder}` }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)' }}>
              <Camera className="w-8 h-8" style={{ color: '#06b6d4' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm" style={{ color: th.title }}>{t.camera.title}</p>
              <p className="text-xs mt-1" style={{ color: th.sub }}>{t.camera.subtitle}</p>
            </div>
          </div>
          {cameraError && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl max-w-sm text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">{cameraError}</span>
            </div>
          )}
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all hover:scale-105"
            style={{ background: '#06b6d4', color: '#fff' }}
          >
            <Camera className="w-4 h-4" />
            {t.camera.activate}
          </button>
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full select-none" style={{ borderRadius: '1rem', overflow: 'hidden', background: '#000' }}>
          <video
            ref={videoRef}
            className="absolute inset-0"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0, pointerEvents: 'none' }}
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            className="block w-full"
            style={{ display: 'block' }}
          />
          <canvas
            ref={overlayRef}
            width={canvasSize.w}
            height={canvasSize.h}
            className="absolute inset-0 w-full h-full"
            style={{
              touchAction: 'none',
              cursor: dragging ? 'grabbing' : hovering ? 'grab' : (phase === 'placing' || phase === 'tracking') ? 'crosshair' : 'default',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setDragging(null); setHovering(null); }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => { if (dragging && phase === 'tracking') liveTracker.reset(); setDragging(null); }}
          />

          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            <div className="pointer-events-auto">{phaseBadge()}</div>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {(phase === 'streaming') && (
                <button
                  onClick={() => setPhase('placing')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
                  style={{ background: 'rgba(245,158,11,0.85)', color: '#fff' }}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  {t.camera.positionPoints}
                </button>
              )}
              {phase === 'placing' && (
                <button
                  onClick={beginTracking}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
                  style={{ background: 'rgba(16,185,129,0.9)', color: '#fff' }}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  {t.camera.startTracking}
                </button>
              )}
              {phase === 'tracking' && (
                <button
                  onClick={stopTracking}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  {t.camera.stopTracking}
                </button>
              )}
              <button
                onClick={() => setMirrored((v) => !v)}
                className="p-1.5 rounded-lg"
                title={t.camera.mirror}
                style={{ background: mirrored ? 'rgba(6,182,212,0.8)' : 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetPoints}
                className="p-1.5 rounded-lg"
                title={t.camera.resetPoints}
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFullscreen((v) => !v)}
                className="p-1.5 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={stopStream}
                className="p-1.5 rounded-lg"
                title={t.camera.stopCamera}
                style={{ background: 'rgba(239,68,68,0.7)', color: '#fff' }}
              >
                <CameraOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {phase === 'placing' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="px-4 py-2 rounded-xl text-xs" style={{ background: 'rgba(0,0,0,0.75)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {t.camera.dragHintPlacing}
              </div>
            </div>
          )}

          {phase === 'tracking' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="px-4 py-2 rounded-xl text-xs flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.75)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Wifi className="w-3 h-3 text-emerald-400" />
                {t.camera.dragHintTracking}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
