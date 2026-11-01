import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  AlertCircle,
  Globe,
  Sparkles,
} from 'lucide-react';
import { AppLanguage } from '../types';
import { translations } from '../utils/translations';
import { BrandLogo } from './BrandLogo';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onSendMessage: (text: string) => Promise<string | undefined>;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  onSendMessage,
}) => {
  const t = translations[language].voiceModal;
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopAllVoiceActivity();
      setTranscript('');
      setAiResponseText('');
      setVoiceState('idle');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const stopAllVoiceActivity = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Start speech recognition
  const startListening = async () => {
    setErrorMessage(null);
    setTranscript('');
    setAiResponseText('');

    // Check for browser SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        // Language code mapping
        const langCodes: Record<AppLanguage, string> = {
          so: 'so-SO',
          en: 'en-US',
          ar: 'ar-SA',
        };
        recognition.lang = langCodes[language] || 'en-US';

        recognition.onstart = () => {
          setVoiceState('listening');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = async (event: any) => {
          console.warn('SpeechRecognition error, attempting media fallback:', event.error);
          if (event.error === 'not-allowed') {
            setVoiceState('error');
            setErrorMessage(t.micPermissionNote);
          } else {
            // Try recorder fallback
            startMediaRecorderFallback();
          }
        };

        recognition.onend = () => {
          // If we captured something, process it
          setTranscript((latest) => {
            if (latest.trim()) {
              handleUserSpeechFinished(latest.trim());
            } else {
              setVoiceState('idle');
            }
            return latest;
          });
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Failed to start SpeechRecognition:', err);
        startMediaRecorderFallback();
      }
    } else {
      // Browser doesn't have Web Speech API; use MediaRecorder + Gemini Transcribe
      startMediaRecorderFallback();
    }
  };

  // MediaRecorder Fallback using /api/transcribe
  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (audioBlob.size < 500) {
          setVoiceState('idle');
          return;
        }

        setVoiceState('processing');
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: 'audio/webm',
              }),
            });
            const data = await res.json();
            if (data.text) {
              setTranscript(data.text);
              handleUserSpeechFinished(data.text);
            } else {
              setVoiceState('idle');
            }
          };
        } catch {
          setVoiceState('idle');
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setVoiceState('listening');

      // Auto stop after 7 seconds of speaking or on silence
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 7000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setVoiceState('error');
      setErrorMessage(t.micPermissionNote);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  // When speech is done, send to SomGPT chat and speak result
  const handleUserSpeechFinished = async (spokenText: string) => {
    setVoiceState('processing');
    try {
      const answer = await onSendMessage(spokenText);
      if (answer && answer.trim()) {
        setAiResponseText(answer);
        if (!isMuted) {
          await playAiSpeech(answer);
        } else {
          setVoiceState('idle');
        }
      } else {
        setVoiceState('idle');
      }
    } catch (err: any) {
      console.error('Error in voice chat:', err);
      setVoiceState('error');
      setErrorMessage('Could not generate response. Please try again.');
    }
  };

  // Play spoken response via server TTS (gemini-3.8-flash-lite-tts) or browser fallback
  const playAiSpeech = async (text: string) => {
    setVoiceState('speaking');

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: 'Kore',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audioPlayerRef.current = audio;

          audio.onended = () => {
            setVoiceState('idle');
          };
          audio.onerror = () => {
            fallbackSpeechSynthesis(text);
          };

          await audio.play();
          return;
        }
      }
      fallbackSpeechSynthesis(text);
    } catch {
      fallbackSpeechSynthesis(text);
    }
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if (!window.speechSynthesis) {
      setVoiceState('idle');
      return;
    }
    window.speechSynthesis.cancel();

    // Clean markdown symbols
    const clean = text.replace(/[*#`_\[\]]/g, '').slice(0, 400);
    const utterance = new SpeechSynthesisUtterance(clean);

    if (language === 'ar') utterance.lang = 'ar-SA';
    else if (language === 'so') utterance.lang = 'so-SO';
    else utterance.lang = 'en-US';

    utterance.onend = () => {
      setVoiceState('idle');
    };
    utterance.onerror = () => {
      setVoiceState('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0e1626] to-[#070b14] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col items-center">
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between mb-4">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 text-xs text-slate-300">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as AppLanguage)}
              className="bg-transparent text-xs text-cyan-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="so" className="bg-slate-900 text-slate-200">Af-Soomaali</option>
              <option value="en" className="bg-slate-900 text-slate-200">English</option>
              <option value="ar" className="bg-slate-900 text-slate-200">العربية</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted && audioPlayerRef.current) {
                  audioPlayerRef.current.pause();
                }
              }}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title={t.exitVoice}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Orb / Visualizer */}
        <div className="my-8 relative flex items-center justify-center">
          {/* Animated Glow Rings */}
          <div
            className={`absolute w-44 h-44 rounded-full transition-all duration-700 ${
              voiceState === 'listening'
                ? 'bg-cyan-500/20 scale-125 animate-ping'
                : voiceState === 'speaking'
                ? 'bg-emerald-500/20 scale-125 animate-pulse'
                : voiceState === 'processing'
                ? 'bg-blue-500/20 scale-110 animate-spin'
                : 'bg-slate-700/10 scale-100'
            }`}
          />
          <div
            className={`absolute w-36 h-36 rounded-full blur-xl transition-all duration-500 ${
              voiceState === 'listening'
                ? 'bg-cyan-400/30'
                : voiceState === 'speaking'
                ? 'bg-emerald-400/30'
                : voiceState === 'processing'
                ? 'bg-blue-400/30'
                : 'bg-transparent'
            }`}
          />

          {/* Interactive Mic / State Button */}
          <button
            onClick={() => {
              if (voiceState === 'listening') {
                stopListening();
              } else if (voiceState === 'speaking') {
                stopAllVoiceActivity();
                setVoiceState('idle');
              } else {
                startListening();
              }
            }}
            className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
              voiceState === 'listening'
                ? 'bg-gradient-to-tr from-cyan-600 to-teal-400 text-slate-950 scale-105 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                : voiceState === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 scale-105 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                : voiceState === 'processing'
                ? 'bg-slate-800 border-2 border-cyan-400/50 text-cyan-400'
                : 'bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 hover:scale-105'
            }`}
          >
            {voiceState === 'listening' ? (
              <Mic className="w-10 h-10 animate-bounce" />
            ) : voiceState === 'speaking' ? (
              <Volume2 className="w-10 h-10 animate-pulse" />
            ) : voiceState === 'processing' ? (
              <Sparkles className="w-9 h-9 animate-spin" />
            ) : (
              <Mic className="w-9 h-9" />
            )}
          </button>
        </div>

        {/* Dynamic Sound Wave Bars */}
        {voiceState === 'listening' && (
          <div className="flex items-center justify-center gap-1.5 h-8 my-2">
            {[0.4, 0.8, 1.2, 0.6, 1.5, 0.9, 1.3, 0.5, 1.1, 0.7].map((height, i) => (
              <span
                key={i}
                className="w-1 bg-cyan-400 rounded-full animate-voice-wave"
                style={{
                  height: `${height * 18}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {voiceState === 'speaking' && (
          <div className="flex items-center justify-center gap-1.5 h-8 my-2">
            {[0.5, 1.1, 0.7, 1.4, 0.9, 1.3, 0.6, 1.2, 0.8, 0.4].map((height, i) => (
              <span
                key={i}
                className="w-1 bg-emerald-400 rounded-full animate-voice-wave"
                style={{
                  height: `${height * 18}px`,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Status Message */}
        <div className="mt-3 text-sm font-semibold tracking-wide">
          {voiceState === 'listening' && (
            <span className="text-cyan-400 flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              {t.listening}
            </span>
          )}
          {voiceState === 'processing' && (
            <span className="text-blue-400 flex items-center gap-1.5 justify-center">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              {t.processing}
            </span>
          )}
          {voiceState === 'speaking' && (
            <span className="text-emerald-400 flex items-center gap-1.5 justify-center">
              <Volume2 className="w-3.5 h-3.5" />
              {t.speaking}
            </span>
          )}
          {voiceState === 'idle' && (
            <span className="text-slate-300">
              {transcript ? 'Taabo makarafoonka si aad u sii hadasho' : t.tapToStart}
            </span>
          )}
          {voiceState === 'error' && (
            <span className="text-rose-400 flex items-center gap-1.5 justify-center">
              <AlertCircle className="w-4 h-4" />
              {errorMessage || 'Khalad ayaa dhacay'}
            </span>
          )}
        </div>

        {/* Live Transcript / Response Preview */}
        <div className="w-full mt-5 min-h-[90px] max-h-48 overflow-y-auto p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left text-sm leading-relaxed">
          {transcript && (
            <div className="mb-2">
              <span className="text-xs font-semibold text-cyan-400 block mb-0.5">
                {language === 'so' ? 'Adiga:' : language === 'ar' ? 'أنت:' : 'You:'}
              </span>
              <p className="text-slate-200">{transcript}</p>
            </div>
          )}

          {aiResponseText && (
            <div className="mt-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-emerald-400 block mb-0.5">
                SomGPT AI:
              </span>
              <p className="text-slate-300 text-xs sm:text-sm line-clamp-4">
                {aiResponseText}
              </p>
            </div>
          )}

          {!transcript && !aiResponseText && (
            <div className="text-center text-slate-500 text-xs py-4">
              {t.sub}
            </div>
          )}
        </div>

        {/* Bottom Action Button */}
        <div className="mt-6 flex items-center gap-3 w-full">
          <button
            onClick={() => {
              if (voiceState === 'listening') {
                stopListening();
              } else {
                startListening();
              }
            }}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md transition-all flex items-center justify-center gap-2"
          >
            {voiceState === 'listening' ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>{t.tapToStop}</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>{t.tapToStart}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
