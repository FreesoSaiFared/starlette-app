import React, { useState, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Sparkles, Music, Heart, Users, Flame, Crown } from 'lucide-react';
import { StarletStats, DancerCandidate } from '../types';
import { StarletModel } from '../components/StarletModel';
import { playChime } from '../utils/audio';

interface StageScreenProps {
  stats: StarletStats;
  hiredDancers?: DancerCandidate[];
  leadDancer?: DancerCandidate;
  onAction: (type: 'encourage' | 'applaud') => void;
  onGoToAuditions?: () => void;
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Stage 3D Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-[#d4af37]">
          <p className="font-serif italic text-lg">The Starlet prepares behind the velvet curtain...</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const StageScreen: React.FC<StageScreenProps> = ({
  stats,
  hiredDancers = [],
  leadDancer,
  onAction,
  onGoToAuditions,
}) => {
  const [modelAction, setModelAction] = useState<'idle' | 'dance' | 'bow'>('idle');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const activeStageDancers = hiredDancers.filter((d) => d.assignedToStage);
  const currentPerformer = leadDancer || activeStageDancers[0];

  const handleAction = (type: 'encourage' | 'applaud') => {
    onAction(type);
    playChime(type === 'encourage' ? 587.33 : 880, 'sine', 0.25);

    // Trigger the related 3D animation and on-stage feedback badge
    if (type === 'encourage') {
      setModelAction('dance');
      setActionFeedback('Frenzied Cancan Routine!');
      setTimeout(() => {
        setModelAction('idle');
        setActionFeedback(null);
      }, 3500);
    } else if (type === 'applaud') {
      setModelAction('bow');
      setActionFeedback('Encore Theatrical Curtsy!');
      setTimeout(() => {
        setModelAction('idle');
        setActionFeedback(null);
      }, 3500);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 md:px-12 animate-fade-in mx-auto max-w-5xl">
      {/* The Stage View */}
      <section className="relative w-full aspect-[21/9] overflow-hidden border border-white/10 bg-[#070606] rounded-2xl shadow-2xl">
        {/* 3D Character Canvas */}
        <div className="absolute inset-0 z-0 opacity-95 cursor-grab active:cursor-grabbing">
          <CanvasErrorBoundary>
            <Canvas camera={{ position: [0, 0.4, 5.2], fov: 42 }}>
              {/* Studio Stage Lighting Setup */}
              <ambientLight intensity={0.65} color="#fff6e8" />

              {/* Main Golden Overhead Spotlight */}
              <spotLight
                position={[0, 6, 4]}
                angle={0.45}
                penumbra={0.8}
                intensity={3.5}
                castShadow
                color="#f7e1a0"
              />

              {/* Warm Rim Highlights */}
              <directionalLight position={[4, 3, -3]} intensity={1.8} color="#d4af37" />
              <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#6b121c" />

              {/* Footlights */}
              <pointLight position={[0, -1.8, 2.5]} intensity={1.0} color="#ffeedb" />

              <Suspense fallback={null}>
                <StarletModel
                  action={modelAction}
                  customModelUrl={currentPerformer?.customModelUrl}
                  customModelScale={currentPerformer?.customModelScale}
                  customModelYOffset={currentPerformer?.customModelYOffset}
                  corsetColor={currentPerformer?.corsetColor}
                  plumeColor={currentPerformer?.plumeColor}
                  accentColor={currentPerformer?.accentColor}
                />
                <ContactShadows position={[0, -1.4, 0]} opacity={0.75} scale={8} blur={2.0} far={3.0} />
              </Suspense>

              <OrbitControls
                enableZoom={false}
                enablePan={false}
                maxPolarAngle={Math.PI / 2 + 0.05}
                minPolarAngle={Math.PI / 2 - 0.25}
                minAzimuthAngle={-Math.PI / 5}
                maxAzimuthAngle={Math.PI / 5}
              />
            </Canvas>
          </CanvasErrorBoundary>
        </div>

        {/* Overlays to blend the 3D canvas smoothly */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-[#050505]/70 via-transparent to-[#050505]/70 opacity-60" />

        {/* Live Performance Tag & Mode */}
        <div className="absolute top-6 left-8 z-20 pointer-events-none flex items-center gap-3">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
          </span>
          <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#d4af37]">
            {modelAction === 'dance'
              ? 'Cancan Choreography'
              : modelAction === 'bow'
              ? 'Encore Curtsy'
              : 'Grand Revue Live'}
          </span>
        </div>

        {/* Action Flash Feedback */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-6 right-8 z-20 px-4 py-1.5 border border-[#d4af37]/60 bg-[#050505]/90 backdrop-blur-sm text-[#d4af37] font-serif italic text-sm rounded-lg shadow-lg"
            >
              {actionFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend/Name Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-8 md:p-10 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent z-20 flex flex-col items-start w-full pointer-events-none">
          <h2 className="font-serif text-3xl md:text-5xl font-light text-white tracking-tight mb-1 italic">
            The Starlet Revue
          </h2>
          <div className="flex items-center gap-2 text-[#d4af37]">
            <span className="font-sans text-[10px] uppercase tracking-[0.25em]">
              Haute Burlesque • Live on Stage
            </span>
          </div>
        </div>
      </section>

      {/* Active Troupe Dancers on Stage Banner */}
      {activeStageDancers.length > 0 && (
        <section className="bg-[#0b0a09] border border-[#d4af37]/30 rounded-2xl p-4 md:p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#d4af37]" />
              <span className="font-serif text-sm md:text-base text-white tracking-wide">
                Ensemble Supporting Cast ({activeStageDancers.length} Performing)
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              +{activeStageDancers.reduce((a, c) => a + c.bonusTps, 0)} Tribute/sec
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activeStageDancers.map((dancer) => (
              <div
                key={dancer.id}
                className="bg-[#14120f] border border-white/10 rounded-xl p-2.5 flex items-center gap-3 relative overflow-hidden"
              >
                <img
                  src={dancer.portrait}
                  alt={dancer.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-lg object-cover border border-[#d4af37]/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-serif text-white truncate">{dancer.name}</div>
                  <div className="text-[9px] text-[#d4af37] uppercase tracking-wider truncate">
                    {dancer.stageName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dynamic Status Dashboard */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Happiness Bar */}
        <StatusBar
          label="Star's Happiness"
          value={stats.happiness}
          displayValue={`${Math.round(stats.happiness)}%`}
        />

        {/* Audience Reaction */}
        <StatusBar
          label="Audience Reaction"
          value={stats.reaction}
          displayValue={stats.reaction > 80 ? 'Frenzied' : stats.reaction > 50 ? 'Excited' : 'Polite'}
        />
      </section>

      {/* Tribute Counter & Primary Actions */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Tribute Counter */}
        <div className="md:col-span-5 bg-[#0a0a0a] p-8 border border-white/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <span className="font-sans text-[10px] text-[#d4af37] uppercase tracking-[0.4em] mb-3">
            Tribute Earned
          </span>
          <div className="flex items-center gap-4">
            <span className="font-serif text-5xl md:text-6xl text-white font-light tracking-tight">
              {stats.tribute.toLocaleString()}
            </span>
          </div>
          <div className="mt-4 text-[#d4af37] text-[11px] font-mono tracking-[0.2em] uppercase">
            +{stats.tributePerSecond} / SEC
          </div>
        </div>

        {/* Action Buttons */}
        <div className="md:col-span-7 flex flex-col gap-4 justify-center">
          <button
            onClick={() => handleAction('encourage')}
            className={`sophisticated-button w-full ${
              modelAction === 'dance' ? 'bg-[#d4af37] text-black font-medium' : ''
            }`}
          >
            Encourage (Cancan Dance)
          </button>

          <button
            onClick={() => handleAction('applaud')}
            className={`sophisticated-button w-full ${
              modelAction === 'bow' ? 'bg-[#d4af37] text-black font-medium' : ''
            }`}
          >
            Applaud (Theatrical Curtsy)
          </button>
        </div>
      </section>
    </div>
  );
};

interface StatusBarProps {
  label: string;
  value: number;
  displayValue: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ label, value, displayValue }) => (
  <div className="bg-[#0a0a0a] p-6 md:p-8 border border-white/10 rounded-2xl flex flex-col">
    <div className="flex justify-between items-end mb-4">
      <span className="font-sans text-[10px] text-white/50 uppercase tracking-[0.2em]">{label}</span>
      <span className="font-serif text-xl font-light italic text-white">{displayValue}</span>
    </div>
    <div className="h-[2px] w-full bg-white/5 overflow-hidden rounded-full">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        className="h-full bg-[#d4af37]"
      />
    </div>
  </div>
);
