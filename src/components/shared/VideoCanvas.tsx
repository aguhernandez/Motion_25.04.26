import {
  useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef,
} from 'react';
import type { KeyPoint, AngleData } from '../../lib/types';
import { getStatusColor } from '../../lib/angleCalculations';
import { OpticalFlowTracker } from '../../lib/opticalFlow';

export interface VideoCanvasHandle {
  exportFrame: () => string;
  startTracking: (pointIds?: string[]) => void;
  stopTracking: () => void;
  resetTracker: () => void;
  isTracking: () => boolean;
  trackNextFrame: (imageData: string) => void;
}

export type TrackingState = 'idle' | 'tracking' | 'lost';

interface VideoCanvasProps {
  videoUrl: string | null;
  imageData: string;
  keyPoints: KeyPoint[];
  angles: AngleData[];
  connections: [string, string][];
  onPointsChange: (points: KeyPoint[]) => void;
  showAngles?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  showClock?: boolean;
  clockMs?: number;
  readonly?: boolean;
  trackingState?: TrackingState;
  trackedPointIds?: string[];
  onTrackingStateChange?: (state: TrackingState) => void;
}

const POINT_RADIUS = 10;
const HIT_RADIUS = 24;

const tracker = new OpticalFlowTracker();

const VideoCanvas = forwardRef<VideoCanvasHandle, VideoCanvasProps>(({
  videoUrl,
  imageData,
  keyPoints,
  angles,
  connections,
  onPointsChange,
  showAngles = true,
  showLabels = true,
  showGrid = false,
  showClock = false,
  clockMs = 0,
  readonly = false,
  trackingState: externalTrackingState,
  trackedPointIds,
  onTrackingStateChange,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const [canvasSize, setCanvasSize] = useState({ w: 700, h: 394 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovering, setHovering] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [internalTracking, setInternalTracking] = useState(false);
  const [activeTrackedIds, setActiveTrackedIds] = useState<string[]>([]);
  const [lostPoints, setLostPoints] = useState<Set<string>>(new Set());
  const prevImageDataRef = useRef<string>('');

  const trackingActive = externalTrackingState === 'tracking' || internalTracking;

  useImperativeHandle(ref, () => ({
    exportFrame: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png', 1.0);
    },
    startTracking: (pointIds?: string[]) => {
      const ids = pointIds ?? keyPoints.map((p) => p.id);
      setActiveTrackedIds(ids);
      setInternalTracking(true);
      setLostPoints(new Set());
      tracker.reset();
      onTrackingStateChange?.('tracking');
    },
    stopTracking: () => {
      setInternalTracking(false);
      onTrackingStateChange?.('idle');
    },
    resetTracker: () => {
      tracker.reset();
      setLostPoints(new Set());
      prevImageDataRef.current = '';
    },
    isTracking: () => trackingActive,
    trackNextFrame: (nextImageDataUrl: string) => {
      if (!trackingActive) return;
      processTrackingFrame(nextImageDataUrl);
    },
  }));

  const getImageData = useCallback((dataUrl: string): ImageData | null => {
    const offscreen = offscreenRef.current;
    const img = new Image();
    img.src = dataUrl;
    if (!img.complete) return null;
    offscreen.width = img.naturalWidth || 640;
    offscreen.height = img.naturalHeight || 360;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  }, []);

  const processTrackingFrame = useCallback(
    (nextDataUrl: string) => {
      if (nextDataUrl === prevImageDataRef.current) return;
      prevImageDataRef.current = nextDataUrl;

      const nextImgData = getImageData(nextDataUrl);
      if (!nextImgData) return;

      const pointsToTrack = activeTrackedIds.length > 0
        ? keyPoints.filter((p) => activeTrackedIds.includes(p.id))
        : keyPoints;

      const results = tracker.track(nextImgData, pointsToTrack);

      const newLost = new Set<string>();
      const updatedPoints = keyPoints.map((kp) => {
        const result = results.find((r) => r.id === kp.id);
        if (!result) return kp;
        if (result.lost || result.confidence < 0.05) {
          newLost.add(kp.id);
          return kp;
        }
        return { ...kp, x: result.x, y: result.y };
      });

      setLostPoints(newLost);
      onPointsChange(updatedPoints);

      if (newLost.size > 0 && newLost.size >= pointsToTrack.length / 2) {
        onTrackingStateChange?.('lost');
      }
    },
    [activeTrackedIds, keyPoints, onPointsChange, onTrackingStateChange, getImageData]
  );

  useEffect(() => {
    if (!trackingActive || !imageData || imageData === prevImageDataRef.current) return;
    processTrackingFrame(imageData);
  }, [imageData, trackingActive, processTrackingFrame]);

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

  useEffect(() => {
    if (!imageData) { setImageLoaded(false); imageRef.current = null; return; }
    const img = new Image();
    img.onload = () => { imageRef.current = img; setImageLoaded(true); };
    img.src = imageData;
  }, [imageData]);

  const toCanvas = useCallback(
    (nx: number, ny: number) => ({ x: nx * canvasSize.w, y: ny * canvasSize.h }),
    [canvasSize]
  );

  const toNorm = useCallback(
    (cx: number, cy: number) => ({ x: cx / canvasSize.w, y: cy / canvasSize.h }),
    [canvasSize]
  );

  const formatClock = (ms: number) => {
    const totalMs = Math.round(ms);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    if (imageRef.current && imageLoaded) {
      ctx.drawImage(imageRef.current, 0, 0, canvasSize.w, canvasSize.h);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      ctx.fillStyle = 'rgba(148,163,184,0.2)';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Cargá un video o imagen', canvasSize.w / 2, canvasSize.h / 2);
    }

    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const cols = 8;
      const rows = 6;
      for (let i = 1; i < cols; i++) {
        const x = (canvasSize.w / cols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize.h);
        ctx.stroke();
      }
      for (let i = 1; i < rows; i++) {
        const y = (canvasSize.h / rows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.w, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (showClock) {
      const label = formatClock(clockMs);
      const fontSize = Math.max(14, Math.floor(canvasSize.w * 0.03));
      ctx.save();
      ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
      const tw = ctx.measureText(label).width;
      const padX = 12, padY = 8;
      const x = canvasSize.w - tw - padX * 2 - 12;
      const y = canvasSize.h - fontSize - padY * 2 - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      ctx.roundRect(x, y, tw + padX * 2, fontSize + padY * 2, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(6,182,212,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#06b6d4';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + padX, y + padY);
      ctx.restore();
    }

    if (trackingActive) {
      const trackBadgeX = 12;
      const trackBadgeY = 12;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(trackBadgeX, trackBadgeY, 110, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(trackBadgeX + 14, trackBadgeY + 13, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 400));
      ctx.beginPath();
      ctx.arc(trackBadgeX + 14, trackBadgeY + 13, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('TRACKING', trackBadgeX + 26, trackBadgeY + 13);
      ctx.restore();
    }

    const pointMap = new Map(keyPoints.map((p) => [p.label, p]));

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
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.restore();
    }

    if (showAngles) {
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
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(vx.x, vx.y, 32, a1, a2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(vx.x, vx.y, 32, a1, a2);
        ctx.strokeStyle = `${color}30`;
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.restore();

        const midAngle = (a1 + a2) / 2;
        const lx = vx.x + Math.cos(midAngle) * 58;
        const ly = vx.y + Math.sin(midAngle) * 58;
        const lbl = `${angle.value_deg}°`;

        ctx.save();
        ctx.font = 'bold 13px Inter, sans-serif';
        const tw = ctx.measureText(lbl).width;
        const px2 = 7, py2 = 5;
        ctx.fillStyle = 'rgba(10,15,30,0.88)';
        ctx.beginPath();
        ctx.roundRect(lx - tw / 2 - px2, ly - 10 - py2, tw + px2 * 2, 20 + py2 * 2, 6);
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
    }

    for (const point of keyPoints) {
      const { x, y } = toCanvas(point.x, point.y);
      const isDragging = dragging === point.id;
      const isHovering = hovering === point.id;
      const isSelected = selected === point.id;
      const isTracked = trackingActive && (activeTrackedIds.length === 0 || activeTrackedIds.includes(point.id));
      const isLost = lostPoints.has(point.id);
      const color = isLost ? '#ef4444' : (point.color ?? '#06b6d4');
      const active = isDragging || isSelected;

      ctx.save();

      if (isTracked && !isLost) {
        ctx.beginPath();
        ctx.arc(x, y, POINT_RADIUS + 12, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}50`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isLost) {
        ctx.beginPath();
        ctx.arc(x, y, POINT_RADIUS + 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#ef444450';
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
        ctx.beginPath();
        ctx.arc(x, y, POINT_RADIUS + 7, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}80`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = active ? 'white' : color;
      ctx.fill();
      ctx.strokeStyle = active ? color : 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = active ? color : 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.restore();

      if (showLabels) {
        ctx.save();
        ctx.font = `${active ? 'bold' : ''} 11px Inter, sans-serif`.trim();
        const tw2 = ctx.measureText(point.label).width;
        const ox = x + POINT_RADIUS + 8;
        const oy = y - POINT_RADIUS - 2;
        ctx.fillStyle = active ? 'rgba(10,15,30,0.92)' : 'rgba(10,15,30,0.78)';
        ctx.beginPath();
        ctx.roundRect(ox - 4, oy - 10, tw2 + 8, 19, 4);
        ctx.fill();
        if (active) {
          ctx.strokeStyle = `${color}70`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillStyle = active ? color : 'rgba(255,255,255,0.9)';
        ctx.textBaseline = 'middle';
        ctx.fillText(point.label, ox, oy - 1);
        ctx.restore();
      }
    }
  }, [keyPoints, angles, connections, canvasSize, imageLoaded, showAngles, showLabels, showGrid, showClock, clockMs, dragging, hovering, selected, toCanvas, trackingActive, activeTrackedIds, lostPoints]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    if (!trackingActive) return;
    let frameId: number;
    const animate = () => {
      draw();
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [trackingActive, draw]);

  const getEventPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
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

  const findClosest = useCallback(
    (cx: number, cy: number): string | null => {
      let closest: string | null = null;
      let minDist = HIT_RADIUS;
      for (const p of keyPoints) {
        const { x, y } = toCanvas(p.x, p.y);
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist < minDist) { minDist = dist; closest = p.id; }
      }
      return closest;
    },
    [keyPoints, toCanvas]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readonly) return;
    const pos = getEventPos(e);
    if (!pos) return;
    const id = findClosest(pos.x, pos.y);
    if (id) { setDragging(id); setSelected(id); }
    else { setSelected(null); }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getEventPos(e);
    if (!pos) return;
    if (dragging && !readonly) {
      const n = toNorm(pos.x, pos.y);
      onPointsChange(
        keyPoints.map((p) =>
          p.id === dragging ? { ...p, x: Math.max(0, Math.min(1, n.x)), y: Math.max(0, Math.min(1, n.y)) } : p
        )
      );
    } else {
      setHovering(findClosest(pos.x, pos.y));
    }
  };

  const handleMouseUp = () => setDragging(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (readonly) return;
    e.preventDefault();
    const pos = getEventPos(e);
    if (!pos) return;
    const id = findClosest(pos.x, pos.y);
    if (id) { setDragging(id); setSelected(id); }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!dragging || readonly) return;
    const pos = getEventPos(e);
    if (!pos) return;
    const n = toNorm(pos.x, pos.y);
    onPointsChange(
      keyPoints.map((p) =>
        p.id === dragging ? { ...p, x: Math.max(0, Math.min(1, n.x)), y: Math.max(0, Math.min(1, n.y)) } : p
      )
    );
  };

  const cursor = dragging ? 'grabbing' : hovering ? 'grab' : readonly ? 'default' : 'crosshair';

  return (
    <div ref={containerRef} className="w-full select-none">
      {!readonly && selected && !trackingActive && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: keyPoints.find((p) => p.id === selected)?.color ?? '#06b6d4' }} />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Arrastrando: <strong style={{ color: 'white' }}>{keyPoints.find((p) => p.id === selected)?.label}</strong>
          </span>
          <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>Soltá para confirmar</span>
        </div>
      )}
      {!readonly && !selected && !trackingActive && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Hacé click y arrastrá los puntos para ajustarlos</span>
        </div>
      )}
      {trackingActive && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Seguimiento activo — los puntos se mueven automáticamente con el video</span>
          {lostPoints.size > 0 && (
            <span className="text-xs text-red-400 ml-auto">{lostPoints.size} punto(s) perdido(s)</span>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="w-full rounded-xl border border-slate-700/40"
        style={{ touchAction: 'none', cursor, display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setDragging(null)}
      />
    </div>
  );
});

VideoCanvas.displayName = 'VideoCanvas';
export default VideoCanvas;
