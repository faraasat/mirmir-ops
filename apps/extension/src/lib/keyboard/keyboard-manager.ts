// Keyboard Shortcuts Manager - Centralized keyboard shortcut handling

import browser from 'webextension-polyfill';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string; // Format: "Ctrl+Shift+K" or "Cmd+K" (Mac)
  action: string; // Action identifier to dispatch
  context?: 'global' | 'chat' | 'workflows' | 'history' | 'settings';
  enabled: boolean;
  customizable: boolean;
}

/**
 * Shortcut category
 */
export interface ShortcutCategory {
  id: string;
  name: string;
  shortcuts: KeyboardShortcut[];
}

// Storage key
const SHORTCUTS_KEY = 'keyboard_shortcuts';

// Default shortcuts
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Global shortcuts
  {
    id: 'open-sidepanel',
    name: 'Open Side Panel',
    description: 'Open the MirmirOps side panel',
    keys: 'Ctrl+Shift+M',
    action: 'OPEN_SIDEPANEL',
    context: 'global',
    enabled: true,
    customizable: true,
  },
  {
    id: 'toggle-voice',
    name: 'Toggle Voice Input',
    description: 'Start or stop voice recognition',
    keys: 'Ctrl+Shift+V',
    action: 'TOGGLE_VOICE',
    context: 'global',
    enabled: true,
    customizable: true,
  },
  {
    id: 'quick-command',
    name: 'Quick Command',
    description: 'Open quick command palette',
    keys: 'Ctrl+Shift+P',
    action: 'QUICK_COMMAND',
    context: 'global',
    enabled: true,
    customizable: true,
  },
  {
    id: 'extract-page',
    name: 'Extract Page Data',
    description: 'Extract data from current page',
    keys: 'Ctrl+Shift+E',
    action: 'EXTRACT_PAGE',
    context: 'global',
    enabled: true,
    customizable: true,
  },

  // Chat shortcuts
  {
    id: 'send-message',
    name: 'Send Message',
    description: 'Send the current message',
    keys: 'Enter',
    action: 'SEND_MESSAGE',
    context: 'chat',
    enabled: true,
    customizable: false,
  },
  {
    id: 'new-line',
    name: 'New Line',
    description: 'Insert a new line in message',
    keys: 'Shift+Enter',
    action: 'NEW_LINE',
    context: 'chat',
    enabled: true,
    customizable: false,
  },
  {
    id: 'clear-chat',
    name: 'Clear Chat',
    description: 'Clear all messages',
    keys: 'Ctrl+L',
    action: 'CLEAR_CHAT',
    context: 'chat',
    enabled: true,
    customizable: true,
  },
  {
    id: 'focus-input',
    name: 'Focus Input',
    description: 'Focus the chat input',
    keys: '/',
    action: 'FOCUS_INPUT',
    context: 'chat',
    enabled: true,
    customizable: true,
  },

  // Navigation shortcuts
  {
    id: 'nav-chat',
    name: 'Go to Chat',
    description: 'Navigate to Chat view',
    keys: 'Alt+1',
    action: 'NAV_CHAT',
    context: 'global',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-history',
    name: 'Go to History',
    description: 'Navigate to History view',
    keys: 'Alt+2',
    action: 'NAV_HISTORY',
    context: 'global',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-workflows',
    name: 'Go to Workflows',
    description: 'Navigate to Workflows view',
    keys: 'Alt+3',
    action: 'NAV_WORKFLOWS',
    context: 'global',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-memory',
    name: 'Go to Memory',
    description: 'Navigate to Memory view',
    keys: 'Alt+4',
    action: 'NAV_MEMORY',
    context: 'global',
    enabled: true,
    customizable: true,
  },
  {
    id: 'nav-settings',
    name: 'Go to Settings',
    description: 'Navigate to Settings view',
    keys: 'Alt+5',
    action: 'NAV_SETTINGS',
    context: 'global',
    enabled: true,
    customizable: true,
  },

  // Workflow shortcuts
  {
    id: 'new-workflow',
    name: 'New Workflow',
    description: 'Create a new workflow',
    keys: 'Ctrl+N',
    action: 'NEW_WORKFLOW',
    context: 'workflows',
    enabled: true,
    customizable: true,
  },
  {
    id: 'run-workflow',
    name: 'Run Workflow',
    description: 'Run the selected workflow',
    keys: 'Ctrl+Enter',
    action: 'RUN_WORKFLOW',
    context: 'workflows',
    enabled: true,
    customizable: true,
  },
  {
    id: 'save-workflow',
    name: 'Save Workflow',
    description: 'Save the current workflow',
    keys: 'Ctrl+S',
    action: 'SAVE_WORKFLOW',
    context: 'workflows',
    enabled: true,
    customizable: true,
  },

  // History shortcuts
  {
    id: 'search-history',
    name: 'Search History',
    description: 'Focus history search',
    keys: 'Ctrl+F',
    action: 'SEARCH_HISTORY',
    context: 'history',
    enabled: true,
    customizable: true,
  },
  {
    id: 'clear-history',
    name: 'Clear History',
    description: 'Clear all history',
    keys: 'Ctrl+Shift+Delete',
    action: 'CLEAR_HISTORY',
    context: 'history',
    enabled: true,
    customizable: true,
  },

  // Misc shortcuts
  {
    id: 'escape',
    name: 'Escape/Cancel',
    description: 'Cancel current action or close modal',
    keys: 'Escape',
    action: 'ESCAPE',
    context: 'global',
    enabled: true,
    customizable: false,
  },
  {
    id: 'help',
    name: 'Show Help',
    description: 'Show keyboard shortcuts help',
    keys: '?',
    action: 'SHOW_HELP',
    context: 'global',
    enabled: true,
    customizable: false,
  },
];

// Shortcut categories for UI
export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    id: 'global',
    name: 'Global',
    shortcuts: DEFAULT_SHORTCUTS.filter(s => s.context === 'global'),
  },
  {
    id: 'chat',
    name: 'Chat',
    shortcuts: DEFAULT_SHORTCUTS.filter(s => s.context === 'chat'),
  },
  {
    id: 'navigation',
    name: 'Navigation',
    shortcuts: DEFAULT_SHORTCUTS.filter(s => s.id.startsWith('nav-')),
  },
  {
    id: 'workflows',
    name: 'Workflows',
    shortcuts: DEFAULT_SHORTCUTS.filter(s => s.context === 'workflows'),
  },
  {
    id: 'history',
    name: 'History',
    shortcuts: DEFAULT_SHORTCUTS.filter(s => s.context === 'history'),
  },
];

// Custom shortcut overrides
let customShortcuts: Map<string, Partial<KeyboardShortcut>> | null = null;

/**
 * Initialize keyboard manager
 */
export async function initializeKeyboardManager(): Promise<void> {
  await loadCustomShortcuts();
  console.log('[KeyboardManager] Initialized');
}

/**
 * Load custom shortcut overrides
 */
async function loadCustomShortcuts(): Promise<void> {
  const result = await browser.storage.local.get(SHORTCUTS_KEY);
  const customs: Record<string, Partial<KeyboardShortcut>> = result[SHORTCUTS_KEY] || {};
  
  customShortcuts = new Map(Object.entries(customs));
}

/**
 * Save custom shortcut overrides
 */
async function saveCustomShortcuts(): Promise<void> {
  if (!customShortcuts) return;
  
  const obj = Object.fromEntries(customShortcuts);
  await browser.storage.local.set({ [SHORTCUTS_KEY]: obj });
}

/**
 * Get all shortcuts with custom overrides applied
 */
export async function getShortcuts(): Promise<KeyboardShortcut[]> {
  if (!customShortcuts) await loadCustomShortcuts();
  
  return DEFAULT_SHORTCUTS.map(shortcut => {
    const custom = customShortcuts!.get(shortcut.id);
    return custom ? { ...shortcut, ...custom } : shortcut;
  });
}

/**
 * Get a single shortcut
 */
export async function getShortcut(id: string): Promise<KeyboardShortcut | null> {
  const shortcuts = await getShortcuts();
  return shortcuts.find(s => s.id === id) || null;
}

/**
 * Update a shortcut
 */
export async function updateShortcut(
  id: string,
  updates: Partial<KeyboardShortcut>
): Promise<void> {
  if (!customShortcuts) await loadCustomShortcuts();
  
  const shortcut = DEFAULT_SHORTCUTS.find(s => s.id === id);
  if (!shortcut || !shortcut.customizable) return;
  
  const existing = customShortcuts!.get(id) || {};
  customShortcuts!.set(id, { ...existing, ...updates });
  
  await saveCustomShortcuts();
}

/**
 * Reset a shortcut to default
 */
export async function resetShortcut(id: string): Promise<void> {
  if (!customShortcuts) await loadCustomShortcuts();
  
  customShortcuts!.delete(id);
  await saveCustomShortcuts();
}

/**
 * Reset all shortcuts to default
 */
export async function resetAllShortcuts(): Promise<void> {
  customShortcuts = new Map();
  await browser.storage.local.remove(SHORTCUTS_KEY);
}

/**
 * Check if a key combo matches a shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const keys = parseKeyCombo(shortcut.keys);
  
  return (
    keys.key === event.key.toLowerCase() &&
    keys.ctrl === (event.ctrlKey || event.metaKey) &&
    keys.shift === event.shiftKey &&
    keys.alt === event.altKey
  );
}

/**
 * Parse key combo string
 */
function parseKeyCombo(keys: string): {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
} {
  const parts = keys.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  
  return {
    key: key === 'enter' ? 'enter' : key === 'escape' ? 'escape' : key,
    ctrl: parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  };
}

/**
 * Format key combo for display
 */
export function formatKeyCombo(keys: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return keys
    .replace(/Ctrl/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Cmd/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Shift/g, isMac ? '⇧' : 'Shift')
    .replace(/Enter/g, isMac ? '↵' : 'Enter')
    .replace(/Escape/g, 'Esc')
    .replace(/\+/g, ' ');
}

/**
 * Get shortcuts by context
 */
export async function getShortcutsByContext(
  context: KeyboardShortcut['context']
): Promise<KeyboardShortcut[]> {
  const shortcuts = await getShortcuts();
  return shortcuts.filter(s => s.context === context && s.enabled);
}

/**
 * Find shortcut for action
 */
export async function findShortcutForAction(action: string): Promise<KeyboardShortcut | null> {
  const shortcuts = await getShortcuts();
  return shortcuts.find(s => s.action === action && s.enabled) || null;
}

/**
 * Check for shortcut conflicts
 */
export async function checkConflicts(
  id: string,
  newKeys: string
): Promise<KeyboardShortcut[]> {
  const shortcuts = await getShortcuts();
  const newCombo = parseKeyCombo(newKeys);
  
  return shortcuts.filter(s => {
    if (s.id === id) return false;
    
    const existing = parseKeyCombo(s.keys);
    return (
      existing.key === newCombo.key &&
      existing.ctrl === newCombo.ctrl &&
      existing.shift === newCombo.shift &&
      existing.alt === newCombo.alt
    );
  });
}

// Event handler type
export type ShortcutHandler = (action: string, event: KeyboardEvent) => void;

// Registered handlers
const handlers = new Map<string, ShortcutHandler>();

/**
 * Register a shortcut handler
 */
export function registerHandler(id: string, handler: ShortcutHandler): () => void {
  handlers.set(id, handler);
  return () => handlers.delete(id);
}

/**
 * Handle keyboard event
 */
export async function handleKeyboardEvent(event: KeyboardEvent): Promise<boolean> {
  const shortcuts = await getShortcuts();
  
  for (const shortcut of shortcuts) {
    if (!shortcut.enabled) continue;
    
    if (matchesShortcut(event, shortcut)) {
      // Dispatch to handlers
      for (const handler of handlers.values()) {
        handler(shortcut.action, event);
      }
      return true;
    }
  }
  
  return false;
}
