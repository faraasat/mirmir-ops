// React hook for voice input and output

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  VoiceRecognition,
  VoiceSynthesis,
  type VoiceConfig,
  type VoiceSynthesisConfig,
  type VoiceRecognitionResult,
} from '@/lib/voice';
import { useAppStore } from '../store/app-store';

export interface UseVoiceOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  autoSubmitOnFinal?: boolean;
}

export interface UseVoiceReturn {
  // State
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  
  // Recognition controls
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  
  // Synthesis controls
  speak: (text: string) => void;
  stopSpeaking: () => void;
  
  // Configuration
  setLanguage: (language: string) => void;
  availableLanguages: string[];
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const { settings } = useAppStore();
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const synthesisRef = useRef<VoiceSynthesis | null>(null);

  // Initialize voice systems
  useEffect(() => {
    recognitionRef.current = new VoiceRecognition({
      language: settings.voiceLanguage,
      continuous: false,
      interimResults: true,
    });

    synthesisRef.current = new VoiceSynthesis({
      language: settings.voiceLanguage,
    });

    // Set up recognition callbacks
    recognitionRef.current.setCallbacks({
      onStart: () => {
        setIsListening(true);
        setError(null);
        setInterimTranscript('');
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
      onResult: (result: VoiceRecognitionResult) => {
        setTranscript(result.transcript);
        setInterimTranscript('');
        options.onTranscript?.(result.transcript, true);
      },
      onInterimResult: (text: string) => {
        setInterimTranscript(text);
        options.onTranscript?.(text, false);
      },
      onError: (err: string) => {
        setError(err);
        setIsListening(false);
        options.onError?.(err);
      },
    });

    // Set up synthesis callbacks
    synthesisRef.current.setCallbacks({
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (err: string) => {
        setError(err);
        setIsSpeaking(false);
      },
    });

    return () => {
      recognitionRef.current?.abort();
      synthesisRef.current?.cancel();
    };
  }, [settings.voiceLanguage, options.onTranscript, options.onError]);

  const isSupported = recognitionRef.current?.isSupported() ?? false;

  const startListening = useCallback(() => {
    if (!settings.voiceEnabled) {
      setError('Voice input is disabled in settings');
      return;
    }
    
    setTranscript('');
    setError(null);
    recognitionRef.current?.start();
  }, [settings.voiceEnabled]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const speak = useCallback((text: string) => {
    synthesisRef.current?.speak(text);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthesisRef.current?.cancel();
  }, []);

  const setLanguage = useCallback((language: string) => {
    recognitionRef.current?.updateConfig({ language });
    synthesisRef.current?.updateConfig({ language });
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    setLanguage,
    availableLanguages: VoiceRecognition.getAvailableLanguages(),
  };
}
