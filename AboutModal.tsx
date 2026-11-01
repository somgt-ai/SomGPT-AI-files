import React from 'react';
import {
  X,
  Shield,
  Sparkles,
  BookOpen,
  Globe2,
  Mic2,
  Cpu,
  User,
  MapPin,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  if (!isOpen) return null;

  const t = translations[language];
  const identity = t.projectIdentity;
  const isSomali = language === 'so';
  const isArabic = language === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0e1726] border border-cyan-500/30 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Brand */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <BrandLogo size="md" showText={true} />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed pr-1">
          {/* Mission Banner */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200">
            <h3 className="font-bold text-sm text-cyan-300 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {isSomali
                ? 'Ujeedada SomGPT AI'
                : isArabic
                ? 'رسالة SomGPT AI'
                : 'The SomGPT AI Mission'}
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              {identity.purpose}
            </p>
          </div>

          {/* Official Project Identity & Ownership Section */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              <HeartHandshake className="w-4 h-4 text-cyan-400" />
              <span>
                {isSomali
                  ? 'Aqoonsiga Rasmiga ah & Lahaanshaha Mashruuca'
                  : isArabic
                  ? 'الهوية الرسمية وملكية المشروع'
                  : 'Official Project Identity & Ownership'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <User className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    {identity.ownerLabel}
                  </span>
                  <span className="text-slate-100 font-bold text-xs sm:text-sm">
                    {identity.ownerName}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    {identity.foundingCityLabel}
                  </span>
                  <span className="text-slate-100 font-semibold">
                    {identity.foundingCity}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    {identity.technologiesLabel}
                  </span>
                  <span className="text-slate-300 text-[11.5px] leading-relaxed block">
                    {identity.technologies}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic leading-relaxed pt-1 border-t border-slate-800">
              "{identity.ownershipStatement}"
            </p>
          </div>

          {/* Capabilities Grid */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              {isSomali ? 'Awoodaha Muhiimka ah' : isArabic ? 'القدرات الأساسية' : 'Core Capabilities'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-slate-100">
                    {isSomali ? 'Waxbarasho & Saynis' : 'Education & STEM'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isSomali ? 'Xisaab, Fiisikis, Kimistari & bayooloji' : 'Step-by-step tutoring and exercises'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                <Globe2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-slate-100">
                    {isSomali ? 'Baaris Internet oo Dhab ah' : 'Live Google Search'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isSomali ? 'Tixraacyo iyo xiriirinno toos ah' : 'Grounding with real citations'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                <Mic2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-slate-100">
                    {isSomali ? 'Wada-hadal Cod ah' : 'Interactive Voice'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isSomali ? 'Af-Soomaali, Ingiriisi & Carabi' : 'Speech-to-text & TTS output'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                <Cpu className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-slate-100">
                    {isSomali ? 'Falanqeynta Sawirrada' : 'Multimodal Vision'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isSomali ? 'Shaxanno, buugaag, iyo code' : 'Diagrams, textbooks, and UI'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ethics & Safety */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Shield className="w-4 h-4" />
              <span>
                {isSomali ? 'Badbaadada & Mabaadi\'da Anshaxa' : 'Safety & Ethical AI Principles'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isSomali
                ? 'SomGPT AI waxay si adag u diidaysaa dhibaateynta dadka, rabshadaha, iyo falalka sharci darrada ah. Waxay u sharaxdaa arrimaha diimaha si xushmad iyo caddaalad leh, iyadoo kala saaraysa qoraalka cad iyo aragtida culumada.'
                : 'SomGPT AI strictly refuses to assist with harm or violence. It handles religious knowledge with respect, distinguishes authoritative texts from scholarly interpretations, and transparently cites sources.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>SomGPT AI • Founded in Jigjiga</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
          >
            {isSomali ? 'Waayahay (Xir)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
