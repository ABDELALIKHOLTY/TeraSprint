import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 4500);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#09090b] transition-all duration-500 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Ambient glowing orbs (Light and Dark adapted) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-400/10 dark:bg-cyan-600/10 blur-[150px] animate-pulse pointer-events-none"></div>

      {/* The Dynamic Logo Container */}
      <div className="relative flex items-center justify-center h-48 w-full overflow-hidden">
        
        {/* TERA (Slide in from Right) */}
        <div className="flex text-7xl font-bold tracking-tight text-gray-800 dark:text-gray-100 mr-4 animate-[slideFromRight_1.5s_cubic-bezier(0.16,1,0.3,1)_forwards]" style={{ transform: 'translateX(300px)', opacity: 0 }}>
          Tera
        </div>

        {/* GIANT 'S' SVG Dynamic */}
        <div className="relative z-10 drop-shadow-2xl mx-2 animate-[giantS_2.5s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <svg width="72" height="96" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sGradSplash" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <filter id="shadowSSplash">
                <feDropShadow dx="4" dy="8" stdDeviation="6" floodOpacity="0.4" />
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feOffset dy="2" dx="2" />
                <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
                <feFlood floodColor="white" floodOpacity="0.6" />
                <feComposite in2="shadowDiff" operator="in" />
                <feComposite in2="SourceGraphic" operator="over" />
              </filter>
            </defs>
            <path 
              d="M 80,40 C 80,10 20,10 20,40 C 20,65 80,65 80,90 C 80,120 20,120 20,90" 
              stroke="url(#sGradSplash)" 
              strokeWidth="24" 
              strokeLinecap="round" 
              style={{ filter: 'url(#shadowSSplash)' }}
            />
          </svg>
        </div>

        {/* PRINT (Slide in from Left) */}
        <div className="flex text-7xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400 ml-4 animate-[slideFromLeft_1.5s_cubic-bezier(0.16,1,0.3,1)_forwards]" style={{ transform: 'translateX(-300px)', opacity: 0 }}>
          print
        </div>
      </div>

      <div className="mt-12 text-center animate-[fadeInUp_1s_ease-out_3s_forwards] opacity-0">
        <h1 className="text-xl font-bold text-gray-500 dark:text-gray-300 tracking-[0.2em] uppercase">
          AI Project Intelligence
        </h1>
        <div className="mt-8 w-64 mx-auto">
          <div className="h-[2px] w-full bg-gray-200 dark:bg-[#27272a] overflow-hidden relative rounded-full">
            <div className="absolute top-0 left-0 h-full bg-cyan-500 animate-[progress_1.5s_cubic-bezier(0.65,0,0.35,1)_3s_forwards]" style={{ width: '0%', boxShadow: '0 0 10px rgba(6,182,212,0.5)' }}></div>
          </div>
          <p className="mt-4 text-[10px] font-mono text-cyan-600/80 dark:text-cyan-500/80 tracking-widest uppercase">
            Initialisation de l'Assistant TeraSprint
          </p>
        </div>
      </div>

      <style>{`
        @keyframes plaqueReveal {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideFromRight {
          0% { transform: translateX(100px); opacity: 0; }
          100% { transform: translateX(0px); opacity: 1; }
        }
        @keyframes slideFromLeft {
          0% { transform: translateX(-100px); opacity: 0; }
          100% { transform: translateX(0px); opacity: 1; }
        }
        @keyframes giantS {
          0% { transform: scale(4); opacity: 0; filter: blur(20px); }
          50% { transform: scale(1); opacity: 1; filter: blur(0px); }
          100% { transform: scale(1); opacity: 1; filter: blur(0px); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
