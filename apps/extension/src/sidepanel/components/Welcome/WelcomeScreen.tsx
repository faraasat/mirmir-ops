import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/app-store';
import { skipOnboarding, needsOnboarding } from '@/lib/onboarding';
import browser from 'webextension-polyfill';

const WELCOME_SHOWN_KEY = 'mirmir_welcome_shown';

interface WelcomeScreenProps {
  onComplete: () => void;
  onStartTour: () => void;
}

const features = [
  {
    icon: ChatIcon,
    title: 'Natural Language Control',
    description: 'Control your browser with simple text or voice commands',
  },
  {
    icon: BrainIcon,
    title: 'AI-Powered Automation',
    description: 'Local or cloud AI models for intelligent assistance',
  },
  {
    icon: WorkflowIcon,
    title: 'Automated Workflows',
    description: 'Create and schedule complex browser automations',
  },
  {
    icon: VoiceIcon,
    title: 'Voice Commands',
    description: 'Hands-free browsing with speech recognition',
  },
  {
    icon: MemoryIcon,
    title: 'Smart Memory',
    description: 'Learns from your habits for personalized suggestions',
  },
  {
    icon: ShieldIcon,
    title: 'Privacy First',
    description: 'Local processing, encrypted storage, full control',
  },
];

export function WelcomeScreen({ onComplete, onStartTour }: WelcomeScreenProps) {
  const [step, setStep] = useState<'welcome' | 'features' | 'setup'>('welcome');
  const { settings, updateSettings } = useAppStore();

  const handleSkip = async () => {
    await skipOnboarding();
    await browser.storage.local.set({ [WELCOME_SHOWN_KEY]: true });
    onComplete();
  };

  const handleStartTour = async () => {
    await browser.storage.local.set({ [WELCOME_SHOWN_KEY]: true });
    onStartTour();
  };

  const handleGetStarted = async () => {
    await skipOnboarding();
    await browser.storage.local.set({ [WELCOME_SHOWN_KEY]: true });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {step === 'welcome' && (
        <WelcomeStep 
          onNext={() => setStep('features')} 
          onSkip={handleSkip}
        />
      )}
      
      {step === 'features' && (
        <FeaturesStep 
          onNext={() => setStep('setup')} 
          onBack={() => setStep('welcome')}
          onSkip={handleSkip}
        />
      )}
      
      {step === 'setup' && (
        <SetupStep 
          settings={settings}
          updateSettings={updateSettings}
          onComplete={handleGetStarted}
          onTakeTour={handleStartTour}
          onBack={() => setStep('features')}
        />
      )}
    </div>
  );
}

function WelcomeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      {/* Logo */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6 shadow-lg">
        <span className="text-white font-bold text-3xl">M</span>
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Welcome to MirmirOps</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Your AI-powered browser assistant for intelligent automation and natural browsing control
      </p>
      
      <button 
        onClick={onNext}
        className="w-full max-w-xs btn-primary py-3 rounded-xl font-medium"
      >
        Get Started
      </button>
      
      <button 
        onClick={onSkip}
        className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip introduction
      </button>
    </div>
  );
}

function FeaturesStep({ 
  onNext, 
  onBack, 
  onSkip 
}: { 
  onNext: () => void; 
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <span className="text-xs text-muted-foreground">Key Features</span>
        <button onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground">
          Skip
        </button>
      </div>
      
      <h2 className="text-lg font-semibold mb-4 text-center">What you can do</h2>
      
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <button 
        onClick={onNext}
        className="w-full btn-primary py-3 rounded-xl font-medium shrink-0"
      >
        Continue
      </button>
    </div>
  );
}

interface SetupStepProps {
  settings: any;
  updateSettings: (settings: any) => Promise<void>;
  onComplete: () => void;
  onTakeTour: () => void;
  onBack: () => void;
}

function SetupStep({ settings, updateSettings, onComplete, onTakeTour, onBack }: SetupStepProps) {
  const [selectedProvider, setSelectedProvider] = useState(settings.defaultLLMProvider || 'webllm');
  
  const providers = [
    { id: 'webllm', name: 'Local AI (WebLLM)', desc: 'Private, runs on your device', recommended: true },
    { id: 'ollama', name: 'Ollama', desc: 'Local server required' },
    { id: 'openai', name: 'OpenAI', desc: 'Requires API key' },
    { id: 'anthropic', name: 'Anthropic', desc: 'Requires API key' },
    { id: 'byok', name: 'Bring Your Own Key', desc: 'Custom provider' },
  ];

  const handleContinue = async () => {
    await updateSettings({ defaultLLMProvider: selectedProvider });
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <span className="text-xs text-muted-foreground">Quick Setup</span>
        <div className="w-6" />
      </div>
      
      <h2 className="text-lg font-semibold mb-1 text-center">Choose AI Provider</h2>
      <p className="text-xs text-muted-foreground text-center mb-4">
        You can change this anytime in Settings
      </p>
      
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setSelectedProvider(provider.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
              selectedProvider === provider.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              selectedProvider === provider.id ? 'border-primary' : 'border-muted-foreground'
            }`}>
              {selectedProvider === provider.id && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{provider.name}</span>
                {provider.recommended && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{provider.desc}</p>
            </div>
          </button>
        ))}
      </div>
      
      <div className="space-y-2 shrink-0">
        <button 
          onClick={handleContinue}
          className="w-full btn-primary py-3 rounded-xl font-medium"
        >
          Start Using MirmirOps
        </button>
        <button 
          onClick={onTakeTour}
          className="w-full btn-secondary py-2.5 rounded-xl font-medium text-sm"
        >
          Take a Quick Tour First
        </button>
      </div>
    </div>
  );
}

// Hook to check if welcome screen should be shown
export function useWelcomeScreen() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const result = await browser.storage.local.get(WELCOME_SHOWN_KEY);
        const needs = await needsOnboarding();
        
        // Show welcome if never shown and needs onboarding
        if (!result[WELCOME_SHOWN_KEY] && needs) {
          setShowWelcome(true);
        }
      } catch (error) {
        console.error('Failed to check welcome status:', error);
      } finally {
        setIsChecking(false);
      }
    }
    check();
  }, []);

  return { showWelcome, setShowWelcome, isChecking };
}

// Icons
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

function WorkflowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function VoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function MemoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export default WelcomeScreen;
