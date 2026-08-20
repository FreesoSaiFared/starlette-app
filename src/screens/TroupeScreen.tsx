import React from 'react';
import { motion } from 'motion/react';
import { Users, Sparkles, Flame, Heart, Award, ArrowRight, Music, CheckCircle, ShieldCheck } from 'lucide-react';
import { DancerCandidate } from '../types';
import { playChime } from '../utils/audio';

interface TroupeScreenProps {
  tribute: number;
  dancers: DancerCandidate[];
  onToggleStageAssignment: (id: string) => void;
  onGoToAuditions: () => void;
  onRehearseTroupe: () => void;
}

export const TroupeScreen: React.FC<TroupeScreenProps> = ({
  tribute,
  dancers,
  onToggleStageAssignment,
  onGoToAuditions,
  onRehearseTroupe,
}) => {
  const hiredDancers = dancers.filter((d) => d.hired);
  const totalTroupeTps = hiredDancers
    .filter((d) => d.assignedToStage)
    .reduce((acc, curr) => acc + curr.bonusTps, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-[#d4af37]" size={22} />
            <h1 className="font-serif text-2xl md:text-3xl tracking-tight text-white font-light">
              THE BURLESQUE ENSEMBLE
            </h1>
          </div>
          <p className="text-white/60 text-xs md:text-sm font-sans tracking-wide mt-1">
            Manage your hired cabaret starlets, stage choreographies, and ensemble synergies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playChime(659.25, 'triangle', 0.3);
              onRehearseTroupe();
            }}
            disabled={hiredDancers.length === 0}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-xs uppercase font-serif tracking-widest text-[#d4af37] flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Music size={16} /> Call Troupe Rehearsal (+Happiness)
          </button>

          <button
            onClick={onGoToAuditions}
            className="px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-serif text-xs uppercase tracking-widest rounded-xl font-medium hover:brightness-110 shadow-lg flex items-center gap-2 transition-all"
          >
            <Sparkles size={16} /> Audition New Dancers
          </button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0e0e0e] border border-white/10 p-5 rounded-2xl">
          <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">Ensemble Size</div>
          <div className="text-2xl font-serif text-white font-light">
            {hiredDancers.length} <span className="text-xs text-white/40 font-sans">/ {dancers.length} Starlets</span>
          </div>
        </div>

        <div className="bg-[#0e0e0e] border border-[#d4af37]/30 p-5 rounded-2xl">
          <div className="text-[11px] uppercase tracking-widest text-[#d4af37] mb-1">Active Stage Bonus</div>
          <div className="text-2xl font-serif text-[#d4af37] font-light">
            +{totalTroupeTps} <span className="text-xs text-white/50 font-sans">Tribute/sec</span>
          </div>
        </div>

        <div className="bg-[#0e0e0e] border border-white/10 p-5 rounded-2xl">
          <div className="text-[11px] uppercase tracking-widest text-emerald-400 mb-1">Ensemble Synergy</div>
          <div className="text-2xl font-serif text-white font-light">
            {hiredDancers.length > 0 ? `${100 + hiredDancers.length * 15}%` : '100%'}
            <span className="text-xs text-emerald-400/70 font-sans ml-2">Revival Rate</span>
          </div>
        </div>
      </div>

      {/* Roster of Hired Dancers */}
      {hiredDancers.length === 0 ? (
        <div className="bg-[#0c0c0c] border border-dashed border-white/15 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <Users size={48} className="text-white/20" />
          <h2 className="font-serif text-xl text-white">Your Cabaret Troupe is Awaiting Talent</h2>
          <p className="text-white/50 text-xs md:text-sm max-w-md font-sans leading-relaxed">
            Head to the Audition Salon to conduct live voice interviews and hire dazzling cancan soloists, prima donnas, and tap dynamos.
          </p>
          <button
            onClick={onGoToAuditions}
            className="mt-2 px-6 py-3 bg-[#d4af37] text-black font-serif text-xs uppercase tracking-widest rounded-full font-medium hover:brightness-110 transition-all flex items-center gap-2"
          >
            Enter Audition Salon <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hiredDancers.map((dancer) => (
            <motion.div
              key={dancer.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0e0e0e] border border-white/15 hover:border-[#d4af37]/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 shadow-xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-black">
                <img
                  src={dancer.image}
                  alt={dancer.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover filter brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md border border-[#d4af37]/50 px-3 py-1 rounded-full text-[10px] uppercase font-sans tracking-widest text-[#d4af37] flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Under Contract
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-serif text-lg text-white font-medium">{dancer.name}</h3>
                  <div className="text-xs text-[#d4af37] font-sans tracking-wider uppercase">{dancer.stageName}</div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs text-white/60 font-sans line-clamp-2 leading-relaxed mb-3">
                    {dancer.bio}
                  </div>

                  <div className="bg-[#141414] border border-white/10 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-white/70">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Specialty</span>
                      <span className="font-serif text-[#d4af37] text-right truncate max-w-[60%]">
                        {dancer.specialty}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white/70">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Tribute Bonus</span>
                      <span className="font-mono text-emerald-400">+{dancer.bonusTps} / sec</span>
                    </div>
                    <div className="flex justify-between items-center text-white/70">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Voice Type</span>
                      <span className="text-white/80">{dancer.voiceName} (Parisian)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onToggleStageAssignment(dancer.id)}
                    className={`w-full py-2.5 rounded-xl font-serif text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      dancer.assignedToStage
                        ? 'bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/70'
                        : 'bg-white/5 border border-white/15 text-white/60 hover:text-white hover:border-[#d4af37]'
                    }`}
                  >
                    {dancer.assignedToStage ? (
                      <>
                        <CheckCircle size={15} /> Performing on Stage
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} /> Assign to Stage Performance
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
