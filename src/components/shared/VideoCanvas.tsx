import {
  useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef,
} from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import MediaUploadArea from './MediaUploadArea';
import type { KeyPoint, AngleData } from '../../lib/types';
import { getStatusColor } from '../../lib/angleCalculations';
import { OpticalFlowTracker } from '../../lib/opticalFlow';

export interface VideoCanvasHandle {
  exportFrame: () => string;
  getVideoElement: () => HTMLVideoElement | null;
  startTracking: (pointIds?: string[]) => void;
  stopTracking: () => void;
  resetTracker: () => void;
  isTracking: () => boolean;
  trackNextFrame: (imageData: string) => void;
}

export type TrackingState = 'idle' | 'tracking' | 'lost';

interface VideoCanvasProps {
  videoUrl?: string | null;
  videoRef?: React.RefObject<HTMLVideoElement>;
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
  onFileSelect?: (file: File) => void;
  uploadDisabled?: boolean;
  trackingState?: TrackingState;
  trackedPointIds?: string[];
  onTrackingStateChange?: (state: TrackingState) => void;
  lostPointIds?: string[];
  trajectory?: ({ x: number; y: number } | null)[];
  hideMeasurements?: boolean;
}

const POINT_RADIUS = 10;
const HIT_RADIUS = 24;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;


interface Transform {
  scale: number;
  drawW: number;
  drawH: number;
  offsetX: number;
  offsetY: number;
}

const VideoCanvas = forwardRef<VideoCanvasHandle, VideoCanvasProps>(({
  videoUrl,
  videoRef: externalVideoRef,
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
  onFileSelect,
  uploadDisabled = false,
  trackingState: externalTrackingState,

  onTrackingStateChange,
  lostPointIds,
  trajectory,
  hideMeasurements = false,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoElRef = externalVideoRef ?? internalVideoRef;

  const [canvasSize, setCanvasSize] = useState({ w: 700, h: 394 });
  const [mediaSize, setMediaSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovering, setHovering] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [internalTracking, setInternalTracking] = useState(false);
  const [activeTrackedIds, setActiveTrackedIds] = useState<string[]>([]);
  const [lostPoints, setLostPoints] = useState<Set<string>>(new Set());
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchRef = useRef<{ dist: number; midX: number; midY: number; zoom: number } | null>(null);
  const prevImageDataRef = useRef<string>('');
  const lastTrackTimeRef = useRef(-1);
  const tracker = useRef(new OpticalFlowTracker()).current;

  const trackingActive = externalTrackingState === 'tracking' || internalTracking;
  const isVideoMode = !!videoUrl;

  useImperativeHandle(ref, () => ({
    exportFrame: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png', 1.0);
    },
    getVideoElement: () => videoElRef.current,
    startTracking: (pointIds?: string[]) => {
      const ids = pointIds ?? keyPoints.map((p) => p.id);
      setActiveTrackedIds(ids);
      setInternalTracking(true);
      setLostPoints(new Set());
      tracker.reset();
      lastTrackTimeRef.current = -1;
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

  // ── Transform computation ──
  const getTransform = useCallback((): Transform => {
    if (mediaSize.w === 0 || mediaSize.h === 0 || canvasSize.w === 0 || canvasSize.h === 0) {
      return { scale: 1, drawW: 0, drawH: 0, offsetX: 0, offsetY: 0 };
    }
    const fitScale = Math.min(canvasSize.w / mediaSize.w, canvasSize.h / mediaSize.h);
    const scale = fitScale * zoom;
    const drawW = mediaSize.w * scale;
    const drawH = mediaSize.h * scale;
    const offsetX = (canvasSize.w - drawW) / 2 + pan.x;
    const offsetY = (canvasSize.h - drawH) / 2 + pan.y;
    return { scale, drawW, drawH, offsetX, offsetY };
  }, [canvasSize, mediaSize, zoom, pan]);

  const toCanvas = useCallback(
    (nx: number, ny: number) => {
      const { offsetX, offsetY, drawW, drawH } = getTransform();
      return { x: offsetX + nx * drawW, y: offsetY + ny * drawH };
    },
    [getTransform]
  );

  const toNorm = useCallback(
    (cx: number, cy: number) => {
      const { offsetX, offsetY, drawW, drawH } = getTransform();
      if (drawW === 0 || drawH === 0) return { x: 0, y: 0 };
      return { x: (cx - offsetX) / drawW, y: (cy - offsetY) / drawH };
    },
    [getTransform]
  );

  // ── Zoom helpers ──
  const zoomAtPoint = useCallback(
    (canvasX: number, canvasY: number, factor: number) => {
      setZoom((prevZoom) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor));
        if (newZoom === prevZoom) return prevZoom;
        const fitScale = Math.min(canvasSize.w / mediaSize.w, canvasSize.h / mediaSize.h);
        const oldDrawW = mediaSize.w * fitScale * prevZoom;
        const oldDrawH = mediaSize.h * fitScale * prevZoom;
        const oldOffsetX = (canvasSize.w - oldDrawW) / 2 + pan.x;
        const oldOffsetY = (canvasSize.h - oldDrawH) / 2 + pan.y;
        const mx = (canvasX - oldOffsetX) / oldDrawW;
        const my = (canvasY - oldOffsetY) / oldDrawH;
        const newDrawW = mediaSize.w * fitScale * newZoom;
        const newDrawH = mediaSize.h * fitScale * newZoom;
        const newPanX = canvasX - mx * newDrawW - (canvasSize.w - newDrawW) / 2;
        const newPanY = canvasY - my * newDrawH - (canvasSize.h - newDrawH) / 2;
        setPan({ x: newPanX, y: newPanY });
        return newZoom;
      });
    },
    [canvasSize, mediaSize, pan]
  );

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z * 1.3));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z / 1.3));
  }, []);
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // ── Image data for tracking ──
  const getImageDataFromUrl = useCallback((dataUrl: string): ImageData | null => {
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

  const captureVideoFrameImageData = useCallback((): ImageData | null => {
    const video = videoElRef.current;
    const offscreen = offscreenRef.current;
    if (!video || !video.videoWidth) return null;
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  }, [videoElRef]);

  const processTrackingFrame = useCallback(
    (nextDataUrl: string) => {
      if (nextDataUrl === prevImageDataRef.current) return;
      prevImageDataRef.current = nextDataUrl;

      const nextImgData = getImageDataFromUrl(nextDataUrl);
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
    [activeTrackedIds, keyPoints, onPointsChange, onTrackingStateChange, getImageDataFromUrl, tracker]
  );

  const runTrackingFromVideo = useCallback(() => {
    if (!trackingActive || !isVideoMode) return;
    const video = videoElRef.current;
    if (!video || video.paused || video.seeking || video.currentTime === lastTrackTimeRef.current) return;
    lastTrackTimeRef.current = video.currentTime;

    const frameData = captureVideoFrameImageData();
    if (!frameData) return;

    const pointsToTrack = activeTrackedIds.length > 0
      ? keyPoints.filter((p) => activeTrackedIds.includes(p.id))
      : keyPoints;

    const results = tracker.track(frameData, pointsToTrack);

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
  }, [trackingActive, isVideoMode, captureVideoFrameImageData, activeTrackedIds, keyPoints, onPointsChange, onTrackingStateChange, tracker, videoElRef]);

  // ── Image-mode tracking (legacy external path) ──
  useEffect(() => {
    if (!trackingActive || isVideoMode || !imageData || imageData === prevImageDataRef.current) return;
    processTrackingFrame(imageData);
  }, [imageData, trackingActive, isVideoMode, processTrackingFrame]);

  // ── Canvas sizing via ResizeObserver ──
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    if (canvasContainerRef.current) ro.observe(canvasContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Image loading (image mode) ──
  useEffect(() => {
    if (isVideoMode) { setImageLoaded(false); imageRef.current = null; return; }
    if (!imageData) { setImageLoaded(false); imageRef.current = null; return; }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setMediaSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageData;
  }, [imageData, isVideoMode]);

  // ── Video metadata loading ──
  useEffect(() => {
    if (!isVideoMode) { setVideoReady(false); setMediaSize({ w: 0, h: 0 }); return; }
    const video = videoElRef.current;
    if (!video) return;
    const onLoaded = () => {
      setMediaSize({ w: video.videoWidth, h: video.videoHeight });
      setVideoReady(true);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, [isVideoMode, videoUrl, videoElRef]);

  // Reset zoom/pan when media changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [videoUrl, imageData]);

  const formatClock = (ms: number) => {
    const totalMs = Math.round(ms);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  // ── Main draw function ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { drawW, drawH, offsetX, offsetY } = getTransform();

    // Dark background fills entire canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    // Draw media at natural aspect ratio (object-contain) + zoom/pan
    const hasMedia = (isVideoMode && videoReady && videoElRef.current && videoElRef.current.videoWidth > 0)
      || (!isVideoMode && imageRef.current && imageLoaded);

    if (hasMedia && drawW > 0 && drawH > 0) {
      if (isVideoMode && videoElRef.current) {
        ctx.drawImage(videoElRef.current, offsetX, offsetY, drawW, drawH);
      } else if (imageRef.current) {
        ctx.drawImage(imageRef.current, offsetX, offsetY, drawW, drawH);
      }
    } else if (!hasMedia) {
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

    // Clip overlays to media area
    if (drawW > 0 && drawH > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(offsetX, offsetY, drawW, drawH);
      ctx.clip();

      if (showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        const cols = 8;
        const rows = 6;
        for (let i = 1; i < cols; i++) {
          const x = offsetX + (drawW / cols) * i;
          ctx.beginPath();
          ctx.moveTo(x, offsetY);
          ctx.lineTo(x, offsetY + drawH);
          ctx.stroke();
        }
        for (let i = 1; i < rows; i++) {
          const y = offsetY + (drawH / rows) * i;
          ctx.beginPath();
          ctx.moveTo(offsetX, y);
          ctx.lineTo(offsetX + drawW, y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      if (trajectory?.length) {
        ctx.beginPath();
        let connected = false;
        for (const point of trajectory) {
          if (!point) { connected = false; continue; }
          const at = toCanvas(point.x, point.y);
          if (connected) ctx.lineTo(at.x, at.y); else ctx.moveTo(at.x, at.y);
          connected = true;
        }
        ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();
      }
      // Connections
      const pointMap = new Map(keyPoints.map((p) => [p.label, p]));
      for (const [labelA, labelB] of connections) {
        const pa = pointMap.get(labelA);
        const pb = pointMap.get(labelB);
        if (!pa || !pb) continue;
        const a = toCanvas(pa.x, pa.y);
        const b = toCanvas(pb.x, pb.y);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.stroke();
      }

      // Angles
      if (showAngles && !hideMeasurements) {
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
          ctx.globalAlpha = 1;

          const midAngle = (a1 + a2) / 2;
          const lx = vx.x + Math.cos(midAngle) * 58;
          const ly = vx.y + Math.sin(midAngle) * 58;
          const lbl = `${angle.value_deg}°`;

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
        }
      }

      // Key points
      for (const point of keyPoints) {
        const { x, y } = toCanvas(point.x, point.y);
        const isDragging = dragging === point.id;
        const isHovering = hovering === point.id;
        const isSelected = selected === point.id;
        const isTracked = trackingActive && (activeTrackedIds.length === 0 || activeTrackedIds.includes(point.id));
        const isLost = lostPoints.has(point.id) || (lostPointIds?.includes(point.id) ?? false);
        const color = isLost ? '#ef4444' : (point.color ?? '#06b6d4');
        const active = isDragging || isSelected;

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

        if (showLabels) {
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
        }
      }

      ctx.restore(); // end clip
    }

    // Clock overlay (drawn outside clip, always visible)
    if (showClock) {
      const effectiveMs = isVideoMode && videoElRef.current
        ? Math.round(videoElRef.current.currentTime * 1000)
        : clockMs;
      const label = formatClock(effectiveMs);
      const fontSize = Math.max(14, Math.floor(canvasSize.w * 0.03));
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
    }

    // Tracking badge (outside clip)
    if (trackingActive) {
      const trackBadgeX = 12;
      const trackBadgeY = 12;
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
    }
  }, [keyPoints, angles, connections, canvasSize, imageLoaded, videoReady, showAngles, showLabels, showGrid, showClock, clockMs, dragging, hovering, selected, toCanvas, trackingActive, activeTrackedIds, lostPoints, lostPointIds, trajectory, hideMeasurements, getTransform, isVideoMode, videoElRef]);

  // ── Draw on state changes (image mode) ──
  useEffect(() => {
    if (!isVideoMode) draw();
  }, [draw, isVideoMode]);

  // ── rAF loop for video mode (60fps) ──
  useEffect(() => {
    if (!isVideoMode) return;
    let frameId: number;
    const animate = () => {
      draw();
      runTrackingFromVideo();
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isVideoMode, draw, runTrackingFromVideo]);

  // ── Event position mapping ──
  const getEventPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        if (!t) return null;
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

  // ── Mouse handlers ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readonly || (isVideoMode && !videoElRef.current?.paused)) return;
    const pos = getEventPos(e);
    if (!pos) return;
    const id = findClosest(pos.x, pos.y);
    if (id) {
      setDragging(id);
      setSelected(id);
    } else {
      setSelected(null);
      // Start panning
      setIsPanning(true);
      panStartRef.current = { x: pos.x, y: pos.y, panX: pan.x, panY: pan.y };
    }
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
    } else if (isPanning) {
      const dx = pos.x - panStartRef.current.x;
      const dy = pos.y - panStartRef.current.y;
      setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
    } else {
      setHovering(findClosest(pos.x, pos.y));
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const pos = getEventPos(e);
    if (!pos) return;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAtPoint(pos.x, pos.y, factor);
  };

  // ── Touch handlers ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((readonly || (isVideoMode && !videoElRef.current?.paused)) && e.touches.length < 2) return;
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const midX = ((t1.clientX + t2.clientX) / 2 - rect.left) * (canvasSize.w / rect.width);
      const midY = ((t1.clientY + t2.clientY) / 2 - rect.top) * (canvasSize.h / rect.height);
      pinchRef.current = { dist, midX, midY, zoom };
      setDragging(null);
      setIsPanning(false);
    } else if (e.touches.length === 1) {
      const pos = getEventPos(e);
      if (!pos) return;
      const id = readonly ? null : findClosest(pos.x, pos.y);
      if (id) {
        e.preventDefault();
        setDragging(id);
        setSelected(id);
      } else {
        // Start panning
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: pos.x, y: pos.y, panX: pan.x, panY: pan.y };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDist = Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
      const factor = newDist / pinchRef.current.dist;
      const startZoom = pinchRef.current.zoom;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom * factor));
      // Zoom centered on pinch midpoint
      const { midX, midY } = pinchRef.current;
      const fitScale = Math.min(canvasSize.w / mediaSize.w, canvasSize.h / mediaSize.h);
      const oldDrawW = mediaSize.w * fitScale * startZoom;
      const oldDrawH = mediaSize.h * fitScale * startZoom;
      const oldOffsetX = (canvasSize.w - oldDrawW) / 2 + pan.x;
      const oldOffsetY = (canvasSize.h - oldDrawH) / 2 + pan.y;
      const mx = (midX - oldOffsetX) / oldDrawW;
      const my = (midY - oldOffsetY) / oldDrawH;
      const newDrawW = mediaSize.w * fitScale * newZoom;
      const newDrawH = mediaSize.h * fitScale * newZoom;
      const newPanX = midX - mx * newDrawW - (canvasSize.w - newDrawW) / 2;
      const newPanY = midY - my * newDrawH - (canvasSize.h - newDrawH) / 2;
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
      pinchRef.current.dist = newDist;
    } else if (e.touches.length === 1) {
      if (dragging && !readonly) {
        e.preventDefault();
        const pos = getEventPos(e);
        if (!pos) return;
        const n = toNorm(pos.x, pos.y);
        onPointsChange(
          keyPoints.map((p) =>
            p.id === dragging ? { ...p, x: Math.max(0, Math.min(1, n.x)), y: Math.max(0, Math.min(1, n.y)) } : p
          )
        );
      } else if (isPanning) {
        e.preventDefault();
        const pos = getEventPos(e);
        if (!pos) return;
        const dx = pos.x - panStartRef.current.x;
        const dy = pos.y - panStartRef.current.y;
        setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      pinchRef.current = null;
      setDragging(null);
      setIsPanning(false);
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      // Switch to pan if not dragging
      if (!dragging) {
        const pos = getEventPos(e);
        if (pos) {
          setIsPanning(true);
          panStartRef.current = { x: pos.x, y: pos.y, panX: pan.x, panY: pan.y };
        }
      }
    }
  };

  const hasMedia = !!(imageData || videoUrl);
  const cursor = dragging ? 'grabbing' : isPanning ? 'grabbing' : hovering ? 'grab' : readonly ? 'default' : 'crosshair';

  return (
    <div className="w-full select-none">
      <div className="flex items-center gap-2 mb-2 px-1" style={{ display: hasMedia ? undefined : 'none' }}>
        {!readonly && selected && !trackingActive && (
          <>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: keyPoints.find((p) => p.id === selected)?.color ?? '#06b6d4' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Arrastrando: <strong style={{ color: 'white' }}>{keyPoints.find((p) => p.id === selected)?.label}</strong>
            </span>
          </>
        )}
        {!readonly && !selected && !trackingActive && (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Hacé click y arrastrá los puntos para ajustarlos</span>
        )}
        {trackingActive && (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Seguimiento activo</span>
            {lostPoints.size > 0 && (
              <span className="text-xs text-red-400">{lostPoints.size} perdido(s)</span>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={zoomOut} title="Alejar" className="flex items-center justify-center w-7 h-7 rounded-md transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono px-1 min-w-[3rem] text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} title="Acercar" className="flex items-center justify-center w-7 h-7 rounded-md transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={resetZoom} title="Ajustar a pantalla" className="flex items-center justify-center w-7 h-7 rounded-md transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={canvasContainerRef}
        className="relative flex items-center justify-center rounded-xl overflow-hidden"
        style={{ background: '#000', height: 'clamp(280px, 50vh, 600px)' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="w-full h-full"
          style={{ touchAction: 'none', cursor, display: 'block', visibility: hasMedia ? 'visible' : 'hidden' }}
          aria-hidden={!hasMedia}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {!hasMedia && <div className="absolute inset-0"><MediaUploadArea allowVideo onFileSelect={onFileSelect} disabled={uploadDisabled || readonly} /></div>}
      </div>

      {isVideoMode && (
        <video
          ref={videoElRef}
          src={videoUrl ?? undefined}
          className="hidden"
          muted
          playsInline
          preload="auto"
        />
      )}
    </div>
  );
});

VideoCanvas.displayName = 'VideoCanvas';
export default VideoCanvas;
