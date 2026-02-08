import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/app-store';
import { useLLM } from '../../hooks/useLLM';
import { useVoiceSynthesis } from '../../hooks/useVoiceSynthesis';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { VoiceButton } from './VoiceButton';
import { WebLLMStatus } from './WebLLMStatus';
import { createContextualPrompt } from '@/lib/llm/prompts';

export function ChatView() {
  const { messages, isLoading, settings, addMessage, updateMessage, setLoading } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const lastSpokenMessageRef = useRef<string | null>(null);
  
  // Voice synthesis for responses
  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceSynthesis();

  const { stream, webllmStatus, loadWebLLM, isStreaming } = useLLM({
    onStream: (content) => {
      if (streamingMessageIdRef.current) {
        updateMessage(streamingMessageIdRef.current, { content, isLoading: false });
      }
    },
    onComplete: (finalContent) => {
      // Speak the response if voice feedback is enabled
      if (settings.voiceFeedbackEnabled && finalContent && streamingMessageIdRef.current) {
        // Avoid speaking the same message twice
        if (lastSpokenMessageRef.current !== streamingMessageIdRef.current) {
          lastSpokenMessageRef.current = streamingMessageIdRef.current;
          // Truncate for TTS if too long
          const textToSpeak = finalContent.length > 500 
            ? finalContent.substring(0, 500) + '...' 
            : finalContent;
          speak(textToSpeak);
        }
      }
    },
    onError: (error) => {
      if (streamingMessageIdRef.current) {
        const errorMessage = `Sorry, I encountered an error: ${error.message}`;
        updateMessage(streamingMessageIdRef.current, {
          content: errorMessage,
          isLoading: false,
        });
        // Speak error if voice feedback enabled
        if (settings.voiceFeedbackEnabled) {
          speak(errorMessage);
        }
      }
      streamingMessageIdRef.current = null;
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      // Add user message
      addMessage({ role: 'user', content: userMessage });
      
      // Create assistant message placeholder for streaming
      const assistantId = `msg_${Date.now()}_assistant`;
      streamingMessageIdRef.current = assistantId;
      
      addMessage({
        role: 'assistant',
        content: '',
        isLoading: true,
      });
      
      // Build messages for LLM
      const systemPrompt = createContextualPrompt({
        url: 'Current page',
        title: 'Browser',
      });

      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages
          .filter(m => m.role !== 'system')
          .slice(-10) // Last 10 messages for context
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: userMessage },
      ];

      setLoading(true);
      
      try {
        await stream(llmMessages, settings.defaultLLMProvider);
      } finally {
        setLoading(false);
        streamingMessageIdRef.current = null;
      }
    },
    [messages, settings.defaultLLMProvider, addMessage, updateMessage, setLoading, stream]
  );

  const handleLoadWebLLM = useCallback(async () => {
    try {
      await loadWebLLM(settings.defaultModel);
    } catch (error) {
      console.error('Failed to load WebLLM:', error);
    }
  }, [loadWebLLM, settings.defaultModel]);

  return (
    <div className="flex flex-col h-full">
      {/* WebLLM Status (only show for webllm provider) */}
      {settings.defaultLLMProvider === 'webllm' && (
        <WebLLMStatus status={webllmStatus} onLoad={handleLoadWebLLM} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {(isLoading || isStreaming) && !messages.some(m => m.isLoading) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-end gap-2">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading || isStreaming} />
          <VoiceButton 
            onVoiceCommand={handleSendMessage} 
            autoSubmit={settings.voiceAutoSubmit !== false} 
          />
          {/* Stop speaking button */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="btn-icon bg-orange-500 text-white hover:bg-orange-600"
              title="Stop speaking"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
