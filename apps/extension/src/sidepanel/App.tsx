import { useEffect } from 'react';
import { useAppStore } from './store/app-store';
import { Header } from './components/common/Header';
import { ChatView } from './components/Chat/ChatView';
import { HistoryView } from './components/History/HistoryView';
import { WorkflowsView } from './components/Workflows/WorkflowsView';
import { SettingsView } from './components/Settings/SettingsView';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { PermissionsView } from './components/Permissions/PermissionsView';

type ViewType = 'chat' | 'history' | 'workflows' | 'settings' | 'analytics' | 'permissions';

export function App() {
  const { currentView, theme, initializeApp } = useAppStore();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

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
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
}
