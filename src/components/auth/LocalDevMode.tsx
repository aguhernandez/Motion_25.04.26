import { useState } from 'react';
import { Activity, User, Award, Shield, Sun, Moon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../contexts/AuthContext';

interface LocalDevModeProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onProfileSelected: (profile: Profile) => void;
}

const PROFILES = [
  {
    role: 'athlete' as const,
    label: 'Atleta',
    labelEn: 'Athlete',
    description: 'Ver sesiones y seguimiento de rendimiento',
    descriptionEn: 'View sessions and track performance',
    icon: User,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.25)',
    hoverBg: 'rgba(16,185,129,0.18)',
  },
  {
    role: 'coach' as const,
    label: 'Coach',
    labelEn: 'Coach',
    description: 'Crear y gestionar sesiones de entrenamiento',
    descriptionEn: 'Create and manage training sessions',
    icon: Award,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.25)',
    hoverBg: 'rgba(59,130,246,0.18)',
  },
  {
    role: 'admin' as const,
    label: 'Admin',
    labelEn: 'Admin',
    description: 'Acceso completo a la gestion del sistema',
    descriptionEn: 'Full system management access',
    icon: Shield,
    color: '#fdda36',
    bg: 'rgba(253,218,54,0.1)',
    border: 'rgba(253,218,54,0.25)',
    hoverBg: 'rgba(253,218,54,0.18)',
  },
];

export default function LocalDevMode({ darkMode, onToggleDark, onProfileSelected }: LocalDevModeProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEs] = useState(true);

  const bg = darkMode ? '#0a0f1a' : '#f5f3f0';
  const cardBg = darkMode ? '#1a1528' : '#ffffff';
  const cardBorder = darkMode ? 'rgba(81,65,99,0.35)' : 'rgba(81,65,99,0.12)';
  const titleColor = darkMode ? '#fdda36' : '#514163';
  const subColor = darkMode ? 'rgba(253,218,54,0.5)' : 'rgba(81,65,99,0.45)';
  const textColor = darkMode ? '#e2e8f0' : '#1f2937';
  const labelColor = darkMode ? '#94a3b8' : '#4b5563';
  const controlBg = darkMode ? 'rgba(81,65,99,0.2)' : '#f5f3f0';
  const controlBorder = darkMode ? 'rgba(81,65,99,0.35)' : 'rgba(81,65,99,0.12)';
  const noteBg = darkMode ? 'rgba(253,218,54,0.06)' : 'rgba(253,218,54,0.08)';
  const noteBorder = darkMode ? 'rgba(253,218,54,0.2)' : 'rgba(253,218,54,0.3)';
  const dotColor = darkMode ? 'rgba(253,218,54,0.06)' : 'rgba(81,65,99,0.04)';
  const errorBg = darkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2';
  const errorBorder = darkMode ? 'rgba(239,68,68,0.3)' : '#fecaca';

  const handleSelect = async (role: 'athlete' | 'coach' | 'admin') => {
    setLoading(role);
    setError(null);
    try {
      const devEmail = `dev-${role}@local.dev`;
      const devName = role === 'athlete' ? 'Test Athlete' : role === 'coach' ? 'Test Coach' : 'Test Admin';

      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', devEmail)
        .maybeSingle();

      if (existing) {
        onProfileSelected(existing as Profile);
        return;
      }

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert({
          hub_user_id: `dev-${role}-local`,
          email: devEmail,
          full_name: devName,
          role,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      onProfileSelected(created as Profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear perfil de desarrollo');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: bg }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <button
        onClick={onToggleDark}
        className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all z-10"
        style={{ background: controlBg, border: `1px solid ${controlBorder}`, color: labelColor }}
        onMouseEnter={(e) => { e.currentTarget.style.color = titleColor; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = labelColor; }}
      >
        {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      </button>

      <div
        className="relative w-full max-w-xl rounded-2xl border p-8"
        style={{
          background: cardBg,
          borderColor: cardBorder,
          boxShadow: darkMode ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(81,65,99,0.08)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f9a825 100%)' }}
          >
            <Activity className="w-7 h-7" style={{ color: '#514163' }} />
          </div>
          <h1 className="font-heading text-base tracking-widest" style={{ color: titleColor }}>
            BIOMECHANIC LAB
          </h1>
          <p className="text-xs mt-0.5 mb-3" style={{ color: subColor }}>
            Asciende Ecosystem
          </p>
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold font-body"
            style={{ background: noteBg, border: `1px solid ${noteBorder}`, color: titleColor }}
          >
            {isEs ? 'Modo Desarrollo Local' : 'Local Development Mode'}
          </div>
        </div>

        <h2 className="text-base font-semibold font-heading mb-1 text-center" style={{ color: textColor }}>
          {isEs ? 'Selecciona un perfil de prueba' : 'Select a test profile'}
        </h2>
        <p className="text-xs text-center mb-6" style={{ color: labelColor }}>
          {isEs
            ? 'Sin conexion al HUB. Los perfiles se crean o reutilizan automaticamente.'
            : 'No HUB connection. Profiles are created or reused automatically.'}
        </p>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm border"
            style={{ background: errorBg, borderColor: errorBorder, color: '#ef4444' }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          {PROFILES.map((p) => {
            const Icon = p.icon;
            const isLoading = loading === p.role;
            return (
              <button
                key={p.role}
                onClick={() => handleSelect(p.role)}
                disabled={!!loading}
                className="flex flex-col items-center gap-2.5 py-5 px-3 rounded-xl border transition-all duration-150 font-body"
                style={{
                  background: p.bg,
                  borderColor: p.border,
                  opacity: loading && !isLoading ? 0.45 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = p.hoverBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = p.bg; }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: p.color + '22', border: `1.5px solid ${p.border}` }}
                >
                  {isLoading ? (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: p.color, borderTopColor: 'transparent' }}
                    />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: p.color }} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-center" style={{ color: p.color }}>
                    {isEs ? p.label : p.labelEn}
                  </div>
                  <div className="text-xs text-center mt-0.5 leading-tight" style={{ color: labelColor }}>
                    {isEs ? p.description : p.descriptionEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="px-4 py-3 rounded-xl text-xs"
          style={{ background: noteBg, border: `1px solid ${noteBorder}`, color: labelColor }}
        >
          <span style={{ color: titleColor, fontWeight: 600 }}>
            {isEs ? 'Nota: ' : 'Note: '}
          </span>
          {isEs
            ? 'Este modo es solo para desarrollo local. En produccion, la autenticacion la maneja el HUB. Puedes cambiar de modo desde el sidebar.'
            : 'This mode is for local development only. In production, authentication is handled by the HUB. You can switch modes from the sidebar.'}
        </div>
      </div>
    </div>
  );
}
