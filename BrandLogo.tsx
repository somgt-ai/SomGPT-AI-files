import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  isAnimated?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  isAnimated = false,
}) => {
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const s = iconSizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-[#0d1829] to-[#042838] border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] overflow-hidden shrink-0 ${sizeMap[size].split(' ')[0]} ${sizeMap[size].split(' ')[1]} ${isAnimated ? 'animate-pulse-subtle' : ''}`}
      >
        {/* Subtle AI Grid Background */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:6px_6px]" />

        {/* SVG Graphic with SG and AI Neural Node Rings */}
        <svg
          width={s}
          height={s}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 p-1"
        >
          <defs>
            <linearGradient id="sgGradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="0.5" stopColor="#06b6d4" />
              <stop offset="1" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="orbitalGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="1" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* AI Neural Circuit Ring */}
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="url(#orbitalGradient)"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            className={isAnimated ? 'animate-spin' : ''}
            style={{ transformOrigin: '50% 50%', animationDuration: '24s' }}
          />

          {/* Synaptic AI Nodes */}
          <circle cx="50" cy="8" r="3.5" fill="#38bdf8" filter="url(#glow)" />
          <circle cx="85" cy="72" r="3" fill="#10b981" filter="url(#glow)" />
          <circle cx="15" cy="72" r="3" fill="#06b6d4" filter="url(#glow)" />

          {/* Center Connection Lines */}
          <path d="M50 8 L50 20 M85 72 L73 63 M15 72 L27 63" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4" />

          {/* Central Bold SG Monogram */}
          <g filter="url(#glow)">
            {/* 'S' Letter */}
            <path
              d="M38 34 C38 29, 32 28, 28 28 C22 28, 18 31, 18 36 C18 43, 38 43, 38 52 C38 60, 31 63, 26 63 C19 63, 16 58, 16 54"
              stroke="url(#sgGradient)"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 'G' Letter */}
            <path
              d="M74 38 C70 30, 62 28, 54 28 C44 28, 38 35, 38 45.5 C38 56, 44 63, 54 63 C63 63, 72 58, 73 50 L56 50"
              stroke="url(#sgGradient)"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Center Sparkle AI Diamond */}
          <polygon
            points="82,24 85,30 91,33 85,36 82,42 79,36 73,33 79,30"
            fill="#38bdf8"
            opacity="0.9"
            filter="url(#glow)"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight text-slate-100 dark:text-white font-['Plus_Jakarta_Sans'] text-base md:text-lg">
              SomGPT
            </span>
            <span className="text-[10px] md:text-xs font-semibold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
              AI
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">
            Intelligent Multimodal Assistant
          </span>
        </div>
      )}
    </div>
  );
};
