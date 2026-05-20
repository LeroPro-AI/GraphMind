import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  appearance: {
    nodeSize: 'medium',
    linkThickness: 1,
    showArrows: true,
    labelSize: 12,
    theme: 'dark',
  },
  physics: {
    linkDistance: 150,
    repulsionStrength: -400,
    gravity: 0.1,
    autoFreeze: true,
    autoFitOnGenerate: true,
    lockLayout: true,
  },
  ai: {
    maxNodes: 25,
    detailLevel: 'deep',
    language: 'Auto Detect',
    customNodeTypes: [],
    mode: 'general',
  },
  api: {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    timeout: 60000,
    keys: {
      gemini: '',
      openai: '',
      groq: '',
    },
  },
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('neural_mapping_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          appearance: { ...DEFAULT_SETTINGS.appearance, ...(parsed.appearance || {}) },
          physics: { ...DEFAULT_SETTINGS.physics, ...(parsed.physics || {}) },
          ai: { ...DEFAULT_SETTINGS.ai, ...(parsed.ai || {}) },
          api: { ...DEFAULT_SETTINGS.api, ...(parsed.api || {}) },
        };
      } catch (e) {
        console.warn('Failed to parse settings, using defaults');
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('neural_mapping_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
