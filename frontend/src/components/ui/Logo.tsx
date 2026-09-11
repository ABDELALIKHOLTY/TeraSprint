import React from 'react';

interface LogoProps {
  className?: string;
  scale?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', scale = 1 }) => {
  return (
    <div 
      className={`relative flex items-center select-none ${className}`}
      style={{ transform: `scale(${scale})`, transformOrigin: 'center left' }}
    >
      <div className="relative flex items-center">
        
        {/* Texte "Tera" */}
        <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100 mr-1 transition-colors">
          Tera
        </span>

        {/* Le 'S' 3D dynamique en SVG (Géométrie parfaite) */}
        <div className="relative z-10 drop-shadow-xl mx-0.5">
          <svg width="24" height="32" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan */}
                <stop offset="50%" stopColor="#3b82f6" /> {/* Blue */}
                <stop offset="100%" stopColor="#1e3a8a" /> {/* Dark Blue */}
              </linearGradient>
              <filter id="shadowS">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                <feOffset dy="1" dx="1" />
                <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
                <feFlood floodColor="white" floodOpacity="0.5" />
                <feComposite in2="shadowDiff" operator="in" />
                <feComposite in2="SourceGraphic" operator="over" />
              </filter>
            </defs>
            
            {/* Chemin unique, fluide et épais */}
            <path 
              d="M 80,40 C 80,10 20,10 20,40 C 20,65 80,65 80,90 C 80,120 20,120 20,90" 
              stroke="url(#sGrad)" 
              strokeWidth="24" 
              strokeLinecap="round" 
              style={{ filter: 'url(#shadowS)' }}
            />
          </svg>
        </div>

        {/* Texte "print" */}
        <span className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400 ml-0.5 transition-colors">
          print
        </span>
      </div>
    </div>
  );
};

