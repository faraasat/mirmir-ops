// Voice Synthesis using Web Speech API

import type { VoiceSynthesisConfig } from './types';
import { DEFAULT_SYNTHESIS_CONFIG } from './types';

export interface VoiceSynthesisCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: string) => void;
  onBoundary?: (charIndex: number, name: string) => void;
}

export class VoiceSynthesis {
  private config: VoiceSynthesisConfig;
  private callbacks: VoiceSynthesisCallbacks = {};
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private queue: string[] = [];
  private isSpeaking: boolean = false;

  constructor(config: Partial<VoiceSynthesisConfig> = {}) {
    this.config = { ...DEFAULT_SYNTHESIS_CONFIG, ...config };
  }

  /**
   * Check if speech synthesis is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Speak text
   */
  speak(text: string, immediate: boolean = false): void {
    if (!this.isSupported()) {
      this.callbacks.onError?.('Speech synthesis not supported');
      return;
    }

    if (immediate) {
      this.cancel();
    }

    if (this.isSpeaking && !immediate) {
      this.queue.push(text);
      return;
    }

    this.speakText(text);
  }

  private speakText(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply config
    if (this.config.voice) {
      utterance.voice = this.config.voice;
    }
    utterance.rate = this.config.rate;
    utterance.pitch = this.config.pitch;
    utterance.volume = this.config.volume;
    utterance.lang = this.config.language;

    // Set callbacks
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.callbacks.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.callbacks.onEnd?.();
      
      // Process queue
      if (this.queue.length > 0) {
        const nextText = this.queue.shift()!;
        this.speakText(nextText);
      }
    };

    utterance.onpause = () => {
      this.callbacks.onPause?.();
    };

    utterance.onresume = () => {
      this.callbacks.onResume?.();
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.callbacks.onError?.(event.error);
    };

    utterance.onboundary = (event) => {
      this.callbacks.onBoundary?.(event.charIndex, event.name);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Pause speaking
   */
  pause(): void {
    if (this.isSupported() && this.isSpeaking) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resume speaking
   */
  resume(): void {
    if (this.isSupported()) {
      window.speechSynthesis.resume();
    }
  }

  /**
   * Cancel all speech
   */
  cancel(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.queue = [];
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isSupported()) {
      return [];
    }

    // Voices might not be loaded immediately
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };

      // Timeout fallback
      setTimeout(() => {
        resolve(window.speechSynthesis.getVoices());
      }, 1000);
    });
  }

  /**
   * Get voices for a specific language
   */
  async getVoicesForLanguage(language: string): Promise<SpeechSynthesisVoice[]> {
    const voices = await this.getVoices();
    const langPrefix = language.split('-')[0];
    
    return voices.filter(voice => 
      voice.lang === language || 
      voice.lang.startsWith(langPrefix)
    );
  }

  /**
   * Set the voice
   */
  async setVoice(voiceName: string): Promise<boolean> {
    const voices = await this.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    
    if (voice) {
      this.config.voice = voice;
      return true;
    }
    
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceSynthesisConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: VoiceSynthesisCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get speaking queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}
