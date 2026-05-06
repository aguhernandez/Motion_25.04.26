import { useRef, useEffect, useState, useCallback } from 'react';
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
}

const POINT_RADIUS = 10;
const HIT_RADIUS = 24;

export default function AngleCanvas({
  imageData,
  keyPoints,
  angles,
  connections,
  onPointsChange,
  showAngles = true,
  showLabels = true,
  readonly = false,
}: AngleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 338 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovering, setHovering] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

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
    (cx: number, cy: number) => {
      if (canvasSize.w === 0 || canvasSize.h === 0) return { x: 0, y: 0 };
      return { x: cx / canvasSize.w, y: cy / canvasSize.h };
    },
    [canvasSize]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    if (imageRef.current && imageLoaded) {
      ctx.drawImage(imageRef.current, 0, 0, canvasSize.w, canvasSize.h);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
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
      ctx.fillText('Cargá una imagen o capturá desde cámara', canvasSize.w / 2, canvasSize.h / 2);
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
      ctx.lineJoin = 'round';
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
        const label = `${angle.value_deg}°`;

        ctx.save();
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
        ctx.restore();
      }
    }

    for (const point of keyPoints) {
      const { x, y } = toCanvas(point.x, point.y);
      const isDragging = dragging === point.id;
      const isHovering = hovering === point.id;
      const isSelected = selected === point.id;
      const color = point.color ?? '#06b6d4';
      const active = isDragging || isSelected;

      ctx.save();

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
  }, [keyPoints, angles, connections, canvasSize, imageLoaded, showAngles, showLabels, dragging, hovering, selected, toCanvas]);

  useEffect(() => { draw(); }, [draw]);

  const getEventPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
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
        p.id === dragging
          ? { ...p, x: Math.max(0, Math.min(1, n.x)), y: Math.max(0, Math.min(1, n.y)) }
          : p
      )
    );
  };

  const cursor = dragging ? 'grabbing' : hovering ? 'grab' : readonly ? 'default' : 'crosshair';

  return (
    <div ref={containerRef} className="w-full select-none">
      {!readonly && selected && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: keyPoints.find((p) => p.id === selected)?.color ?? '#06b6d4' }}
          />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Arrastrando: <strong style={{ color: 'white' }}>{keyPoints.find((p) => p.id === selected)?.label}</strong>
          </span>
          <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Soltá para confirmar
          </span>
        </div>
      )}
      {!readonly && !selected && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Hacé click y arrastrá los puntos para ajustarlos
          </span>
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
}
