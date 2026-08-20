import React from 'react';
import { Theater, Sparkles, Users, VenetianMask, Clock, Sliders } from 'lucide-react';
import { GameView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: GameView;
  onViewChange: (view: GameView) => void;
  starletPortrait?: string;
  tribute?: number;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeView,
  onViewChange,
  tribute = 0,
}) => {
  return (
    <div className="min-h-screen flex flex-col relative wallpaper-grain bg-[#050505] text-white">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/10">
        <div className="flex justify-between items-center w-full px-6 md:px-12 py-4">
          <div
            className="text-xl md:text-2xl tracking-tighter uppercase font-light font-serif cursor-pointer select-none"
            onClick={() => onViewChange('stage')}
          >
            AURELIAN <span className="text-[#d4af37]">/</span> STARLET
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-mono text-[#d4af37]">
              <span>{tribute.toLocaleString()} Tribute</span>
            </div>
            <button
              onClick={() => onViewChange('studio')}
              className={`text-[10px] uppercase tracking-[0.2em] font-sans font-medium flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                activeView === 'studio'
                  ? 'bg-[#d4af37] text-black border-[#d4af37]'
                  : 'bg-white/5 border-white/10 text-[#d4af37] hover:border-[#d4af37]'
              }`}
            >
              <Sliders size={13} /> Studio
            </button>
            <button
              onClick={() => onViewChange('auditions')}
              className="text-[#d4af37] hover:text-white transition-all text-[10px] uppercase tracking-[0.2em] font-sans font-medium flex items-center gap-1.5 hidden sm:flex"
            >
              <Sparkles size={13} /> Auditions
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow pt-24 pb-32">{children}</main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl flex justify-around items-center px-2 sm:px-6 pt-3 pb-6">
        <NavButton
          icon={<Theater size={19} />}
          label="Stage"
          active={activeView === 'stage'}
          onClick={() => onViewChange('stage')}
        />
        <NavButton
          icon={<Sparkles size={19} />}
          label="Auditions"
          active={activeView === 'auditions'}
          onClick={() => onViewChange('auditions')}
        />
        <NavButton
          icon={<Sliders size={19} />}
          label="Studio"
          active={activeView === 'studio'}
          onClick={() => onViewChange('studio')}
        />
        <NavButton
          icon={<Users size={19} />}
          label="Troupe"
          active={activeView === 'troupe'}
          onClick={() => onViewChange('troupe')}
        />
        <NavButton
          icon={<VenetianMask size={19} />}
          label="Wardrobe"
          active={activeView === 'wardrobe'}
          onClick={() => onViewChange('wardrobe')}
        />
        <NavButton
          icon={<Clock size={19} />}
          label="Scenarios"
          active={activeView === 'scenarios' || activeView === 'demands'}
          onClick={() => onViewChange('scenarios')}
        />
      </nav>
    </div>
  );
};

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center transition-all duration-300 px-3 sm:px-4 py-1.5 rounded-lg ${
      active ? 'text-[#d4af37] bg-white/5' : 'text-white/60 hover:text-white'
    }`}
  >
    <div className="mb-1.5 opacity-90">{icon}</div>
    <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-medium whitespace-nowrap">
      {label}
    </span>
  </button>
);
