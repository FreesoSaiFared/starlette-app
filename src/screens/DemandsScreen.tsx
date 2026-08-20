import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Scroll, Heart, Award, ArrowRight, Clock, Star, Gift, Wine } from 'lucide-react';
import { playChime } from '../utils/audio';

interface DemandsScreenProps {
  onReturnToStage: () => void;
  onGoToAuditions: () => void;
}

export const DemandsScreen: React.FC<DemandsScreenProps> = ({ onReturnToStage, onGoToAuditions }) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 text-white">
      {/* Top Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/40 text-[#d4af37] text-xs font-serif uppercase tracking-[0.2em]"
        >
          <Clock size={14} /> The Starlet's Bureau
        </motion.div>

        <h1 className="font-serif text-4xl md:text-5xl font-light text-white tracking-tight italic">
          Coming Soon
        </h1>
        <p className="font-serif text-lg md:text-xl text-amber-200/80 italic font-light">
          The Starlet's whims for this section are still being drafted...
        </p>
        <p className="text-white/50 text-xs md:text-sm font-sans leading-relaxed">
          Her personal vanity demands, capricious midnight champagne requests, and private audience letters are being carefully inscribed by her Parisian valets.
        </p>
      </div>

      {/* Opulent Whims Draft Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-[#0e0e0e] border border-white/10 p-6 rounded-2xl space-y-3 relative overflow-hidden group hover:border-[#d4af37]/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
            <Wine size={20} />
          </div>
          <h3 className="font-serif text-lg text-white font-medium">Midnight Champagne Quests</h3>
          <p className="text-xs text-white/50 font-sans leading-relaxed">
            Satisfy impromptu requests for vintage crystal carafes and Montmartre delicacies to earn massive Tribute surges.
          </p>
          <div className="text-[10px] uppercase tracking-widest text-[#d4af37] font-sans pt-2">
            Draft In Progress • Chapter I
          </div>
        </div>

        <div className="bg-[#0e0e0e] border border-white/10 p-6 rounded-2xl space-y-3 relative overflow-hidden group hover:border-[#d4af37]/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
            <Gift size={20} />
          </div>
          <h3 className="font-serif text-lg text-white font-medium">Secret Admirer Tributes</h3>
          <p className="text-xs text-white/50 font-sans leading-relaxed">
            Unseal perfumed letters and exquisite gifts from high-society patrons and international ambassadors.
          </p>
          <div className="text-[10px] uppercase tracking-widest text-[#d4af37] font-sans pt-2">
            Draft In Progress • Chapter II
          </div>
        </div>

        <div className="bg-[#0e0e0e] border border-white/10 p-6 rounded-2xl space-y-3 relative overflow-hidden group hover:border-[#d4af37]/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
            <Star size={20} />
          </div>
          <h3 className="font-serif text-lg text-white font-medium">Starlet's Royal Decree</h3>
          <p className="text-xs text-white/50 font-sans leading-relaxed">
            High-drama interactive narrative dilemmas testing the director's loyalty, stage direction, and aesthetic discipline.
          </p>
          <div className="text-[10px] uppercase tracking-widest text-[#d4af37] font-sans pt-2">
            Draft In Progress • Chapter III
          </div>
        </div>
      </div>

      {/* Action Navigation CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => {
            playChime(523.25, 'sine', 0.2);
            onReturnToStage();
          }}
          className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full font-serif uppercase tracking-widest text-xs transition-all"
        >
          Return to Stage
        </button>

        <button
          onClick={() => {
            playChime(659.25, 'triangle', 0.3);
            onGoToAuditions();
          }}
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-serif uppercase tracking-widest text-xs font-semibold rounded-full hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all"
        >
          <Sparkles size={16} /> Audition & Hire Dancers
        </button>
      </div>
    </div>
  );
};
