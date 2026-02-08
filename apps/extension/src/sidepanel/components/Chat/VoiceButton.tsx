import { useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/app-store';
import { useVoice } from '../../hooks/useVoice';

interface VoiceButtonProps {
  onVoiceCommand?: (transcript: string) => void;
  autoSubmit?: boolean;
}

export function VoiceButton({ onVoiceCommand, autoSubmit = true }: VoiceButtonProps) {
  const { setInputText, settings, setVoiceActive } = useAppStore();
  
  const handleFinalTranscript = useCallback((transcript: string) => {
    setInputText(transcript);
    
    // Auto-submit to agent if enabled
    if (autoSubmit && onVoiceCommand && transcript.trim()) {
      // Small delay to show the transcript before submitting
      setTimeout(() => {
        onVoiceCommand(transcript);
        setInputText(''); // Clear input after submit
      }, 300);
    }
  }, [autoSubmit, onVoiceCommand, setInputText]);
  
  const {
    isListening,
    isSupported,
    interimTranscript,
    error,
    toggleListening,
  } = useVoice({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        handleFinalTranscript(transcript);
      }
    },
    onError: (err) => {
      console.error('[Voice] Error:', err);
    },
  });

  // Sync listening state with app store
  useEffect(() => {
    setVoiceActive(isListening);
  }, [isListening, setVoiceActive]);

  // Update input with interim results
  useEffect(() => {
    if (interimTranscript) {
      setInputText(interimTranscript);
    }
  }, [interimTranscript, setInputText]);

  if (!settings.voiceEnabled || !isSupported) {
    return null;
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={toggleListening}
        className={`btn-icon shrink-0 ${
          isListening
            ? 'bg-red-500 text-white voice-active'
            : 'bg-muted hover:bg-muted/80'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        <MicrophoneIcon className="w-5 h-5" />
      </button>
      
      {/* Listening indicator */}
      {isListening && (
        <span className="absolute -top-1 -right-1 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}
      
      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

