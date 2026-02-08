import { Component, useEffect, useState } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { useAppStore } from './store/app-store';
import { Header } from './components/common/Header';
import { ModelSelectorBar } from './components/common/ModelSelectorBar';
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

// Error boundary to prevent individual view crashes from killing the whole app
class ViewErrorBoundary extends Component<
  { children: ReactNode; viewName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; viewName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.viewName}] View crashed:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Something went wrong</h3>
          <p className="text-xs text-muted-foreground mb-3 max-w-[250px]">
            {this.state.error?.message || 'An unexpected error occurred in this view.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    const viewName = (currentView as ViewType) || 'chat';
    let viewComponent: ReactNode;
    
    switch (viewName) {
      case 'chat':
        viewComponent = <ChatView />;
        break;
      case 'history':
        viewComponent = <HistoryView />;
        break;
      case 'workflows':
        viewComponent = <WorkflowsView />;
        break;
      case 'settings':
        viewComponent = <SettingsView />;
        break;
      case 'analytics':
        viewComponent = <AnalyticsView />;
        break;
      case 'permissions':
        viewComponent = <PermissionsView />;
        break;
      case 'memory':
        viewComponent = <MemoryView />;
        break;
      case 'account':
        viewComponent = <AuthView />;
        break;
      default:
        viewComponent = <ChatView />;
    }
    
    return (
      <ViewErrorBoundary key={viewName} viewName={viewName}>
        {viewComponent}
      </ViewErrorBoundary>
    );
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
      <ModelSelectorBar />
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
