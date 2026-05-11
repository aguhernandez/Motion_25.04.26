import { useState, useEffect, useRef } from 'react';
import {
  Activity, Sun, Moon, Globe, ChevronRight, Play,
  Zap, Target, TrendingUp, RotateCcw, Layers, GitMerge,
  ArrowRight, Circle, Cpu, Radio, Gauge, Scan, Award,
  Bike, PersonStanding, Waves, Dumbbell, Wind, BarChart2,
} from 'lucide-react';
import { useT } from '../../lib/LanguageContext';
import LoginModal from './LoginModal';

interface LandingPageProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onLogin: () => void;
  onLoginWithCredentials: (email: string, password: string) => Promise<{ error?: string }>;
}

// Animated angle lines for hero overlay
function BiomechOverlay({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* skeleton limbs */}
      <line x1="300" y1="80" x2="300" y2="180" stroke="rgba(253,218,54,0.5)" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="300" y1="180" x2="260" y2="260" stroke="rgba(253,218,54,0.5)" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="260" y1="260" x2="245" y2="340" stroke="#fdda36" strokeWidth="2" />
      <line x1="300" y1="180" x2="340" y2="270" stroke="rgba(253,218,54,0.5)" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="340" y1="270" x2="355" y2="340" stroke="#fdda36" strokeWidth="2" />
      {/* arms */}
      <line x1="300" y1="200" x2="220" y2="230" stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" />
      <line x1="220" y1="230" x2="175" y2="215" stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" />
      <line x1="300" y1="200" x2="380" y2="235" stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" />
      <line x1="380" y1="235" x2="425" y2="220" stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" />
      {/* angle arc at knee */}
      <path d="M 252,258 A 20 20 0 0 1 267,248" stroke="#10b981" strokeWidth="2" fill="none" />
      <path d="M 332,268 A 20 20 0 0 0 348,256" stroke="#10b981" strokeWidth="2" fill="none" />
      {/* angle label */}
      <rect x="225" y="270" width="38" height="18" rx="4" fill="rgba(16,185,129,0.18)" />
      <text x="244" y="283" textAnchor="middle" fontSize="10" fill="#10b981" fontFamily="monospace">142°</text>
      <rect x="350" y="278" width="38" height="18" rx="4" fill="rgba(16,185,129,0.18)" />
      <text x="369" y="291" textAnchor="middle" fontSize="10" fill="#10b981" fontFamily="monospace">139°</text>
      {/* joints */}
      {[
        [300, 80], [300, 180], [260, 260], [245, 340],
        [340, 270], [355, 340], [220, 230], [175, 215],
        [380, 235], [425, 220],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="5" fill="#fdda36" fillOpacity="0.9" />
      ))}
      {/* velocity vectors */}
      <line x1="245" y1="340" x2="225" y2="310" stroke="rgba(253,218,54,0.35)" strokeWidth="1" />
      <polygon points="225,310 220,320 230,317" fill="rgba(253,218,54,0.35)" />
      <line x1="355" y1="340" x2="375" y2="315" stroke="rgba(253,218,54,0.35)" strokeWidth="1" />
      <polygon points="375,315 370,325 380,320" fill="rgba(253,218,54,0.35)" />
      {/* ground contact line */}
      <line x1="200" y1="355" x2="410" y2="355" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
    </svg>
  );
}

// Animated metric card
function MetricCard({
  label, value, unit, color, icon: Icon, trend,
}: {
  label: string; value: string; unit: string; color: string; icon: React.ElementType; trend?: string;
}) {
  return (
    <div
      className="relative rounded-2xl p-4 overflow-hidden flex-shrink-0 w-48"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            {trend}
          </span>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold font-mono" style={{ color: '#f1f5f9' }}>{value}</span>
        <span className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{unit}</span>
      </div>
      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}60, transparent)` }} />
    </div>
  );
}

// Module card for Netflix row
function ModuleCard({
  icon: Icon, title, sub, accentColor, tags,
}: {
  icon: React.ElementType; title: string; sub: string; accentColor: string; tags: string[];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex-shrink-0 w-64 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? accentColor + '55' : 'rgba(255,255,255,0.07)'}`,
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'none',
        boxShadow: hovered ? `0 20px 60px ${accentColor}20` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* header gradient */}
      <div className="h-32 flex items-center justify-center relative" style={{ background: `linear-gradient(135deg, ${accentColor}12 0%, rgba(0,0,0,0) 100%)` }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
          <Icon className="w-8 h-8" style={{ color: accentColor }} />
        </div>
        {hovered && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: accentColor }}>
            <Play className="w-3 h-3 text-black ml-0.5" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, rgba(10,15,26,0.8), transparent)' }} />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>{title}</h3>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{sub}</p>
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Ecosystem node
function EcoNode({ label, sub, color, isCenter }: { label: string; sub: string; color: string; isCenter?: boolean }) {
  return (
    <div
      className="flex flex-col items-center gap-2 group"
    >
      <div
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
        style={{
          background: isCenter ? `${color}20` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isCenter ? color + '60' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: isCenter ? `0 0 32px ${color}30` : 'none',
        }}
      >
        <Activity className="w-6 h-6" style={{ color: isCenter ? color : 'rgba(255,255,255,0.5)' }} />
        {isCenter && <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ background: `${color}08` }} />}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold" style={{ color: isCenter ? color : 'rgba(255,255,255,0.7)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
      </div>
    </div>
  );
}

// Interactive particle network canvas for hero background
function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const COUNT = 90;
    const CONNECT_DIST = 140;
    const MOUSE_REPEL = 120;
    const SPEED = 0.35;

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      ox: number; oy: number; // original position
      r: number;
    };

    let W = 0, H = 0;
    const particles: Particle[] = [];

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        particles.push({
          x, y, ox: x, oy: y,
          vx: (Math.random() - 0.5) * SPEED,
          vy: (Math.random() - 0.5) * SPEED,
          r: Math.random() * 1.8 + 0.8,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const mx = mouse.current.x;
      const my = mouse.current.y;

      // Update positions
      for (const p of particles) {
        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x));
        p.y = Math.max(0, Math.min(H, p.y));

        // Mouse attraction/repulsion
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_REPEL && dist > 0) {
          const force = (MOUSE_REPEL - dist) / MOUSE_REPEL;
          // attract gently toward cursor
          p.x += (dx / dist) * force * 1.8;
          p.y += (dy / dist) * force * 1.8;
        }
      }

      // Draw edges
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            // Boost opacity if either particle is near mouse
            const da = Math.sqrt((mx - a.x) ** 2 + (my - a.y) ** 2);
            const db = Math.sqrt((mx - b.x) ** 2 + (my - b.y) ** 2);
            const nearMouse = Math.min(da, db) < MOUSE_REPEL * 1.5;
            const baseAlpha = (1 - d / CONNECT_DIST) * (nearMouse ? 0.55 : 0.12);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = nearMouse
              ? `rgba(253,218,54,${baseAlpha})`
              : `rgba(255,255,255,${baseAlpha})`;
            ctx.lineWidth = nearMouse ? 0.8 : 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const p of particles) {
        const dd = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
        const nearMouse = dd < MOUSE_REPEL * 1.5;
        const alpha = nearMouse ? 0.9 : 0.3;
        const radius = nearMouse ? p.r * 1.8 : p.r;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nearMouse ? `rgba(253,218,54,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => { mouse.current = { x: -9999, y: -9999 }; };

    const ro = new ResizeObserver(() => { resize(); init(); });
    ro.observe(canvas);
    resize();
    init();
    draw();

    canvas.closest('section')?.addEventListener('mousemove', onMouseMove);
    canvas.closest('section')?.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      canvas.closest('section')?.removeEventListener('mousemove', onMouseMove);
      canvas.closest('section')?.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

export default function LandingPage({ darkMode, onToggleDark, onLogin, onLoginWithCredentials }: LandingPageProps) {
  const { language, setLanguage } = useT();
  const isEs = language === 'es';
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);

  const openLogin = () => setShowLoginModal(true);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, e.target.id]));
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('[data-observe]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const isVisible = (id: string) => visibleSections.has(id);

  const modules = [
    { icon: PersonStanding, title: isEs ? 'Running Mechanics' : 'Running Mechanics', sub: isEs ? 'Análisis biomecánico de carrera, cadencia, tipo de pisada y simetría' : 'Running biomechanics, cadence, foot strike and symmetry analysis', accentColor: '#06b6d4', tags: ['Gait', 'Cadence', 'Symmetry'] },
    { icon: Bike, title: isEs ? 'Ciclismo' : 'Cycling', sub: isEs ? 'Bike fitting, ángulos de pedaleo, postura aerodinámica' : 'Bike fitting, pedaling angles, aerodynamic posture', accentColor: '#fdda36', tags: ['Fitting', 'Aero', 'Power'] },
    { icon: Zap, title: isEs ? 'Análisis de Salto' : 'Jump Mechanics', sub: isEs ? 'Altura, tiempo de contacto, absorción de impacto y propulsión' : 'Height, contact time, impact absorption and propulsion', accentColor: '#10b981', tags: ['Force', 'Contact', 'Height'] },
    { icon: Gauge, title: isEs ? 'Técnica de Sprint' : 'Sprint Technique', sub: isEs ? 'Mecánica de aceleración, frecuencia y longitud de zancada' : 'Acceleration mechanics, stride frequency and length', accentColor: '#f59e0b', tags: ['Stride', 'Freq', 'Accel'] },
    { icon: GitMerge, title: isEs ? 'Análisis de Simetría' : 'Asymmetry Analysis', sub: isEs ? 'Detección de desequilibrios bilaterales en carga y movimiento' : 'Detection of bilateral imbalances in load and movement', accentColor: '#ef4444', tags: ['Bilateral', 'Load', 'Risk'] },
    { icon: BarChart2, title: isEs ? 'Eficiencia de Movimiento' : 'Movement Efficiency', sub: isEs ? 'Score de economía de movimiento y optimización del gesto técnico' : 'Movement economy score and technical gesture optimization', accentColor: '#8b5cf6', tags: ['Economy', 'Score', 'Optimize'] },
    { icon: Waves, title: isEs ? 'Natación' : 'Swimming', sub: isEs ? 'Stroke analysis, hidrodinámica y eficiencia de ciclo' : 'Stroke analysis, hydrodynamics and cycle efficiency', accentColor: '#06b6d4', tags: ['Stroke', 'DPS', 'SWOLF'] },
    { icon: Dumbbell, title: isEs ? 'Halterofilia & Fuerza' : 'Weightlifting & Strength', sub: isEs ? 'Técnica de levantamiento, alineación articular y producción de fuerza' : 'Lifting technique, joint alignment and force production', accentColor: '#f97316', tags: ['Technique', 'Alignment', 'Power'] },
  ];

  const metrics = [
    { label: isEs ? 'Cadencia' : 'Cadence', value: '178', unit: 'spm', color: '#06b6d4', icon: Radio, trend: '+3%' },
    { label: isEs ? 'Ángulo rodilla' : 'Knee angle', value: '142', unit: '°', color: '#10b981', icon: Target },
    { label: isEs ? 'Tiempo contacto' : 'Contact time', value: '215', unit: 'ms', color: '#fdda36', icon: Zap, trend: '-12ms' },
    { label: isEs ? 'Simetría' : 'Symmetry', value: '97', unit: '%', color: '#10b981', icon: GitMerge, trend: '+2%' },
    { label: isEs ? 'Eficiencia' : 'Efficiency', value: '91', unit: '%', color: '#f59e0b', icon: Award },
    { label: isEs ? 'Velocidad' : 'Velocity', value: '3.8', unit: 'm/s', color: '#06b6d4', icon: Gauge, trend: '+0.2' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#050c18', color: '#f1f5f9' }}>
      {/* ── NAV ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300"
        style={{
          background: scrollY > 60 ? 'rgba(5,12,24,0.92)' : 'transparent',
          backdropFilter: scrollY > 60 ? 'blur(12px)' : 'none',
          borderBottom: scrollY > 60 ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          <img src="/asciende_the_athletes_support_platform.png" alt="Asciende" className="h-6 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
          <span className="text-xs tracking-widest" style={{ fontFamily: '"Krona One", sans-serif', color: 'rgba(253,218,54,0.7)', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '8px' }}>BIOMECHANIC</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
          >
            <Globe className="w-3.5 h-3.5" />
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={onToggleDark}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={openLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: '#fdda36', color: '#0a0f1a' }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(253,218,54,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            {isEs ? 'Ingresar' : 'Sign in'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(253,218,54,0.06) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(6,182,212,0.04) 0%, transparent 60%)' }} />
        {/* Particle network */}
        <ParticleNetwork />
        {/* Grid overlay on top of particles */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Biomechanics overlay — parallax shift */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[55%] opacity-25 pointer-events-none"
          style={{ transform: `translateY(calc(-50% + ${scrollY * 0.12}px))` }}
        >
          <BiomechOverlay className="w-full h-auto" />
        </div>

        {/* Floating metric cards — right side */}
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 space-y-3 hidden xl:flex flex-col"
          style={{ transform: `translateY(calc(-50% + ${scrollY * 0.05}px))` }}
        >
          {metrics.slice(0, 3).map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8" style={{ background: 'rgba(253,218,54,0.08)', border: '1px solid rgba(253,218,54,0.2)', color: 'rgba(253,218,54,0.8)' }}>
            <Scan className="w-3 h-3" />
            {isEs ? 'Inteligencia de Movimiento' : 'Movement Intelligence'}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-none tracking-tight mb-6">
            <span style={{ color: '#f1f5f9' }}>{isEs ? 'Movimiento' : 'Movement'}</span>
            <br />
            <span style={{ color: '#fdda36' }}>{isEs ? 'Cuantificado' : 'Quantified'}</span>
          </h1>

          <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(241,245,249,0.55)' }}>
            {isEs
              ? 'Sistema de análisis biomecánico de alto rendimiento para corredores, ciclistas y atletas de élite. Precisión científica en cada movimiento.'
              : 'High-performance biomechanical analysis for runners, cyclists and elite athletes. Scientific precision in every movement.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openLogin}
              className="flex items-center gap-2.5 px-7 py-4 rounded-xl font-bold text-base transition-all duration-200"
              style={{ background: '#fdda36', color: '#0a0f1a' }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(253,218,54,0.45)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <Cpu className="w-4 h-4" />
              {isEs ? 'Iniciar análisis' : 'Start analysis'}
            </button>
            <button
              onClick={() => document.getElementById('modules-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2.5 px-7 py-4 rounded-xl font-semibold text-base transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              {isEs ? 'Explorar módulos' : 'Explore modules'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, rgba(253,218,54,0.4), transparent)' }} />
        </div>
      </section>

      {/* ── METRICS STRIP ── */}
      <section className="py-16 relative" id="metrics-strip" data-observe="metrics-strip">
        <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
        <div
          className="relative max-w-7xl mx-auto px-6 transition-all duration-700"
          style={{ opacity: isVisible('metrics-strip') ? 1 : 0, transform: isVisible('metrics-strip') ? 'none' : 'translateY(30px)' }}
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max mx-auto justify-center">
              {metrics.map((m) => <MetricCard key={m.label} {...m} />)}
            </div>
          </div>
          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {isEs ? 'Datos de ejemplo · Sistema en vivo muestra métricas reales de atleta' : 'Sample data · Live system shows real athlete metrics'}
          </p>
        </div>
      </section>

      {/* ── ANALYSIS PREVIEW ── */}
      <section className="py-24 px-6" id="analysis-preview" data-observe="analysis-preview">
        <div className="max-w-7xl mx-auto">
          <div
            className="text-center mb-16 transition-all duration-700"
            style={{ opacity: isVisible('analysis-preview') ? 1 : 0, transform: isVisible('analysis-preview') ? 'none' : 'translateY(30px)' }}
          >
            <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'rgba(253,218,54,0.6)' }}>
              {isEs ? 'ANÁLISIS VISUAL' : 'VISUAL ANALYSIS'}
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold" style={{ color: '#f1f5f9' }}>
              {isEs ? 'Ve el movimiento' : 'See the movement'}
              <br />
              <span style={{ color: '#fdda36' }}>{isEs ? 'con precisión científica' : 'with scientific precision'}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large card left */}
            <div
              className="md:col-span-2 rounded-3xl overflow-hidden relative transition-all duration-700"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                minHeight: '320px',
                opacity: isVisible('analysis-preview') ? 1 : 0,
                transform: isVisible('analysis-preview') ? 'none' : 'translateX(-30px)',
                transitionDelay: '100ms',
              }}
            >
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(6,182,212,0.06) 0%, transparent 60%)' }} />
              <div className="relative p-8 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}>
                    <Scan className="w-5 h-5" style={{ color: '#06b6d4' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: '#f1f5f9' }}>{isEs ? 'Rastreo de puntos clave' : 'Key point tracking'}</h3>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{isEs ? 'Detección en tiempo real' : 'Real-time detection'}</p>
                  </div>
                </div>
                {/* Skeleton viz */}
                <div className="flex-1 flex items-center justify-center relative">
                  <BiomechOverlay className="w-full max-w-sm opacity-90" />
                  {/* Overlaid metric chips */}
                  <div className="absolute top-2 left-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs font-mono" style={{ color: '#10b981' }}>142° · 139°</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(253,218,54,0.08)', border: '1px solid rgba(253,218,54,0.15)' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#fdda36' }} />
                      <span className="text-xs font-mono" style={{ color: '#fdda36' }}>97% {isEs ? 'simetría' : 'symmetry'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column cards */}
            <div className="flex flex-col gap-6">
              {[
                { icon: TrendingUp, title: isEs ? 'Análisis longitudinal' : 'Longitudinal analysis', sub: isEs ? 'Compará sesiones para ver la progresión técnica en el tiempo' : 'Compare sessions to track technical progression over time', color: '#fdda36', delay: '200ms' },
                { icon: RotateCcw, title: isEs ? 'Comparación de snapshots' : 'Snapshot comparison', sub: isEs ? 'Vista lado a lado de dos momentos del movimiento' : 'Side-by-side view of two movement moments', color: '#10b981', delay: '300ms' },
                { icon: Layers, title: isEs ? 'Reporte PDF' : 'PDF Report', sub: isEs ? 'Informe completo con ángulos, métricas y observaciones' : 'Complete report with angles, metrics and observations', color: '#06b6d4', delay: '400ms' },
              ].map(({ icon: Icon, title, sub, color, delay }) => (
                <div
                  key={title}
                  className="rounded-2xl p-5 flex-1 transition-all duration-700"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    opacity: isVisible('analysis-preview') ? 1 : 0,
                    transform: isVisible('analysis-preview') ? 'none' : 'translateX(30px)',
                    transitionDelay: delay,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{title}</h4>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MODULES CAROUSEL ── */}
      <section className="py-24 overflow-hidden" id="modules-section" data-observe="modules-section">
        <div className="relative" style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="py-24 px-6">
            <div
              className="max-w-7xl mx-auto text-center mb-12 transition-all duration-700"
              style={{ opacity: isVisible('modules-section') ? 1 : 0, transform: isVisible('modules-section') ? 'none' : 'translateY(30px)' }}
            >
              <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'rgba(253,218,54,0.6)' }}>
                {isEs ? 'MÓDULOS DE ANÁLISIS' : 'ANALYSIS MODULES'}
              </p>
              <h2 className="text-4xl font-bold" style={{ color: '#f1f5f9' }}>
                {isEs ? 'Cada deporte.' : 'Every sport.'}
                <span style={{ color: '#fdda36' }}> {isEs ? 'Cada movimiento.' : 'Every movement.'}</span>
              </h2>
            </div>

            {/* Scrollable row */}
            <div
              className="transition-all duration-700"
              style={{ opacity: isVisible('modules-section') ? 1 : 0, transitionDelay: '200ms' }}
            >
              <div className="overflow-x-auto pb-6" style={{ scrollbarWidth: 'none' }}>
                <div className="flex gap-5 px-6 min-w-max mx-auto" style={{ maxWidth: 'calc(100vw - 3rem)' }}>
                  {modules.map((m) => (
                    <ModuleCard key={m.title} {...m} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKFLOW PREVIEW ── */}
      <section className="py-24 px-6" id="workflow-section" data-observe="workflow-section">
        <div className="max-w-7xl mx-auto">
          <div
            className="text-center mb-16 transition-all duration-700"
            style={{ opacity: isVisible('workflow-section') ? 1 : 0, transform: isVisible('workflow-section') ? 'none' : 'translateY(30px)' }}
          >
            <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'rgba(253,218,54,0.6)' }}>
              {isEs ? 'FLUJO DE TRABAJO' : 'WORKFLOW'}
            </p>
            <h2 className="text-4xl font-bold" style={{ color: '#f1f5f9' }}>
              {isEs ? 'Del video al insight' : 'From video to insight'}
              <br />
              <span style={{ color: '#fdda36' }}>{isEs ? 'en segundos' : 'in seconds'}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', icon: Play, title: isEs ? 'Cargá el video' : 'Load video', sub: isEs ? 'Video, imagen o cámara en vivo. Cualquier formato deportivo.' : 'Video, image or live camera. Any sports format.', color: '#06b6d4', delay: '0ms' },
              { step: '02', icon: Target, title: isEs ? 'Marcá los puntos' : 'Mark points', sub: isEs ? 'Arrastrá los puntos clave sobre articulaciones y segmentos.' : 'Drag key points onto joints and body segments.', color: '#fdda36', delay: '100ms' },
              { step: '03', icon: Zap, title: isEs ? 'Análisis instantáneo' : 'Instant analysis', sub: isEs ? 'Ángulos, vectores y métricas calculados en tiempo real.' : 'Angles, vectors and metrics calculated in real-time.', color: '#10b981', delay: '200ms' },
              { step: '04', icon: Layers, title: isEs ? 'Reportes & Comparación' : 'Reports & Comparison', sub: isEs ? 'Exportá PDFs, compará sesiones y trackea la progresión.' : 'Export PDFs, compare sessions and track progression.', color: '#f59e0b', delay: '300ms' },
            ].map(({ step, icon: Icon, title, sub, color, delay }) => (
              <div
                key={step}
                className="relative rounded-2xl p-6 transition-all duration-700"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  opacity: isVisible('workflow-section') ? 1 : 0,
                  transform: isVisible('workflow-section') ? 'none' : 'translateY(30px)',
                  transitionDelay: delay,
                }}
              >
                <div className="flex items-start gap-4">
                  <div>
                    <span className="text-xs font-mono font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>{step}</span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mt-2" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold mt-4 mb-2" style={{ color: '#f1f5f9' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM ── */}
      <section className="py-24 px-6" id="ecosystem-section" data-observe="ecosystem-section">
        <div
          className="max-w-5xl mx-auto rounded-3xl p-12 relative overflow-hidden transition-all duration-700"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            opacity: isVisible('ecosystem-section') ? 1 : 0,
            transform: isVisible('ecosystem-section') ? 'none' : 'translateY(30px)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(253,218,54,0.04) 0%, transparent 60%)' }} />
          <div className="relative">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'rgba(253,218,54,0.6)' }}>
                {isEs ? 'ECOSISTEMA' : 'ECOSYSTEM'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#f1f5f9' }}>
                {isEs ? 'Parte del ecosistema' : 'Part of the'}
                <span style={{ color: '#fdda36' }}> Asciende</span>
              </h2>
              <p className="text-sm max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {isEs
                  ? 'Biomechanic se conecta con todos los módulos del sistema de rendimiento Asciende para una visión integrada del atleta.'
                  : 'Biomechanic connects with all Asciende performance system modules for an integrated athlete view.'}
              </p>
            </div>

            {/* Node map */}
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
              <EcoNode label="Lab" sub={isEs ? 'Datos' : 'Data'} color="#06b6d4" />
              <EcoNode label="Endurance" sub={isEs ? 'Carga' : 'Load'} color="#10b981" />
              <EcoNode label="BIOMECHANIC" sub={isEs ? 'Movimiento' : 'Movement'} color="#fdda36" isCenter />
              <EcoNode label="Nutrition" sub={isEs ? 'Nutrición' : 'Nutrition'} color="#f59e0b" />
              <EcoNode label="Academy" sub={isEs ? 'Formación' : 'Training'} color="#ef4444" />
            </div>

            {/* Connection lines (decorative) */}
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              {['API REST', 'WebSocket', isEs ? 'Datos en tiempo real' : 'Real-time data', isEs ? 'Perfil unificado' : 'Unified profile'].map((tag) => (
                <span key={tag} className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-32 px-6" id="cta-section" data-observe="cta-section">
        <div
          className="max-w-3xl mx-auto text-center transition-all duration-700"
          style={{ opacity: isVisible('cta-section') ? 1 : 0, transform: isVisible('cta-section') ? 'none' : 'translateY(40px)' }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8" style={{ background: 'rgba(253,218,54,0.08)', border: '1px solid rgba(253,218,54,0.2)', color: 'rgba(253,218,54,0.8)' }}>
            <Circle className="w-2.5 h-2.5 fill-current" />
            {isEs ? 'Sistema activo' : 'System active'}
          </div>
          <h2 className="text-5xl sm:text-6xl font-bold leading-none mb-6">
            <span style={{ color: '#f1f5f9' }}>{isEs ? 'Analizá.' : 'Analyze.'}</span>{' '}
            <span style={{ color: '#fdda36' }}>{isEs ? 'Optimizá.' : 'Optimize.'}</span>
            <br />
            <span style={{ color: 'rgba(241,245,249,0.5)' }}>{isEs ? 'Superá.' : 'Excel.'}</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: 'rgba(241,245,249,0.45)' }}>
            {isEs
              ? 'Accedé al sistema completo de análisis biomecánico con tu cuenta del Hub.'
              : 'Access the complete biomechanical analysis system with your Hub account.'}
          </p>
          <button
            onClick={openLogin}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200"
            style={{ background: '#fdda36', color: '#0a0f1a' }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(253,218,54,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <Wind className="w-5 h-5" />
            {isEs ? 'Ir al Hub · Iniciar sesión' : 'Go to Hub · Sign in'}
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-5 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            hub.asciende.pro
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/asciende_the_athletes_support_platform.png" alt="Asciende" className="h-4 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.3 }} />
            <span style={{ fontFamily: '"Krona One", sans-serif', color: 'rgba(253,218,54,0.3)', fontSize: '8px', letterSpacing: '0.15em', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '8px' }}>BIOMECHANIC</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {isEs ? '© 2025 Asciende Ecosystem. Sistema de análisis biomecánico.' : '© 2025 Asciende Ecosystem. Biomechanical analysis system.'}
          </p>
        </div>
      </footer>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginWithCredentials={onLoginWithCredentials}
          onLoginWithHub={onLogin}
        />
      )}
    </div>
  );
}


export default LandingPage