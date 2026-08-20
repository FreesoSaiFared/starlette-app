import React from 'react';
import { Menu, Settings, Theater, Calendar, BarChart3, VenetianMask } from 'lucide-react';
import { motion } from 'motion/react';
import { GameView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: GameView;
  onViewChange: (view: GameView) => void;
  starletPortrait?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange, starletPortrait }) => {
  return (
    <div className="min-h-screen flex flex-col relative wallpaper-grain">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/10">
        <div className="flex justify-between items-center w-full px-12 py-8">
          <button className="text-white/60 hover:text-white transition-all">
            <Menu size={24} />
          </button>
          <div className="text-2xl tracking-tighter uppercase font-light font-serif cursor-pointer" 
              onClick={() => onViewChange('stage')}>
            AURELIAN <span className="text-[#d4af37]">/</span> STARLET
          </div>
          <div className="flex items-center gap-6">
            <button className="text-white/60 hover:text-[#d4af37] transition-all text-[10px] uppercase tracking-[0.2em] font-sans font-medium">
              Inquiry
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow pt-24 pb-32">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl flex justify-around items-center px-4 pt-4 pb-8">
        <NavButton 
          icon={<Theater size={20} />} 
          label="Stage" 
          active={activeView === 'stage'} 
          onClick={() => onViewChange('stage')} 
        />
        <NavButton 
          icon={<Calendar size={20} />} 
          label="Demands" 
          active={activeView === 'demands'} 
          onClick={() => onViewChange('demands')} 
        />
        <NavButton 
          icon={<BarChart3 size={20} />} 
          label="Applause" 
          active={activeView === 'mirror'} 
          onClick={() => onViewChange('mirror')} 
        />
        <NavButton 
          icon={<VenetianMask size={20} />} 
          label="Wardrobe" 
          active={activeView === 'wardrobe'} 
          onClick={() => onViewChange('wardrobe')} 
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
    className={`flex flex-col items-center justify-center transition-all duration-300 px-4 py-2 ${
      active ? 'text-[#d4af37]' : 'text-white/60 hover:text-white'
    }`}
  >
    <div className="mb-2 opacity-80">{icon}</div>
    <span className="font-sans text-[10px] uppercase tracking-[0.2em] font-medium">{label}</span>
  </button>
);
