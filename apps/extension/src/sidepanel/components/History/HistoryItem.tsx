import { useState } from 'react';
import type { HistoryEntry } from '@/lib/history';

interface HistoryItemProps {
  entry: HistoryEntry;
}

export function HistoryItem({ entry }: HistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = () => {
    switch (entry.type) {
      case 'command':
        return <CommandIcon className="w-4 h-4" />;
      case 'action':
        return <ActionIcon className="w-4 h-4" />;
      case 'response':
        return <ResponseIcon className="w-4 h-4" />;
      case 'error':
        return <ErrorIcon className="w-4 h-4 text-red-500" />;
      case 'navigation':
        return <NavigationIcon className="w-4 h-4" />;
      case 'workflow':
        return <WorkflowIcon className="w-4 h-4" />;
      default:
        return <CommandIcon className="w-4 h-4" />;
    }
  };

  const getTitle = () => {
    if (entry.command?.input) {
      return entry.command.input.slice(0, 50) + (entry.command.input.length > 50 ? '...' : '');
    }
    if (entry.action) {
      return `${entry.action.type}: ${entry.action.target || 'page'}`;
    }
    if (entry.llm?.response) {
      return entry.llm.response.slice(0, 50) + '...';
    }
    if (entry.context?.title) {
      return entry.context.title;
    }
    return entry.type;
  };

  const getStatus = () => {
    if (entry.result) {
      return entry.result.success ? (
        <span className="text-green-500 text-xs">Success</span>
      ) : (
        <span className="text-red-500 text-xs">Failed</span>
      );
    }
    return null;
  };

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="mt-0.5 text-muted-foreground">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{getTitle()}</span>
            {getStatus()}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {entry.context?.url && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {new URL(entry.context.url).hostname}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(entry.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        <ChevronIcon
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 pt-0 bg-muted/30">
          <div className="text-xs space-y-2">
            {entry.command?.input && (
              <div>
                <span className="font-medium text-muted-foreground">Input:</span>
                <p className="mt-1 text-foreground">{entry.command.input}</p>
              </div>
            )}
            {entry.action && (
              <div>
                <span className="font-medium text-muted-foreground">Action:</span>
                <pre className="mt-1 text-foreground bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(entry.action, null, 2)}
                </pre>
              </div>
            )}
            {entry.result && (
              <div>
                <span className="font-medium text-muted-foreground">Result:</span>
                <pre className="mt-1 text-foreground bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(entry.result, null, 2)}
                </pre>
              </div>
            )}
            {entry.llm && (
              <div>
                <span className="font-medium text-muted-foreground">LLM ({entry.llm.provider}):</span>
                <p className="mt-1 text-foreground">{entry.llm.response}</p>
                {entry.llm.promptTokens && (
                  <span className="text-muted-foreground">
                    Tokens: {entry.llm.promptTokens} + {entry.llm.completionTokens}
                  </span>
                )}
              </div>
            )}
            {entry.result?.error && (
              <div>
                <span className="font-medium text-red-500">Error:</span>
                <p className="mt-1 text-red-500">{entry.result.error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CommandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ActionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ResponseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function NavigationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function WorkflowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
