import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Square, FastForward } from 'lucide-react';

interface AudioPlayerBarProps {
  text: string;
  voice?: string;
  language?: string;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  text,
  voice = 'Kore',
  language = 'so',
  isPlaying,
  onPlayStateChange,
}) => {
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<any>(null);

  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Code omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~\[\]]/g, '')
    .trim()
    .slice(0, 1000);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setProgress(0);
    onPlayStateChange(false);
  };

  const togglePlay = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    onPlayStateChange(true);
    setProgress(5);

    try {
      // First attempt server-side TTS
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audio.playbackRate = playbackSpeed;
          audioRef.current = audio;

          audio.ontimeupdate = () => {
            if (audio.duration) {
              setProgress((audio.currentTime / audio.duration) * 100);
            }
          };

          audio.onended = () => {
            stopPlayback();
          };

          audio.onerror = () => {
            playBrowserFallback();
          };

          await audio.play();
          return;
        }
      }
      playBrowserFallback();
    } catch {
      playBrowserFallback();
    }
  };

  const playBrowserFallback = () => {
    if (!window.speechSynthesis) {
      stopPlayback();
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 450));
    utterance.rate = playbackSpeed;
    if (language === 'ar') utterance.lang = 'ar-SA';
    else if (language === 'so') utterance.lang = 'so-SO';
    else utterance.lang = 'en-US';

    const words = cleanText.split(/\s+/).length;
    const estSeconds = Math.max((words / 2.5) / playbackSpeed, 3);
    const start = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.min((elapsed / estSeconds) * 100, 95);
      setProgress(pct);
    }, 200);

    utterance.onend = () => {
      stopPlayback();
    };

    utterance.onerror = () => {
      stopPlayback();
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  return (
    <div className="mt-3 p-2.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-md">
      {/* Play/Pause Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
          }`}
          title={isPlaying ? 'Pause' : 'Play Voice'}
        >
          {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="flex items-center gap-1.5">
          <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="text-xs font-semibold text-slate-300">
            {isPlaying
              ? language === 'so' ? 'Dhageyso...' : 'Speaking...'
              : language === 'so' ? 'Ku dhageyso cod' : 'Listen with Voice'}
          </span>
        </div>
      </div>

      {/* Dynamic Sound Wave Visualizer */}
      {isPlaying ? (
        <div className="flex-1 max-w-[120px] sm:max-w-[180px] flex items-center justify-center gap-1 h-5 mx-2">
          {[0.4, 0.9, 1.4, 0.7, 1.2, 0.5, 1.3, 0.8, 1.5, 0.6].map((h, i) => (
            <span
              key={i}
              className="w-1 bg-cyan-400 rounded-full animate-voice-wave"
              style={{
                height: `${h * 14}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 mx-2 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[150px]">
          <div
            className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Speed & Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggleSpeed}
          className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-cyan-300 bg-slate-800/80 hover:bg-slate-800 transition-colors"
          title="Playback speed"
        >
          {playbackSpeed}x
        </button>
        {isPlaying && (
          <button
            onClick={stopPlayback}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
            title="Stop audio"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
