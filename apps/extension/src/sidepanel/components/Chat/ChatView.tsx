import { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../../store/app-store';
import { useLLM } from '../../hooks/useLLM';
import { useVoiceSynthesis } from '../../hooks/useVoiceSynthesis';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { VoiceButton } from './VoiceButton';
import { WebLLMStatus } from './WebLLMStatus';
import { ModelSelector } from './ModelSelector';
import { createContextualPrompt } from '@/lib/llm/prompts';

export function ChatView() {
  const { messages, isLoading, settings, addMessage, updateMessage, setLoading, setView } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const lastSpokenMessageRef = useRef<string | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
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

  // Check if configuration is needed for the selected provider
  const needsConfiguration = (() => {
    const provider = settings.defaultLLMProvider;
    
    if (provider === 'webllm') {
      return !webllmStatus || webllmStatus.status !== 'ready';
    }
    if (provider === 'openai') {
      return !settings.apiKeys?.openai;
    }
    if (provider === 'anthropic') {
      return !settings.apiKeys?.anthropic;
    }
    if (provider === 'ollama') {
      return !settings.apiKeys?.ollama;
    }
    if (provider === 'byok') {
      return !settings.apiKeys?.byokEndpoint || !settings.apiKeys?.byokModel;
    }
    return false;
  })();
  
  const getConfigurationMessage = () => {
    const provider = settings.defaultLLMProvider;
    switch (provider) {
      case 'webllm': return { title: 'AI Model Required', desc: 'Select and download a model to chat' };
      case 'openai': return { title: 'OpenAI API Key Required', desc: 'Enter your API key to use OpenAI' };
      case 'anthropic': return { title: 'Anthropic API Key Required', desc: 'Enter your API key to use Claude' };
      case 'ollama': return { title: 'Ollama Setup Required', desc: 'Configure your Ollama server connection' };
      case 'byok': return { title: 'Custom Provider Setup', desc: 'Configure your API endpoint and model' };
      default: return { title: 'Configuration Required', desc: 'Set up your AI provider' };
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      // Add user message
      addMessage({ role: 'user', content: userMessage });
      
      // Create assistant message placeholder for streaming
      // Note: addMessage returns the actual ID it creates internally
      const assistantMessageId = addMessage({
        role: 'assistant',
        content: '',
        isLoading: true,
      });
      
      // Store the message ID for updating during streaming/error
      streamingMessageIdRef.current = assistantMessageId || `msg_${Date.now()}_assistant`;
      const currentMessageId = streamingMessageIdRef.current;
      
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
      } catch (error) {
        // Handle any uncaught errors
        console.error('[ChatView] Error sending message:', error);
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        updateMessage(currentMessageId, {
          content: `Sorry, I couldn't process your request. ${errorMsg}`,
          isLoading: false,
        });
      } finally {
        setLoading(false);
        // Ensure the loading state is cleared on the message
        // Use the captured ID to avoid race conditions
        const lastMessages = useAppStore.getState().messages;
        const targetMsg = lastMessages.find(m => m.id === currentMessageId);
        if (targetMsg && targetMsg.isLoading) {
          updateMessage(currentMessageId, {
            content: targetMsg.content || 'Sorry, I couldn\'t process your request. Please try again.',
            isLoading: false,
          });
        }
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

  const configMsg = getConfigurationMessage();
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Configuration Banner (show when provider needs setup) */}
      {needsConfiguration && !showModelSelector && (
        <div className="shrink-0 p-3 bg-primary/5 border-b border-primary/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BrainIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{configMsg.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{configMsg.desc}</p>
              </div>
            </div>
            <button
              onClick={() => setShowModelSelector(true)}
              className="shrink-0 btn-primary text-xs py-1.5 px-3 rounded-lg"
            >
              Setup
            </button>
          </div>
        </div>
      )}

      {/* Model/Provider Selector */}
      {showModelSelector && (
        <div className="shrink-0 p-3 border-b border-border">
          <ModelSelector 
            compact
            provider={settings.defaultLLMProvider}
            onModelReady={() => setShowModelSelector(false)}
            onDismiss={() => {
              setShowModelSelector(false);
              setView('settings');
            }}
          />
        </div>
      )}

      {/* WebLLM Status (only show for webllm provider when loading) */}
      {settings.defaultLLMProvider === 'webllm' && webllmStatus && 
        webllmStatus.status !== 'idle' && webllmStatus.status !== 'ready' && (
        <WebLLMStatus status={webllmStatus} onLoad={handleLoadWebLLM} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
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
      <div className="shrink-0 border-t border-border p-3 bg-card">
        <div className="flex items-end gap-2">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading || isStreaming || needsConfiguration} />
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

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
