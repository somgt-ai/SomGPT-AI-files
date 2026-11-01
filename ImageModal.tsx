import React, { useState } from 'react';
import {
  X,
  Download,
  Edit2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { GeneratedImage } from '../types';
import { downloadImage } from '../utils/imageUtils';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImage | null;
  onEditImage?: (image: GeneratedImage) => void;
  onGenerateVariation?: (prompt: string, style?: string) => void;
  language?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  image,
  onEditImage,
  onGenerateVariation,
  language = 'so',
}) => {
  const [scale, setScale] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !image) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 2.5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.75));

  const displayUrl = showOriginal && image.originalImageUrl ? image.originalImageUrl : image.url;
  const isSomali = language === 'so';

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[96vh] bg-[#0c121e] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 bg-[#080d16]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-100 block truncate">
                {image.isEdited
                  ? isSomali ? 'Sawirka AI-ga Lagu Hagaajiyay' : 'AI Enhanced & Edited Image'
                  : isSomali ? 'Sawir Dhab ah oo SomGPT AI Abuurtay' : 'SomGPT AI Photorealistic Image'}
              </span>
              <span className="text-[11px] text-slate-400 block truncate max-w-xs sm:max-w-md">
                {image.prompt}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Copy Prompt */}
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Copy Prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copied ? (isSomali ? 'La nuulmeeyay' : 'Copied') : (isSomali ? 'Nuulmee' : 'Copy Prompt')}</span>
            </button>

            {/* Compare Original Toggle */}
            {image.originalImageUrl && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showOriginal
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {showOriginal
                    ? isSomali ? 'Midka Cusub' : 'View Edited'
                    : isSomali ? 'Asalka (Original)' : 'Compare Original'}
                </span>
              </button>
            )}

            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:block"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:block"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Download */}
            <button
              onClick={() => downloadImage(image.url, `somgpt-photo-${Date.now()}.jpg`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white transition-all shadow-md active:scale-95"
              title="Download image"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isSomali ? 'Degso' : 'Download'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Display Canvas */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60 min-h-[300px] sm:min-h-[420px]">
          <div
            className="transition-transform duration-200 origin-center max-w-full max-h-full"
            style={{ transform: `scale(${scale})` }}
          >
            <img
              src={displayUrl}
              alt={image.prompt}
              className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800/80 bg-[#05080f]"
            />
          </div>
        </div>

        {/* Footer Actions Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-[#080d16] flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold">
              📸 {image.style ? image.style.toUpperCase() : 'PHOTOREALISTIC'}
            </span>
            {image.aspectRatio && (
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-400 border border-slate-700">
                {image.aspectRatio}
              </span>
            )}
            {image.isEdited && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-[11px] text-emerald-300 border border-emerald-500/30">
                {isSomali ? 'La Hagaajiyay' : 'AI Enhanced'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Generate Variation */}
            {onGenerateVariation && (
              <button
                onClick={() => {
                  onGenerateVariation(image.prompt, image.style);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isSomali ? 'Abuur Mid Kale (Variation)' : 'Generate Variation'}</span>
              </button>
            )}

            {/* Edit Image */}
            {onEditImage && (
              <button
                onClick={() => {
                  onEditImage(image);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-semibold transition-all active:scale-95 shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isSomali ? 'Hagaaji (Edit)' : 'Edit Image'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
