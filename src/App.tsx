import { useState, useCallback, useEffect } from 'react';
import type { ActiveView, BiomechanicsSession, SessionType } from './lib/types';
import { useAthletes } from './hooks/useAthletes';
import { useSessions } from './hooks/useSessions';
import { useSnapshots } from './hooks/useSnapshots';
import { useReferenceRanges } from './hooks/useReferenceRanges';
import { useLanguage } from './hooks/useLanguage';
import { useAuth } from './contexts/AuthContext';
import { LanguageContext } from './lib/LanguageContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MobileTopBar from './components/layout/MobileTopBar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import LandingPage from './components/auth/LandingPage';
import Dashboard from './components/views/Dashboard';
import SessionsView from './components/views/SessionsView';
import AthletesView from './components/views/AthletesView';
import ReferencesView from './components/views/ReferencesView';
import SettingsView from './components/views/SettingsView';
import CyclingAnalysis from './components/cycling/CyclingAnalysis';
import RunningAnalysis from './components/running/RunningAnalysis';
import SwimmingAnalysis from './components/swimming/SwimmingAnalysis';
import WeightliftingAnalysis from './components/weightlifting/WeightliftingAnalysis';
import CustomAnalysis from './components/custom/CustomAnalysis';
import AerodynamicsAnalysis from './components/aerodynamics/AerodynamicsAnalysis';
import NewSessionModal from './components/shared/NewSessionModal';
import AthleteModal from './components/shared/AthleteModal';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [showNewSession, setShowNewSession] = useState(false);
  const [showNewAthlete, setShowNewAthlete] = useState(false);
  const [defaultSessionType, setDefaultSessionType] = useState<SessionType>('cycling');
  const [activeCyclingSession, setActiveCyclingSession] = useState<BiomechanicsSession | null>(null);
  const [activeRunningSession, setActiveRunningSession] = useState<BiomechanicsSession | null>(null);
  const [activeSwimmingSession, setActiveSwimmingSession] = useState<BiomechanicsSession | null>(null);
  const [activeWeightliftingSession, setActiveWeightliftingSession] = useState<BiomechanicsSession | null>(null);
  const [activeCustomSession, setActiveCustomSession] = useState<BiomechanicsSession | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('biomechanic_dark');
      if (stored !== null) return stored !== 'false';
    } catch { /* ignore */ }
    return true;
  });

  const toggleDark = () => setDarkMode((v) => {
    const next = !v;
    try { localStorage.setItem('biomechanic_dark', String(next)); } catch { /* ignore */ }
    return next;
  });

  useEffect(() => {
    document.documentElement.style.backgroundColor = darkMode ? '#0a0f1a' : '#f5f3f0';
    document.body.style.backgroundColor = darkMode ? '#0a0f1a' : '#f5f3f0';
    document.body.style.color = darkMode ? '#e2e8f0' : '#1f2937';
  }, [darkMode]);

  const { language, setLanguage, t } = useLanguage();
  const { user, loading: authLoading, logout: signOut, login, loginWithCredentials } = useAuth();

  const { athletes, createAthlete, updateAthlete, deleteAthlete } = useAthletes();
  const { sessions, createSession, deleteSession, fetchSessions } = useSessions();
  const { ranges, createRange, updateRange, deleteRange } = useReferenceRanges();

  const activeSession =
    activeView === 'cycling-analysis'
      ? activeCyclingSession
      : activeView === 'running-analysis'
      ? activeRunningSession
      : activeView === 'swimming-analysis'
      ? activeSwimmingSession
      : activeView === 'weightlifting-analysis'
      ? activeWeightliftingSession
      : activeCustomSession;

  const { snapshots, saveSnapshot } = useSnapshots(activeSession?.id);

  const handleNewSession = useCallback(
    (type?: SessionType) => {
      setDefaultSessionType(type ?? 'cycling');
      setShowNewSession(true);
    },
    []
  );

  const handleCreateSession = useCallback(
    async (params: Parameters<typeof createSession>[0]) => {
      const session = await createSession(params);
      await fetchSessions();
      if (params.session_type === 'cycling') {
        setActiveCyclingSession(session);
        setActiveView('cycling-analysis');
      } else if (params.session_type === 'running') {
        setActiveRunningSession(session);
        setActiveView('running-analysis');
      } else if (params.session_type === 'swimming') {
        setActiveSwimmingSession(session);
        setActiveView('swimming-analysis');
      } else if (params.session_type === 'weightlifting') {
        setActiveWeightliftingSession(session);
        setActiveView('weightlifting-analysis');
      } else {
        setActiveCustomSession(session);
        setActiveView('custom-analysis');
      }
    },
    [createSession, fetchSessions]
  );

  const handleViewChange = useCallback(
    (view: ActiveView, session?: BiomechanicsSession) => {
      setActiveView(view);
      if (view === 'cycling-analysis') {
        setActiveCyclingSession(session ?? null);
      } else if (view === 'running-analysis') {
        setActiveRunningSession(session ?? null);
      } else if (view === 'swimming-analysis') {
        setActiveSwimmingSession(session ?? null);
      } else if (view === 'weightlifting-analysis') {
        setActiveWeightliftingSession(session ?? null);
      } else if (view === 'custom-analysis') {
        setActiveCustomSession(session ?? null);
      }
    },
    []
  );

  const handleSelectCyclingSession = useCallback((session: BiomechanicsSession) => {
    setActiveCyclingSession(session?.id ? session : null);
  }, []);

  const handleSelectRunningSession = useCallback((session: BiomechanicsSession) => {
    setActiveRunningSession(session?.id ? session : null);
  }, []);

  const handleSelectSwimmingSession = useCallback((session: BiomechanicsSession) => {
    setActiveSwimmingSession(session?.id ? session : null);
  }, []);

  const handleSelectWeightliftingSession = useCallback((session: BiomechanicsSession) => {
    setActiveWeightliftingSession(session?.id ? session : null);
  }, []);

  const handleSelectCustomSession = useCallback((session: BiomechanicsSession) => {
    setActiveCustomSession(session?.id ? session : null);
  }, []);

  const getViewInfo = () => {
    switch (activeView) {
      case 'dashboard': return t.views.dashboard;
      case 'cycling-analysis': return t.views.cycling;
      case 'running-analysis': return t.views.running;
      case 'swimming-analysis': return t.views.swimming;
      case 'weightlifting-analysis': return t.views.weightlifting;
      case 'custom-analysis': return t.views.custom;
      case 'aerodynamics': return t.views.aerodynamics;
      case 'sessions': return t.views.sessions;
      case 'athletes': return t.views.athletes;
      case 'references': return t.views.references;
      case 'settings': return t.views.settings;
      default: return { title: '', subtitle: '' };
    }
  };

  const viewInfo = getViewInfo();

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            sessions={sessions}
            athletes={athletes}
            onViewChange={handleViewChange}
            onNewSession={() => handleNewSession()}
          />
        );
      case 'cycling-analysis':
        return (
          <CyclingAnalysis
            sessions={sessions}
            snapshots={snapshots}
            references={ranges}
            athletes={athletes}
            onNewSession={() => handleNewSession('cycling')}
            onSaveSnapshot={saveSnapshot}
            onSelectSession={handleSelectCyclingSession}
            activeSession={activeCyclingSession}
          />
        );
      case 'running-analysis':
        return (
          <RunningAnalysis
            sessions={sessions}
            snapshots={snapshots}
            references={ranges}
            athletes={athletes}
            onNewSession={() => handleNewSession('running')}
            onSaveSnapshot={saveSnapshot}
            onSelectSession={handleSelectRunningSession}
            activeSession={activeRunningSession}
          />
        );
      case 'swimming-analysis':
        return (
          <SwimmingAnalysis
            sessions={sessions}
            snapshots={snapshots}
            references={ranges}
            athletes={athletes}
            onNewSession={() => handleNewSession('swimming')}
            onSaveSnapshot={saveSnapshot}
            onSelectSession={handleSelectSwimmingSession}
            activeSession={activeSwimmingSession}
          />
        );
      case 'weightlifting-analysis':
        return (
          <WeightliftingAnalysis
            sessions={sessions}
            snapshots={snapshots}
            references={ranges}
            athletes={athletes}
            onNewSession={() => handleNewSession('weightlifting')}
            onSaveSnapshot={saveSnapshot}
            onSelectSession={handleSelectWeightliftingSession}
            activeSession={activeWeightliftingSession}
          />
        );
      case 'custom-analysis':
        return (
          <CustomAnalysis
            sessions={sessions}
            snapshots={snapshots}
            onNewSession={() => handleNewSession('custom')}
            onSaveSnapshot={saveSnapshot}
            onSelectSession={handleSelectCustomSession}
            activeSession={activeCustomSession}
          />
        );
      case 'aerodynamics':
        return <AerodynamicsAnalysis athletes={athletes} />;
      case 'sessions':
        return (
          <SessionsView
            sessions={sessions}
            athletes={athletes}
            onDelete={deleteSession}
            onNewSession={() => handleNewSession()}
            onViewChange={handleViewChange}
          />
        );
      case 'athletes':
        return (
          <AthletesView
            athletes={athletes}
            onCreate={createAthlete}
            onUpdate={updateAthlete}
            onDelete={deleteAthlete}
          />
        );
      case 'references':
        return (
          <ReferencesView
            ranges={ranges}
            onCreate={createRange}
            onUpdate={updateRange}
            onDelete={deleteRange}
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  const bg = darkMode ? '#0a0f1a' : '#f5f3f0';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fdda36', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t, darkMode, onToggleDark: toggleDark }}>
        <LandingPage darkMode={darkMode} onToggleDark={toggleDark} onLogin={login} onLoginWithCredentials={loginWithCredentials} />
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, darkMode, onToggleDark: toggleDark }}>
      <div className={darkMode ? 'dark' : ''} style={{ colorScheme: darkMode ? 'dark' : 'light' }}>
        <div className="flex h-screen overflow-hidden" style={{ background: bg }}>
          <Sidebar
            activeView={activeView}
            onViewChange={setActiveView}
            darkMode={darkMode}
            onToggleDark={toggleDark}
            user={user}
            onSignOut={signOut}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <MobileTopBar
              title={viewInfo.title}
              subtitle={viewInfo.subtitle}
              darkMode={darkMode}
              onToggleDark={toggleDark}
              onSignOut={signOut}
              user={user}
            />

            <Header
              title={viewInfo.title}
              subtitle={viewInfo.subtitle}
              darkMode={darkMode}
              onNewSession={
                ['cycling-analysis', 'running-analysis', 'swimming-analysis', 'weightlifting-analysis', 'custom-analysis', 'sessions', 'dashboard'].includes(activeView)
                  ? () => handleNewSession(
                      activeView === 'running-analysis' ? 'running'
                      : activeView === 'swimming-analysis' ? 'swimming'
                      : activeView === 'weightlifting-analysis' ? 'weightlifting'
                      : activeView === 'custom-analysis' ? 'custom'
                      : 'cycling'
                    )
                  : undefined
              }
            />

            <main className="flex-1 overflow-y-auto p-5 pt-20 pb-24 lg:pt-5 lg:pb-5">
              <div className="max-w-7xl mx-auto">
                {renderView()}
              </div>
            </main>
          </div>

          <MobileBottomNav activeView={activeView} onViewChange={setActiveView} />

          {showNewSession && (
            <NewSessionModal
              athletes={athletes}
              defaultType={defaultSessionType}
              onSave={handleCreateSession}
              onClose={() => setShowNewSession(false)}
              onCreateAthlete={() => { setShowNewSession(false); setShowNewAthlete(true); }}
            />
          )}

          {showNewAthlete && (
            <AthleteModal
              onSave={async (data) => {
                await createAthlete(data);
                setShowNewAthlete(false);
                setShowNewSession(true);
              }}
              onClose={() => setShowNewAthlete(false)}
            />
          )}
        </div>
      </div>
    </LanguageContext.Provider>
  );
}
