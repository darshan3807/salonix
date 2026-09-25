import React from 'react';

interface SalonVisualProps {
  name: string;
  category?: string;
  city?: string;
  accentColor?: string;
  className?: string;
  aspect?: '16:9' | '4:3' | '3:2' | '1:1';
}

export const SalonVisual: React.FC<SalonVisualProps> = ({
  name,
  category = 'Unisex Luxury Salon',
  city = 'Pune',
  accentColor = '#6B21A8',
  className = '',
  aspect = '4:3',
}) => {
  const aspectClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '3:2': 'aspect-[3/2]',
    '1:1': 'aspect-square',
  }[aspect];

  // Distinct styled themes based on salon name
  const isAura = name.toLowerCase().includes('aura');
  const isBloom = name.toLowerCase().includes('bloom') || name.toLowerCase().includes('blush');
  const isMen = name.toLowerCase().includes('groom') || name.toLowerCase().includes('men');
  const isEnvi = name.toLowerCase().includes('envi');

  return (
    <div
      className={`relative overflow-hidden w-full ${aspectClass} select-none bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 ${className}`}
    >
      {/* Background Architectural Patterns */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`grad-${name.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id={`glow-${name.replace(/\s+/g, '')}`} cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="400" height="300" fill={`url(#grad-${name.replace(/\s+/g, '')})`} />
        <circle cx="200" cy="80" r="140" fill={`url(#glow-${name.replace(/\s+/g, '')})`} />

        {/* Salon Interior Line Art Geometry */}
        {/* Salon Floor perspective */}
        <polygon points="0,300 400,300 350,210 50,210" fill="#0F172A" opacity="0.6" />
        <line x1="50" y1="210" x2="0" y2="300" stroke="#334155" strokeWidth="1" />
        <line x1="125" y1="210" x2="100" y2="300" stroke="#334155" strokeWidth="1" />
        <line x1="200" y1="210" x2="200" y2="300" stroke="#334155" strokeWidth="1" />
        <line x1="275" y1="210" x2="300" y2="300" stroke="#334155" strokeWidth="1" />
        <line x1="350" y1="210" x2="400" y2="300" stroke="#334155" strokeWidth="1" />

        {/* Mirrors & Stations */}
        <rect x="70" y="70" width="70" height="120" rx="35" fill="#1E293B" stroke="#A855F7" strokeWidth="1.5" opacity="0.85" />
        <rect x="165" y="60" width="70" height="130" rx="35" fill="#1E293B" stroke="#E9D5FF" strokeWidth="1.5" opacity="0.95" />
        <rect x="260" y="70" width="70" height="120" rx="35" fill="#1E293B" stroke="#A855F7" strokeWidth="1.5" opacity="0.85" />

        {/* Floating Styling Lights / Chandeliers */}
        <circle cx="105" cy="50" r="6" fill="#FEF08A" opacity="0.9" />
        <line x1="105" y1="0" x2="105" y2="44" stroke="#64748B" strokeWidth="1" />
        <circle cx="200" cy="40" r="8" fill="#FEF08A" opacity="0.95" />
        <line x1="200" y1="0" x2="200" y2="32" stroke="#64748B" strokeWidth="1" />
        <circle cx="295" cy="50" r="6" fill="#FEF08A" opacity="0.9" />
        <line x1="295" y1="0" x2="295" y2="44" stroke="#64748B" strokeWidth="1" />

        {/* Styling Chair silhouettes */}
        <rect x="180" y="165" width="40" height="35" rx="6" fill="#475569" opacity="0.9" />
        <rect x="195" y="200" width="10" height="25" fill="#94A3B8" />
        <ellipse cx="200" cy="225" rx="20" ry="5" fill="#64748B" />

        {/* Plants & Aesthetics */}
        <path d="M 340,195 Q 350,175 358,160 Q 365,180 340,195" fill="#10B981" opacity="0.8" />
        <path d="M 335,195 Q 325,175 320,165 Q 330,180 335,195" fill="#059669" opacity="0.8" />
        <rect x="330" y="195" width="16" height="20" rx="2" fill="#E2E8F0" opacity="0.7" />
      </svg>

      {/* Atmospheric Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

      {/* Salon Badge / Overlay Meta */}
      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between z-10 pointer-events-none">
        <div>
          <span className="text-[11px] font-medium tracking-wider uppercase text-purple-200 block drop-shadow-sm">
            {city} · {category}
          </span>
          <h4 className="text-white font-display font-semibold text-lg drop-shadow-md leading-tight mt-0.5">
            {name}
          </h4>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/20 text-white text-xs font-medium">
          {isAura ? 'Luxury Spa' : isBloom ? 'Boutique' : isMen ? 'Barbershop' : isEnvi ? 'Studio' : 'Salon'}
        </div>
      </div>
    </div>
  );
};
