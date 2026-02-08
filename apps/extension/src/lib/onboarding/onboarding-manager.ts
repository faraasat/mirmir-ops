// Onboarding Manager - Guide new users through the extension

import browser from 'webextension-polyfill';

/**
 * Onboarding step
 */
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'input' | 'navigate' | 'wait';
    value?: string;
  };
  canSkip?: boolean;
  completionCheck?: () => boolean | Promise<boolean>;
}

/**
 * Onboarding flow
 */
export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  requiredFor?: 'all' | 'new' | 'upgrade';
}

/**
 * User onboarding state
 */
export interface OnboardingState {
  hasCompletedInitialOnboarding: boolean;
  completedFlows: string[];
  currentFlow: string | null;
  currentStep: number;
  skippedSteps: string[];
  startedAt: number | null;
  completedAt: number | null;
}

// Storage key
const ONBOARDING_STATE_KEY = 'onboarding_state';

// Default state
const DEFAULT_STATE: OnboardingState = {
  hasCompletedInitialOnboarding: false,
  completedFlows: [],
  currentFlow: null,
  currentStep: 0,
  skippedSteps: [],
  startedAt: null,
  completedAt: null,
};

// Onboarding flows
export const ONBOARDING_FLOWS: OnboardingFlow[] = [
  {
    id: 'initial',
    name: 'Welcome to MirmirOps',
    description: 'Learn the basics of your AI browser assistant',
    requiredFor: 'new',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to MirmirOps!',
        description: 'Your AI-powered browser assistant that helps you navigate, automate, and extract data from any website. Let\'s take a quick tour!',
        position: 'center',
        canSkip: false,
      },
      {
        id: 'chat-intro',
        title: 'Chat Interface',
        description: 'This is where you interact with your AI assistant. Type commands or questions in natural language, or use voice input.',
        target: '[data-onboarding="chat-input"]',
        position: 'top',
      },
      {
        id: 'voice-intro',
        title: 'Voice Commands',
        description: 'Click the microphone button or press Ctrl+Shift+V to use voice commands. Say things like "Go to Google" or "Fill this form".',
        target: '[data-onboarding="voice-button"]',
        position: 'top',
      },
      {
        id: 'history-intro',
        title: 'History',
        description: 'Track all your browsing history, commands, and actions. You can search, filter, and even set up automatic cleanup rules.',
        target: '[data-onboarding="history-tab"]',
        position: 'bottom',
      },
      {
        id: 'workflows-intro',
        title: 'Workflows',
        description: 'Create automated workflows to perform repetitive tasks. Chain multiple actions together and even schedule them to run automatically.',
        target: '[data-onboarding="workflows-tab"]',
        position: 'bottom',
      },
      {
        id: 'memory-intro',
        title: 'Memory',
        description: 'MirmirOps learns from your interactions. It remembers your preferences, frequent actions, and can provide personalized suggestions.',
        target: '[data-onboarding="memory-tab"]',
        position: 'bottom',
      },
      {
        id: 'settings-intro',
        title: 'Settings',
        description: 'Customize MirmirOps to your liking. Configure LLM providers, voice settings, privacy controls, and more.',
        target: '[data-onboarding="settings-tab"]',
        position: 'bottom',
      },
      {
        id: 'try-command',
        title: 'Try Your First Command',
        description: 'Type "What can you do?" in the chat to see a list of available commands and capabilities.',
        target: '[data-onboarding="chat-input"]',
        position: 'top',
        action: {
          type: 'input',
          value: 'What can you do?',
        },
      },
      {
        id: 'complete',
        title: 'You\'re All Set!',
        description: 'You\'ve completed the basic tour. Explore the extension and discover all its powerful features. Need help? Just ask!',
        position: 'center',
        canSkip: false,
      },
    ],
  },
  {
    id: 'workflows-deep',
    name: 'Workflow Mastery',
    description: 'Learn to create powerful automated workflows',
    requiredFor: 'all',
    steps: [
      {
        id: 'workflow-create',
        title: 'Creating Workflows',
        description: 'Click "New Workflow" to start creating an automated sequence of actions.',
        target: '[data-onboarding="new-workflow-btn"]',
        position: 'bottom',
      },
      {
        id: 'workflow-actions',
        title: 'Adding Actions',
        description: 'Add actions like navigation, clicking, typing, and data extraction. Each action can be configured with specific parameters.',
        target: '[data-onboarding="workflow-actions"]',
        position: 'left',
      },
      {
        id: 'workflow-schedule',
        title: 'Scheduling',
        description: 'Set up automatic execution using cron expressions. Run workflows daily, weekly, or at specific times.',
        target: '[data-onboarding="workflow-schedule"]',
        position: 'left',
      },
    ],
  },
  {
    id: 'voice-commands',
    name: 'Voice Command Guide',
    description: 'Master voice interactions',
    requiredFor: 'all',
    steps: [
      {
        id: 'voice-activate',
        title: 'Activating Voice',
        description: 'Press Ctrl+Shift+V or click the microphone to start listening. A visual indicator shows when voice is active.',
        target: '[data-onboarding="voice-button"]',
        position: 'top',
      },
      {
        id: 'voice-examples',
        title: 'Voice Command Examples',
        description: 'Try commands like: "Search for AI news", "Fill this form with my info", "Extract all emails from this page", "Go back".',
        position: 'center',
      },
      {
        id: 'voice-settings',
        title: 'Voice Settings',
        description: 'Customize voice recognition language, speech rate, and enable/disable voice feedback in Settings.',
        target: '[data-onboarding="settings-tab"]',
        position: 'bottom',
      },
    ],
  },
];

/**
 * Get onboarding state
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const result = await browser.storage.local.get(ONBOARDING_STATE_KEY);
  return result[ONBOARDING_STATE_KEY] || DEFAULT_STATE;
}

/**
 * Save onboarding state
 */
async function saveOnboardingState(state: OnboardingState): Promise<void> {
  await browser.storage.local.set({ [ONBOARDING_STATE_KEY]: state });
}

/**
 * Start onboarding flow
 */
export async function startOnboarding(flowId: string): Promise<OnboardingFlow | null> {
  const flow = ONBOARDING_FLOWS.find(f => f.id === flowId);
  if (!flow) return null;
  
  const state = await getOnboardingState();
  state.currentFlow = flowId;
  state.currentStep = 0;
  state.startedAt = Date.now();
  state.completedAt = null;
  
  await saveOnboardingState(state);
  return flow;
}

/**
 * Get current step
 */
export async function getCurrentStep(): Promise<{
  flow: OnboardingFlow;
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
} | null> {
  const state = await getOnboardingState();
  
  if (!state.currentFlow) return null;
  
  const flow = ONBOARDING_FLOWS.find(f => f.id === state.currentFlow);
  if (!flow || state.currentStep >= flow.steps.length) return null;
  
  return {
    flow,
    step: flow.steps[state.currentStep],
    stepIndex: state.currentStep,
    totalSteps: flow.steps.length,
  };
}

/**
 * Advance to next step
 */
export async function nextStep(): Promise<boolean> {
  const state = await getOnboardingState();
  
  if (!state.currentFlow) return false;
  
  const flow = ONBOARDING_FLOWS.find(f => f.id === state.currentFlow);
  if (!flow) return false;
  
  state.currentStep++;
  
  if (state.currentStep >= flow.steps.length) {
    // Flow complete
    state.completedFlows.push(state.currentFlow);
    
    if (state.currentFlow === 'initial') {
      state.hasCompletedInitialOnboarding = true;
    }
    
    state.currentFlow = null;
    state.currentStep = 0;
    state.completedAt = Date.now();
    
    await saveOnboardingState(state);
    return true;
  }
  
  await saveOnboardingState(state);
  return false;
}

/**
 * Go to previous step
 */
export async function previousStep(): Promise<void> {
  const state = await getOnboardingState();
  
  if (state.currentStep > 0) {
    state.currentStep--;
    await saveOnboardingState(state);
  }
}

/**
 * Skip current step
 */
export async function skipStep(): Promise<boolean> {
  const state = await getOnboardingState();
  const current = await getCurrentStep();
  
  if (current && current.step.canSkip !== false) {
    state.skippedSteps.push(current.step.id);
    return nextStep();
  }
  
  return false;
}

/**
 * Skip entire onboarding
 */
export async function skipOnboarding(): Promise<void> {
  const state = await getOnboardingState();
  
  state.hasCompletedInitialOnboarding = true;
  state.currentFlow = null;
  state.currentStep = 0;
  state.completedAt = Date.now();
  
  await saveOnboardingState(state);
}

/**
 * Check if initial onboarding is needed
 */
export async function needsOnboarding(): Promise<boolean> {
  const state = await getOnboardingState();
  return !state.hasCompletedInitialOnboarding;
}

/**
 * Check if a specific flow is completed
 */
export async function isFlowCompleted(flowId: string): Promise<boolean> {
  const state = await getOnboardingState();
  return state.completedFlows.includes(flowId);
}

/**
 * Reset onboarding state
 */
export async function resetOnboarding(): Promise<void> {
  await saveOnboardingState(DEFAULT_STATE);
}

/**
 * Get available flows for user
 */
export async function getAvailableFlows(): Promise<OnboardingFlow[]> {
  const state = await getOnboardingState();
  
  return ONBOARDING_FLOWS.filter(flow => {
    // Already completed
    if (state.completedFlows.includes(flow.id)) return false;
    
    // Initial flow only for new users
    if (flow.id === 'initial' && state.hasCompletedInitialOnboarding) return false;
    
    return true;
  });
}

/**
 * Get flow by ID
 */
export function getFlow(flowId: string): OnboardingFlow | undefined {
  return ONBOARDING_FLOWS.find(f => f.id === flowId);
}
