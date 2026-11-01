import React from 'react';
import {
  X,
  Moon,
  Sun,
  Monitor,
  Globe,
  Trash2,
  Download,
  Volume2,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { AppSettings, AppLanguage, AppTheme } from '../types';
import { translations } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearAllChats: () => void;
  onExportChats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllChats,
  onExportChats,
}) => {
  if (!isOpen) return null;

  const t = translations[settings.language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1726] border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">{t.settings}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 text-sm text-slate-200 pr-1">
          {/* Appearance Section */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
              {t.appearance}
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'dark', label: t.darkMode, icon: Moon },
                { id: 'light', label: t.lightMode, icon: Sun },
                { id: 'system', label: t.systemTheme, icon: Monitor },
              ].map(({ id, label, icon: Icon }) => {
                const isActive = settings.theme === id;
                return (
                  <button
                    key={id}
                    onClick={() => onUpdateSettings({ theme: id as AppTheme })}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>{t.language}</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'so', label: 'Af-Soomaali', badge: 'Somali' },
                { id: 'en', label: 'English', badge: 'Global' },
                { id: 'ar', label: 'العربية', badge: 'Arabic' },
              ].map(({ id, label, badge }) => {
                const isActive = settings.language === id;
                return (
                  <button
                    key={id}
                    onClick={() => onUpdateSettings({ language: id as AppLanguage })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-semibold">{label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Personality */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t.voiceSettings}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { name: 'Kore', desc: 'Clear & Friendly' },
                { name: 'Fenrir', desc: 'Deep & Authoritative' },
                { name: 'Puck', desc: 'Energetic & Crisp' },
                { name: 'Charon', desc: 'Warm & Calm' },
                { name: 'Zephyr', desc: 'Gentle & Smooth' },
              ].map(({ name, desc }) => {
                const isSelected = settings.ttsVoice === name;
                return (
                  <button
                    key={name}
                    onClick={() => onUpdateSettings({ ttsVoice: name as any })}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] text-slate-500">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Model & Security Info */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Model: Google Gemini 3.8 Flash (Active)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              API calls are securely proxied server-side. Google Search grounding provides verified real-time references.
            </p>
          </div>

          {/* Data Management */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Taariikhda Wadahadallada (Chat History)</div>
                <div className="text-[11px] text-slate-400">Dhoofi ama tirtir wada-sheekeysiga</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onExportChats}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                  title="Export chats"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Dhoofi</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(t.confirmClear)) {
                      onClearAllChats();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-xs font-medium text-rose-300 transition-colors"
                  title="Clear all chats"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearAllChats}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
          >
            Waayahay (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
