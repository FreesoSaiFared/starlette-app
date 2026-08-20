import React from 'react';
import { AlertCircle, Gift, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Crisis } from '../types';

interface CrisisOverlayProps {
  crisis: Crisis | null;
  onSolve: (id: string) => void;
  onClose: () => void;
}

export const CrisisOverlay: React.FC<CrisisOverlayProps> = ({ crisis, onSolve, onClose }) => {
  return (
    <AnimatePresence>
      {crisis && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="w-full max-w-2xl bg-[#050505] border border-white/10 flex flex-col items-center p-12 text-center shadow-2xl relative"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            {/* Character in Crisis */}
            <div className="w-48 h-64 border border-white/10 mb-8 overflow-hidden">
              <img 
                src={crisis.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuBVWgjluHEiGwb3AXnB6LctO3yfad7OyvKH-k1es_c86lTiiXbt3OPuqtXaqoxwTuhQZkeixi8VJ8HeTVRDhwR7aoHowSFPpC8OzoATKY_gYy_Ok8gA-dT2R71YEYyGijloUh_kwxa4MvAkG9MoNzWMF6-XrHV5qewMz7dIQAHWiB8xIpzza1l9x8MPGkvKAbLB69h9r9kPCcuBe_kK6okLZaMM4AKkqDfsemWUIJeIXPW0ZE70zon92RQL58oqngOxLeSGbnW-4vo"} 
                alt="Crisis" 
                className="w-full h-full object-cover opacity-80" 
              />
            </div>

            <span className="font-sans text-[11px] uppercase tracking-[0.4em] text-[#d4af37] block mb-4">
              Stage Crisis Detected
            </span>
            <h2 className="text-3xl font-light text-white italic tracking-tight mb-8">
              Stage Fright: {crisis.level}
            </h2>

            {/* Severity Bar */}
            <div className="w-full h-[1px] bg-white/10 mb-8 relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: crisis.level === 'CRITICAL' ? '95%' : crisis.level === 'MEDIUM' ? '60%' : '30%' }}
                className="absolute left-0 top-0 h-full bg-[#d4af37]"
              />
            </div>

            <div className="mb-12">
              <p className="text-xl text-white/50 leading-relaxed font-light italic mb-6">
                "{crisis.message}"
              </p>
              <p className="text-sm text-white/30 font-light leading-relaxed">
                Our star is having a breakdown behind the velvet curtains. If she doesn't go on soon, the exhibition is over.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-6 w-full items-center">
              <button 
                onClick={() => onSolve(crisis.id)}
                className="sophisticated-button w-full flex gap-3"
              >
                <Gift size={16} />
                Emergency Gift (Instant Solve)
              </button>
              
              <button 
                onClick={onClose}
                className="text-[10px] uppercase tracking-[0.2em] font-sans text-white/40 hover:text-white transition-colors"
              >
                Ignore (Risk Meltdown)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
