import type { WebLLMProgress } from '@/lib/llm';

interface WebLLMStatusProps {
  status: WebLLMProgress | null;
  onLoad: () => void;
}

export function WebLLMStatus({ status, onLoad }: WebLLMStatusProps) {
  if (!status || status.status === 'idle') {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 text-xs">
        <span className="text-muted-foreground">WebLLM not loaded</span>
        <button
          onClick={onLoad}
          className="text-primary hover:text-primary/80 font-medium"
        >
          Load Local Model
        </button>
      </div>
    );
  }

  if (status.status === 'loading') {
    return (
      <div className="px-4 py-2 bg-muted/50">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Loading model...</span>
          <span className="text-muted-foreground">{Math.round(status.progress * 100)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${status.progress * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">{status.text}</p>
      </div>
    );
  }

  if (status.status === 'ready') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/30 text-xs">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-green-700 dark:text-green-400">
          Local AI ready
        </span>
      </div>
    );
  }

  if (status.status === 'error') {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-950/30 text-xs">
        <span className="text-red-600 dark:text-red-400 truncate">
          {status.error || 'Failed to load model'}
        </span>
        <button
          onClick={onLoad}
          className="text-red-600 dark:text-red-400 hover:underline font-medium shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
