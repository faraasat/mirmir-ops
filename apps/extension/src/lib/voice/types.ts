// Voice System Types

export interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives: Array<{ transcript: string; confidence: number }>;
}

export interface VoiceSynthesisConfig {
  voice?: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
  language: string;
}

export interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  isSpeaking: boolean;
  error: string | null;
  transcript: string;
  interimTranscript: string;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  language: 'en-US',
  continuous: false,
  interimResults: true,
  maxAlternatives: 3,
};

export const DEFAULT_SYNTHESIS_CONFIG: VoiceSynthesisConfig = {
  voice: null,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  language: 'en-US',
};
