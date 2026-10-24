import { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import MediaUploadArea from './MediaUploadArea';
import type { KeyPoint, AngleData } from '../../lib/types';
import { getStatusColor } from '../../lib/angleCalculations';

interface AngleCanvasProps {
  imageData: string;
  keyPoints: KeyPoint[];
  angles: AngleData[];
  connections: [string, string][];
  onPointsChange: (points: KeyPoint[]) => void;
  showAngles?: boolean;
  showLabels?: boolean;
  readonly?: boolean;
  onFileSelect?: (file: File) => void;
  uploadDisabled?: boolean;
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

export default function AngleCanvas({
  imageData,
  keyPoints,
  angles,
  connections,
  onPointsChange,
  showAngles = true,
  showLabels = true,
  readonly = false,
  onFileSelect,
  uploadDisabled = false,
}: AngleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 338 });
  const [mediaSize, setMediaSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovering, setHovering] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchRef = useRef<{ dist: number; midX: number; midY: number; zoom: number } | null>(null);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!imageData) { setImageLoaded(false); imageRef.current = null; setMediaSize({ w: 0, h: 0 }); return; }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setMediaSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageData;
  }, [imageData]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageData]);

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

  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.3)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.3)), []);
  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { drawW, drawH, offsetX, offsetY } = getTransform();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    if (imageRef.current && imageLoaded && drawW > 0 && drawH > 0) {
      ctx.drawImage(imageRef.current, offsetX, offsetY, drawW, drawH);
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
      ctx.fillText('Cargá una imagen o capturá desde cámara', canvasSize.w / 2, canvasSize.h / 2);
    }

    if (drawW > 0 && drawH > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(offsetX, offsetY, drawW, drawH);
      ctx.clip();

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
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        ctx.stroke();
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
          const label = `${angle.value_deg}°`;

          ctx.font = 'bold 13px Inter, sans-serif';
          const tw = ctx.measureText(label).width;
          const px = 7, py = 5;
          ctx.fillStyle = 'rgba(10,15,30,0.88)';
          ctx.beginPath();
          ctx.roundRect(lx - tw / 2 - px, ly - 10 - py, tw + px * 2, 20 + py * 2, 6);
          ctx.fill();
          ctx.strokeStyle = `${color}60`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, lx, ly);
        }
      }

      for (const point of keyPoints) {
        const { x, y } = toCanvas(point.x, point.y);
        const isDragging = dragging === point.id;
        const isHovering = hovering === point.id;
        const isSelected = selected === point.id;
        const color = point.color ?? '#06b6d4';
        const active = isDragging || isSelected;

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

      ctx.restore();
    }
  }, [keyPoints, angles, connections, canvasSize, imageLoaded, showAngles, showLabels, dragging, hovering, selected, toCanvas, getTransform]);

  useEffect(() => { draw(); }, [draw]);

  const getEventPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        if (!t) return null;
        clientX = t.clientX;
        clientY = t.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
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
    if (id) {
      setDragging(id);
      setSelected(id);
    } else {
      setSelected(null);
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
          p.id === dragging
            ? { ...p, x: Math.max(0, Math.min(1, n.x)), y: Math.max(0, Math.min(1, n.y)) }
            : p
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (readonly && e.touches.length < 2) return;
    if (e.touches.length === 2) {
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
            p.id === dragging
              ? { ...p, x: Math.max(0, Math.min(1, n.x)), y: Math.max(0, Math.min(1, n.y)) }
              : p
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
      if (!dragging) {
        const pos = getEventPos(e);
        if (pos) {
          setIsPanning(true);
          panStartRef.current = { x: pos.x, y: pos.y, panX: pan.x, panY: pan.y };
        }
      }
    }
  };

  const hasMedia = !!imageData;
  const cursor = dragging ? 'grabbing' : isPanning ? 'grabbing' : hovering ? 'grab' : readonly ? 'default' : 'crosshair';

  return (
    <div className="w-full select-none">
      <div className="flex items-center gap-2 mb-2 px-1" style={{ display: hasMedia ? undefined : 'none' }}>
        {!readonly && selected && (
          <>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: keyPoints.find((p) => p.id === selected)?.color ?? '#06b6d4' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Arrastrando: <strong style={{ color: 'white' }}>{keyPoints.find((p) => p.id === selected)?.label}</strong>
            </span>
          </>
        )}
        {!readonly && !selected && (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Hacé click y arrastrá los puntos para ajustarlos</span>
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
        ref={containerRef}
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
        {!hasMedia && <div className="absolute inset-0"><MediaUploadArea onFileSelect={onFileSelect} disabled={uploadDisabled || readonly} /></div>}
      </div>
    </div>
  );
}
