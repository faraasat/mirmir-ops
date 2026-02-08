// Voice Synthesis Hook - Text-to-speech for agent responses
import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceSynthesis } from '@/lib/voice/synthesis';

interface UseVoiceSynthesisOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useVoiceSynthesis(options: UseVoiceSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  const synthesisRef = useRef<VoiceSynthesis | null>(null);
  
  // Initialize synthesis
  useEffect(() => {
    synthesisRef.current = new VoiceSynthesis({
      rate: options.rate ?? 1.0,
      pitch: options.pitch ?? 1.0,
      volume: options.volume ?? 1.0,
    });
    
    // Set callbacks
    synthesisRef.current.setCallbacks({
      onStart: () => {
        setIsSpeaking(true);
        options.onStart?.();
      },
      onEnd: () => {
        setIsSpeaking(false);
        options.onEnd?.();
      },
      onError: (errorMsg: string) => {
        setIsSpeaking(false);
        options.onError?.(new Error(errorMsg));
      },
    });
    
    setIsSupported(synthesisRef.current.isSupported());
    
    // Load voices asynchronously
    const loadVoices = async () => {
      if (!synthesisRef.current) return;
      
      const availableVoices = await synthesisRef.current.getVoices();
      setVoices(availableVoices);
      
      // Set default voice (prefer English)
      if (!currentVoice && availableVoices.length > 0) {
        const englishVoice = availableVoices.find((v: SpeechSynthesisVoice) => 
          v.lang.startsWith('en') && v.default
        ) || availableVoices.find((v: SpeechSynthesisVoice) => 
          v.lang.startsWith('en')
        ) || availableVoices[0];
        
        setCurrentVoice(englishVoice);
        if (synthesisRef.current && englishVoice) {
          await synthesisRef.current.setVoice(englishVoice.name);
        }
      }
    };
    
    // Voices may load asynchronously
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', () => loadVoices());
      
      return () => {
        synthesisRef.current?.cancel();
      };
    }
  }, [options.rate, options.pitch, options.volume]);
  
  const speak = useCallback((text: string) => {
    if (!synthesisRef.current) return;
    
    // Cancel any ongoing speech
    synthesisRef.current.cancel();
    
    // Speak the new text
    synthesisRef.current.speak(text, true);
  }, []);
  
  const stop = useCallback(() => {
    synthesisRef.current?.cancel();
    setIsSpeaking(false);
  }, []);
  
  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }, []);
  
  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }, []);
  
  const setVoice = useCallback(async (voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice);
    if (synthesisRef.current) {
      await synthesisRef.current.setVoice(voice.name);
    }
  }, []);
  
  const setRate = useCallback((rate: number) => {
    if (synthesisRef.current) {
      synthesisRef.current.updateConfig({ rate });
    }
  }, []);
  
  const setPitch = useCallback((pitch: number) => {
    if (synthesisRef.current) {
      synthesisRef.current.updateConfig({ pitch });
    }
  }, []);
  
  const setVolume = useCallback((volume: number) => {
    if (synthesisRef.current) {
      synthesisRef.current.updateConfig({ volume });
    }
  }, []);
  
  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
    voices,
    currentVoice,
    setVoice,
    setRate,
    setPitch,
    setVolume,
  };
}
