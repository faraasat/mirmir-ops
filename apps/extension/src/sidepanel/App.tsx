import { useEffect, useState } from 'react';
import { useAppStore } from './store/app-store';
import { Header } from './components/common/Header';
import { ChatView } from './components/Chat/ChatView';
import { HistoryView } from './components/History/HistoryView';
import { WorkflowsView } from './components/Workflows/WorkflowsView';
import { SettingsView } from './components/Settings/SettingsView';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { PermissionsView } from './components/Permissions/PermissionsView';
import { MemoryView } from './components/Memory/MemoryView';
import { AuthView } from './components/Auth/AuthView';
import { WelcomeScreen, useWelcomeScreen } from './components/Welcome/WelcomeScreen';
import { OnboardingOverlay } from './components/Onboarding/OnboardingOverlay';
import { initializeThemeManager } from '@/lib/themes';

type ViewType = 'chat' | 'history' | 'workflows' | 'settings' | 'analytics' | 'permissions' | 'memory' | 'account';

export function App() {
  const { currentView, initializeApp } = useAppStore();
  const { showWelcome, setShowWelcome, isChecking } = useWelcomeScreen();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    initializeApp();
    // Initialize theme manager to apply saved theme settings
    initializeThemeManager();
  }, [initializeApp]);

  const renderView = () => {
    switch (currentView as ViewType) {
      case 'chat':
        return <ChatView />;
      case 'history':
        return <HistoryView />;
      case 'workflows':
        return <WorkflowsView />;
      case 'settings':
        return <SettingsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'permissions':
        return <PermissionsView />;
      case 'memory':
        return <MemoryView />;
      case 'account':
        return <AuthView />;
      default:
        return <ChatView />;
    }
  };

  // Show loading state while checking welcome status
  if (isChecking) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">M</span>
        </div>
      </div>
    );
  }

  // Show welcome screen for first-time users
  if (showWelcome) {
    return (
      <WelcomeScreen 
        onComplete={() => setShowWelcome(false)}
        onStartTour={() => {
          setShowWelcome(false);
          setShowTour(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>
      
      {/* Onboarding tour overlay */}
      {showTour && (
        <OnboardingOverlay onComplete={() => setShowTour(false)} />
      )}
    </div>
  );
}
