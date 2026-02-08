// Theme Manager - Advanced theming and customization

import browser from 'webextension-polyfill';

/**
 * Color scheme
 */
export type ColorScheme = 'light' | 'dark' | 'system';

/**
 * Accent color
 */
export type AccentColor = 
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'pink'
  | 'red'
  | 'teal'
  | 'indigo';

/**
 * Theme preset
 */
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colorScheme: ColorScheme;
  accentColor: AccentColor;
  colors: ThemeColors;
  isCustom: boolean;
  isPro?: boolean;
}

/**
 * Theme colors
 */
export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryLight: string;
  
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Surface colors
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Border colors
  border: string;
  borderHover: string;
  borderFocus: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Special colors
  accent: string;
  shadow: string;
}

/**
 * User theme settings
 */
export interface ThemeSettings {
  colorScheme: ColorScheme;
  accentColor: AccentColor;
  presetId: string | null;
  customColors: Partial<ThemeColors>;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  density: 'compact' | 'normal' | 'comfortable';
  animations: boolean;
}

// Storage key
const THEME_SETTINGS_KEY = 'theme_settings';

// Default settings
const DEFAULT_SETTINGS: ThemeSettings = {
  colorScheme: 'system',
  accentColor: 'blue',
  presetId: null,
  customColors: {},
  fontSize: 'medium',
  fontFamily: 'system-ui',
  borderRadius: 'medium',
  density: 'normal',
  animations: true,
};

// Accent color palettes
const ACCENT_PALETTES: Record<AccentColor, { light: string; dark: string; hover: string }> = {
  blue: { light: '#3B82F6', dark: '#60A5FA', hover: '#2563EB' },
  purple: { light: '#8B5CF6', dark: '#A78BFA', hover: '#7C3AED' },
  green: { light: '#10B981', dark: '#34D399', hover: '#059669' },
  orange: { light: '#F97316', dark: '#FB923C', hover: '#EA580C' },
  pink: { light: '#EC4899', dark: '#F472B6', hover: '#DB2777' },
  red: { light: '#EF4444', dark: '#F87171', hover: '#DC2626' },
  teal: { light: '#14B8A6', dark: '#2DD4BF', hover: '#0D9488' },
  indigo: { light: '#6366F1', dark: '#818CF8', hover: '#4F46E5' },
};

// Built-in presets
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default-light',
    name: 'Light',
    description: 'Clean and bright default theme',
    colorScheme: 'light',
    accentColor: 'blue',
    isCustom: false,
    colors: {
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryLight: '#DBEAFE',
      background: '#FFFFFF',
      backgroundSecondary: '#F9FAFB',
      backgroundTertiary: '#F3F4F6',
      surface: '#FFFFFF',
      surfaceHover: '#F9FAFB',
      surfaceActive: '#F3F4F6',
      textPrimary: '#111827',
      textSecondary: '#4B5563',
      textTertiary: '#9CA3AF',
      textInverse: '#FFFFFF',
      border: '#E5E7EB',
      borderHover: '#D1D5DB',
      borderFocus: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      accent: '#3B82F6',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
  },
  {
    id: 'default-dark',
    name: 'Dark',
    description: 'Easy on the eyes dark theme',
    colorScheme: 'dark',
    accentColor: 'blue',
    isCustom: false,
    colors: {
      primary: '#60A5FA',
      primaryHover: '#3B82F6',
      primaryLight: '#1E3A5F',
      background: '#111827',
      backgroundSecondary: '#1F2937',
      backgroundTertiary: '#374151',
      surface: '#1F2937',
      surfaceHover: '#374151',
      surfaceActive: '#4B5563',
      textPrimary: '#F9FAFB',
      textSecondary: '#D1D5DB',
      textTertiary: '#9CA3AF',
      textInverse: '#111827',
      border: '#374151',
      borderHover: '#4B5563',
      borderFocus: '#60A5FA',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA',
      accent: '#60A5FA',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep blue dark theme',
    colorScheme: 'dark',
    accentColor: 'indigo',
    isCustom: false,
    isPro: true,
    colors: {
      primary: '#818CF8',
      primaryHover: '#6366F1',
      primaryLight: '#312E81',
      background: '#0F0F1A',
      backgroundSecondary: '#1A1A2E',
      backgroundTertiary: '#252547',
      surface: '#1A1A2E',
      surfaceHover: '#252547',
      surfaceActive: '#303064',
      textPrimary: '#F1F1F9',
      textSecondary: '#C4C4D8',
      textTertiary: '#8B8BA8',
      textInverse: '#0F0F1A',
      border: '#303064',
      borderHover: '#404080',
      borderFocus: '#818CF8',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#818CF8',
      accent: '#818CF8',
      shadow: 'rgba(0, 0, 0, 0.4)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Nature-inspired green theme',
    colorScheme: 'light',
    accentColor: 'green',
    isCustom: false,
    isPro: true,
    colors: {
      primary: '#059669',
      primaryHover: '#047857',
      primaryLight: '#D1FAE5',
      background: '#FAFDFB',
      backgroundSecondary: '#F0FDF4',
      backgroundTertiary: '#DCFCE7',
      surface: '#FFFFFF',
      surfaceHover: '#F0FDF4',
      surfaceActive: '#DCFCE7',
      textPrimary: '#14532D',
      textSecondary: '#166534',
      textTertiary: '#4ADE80',
      textInverse: '#FFFFFF',
      border: '#BBF7D0',
      borderHover: '#86EFAC',
      borderFocus: '#059669',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#059669',
      accent: '#059669',
      shadow: 'rgba(5, 150, 105, 0.1)',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and pink tones',
    colorScheme: 'light',
    accentColor: 'orange',
    isCustom: false,
    isPro: true,
    colors: {
      primary: '#F97316',
      primaryHover: '#EA580C',
      primaryLight: '#FFF7ED',
      background: '#FFFBF8',
      backgroundSecondary: '#FFF7ED',
      backgroundTertiary: '#FFEDD5',
      surface: '#FFFFFF',
      surfaceHover: '#FFF7ED',
      surfaceActive: '#FFEDD5',
      textPrimary: '#7C2D12',
      textSecondary: '#9A3412',
      textTertiary: '#FB923C',
      textInverse: '#FFFFFF',
      border: '#FED7AA',
      borderHover: '#FDBA74',
      borderFocus: '#F97316',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#F97316',
      accent: '#F97316',
      shadow: 'rgba(249, 115, 22, 0.1)',
    },
  },
];

/**
 * Get theme settings
 */
export async function getThemeSettings(): Promise<ThemeSettings> {
  const result = await browser.storage.local.get(THEME_SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...result[THEME_SETTINGS_KEY] };
}

/**
 * Save theme settings
 */
export async function saveThemeSettings(settings: ThemeSettings): Promise<void> {
  await browser.storage.local.set({ [THEME_SETTINGS_KEY]: settings });
}

/**
 * Update theme settings
 */
export async function updateThemeSettings(
  updates: Partial<ThemeSettings>
): Promise<ThemeSettings> {
  const current = await getThemeSettings();
  const updated = { ...current, ...updates };
  await saveThemeSettings(updated);
  return updated;
}

/**
 * Get resolved color scheme (handles 'system')
 */
export function getResolvedColorScheme(scheme: ColorScheme): 'light' | 'dark' {
  if (scheme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return scheme;
}

/**
 * Get active theme colors
 */
export async function getActiveThemeColors(): Promise<ThemeColors> {
  const settings = await getThemeSettings();
  const resolvedScheme = getResolvedColorScheme(settings.colorScheme);
  
  // Start with preset colors if one is selected
  let colors: ThemeColors;
  
  if (settings.presetId) {
    const preset = THEME_PRESETS.find(p => p.id === settings.presetId);
    colors = preset?.colors || THEME_PRESETS[0].colors;
  } else {
    // Use default preset for the color scheme
    const defaultPreset = THEME_PRESETS.find(
      p => p.id === `default-${resolvedScheme}`
    );
    colors = defaultPreset?.colors || THEME_PRESETS[0].colors;
  }
  
  // Apply accent color
  const accentPalette = ACCENT_PALETTES[settings.accentColor];
  colors = {
    ...colors,
    primary: resolvedScheme === 'dark' ? accentPalette.dark : accentPalette.light,
    primaryHover: accentPalette.hover,
    accent: resolvedScheme === 'dark' ? accentPalette.dark : accentPalette.light,
    borderFocus: resolvedScheme === 'dark' ? accentPalette.dark : accentPalette.light,
    info: resolvedScheme === 'dark' ? accentPalette.dark : accentPalette.light,
  };
  
  // Apply custom overrides
  return { ...colors, ...settings.customColors };
}

/**
 * Convert hex to HSL values (space-separated for CSS)
 */
function hexToHSL(hex: string): string {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');
  
  // Parse r, g, b values
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  // Return as "h s% l%" format for CSS
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Apply theme to document
 */
export async function applyTheme(): Promise<void> {
  const settings = await getThemeSettings();
  const colors = await getActiveThemeColors();
  const resolvedScheme = getResolvedColorScheme(settings.colorScheme);
  
  const root = document.documentElement;
  
  // Set color scheme class
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedScheme);
  
  // Convert hex colors to HSL for Tailwind CSS variables
  // These match the variables defined in styles.css
  const primaryHSL = hexToHSL(colors.primary);
  const backgroundHSL = hexToHSL(colors.background);
  const surfaceHSL = hexToHSL(colors.surface);
  const textPrimaryHSL = hexToHSL(colors.textPrimary);
  const textSecondaryHSL = hexToHSL(colors.textSecondary);
  const borderHSL = hexToHSL(colors.border);
  const accentHSL = hexToHSL(colors.accent);
  const errorHSL = hexToHSL(colors.error);
  const mutedHSL = hexToHSL(colors.backgroundSecondary);
  
  // Apply Tailwind-compatible CSS variables (HSL format without hsl())
  root.style.setProperty('--primary', primaryHSL);
  root.style.setProperty('--primary-foreground', resolvedScheme === 'dark' ? '240 10% 3.9%' : '0 0% 98%');
  root.style.setProperty('--background', backgroundHSL);
  root.style.setProperty('--foreground', textPrimaryHSL);
  root.style.setProperty('--card', surfaceHSL);
  root.style.setProperty('--card-foreground', textPrimaryHSL);
  root.style.setProperty('--popover', surfaceHSL);
  root.style.setProperty('--popover-foreground', textPrimaryHSL);
  root.style.setProperty('--secondary', mutedHSL);
  root.style.setProperty('--secondary-foreground', textPrimaryHSL);
  root.style.setProperty('--muted', mutedHSL);
  root.style.setProperty('--muted-foreground', textSecondaryHSL);
  root.style.setProperty('--accent', accentHSL);
  root.style.setProperty('--accent-foreground', textPrimaryHSL);
  root.style.setProperty('--destructive', errorHSL);
  root.style.setProperty('--destructive-foreground', '0 0% 98%');
  root.style.setProperty('--border', borderHSL);
  root.style.setProperty('--input', borderHSL);
  root.style.setProperty('--ring', primaryHSL);
  
  // Apply border radius (for --radius variable)
  const radii = {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '0.75rem',
  };
  root.style.setProperty('--radius', radii[settings.borderRadius]);
  
  // Base font sizes
  const baseFontSizes = {
    small: 14,
    medium: 16,
    large: 18,
  };
  
  // Density multipliers
  const densityMultipliers = {
    compact: 0.9,
    normal: 1,
    comfortable: 1.1,
  };
  
  // Calculate final font size: base font size * density
  const baseFontSize = baseFontSizes[settings.fontSize];
  const densityMultiplier = densityMultipliers[settings.density];
  const finalFontSize = Math.round(baseFontSize * densityMultiplier);
  
  // Apply font size - this affects all rem-based spacing in the UI
  root.style.fontSize = `${finalFontSize}px`;
  
  // Store density as a CSS variable for any components that want explicit density scaling
  root.style.setProperty('--density', `${densityMultiplier}`);
  
  // Handle animations
  if (!settings.animations) {
    root.classList.add('no-animations');
  } else {
    root.classList.remove('no-animations');
  }
  
  console.log('[ThemeManager] Applied theme:', {
    scheme: resolvedScheme,
    accent: settings.accentColor,
    fontSize: settings.fontSize,
    borderRadius: settings.borderRadius,
    density: settings.density,
  });
}

/**
 * Initialize theme manager
 */
export async function initializeThemeManager(): Promise<void> {
  await applyTheme();
  
  // Listen for system color scheme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const settings = await getThemeSettings();
    if (settings.colorScheme === 'system') {
      await applyTheme();
    }
  });
  
  console.log('[ThemeManager] Initialized');
}

/**
 * Get preset by ID
 */
export function getPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find(p => p.id === id);
}

/**
 * Get available presets
 */
export function getAvailablePresets(isPro: boolean = false): ThemePreset[] {
  return THEME_PRESETS.filter(p => !p.isPro || isPro);
}

/**
 * Reset theme to defaults
 */
export async function resetTheme(): Promise<void> {
  await saveThemeSettings(DEFAULT_SETTINGS);
  await applyTheme();
}

/**
 * Export theme as JSON
 */
export async function exportTheme(): Promise<string> {
  const settings = await getThemeSettings();
  return JSON.stringify(settings, null, 2);
}

/**
 * Import theme from JSON
 */
export async function importTheme(json: string): Promise<void> {
  const settings = JSON.parse(json) as ThemeSettings;
  await saveThemeSettings(settings);
  await applyTheme();
}
