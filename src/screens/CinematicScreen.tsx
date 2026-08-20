import React from 'react';
import { FastForward, Clapperboard } from 'lucide-react';
import { motion } from 'motion/react';

interface CinematicScreenProps {
  onSkip: () => void;
}

export const CinematicScreen: React.FC<CinematicScreenProps> = ({ onSkip }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-hidden cursor-pointer" onClick={onSkip}>
      {/* Cinematic Content */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBF53flSaK0vLT2UM6ZsWyZKc0vmQRp5oA6PJWWsY_VxnCS7ziGAS57Frsxcw5jpdr2d8E0iCH22z29lNQ7XCoBZ5qrYwJ7UFaIpEPC6SaE-kDYPVQXTWXp1UTiEO7Sso6v1h1zxiLCZuR4tY_oJvSlBOne2M2zkdvEc1yJ0D7VyaPUqP3-zKFn2WUDgqpphFdZrLMlzmrmq5tTFFWz05V4empEGKIuAWigVpn6yGO6RSjU9saQDctrKjxYENfzB0Ez8WFRC3Us8ww" 
          alt="Cinematic Intro" 
          className="w-full h-full object-cover"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
        <div className="absolute inset-0 bg-[#050505] opacity-50" />
      </div>

      {/* Film Effects */}
      <div className="film-grain" />

      {/* UI Elements */}
      <div className="absolute inset-0 z-30 flex flex-col justify-between p-12 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.5, y: 0 }}
          className="flex items-center gap-2"
        >
          <Clapperboard size={16} />
          <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-white/50">ARCHIVE / VISUALS</span>
        </motion.div>

        <div className="flex justify-end items-end">
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="pointer-events-auto flex items-center gap-3 hover:text-white transition-all group text-white/60"
          >
            <span className="font-sans text-[11px] uppercase tracking-[0.2em]">Skip Intro</span>
            <FastForward size={14} className="group-hover:text-white transition-colors" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
