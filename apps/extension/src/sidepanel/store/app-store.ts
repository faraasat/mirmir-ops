import { create } from 'zustand';
import browser from 'webextension-polyfill';
import type { UserSettings, PlanType, UsageStats } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { STORAGE_KEYS } from '@/shared/constants';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isLoading?: boolean;
}

interface AppState {
  // UI State
  currentView: 'chat' | 'history' | 'workflows' | 'settings' | 'analytics' | 'permissions' | 'memory';
  isLoading: boolean;
  error: string | null;
  
  // User State
  user: {
    id: string;
    email: string;
    plan: PlanType;
  } | null;
  settings: UserSettings;
  usage: UsageStats | null;
  
  // Chat State
  messages: Message[];
  inputText: string;
  isVoiceActive: boolean;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setView: (view: AppState['currentView']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setInputText: (text: string) => void;
  
  setVoiceActive: (active: boolean) => void;
  
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  initializeApp: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial UI State
  currentView: 'chat',
  isLoading: false,
  error: null,
  
  // Initial User State
  user: null,
  settings: DEFAULT_SETTINGS,
  usage: null,
  
  // Initial Chat State
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m MirmirOps, your AI browser assistant. I can help you navigate websites, fill forms, extract data, and automate tasks. What would you like to do?',
      timestamp: Date.now(),
    },
  ],
  inputText: '',
  isVoiceActive: false,
  
  // Theme
  theme: 'system',
  
  // Actions
  setView: (view) => set({ currentView: view }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  addMessage: (message) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      messages: [...state.messages, { ...message, id, timestamp: Date.now() }],
    }));
    return id;
  },
  
  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },
  
  clearMessages: () => {
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Chat cleared. How can I help you?',
          timestamp: Date.now(),
        },
      ],
    });
  },
  
  setInputText: (text) => set({ inputText: text }),
  
  setVoiceActive: (active) => set({ isVoiceActive: active }),
  
  updateSettings: async (updates) => {
    const currentSettings = get().settings;
    const newSettings = { ...currentSettings, ...updates };
    
    // Save to storage
    await browser.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: newSettings,
    });
    
    set({ settings: newSettings });
    
    // Update theme if changed
    if (updates.theme) {
      set({ theme: updates.theme });
    }
  },
  
  setTheme: (theme) => {
    set({ theme });
    get().updateSettings({ theme });
  },
  
  initializeApp: async () => {
    try {
      set({ isLoading: true });
      
      // Load settings from storage
      const result = await browser.storage.local.get([
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.USAGE,
      ]);
      
      const settings = result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
      const user = result[STORAGE_KEYS.USER] || null;
      const usage = result[STORAGE_KEYS.USAGE] || null;
      
      set({
        settings,
        user,
        usage,
        theme: settings.theme || 'system',
        isLoading: false,
      });
    } catch (error) {
      console.error('[MirmirOps] Failed to initialize:', error);
      set({ 
        isLoading: false, 
        error: 'Failed to initialize extension' 
      });
    }
  },
  
  refreshUsage: async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_LIMITS',
        payload: {},
        timestamp: Date.now(),
      });
      
      if (response?.success) {
        set({ usage: response.data });
      }
    } catch (error) {
      console.error('[MirmirOps] Failed to refresh usage:', error);
    }
  },
}));
