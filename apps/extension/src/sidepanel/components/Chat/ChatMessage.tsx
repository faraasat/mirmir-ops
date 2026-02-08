import React from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isLoading?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

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
            : 'bg-muted text-foreground rounded-bl-md'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-xs font-bold">M</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">MirmirOps</span>
          </div>
        )}
        
        <div className="text-sm whitespace-pre-wrap">
          {message.isLoading ? (
            <span className="flex items-center gap-2">
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
