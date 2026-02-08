import React, { useState, useEffect } from 'react';
import {
  getThemeSettings,
  updateThemeSettings,
  applyTheme,
  resetTheme,
  getAvailablePresets,
  type ThemeSettings,
  type ColorScheme,
  type AccentColor,
  type ThemePreset,
} from '@/lib/themes';

interface ThemeSettingsProps {
  isPro?: boolean;
}

export const ThemeSettingsView: React.FC<ThemeSettingsProps> = ({ isPro = false }) => {
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
  const [presets, setPresets] = useState<ThemePreset[]>([]);

  useEffect(() => {
    loadSettings();
    setPresets(getAvailablePresets(isPro));
  }, [isPro]);

  const loadSettings = async () => {
    const loaded = await getThemeSettings();
    setSettings(loaded);
  };

  const handleUpdate = async (updates: Partial<ThemeSettings>) => {
    if (!settings) return;
    
    const updated = await updateThemeSettings(updates);
    setSettings(updated);
    await applyTheme();
  };

  const handleReset = async () => {
    if (confirm('Reset all theme settings to defaults?')) {
      await resetTheme();
      await loadSettings();
    }
  };

  if (!settings) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Color Scheme */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color Scheme
        </h3>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as ColorScheme[]).map((scheme) => (
            <button
              key={scheme}
              onClick={() => handleUpdate({ colorScheme: scheme })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                settings.colorScheme === scheme
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {scheme === 'light' && <SunIcon className="w-4 h-4" />}
              {scheme === 'dark' && <MoonIcon className="w-4 h-4" />}
              {scheme === 'system' && <ComputerIcon className="w-4 h-4" />}
              <span className="text-sm capitalize">{scheme}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Accent Color
        </h3>
        <div className="flex gap-2 flex-wrap">
          {(['blue', 'purple', 'green', 'orange', 'pink', 'red', 'teal', 'indigo'] as AccentColor[]).map((color) => {
            const colors: Record<AccentColor, string> = {
              blue: 'bg-blue-500',
              purple: 'bg-purple-500',
              green: 'bg-green-500',
              orange: 'bg-orange-500',
              pink: 'bg-pink-500',
              red: 'bg-red-500',
              teal: 'bg-teal-500',
              indigo: 'bg-indigo-500',
            };
            
            return (
              <button
                key={color}
                onClick={() => handleUpdate({ accentColor: color })}
                className={`w-8 h-8 rounded-full ${colors[color]} ${
                  settings.accentColor === color
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800'
                    : ''
                }`}
                title={color}
              />
            );
          })}
        </div>
      </div>

      {/* Theme Presets */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Theme Presets
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleUpdate({ presetId: preset.id })}
              className={`p-3 rounded-lg border text-left transition-colors ${
                settings.presetId === preset.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: preset.colors.primary }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {preset.name}
                </span>
                {preset.isPro && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded">
                    Pro
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Font Size
        </h3>
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => handleUpdate({ fontSize: size })}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                settings.fontSize === size
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className={size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm'}>
                Aa
              </span>
              <span className="ml-1 capitalize">{size}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Border Radius
        </h3>
        <div className="flex gap-2">
          {(['none', 'small', 'medium', 'large'] as const).map((radius) => {
            const radiusMap = {
              none: 'rounded-none',
              small: 'rounded-sm',
              medium: 'rounded-md',
              large: 'rounded-xl',
            };
            
            return (
              <button
                key={radius}
                onClick={() => handleUpdate({ borderRadius: radius })}
                className={`flex-1 px-3 py-2 border transition-colors ${radiusMap[radius]} ${
                  settings.borderRadius === radius
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-xs capitalize">{radius}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Density */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Density
        </h3>
        <div className="flex gap-2">
          {(['compact', 'normal', 'comfortable'] as const).map((density) => (
            <button
              key={density}
              onClick={() => handleUpdate({ density })}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                settings.density === density
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="capitalize">{density}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Animations */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Animations
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enable UI animations and transitions
          </p>
        </div>
        <button
          onClick={() => handleUpdate({ animations: !settings.animations })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.animations ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.animations ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Reset */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleReset}
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

// Icons
const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const ComputerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export default ThemeSettingsView;
