import React from 'react';
import {
  X,
  BookOpen,
  Search,
  Code2,
  Compass,
  Mic,
  Camera,
  ArrowRight,
} from 'lucide-react';
import { AppLanguage, AppMode } from '../types';

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
  onSelectFeature: (mode: AppMode, initialPrompt: string, openVoice?: boolean) => void;
}

export const ExploreModal: React.FC<ExploreModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectFeature,
}) => {
  if (!isOpen) return null;

  const isSomali = language === 'so';

  const features = [
    {
      id: 'study',
      mode: 'study' as AppMode,
      icon: BookOpen,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      title: isSomali ? 'Macallinka Waxbarashada & STEM' : 'STEM Education & Learning',
      desc: isSomali
        ? 'Sharaxaadda Xisaabta, Fiisigiska, Kimistariga, iyo casharrada dugsiga sare iyo jaamacadda si tallaabo-tallaabo ah.'
        : 'Step-by-step tutoring in mathematics, physics, biology, and chemistry with intuitive problem solving.',
      prompt: isSomali
        ? 'Fadlan ii sharax fikradda xisaabta ee calculus (derivatives) adigoo isticmaalaya tusaale fudud oo nolosha dhabta ah.'
        : 'Please explain the concept of calculus derivatives using an intuitive real-world analogy.',
    },
    {
      id: 'research',
      mode: 'research' as AppMode,
      icon: Search,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      title: isSomali ? 'Baaris Internet oo Toos ah' : 'Live Web Research Grounding',
      desc: isSomali
        ? 'Baarista xogaha ugu dambeeyay ee internetka adigoo helaya ilo iyo tixraacyo la xaqiijiyay oo aad gujin karto.'
        : 'Deep web research backed by real-time Google Search grounding and clickable citations.',
      prompt: isSomali
        ? 'Baar internetka: Waa maxay horumarkii cilmiga ee ugu dambeeyay sanadkan ee ku saabsan daaweynta cudurada ama tamarta cagaaran?'
        : 'Research the most recent breakthroughs in clean energy storage from credible scientific publications.',
    },
    {
      id: 'religion',
      mode: 'religion' as AppMode,
      icon: Compass,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      title: isSomali ? 'Daraasaadka Diinta & Islaamka' : 'Islamic & Religious Studies',
      desc: isSomali
        ? 'Barashada Qur\'aanka, Axaadiista, Taariikhda Islaamka, iyo kala duwanaanshaha culimada si xushmad iyo tixraac leh.'
        : 'Scholarly, respectful examination of religious texts, Islamic history, and jurisprudence with authentic citations.',
      prompt: isSomali
        ? 'Sharax qawaaciidda ugu waaweyn ee fiqhiga Islaamka (القواعد الفقهية الكبرى) iyo tusaalayaashooda.'
        : 'Explain the major universal maxims of Islamic jurisprudence (Al-Qawaid Al-Fiqhiyyah) with classical examples.',
    },
    {
      id: 'code',
      mode: 'code' as AppMode,
      icon: Code2,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      title: isSomali ? 'Khabiirka Barnaamijyada & Code' : 'Coding & Software Engineering',
      desc: isSomali
        ? 'Qorista code hufan, qalad-hagaajinta (debugging), iyo sharaxaadda qaab-dhismeedka software-ka casriga ah.'
        : 'Write clean code, debug syntax errors, architect systems, and learn web/mobile development.',
      prompt: isSomali
        ? 'I tus sida TypeScript iyo React loogu dhiso nidaam maareynaya xaaladda (State Management) oo hufan.'
        : 'Write a TypeScript utility for exponential backoff retry logic with complete type safety and unit test examples.',
    },
    {
      id: 'voice',
      mode: 'standard' as AppMode,
      icon: Mic,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      title: isSomali ? 'Wadahadalka Codka ee Tooska ah' : 'Live Interactive Voice Chat',
      desc: isSomali
        ? 'Si toos ah ugu hadal codkaaga Af-Soomaali ama luqado kale, AI-guna wuxuu kuugu jawaabayaa cod dabiici ah.'
        : 'Speak freely with your microphone and hear articulate voice responses in Somali, English, or Arabic.',
      prompt: '',
      openVoice: true,
    },
    {
      id: 'vision',
      mode: 'study' as AppMode,
      icon: Camera,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      title: isSomali ? 'Falanqeynta Sawirrada & Shaxannada' : 'Multimodal Vision & Documents',
      desc: isSomali
        ? 'Soo geli sawirro ku saabsan su\'aalo xisaabeed, qoraal buug, shaxan saynis, ama screenshots-ka ciladaha code-ka.'
        : 'Upload diagrams, textbook homework questions, or code error screenshots for instant explanation.',
      prompt: isSomali
        ? 'Waxaan doonayaa inaan sawir soo geliyo si aad iigu falanqeyso. Sidee iigu caawin kartaa?'
        : 'I would like to analyze an image. What types of diagrams and documents can you explain?',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e1726] border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {isSomali ? 'Sahami Awoodaha SomGPT AI' : 'Explore SomGPT AI Capabilities'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSomali
                ? 'Dooro mid ka mid ah takhasusyada si aad isla markiiba u bilowdo'
                : 'Select a specialized domain to begin with an optimized configuration'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="flex-1 overflow-y-auto py-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 pr-1">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectFeature(item.mode, item.prompt, item.openVoice);
                  onClose();
                }}
                className="group p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-xl border ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-cyan-400/90 group-hover:text-cyan-300">
                  <span>{isSomali ? 'Bilow hadda' : 'Launch mode'}</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Xir (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
