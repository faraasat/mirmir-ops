interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isLoading?: boolean;
  isError?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  // Check if the message content indicates an error
  const isErrorMessage = message.content.toLowerCase().includes('sorry') && 
    (message.content.toLowerCase().includes('error') || 
     message.content.toLowerCase().includes("couldn't") ||
     message.content.toLowerCase().includes('failed'));

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-enter`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : isErrorMessage
              ? 'bg-destructive/10 text-foreground border border-destructive/20 rounded-bl-md'
              : 'bg-muted text-foreground rounded-bl-md'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              isErrorMessage ? 'bg-destructive/20' : 'bg-primary/20'
            }`}>
              {isErrorMessage ? (
                <ErrorIcon className="w-3 h-3 text-destructive" />
              ) : (
                <span className="text-primary text-xs font-bold">M</span>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {isErrorMessage ? 'Error' : 'MirmirOps'}
            </span>
          </div>
        )}
        
        <div className="text-sm whitespace-pre-wrap">
          {message.isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner className="w-4 h-4" />
              <span className="animate-pulse">Processing...</span>
            </span>
          ) : (
            formatContent(message.content)
          )}
        </div>
        
        <div className={`text-[10px] mt-1 ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function formatContent(content: string): React.ReactNode {
  // Simple markdown-like formatting
  const parts = content.split(/(`[^`]+`)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-black/10 dark:bg-white/10 px-1 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
