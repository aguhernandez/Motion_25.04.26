import { useState, useEffect } from 'react';
import { Key, User, Shield, CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useT } from '../../lib/LanguageContext';
import { supabase } from '../../lib/supabase';
import { getTheme } from '../../lib/theme';

export default function SettingsView() {
  const { profile, user } = useAuth();
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const isAdmin = profile?.role === 'admin';
  const isCoach = profile?.role === 'coach';

  const roleLabel = isAdmin ? 'Administrador' : isCoach ? 'Entrenador' : 'Atleta';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-heading" style={{ color: th.rowText }}>
        Configuracion — {roleLabel}
      </h2>

      <ProfileSection user={user} profile={profile} th={th} />

      {isAdmin && <AdminHubTokenSection th={th} />}

      {(isAdmin || isCoach) && <CoachPreferencesSection th={th} />}

      <GeneralSection th={th} darkMode={darkMode} />
    </div>
  );
}

function ProfileSection({ user, profile, th }: { user: any; profile: any; th: any }) {
  return (
    <div className="rounded-xl p-5" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(253,218,54,0.12)' }}>
          <User className="w-4 h-4" style={{ color: '#fdda36' }} />
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: th.rowText }}>Perfil</h3>
          <p className="text-xs" style={{ color: th.sub }}>Informacion de tu cuenta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoField label="Email" value={user?.email ?? '—'} th={th} />
        <InfoField label="Nombre" value={profile?.full_name ?? user?.name ?? '—'} th={th} />
        <InfoField label="Rol" value={profile?.role ?? user?.role ?? '—'} th={th} />
        <InfoField label="Membership" value={user?.membership_name ?? '—'} th={th} />
      </div>
    </div>
  );
}

function InfoField({ label, value, th }: { label: string; value: string; th: any }) {
  return (
    <div className="rounded-lg p-3" style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}` }}>
      <p className="text-xs font-medium mb-0.5" style={{ color: th.sub }}>{label}</p>
      <p className="text-sm font-medium capitalize" style={{ color: th.rowText }}>{value}</p>
    </div>
  );
}

function AdminHubTokenSection({ th }: { th: any }) {
  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'x_planner_token')
      .maybeSingle();

    if (data?.value) {
      setSavedToken(data.value);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');

    const cleanToken = token.trim();
    const { error } = await supabase
      .from('platform_settings')
      .upsert(
        { key: 'x_planner_token', value: cleanToken, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('[Settings] Save token failed:', error.message);
      setStatus('error');
    } else {
      setSavedToken(token);
      setToken('');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    }
    setSaving(false);
  };

  const maskedDisplay = savedToken
    ? `${savedToken.slice(0, 8)}...${savedToken.slice(-6)}`
    : '';

  return (
    <div className="rounded-xl p-5" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(253,218,54,0.12)' }}>
          <Key className="w-4 h-4" style={{ color: '#fdda36' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm" style={{ color: th.rowText }}>X-Token-Planner (Hub)</h3>
          <p className="text-xs" style={{ color: th.sub }}>Token de conexion con el Hub para sincronizar atletas</p>
        </div>
        <Shield className="w-4 h-4 flex-shrink-0" style={{ color: savedToken ? '#10b981' : '#f59e0b' }} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: th.sub }} />
          <span className="text-sm" style={{ color: th.sub }}>Cargando...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {savedToken && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10b981' }} />
              <span style={{ color: '#10b981' }}>Token configurado: {maskedDisplay}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: th.sub }}>
              {savedToken ? 'Actualizar token' : 'Ingresa el X-Token-Planner del Hub'}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pegar X-Token-Planner del Hub..."
              className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
              style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !token.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#fdda36', color: '#514163' }}
            >
              {saving ? 'Guardando...' : 'Guardar token'}
            </button>

            {status === 'success' && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#10b981' }}>
                <CheckCircle className="w-3.5 h-3.5" /> Guardado correctamente
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#ef4444' }}>
                <AlertCircle className="w-3.5 h-3.5" /> Error al guardar
              </span>
            )}
          </div>

          <p className="text-xs leading-relaxed pt-1" style={{ color: th.sub }}>
            Este token permite que el Planner se comunique con el Hub para sincronizar la lista de atletas del entrenador. Se obtiene desde la configuracion del Hub.
          </p>
        </div>
      )}
    </div>
  );
}

function CoachPreferencesSection({ th }: { th: any }) {
  return (
    <div className="rounded-xl p-5" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(253,218,54,0.12)' }}>
          <Settings className="w-4 h-4" style={{ color: '#fdda36' }} />
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: th.rowText }}>Preferencias de Entrenador</h3>
          <p className="text-xs" style={{ color: th.sub }}>Ajustes de visualizacion y analisis</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}` }}>
          <span className="text-sm" style={{ color: th.rowText }}>Sincronizacion automatica de atletas del Hub</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Activo</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}` }}>
          <span className="text-sm" style={{ color: th.rowText }}>Notificaciones de nuevas sesiones</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(253,218,54,0.1)', color: '#fdda36' }}>Proximamente</span>
        </div>
      </div>
    </div>
  );
}

function GeneralSection({ th, darkMode }: { th: any; darkMode: boolean }) {
  return (
    <div className="rounded-xl p-5" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(253,218,54,0.12)' }}>
          <Settings className="w-4 h-4" style={{ color: '#fdda36' }} />
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: th.rowText }}>General</h3>
          <p className="text-xs" style={{ color: th.sub }}>Preferencias generales de la plataforma</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}` }}>
          <span className="text-sm" style={{ color: th.rowText }}>Tema</span>
          <span className="text-xs font-medium" style={{ color: th.sub }}>{darkMode ? 'Oscuro' : 'Claro'}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}` }}>
          <span className="text-sm" style={{ color: th.rowText }}>Version</span>
          <span className="text-xs font-medium" style={{ color: th.sub }}>Biomechanic v1.0</span>
        </div>
      </div>
    </div>
  );
}
