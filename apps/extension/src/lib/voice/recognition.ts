// Voice Recognition using Web Speech API

import type { VoiceConfig, VoiceRecognitionResult } from './types';
import { DEFAULT_VOICE_CONFIG } from './types';

// Type augmentation for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

type SpeechRecognitionType = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
};

// Get SpeechRecognition constructor
function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null;
  
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionType;
    webkitSpeechRecognition?: SpeechRecognitionType;
  };
  
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface VoiceRecognitionCallbacks {
  onResult?: (result: VoiceRecognitionResult) => void;
  onInterimResult?: (transcript: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export class VoiceRecognition {
  private recognition: InstanceType<SpeechRecognitionType> | null = null;
  private config: VoiceConfig;
  private callbacks: VoiceRecognitionCallbacks = {};
  private isListening: boolean = false;
  private restartOnEnd: boolean = false;

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };
    this.initialize();
  }

  private initialize(): void {
    const SpeechRecognition = getSpeechRecognition();
    
    if (!SpeechRecognition) {
      console.warn('[Voice] Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd?.();
      
      // Restart if continuous mode and not explicitly stopped
      if (this.restartOnEnd && this.config.continuous) {
        this.start();
      }
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          // Build alternatives array
          const alternatives: Array<{ transcript: string; confidence: number }> = [];
          for (let j = 0; j < result.length; j++) {
            alternatives.push({
              transcript: result[j].transcript,
              confidence: result[j].confidence,
            });
          }

          this.callbacks.onResult?.({
            transcript,
            confidence,
            isFinal: true,
            alternatives,
          });
        } else {
          this.callbacks.onInterimResult?.(transcript);
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const error = this.getErrorMessage(event.error);
      this.callbacks.onError?.(error);
      
      // Don't restart on certain errors
      if (['not-allowed', 'service-not-allowed', 'no-speech'].includes(event.error)) {
        this.restartOnEnd = false;
      }
    };

    this.recognition.onspeechstart = () => {
      this.callbacks.onSpeechStart?.();
    };

    this.recognition.onspeechend = () => {
      this.callbacks.onSpeechEnd?.();
    };
  }

  private getErrorMessage(error: string): string {
    switch (error) {
      case 'no-speech':
        return 'No speech detected. Please try again.';
      case 'audio-capture':
        return 'No microphone found. Please check your device.';
      case 'not-allowed':
        return 'Microphone access denied. Please allow access in your browser settings.';
      case 'service-not-allowed':
        return 'Speech recognition service not allowed.';
      case 'aborted':
        return 'Speech recognition was aborted.';
      case 'network':
        return 'Network error occurred. Please check your connection.';
      case 'bad-grammar':
        return 'Speech grammar error.';
      case 'language-not-supported':
        return 'Language not supported.';
      default:
        return `Speech recognition error: ${error}`;
    }
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return getSpeechRecognition() !== null;
  }

  /**
   * Start listening
   */
  start(): void {
    if (!this.recognition) {
      this.callbacks.onError?.('Speech recognition not supported');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.restartOnEnd = this.config.continuous;
    
    try {
      this.recognition.start();
    } catch (error) {
      // Recognition might already be running
      console.warn('[Voice] Start error:', error);
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    this.restartOnEnd = false;
    this.recognition.stop();
  }

  /**
   * Abort listening (immediate stop)
   */
  abort(): void {
    if (!this.recognition) {
      return;
    }

    this.restartOnEnd = false;
    this.recognition.abort();
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: VoiceRecognitionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get available languages
   */
  static getAvailableLanguages(): string[] {
    // Common languages supported by most browsers
    return [
      'en-US', 'en-GB', 'en-AU',
      'es-ES', 'es-MX',
      'fr-FR', 'fr-CA',
      'de-DE',
      'it-IT',
      'pt-BR', 'pt-PT',
      'zh-CN', 'zh-TW',
      'ja-JP',
      'ko-KR',
      'ru-RU',
      'ar-SA',
      'hi-IN',
      'nl-NL',
      'pl-PL',
      'tr-TR',
    ];
  }
}
