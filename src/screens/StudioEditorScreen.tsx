import React, { useState, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import {
  Mic,
  Volume2,
  Sparkles,
  Sliders,
  Settings,
  User,
  Box,
  Globe,
  Play,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Radio,
  Music,
  Heart,
  HelpCircle,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { DancerCandidate, LLMConfig } from '../types';
import { StarletModel } from '../components/StarletModel';
import { playChime, playPCM24kAudio } from '../utils/audio';

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Studio Editor 3D Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-[#d4af37] p-4 text-center">
          <p className="font-serif italic text-sm">3D preview model preparing behind velvet curtain...</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface StudioEditorScreenProps {
  dancers: DancerCandidate[];
  onUpdateDancer: (updated: DancerCandidate) => void;
  onCreateDancer: (newDancer: DancerCandidate) => void;
  onDeleteDancer?: (id: string) => void;
  llmConfig: LLMConfig;
  onUpdateLLMConfig: (config: LLMConfig) => void;
  onGoToAudition: (dancerId: string) => void;
}

type StudioTab = 'voice' | 'persona' | 'model3d' | 'llm';

const PRESET_VOICES = [
  { id: 'Kore', name: 'Kore (Sensual / Parisian Alto)', description: 'Alluring, velvety, seductive French phrasing with dramatic pauses' },
  { id: 'Puck', name: 'Puck (Playful / Bright Flapper)', description: 'Brisk, witty, melodious 1920s showgirl with bubbling charisma' },
  { id: 'Zephyr', name: 'Zephyr (Soft / Velvet Siren)', description: 'Intimate, breathy, mysterious, delicate acoustic lilt' },
  { id: 'Fenrir', name: 'Fenrir (Commanding / Haute Diva)', description: 'Regal, authoritative, theatrical opera prima donna' },
  { id: 'Charon', name: 'Charon (Deep / Enigmatic Storyteller)', description: 'Resonant, smoky cabaret avant-garde poet' },
  { id: 'Aoede', name: 'Aoede (Melodic / Musical Starlet)', description: 'Harmonic, expressive, sweet Parisian melody' },
];

const VOICE_PRESET_STYLES = [
  'Seductive French burlesque starlet with delicate vocal fry, melodic lilt, and dramatic pauses',
  'Playful 1920s Parisian flapper, brisk tempo, sparkling laughter, alluring confidence',
  'Haughty Parisian prima donna, aristocratic tone, commanding, dramatic French accent',
  'Mysterious avant-garde cabaret artist, smoky whisper, slow seductive cadence',
  'Energetic champagne cancan dynamo, enthusiastic Parisian slang, bubbling high tempo',
];

const COLOR_PALETTES = {
  corset: [
    { name: 'Obsidian Velvet', hex: '#151414' },
    { name: 'Midnight Violet', hex: '#2b102f' },
    { name: 'Ruby Noir', hex: '#4a0e17' },
    { name: 'Emerald Velvet', hex: '#0f3322' },
    { name: 'Imperial Sapphire', hex: '#0f2042' },
    { name: 'Pearl Gold', hex: '#d4af37' },
  ],
  plume: [
    { name: 'Imperial Gold', hex: '#d4af37' },
    { name: 'Crimson Silk', hex: '#b21e35' },
    { name: 'Midnight Onyx', hex: '#1f1f1f' },
    { name: 'Peacock Cyan', hex: '#0d7c7c' },
    { name: 'Champagne Ivory', hex: '#f3e5ab' },
    { name: 'Rose Petal', hex: '#c4687d' },
  ],
  accent: [
    { name: 'Cabaret Crimson', hex: '#5c0f1b' },
    { name: 'Golden Topaz', hex: '#d4af37' },
    { name: 'Violet Velvet', hex: '#491b6d' },
    { name: 'Deep Emerald', hex: '#1b4d3e' },
    { name: 'Burgundy Wine', hex: '#722f37' },
  ],
};

export const StudioEditorScreen: React.FC<StudioEditorScreenProps> = ({
  dancers,
  onUpdateDancer,
  onCreateDancer,
  onDeleteDancer,
  llmConfig,
  onUpdateLLMConfig,
  onGoToAudition,
}) => {
  const [selectedId, setSelectedId] = useState<string>(dancers[0]?.id || 'colette');
  const [activeTab, setActiveTab] = useState<StudioTab>('voice');
  const [previewAction, setPreviewAction] = useState<'idle' | 'dance' | 'bow'>('idle');
  const [discoveredClips, setDiscoveredClips] = useState<string[]>([]);

  // Voice Test state
  const [testText, setTestText] = useState<string>(
    'Mon cher Directeur, look into my eyes... the stage has been waiting for our grand premiere.'
  );
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [voiceTestAudioBase64, setVoiceTestAudioBase64] = useState<string | null>(null);

  // External LLM test connection state
  const [isTestingLLM, setIsTestingLLM] = useState(false);
  const [llmTestStatus, setLlmTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Save feedback state
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const currentDancer = dancers.find((d) => d.id === selectedId) || dancers[0];

  const handleFieldChange = (field: keyof DancerCandidate, value: any) => {
    if (!currentDancer) return;
    const updated = { ...currentDancer, [field]: value };
    onUpdateDancer(updated);
  };

  const handleCreateNewStarlet = () => {
    const newId = 'starlet_' + Date.now();
    const newStarlet: DancerCandidate = {
      id: newId,
      name: 'Jessica Reynolds',
      stageName: 'Jessica Reynolds',
      title: 'Aspiring Lead Actor',
      bio: 'A rising star who recently broke out in the indie film scene, looking for her first major studio role.',
      specialty: 'Raw Authenticity & Improvisation',
      hiringPrice: 3000,
      bonusTps: 30,
      happinessBonus: 25,
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      portrait: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      voiceName: 'Kore',
      voiceStyle: 'Grounded, modern, naturalistic with occasional slight vocal fry',
      intonationPitch: 1.0,
      intonationSpeed: 1.0,
      personality: 'Eager, creative, professional but highly opinionated on script authenticity.',
      greeting: "Hi. Thanks for having me in. I loved the sides, but I had some questions about my character's motivation in scene 4.",
      corsetColor: '#2b102f',
      plumeColor: '#d4af37',
      accentColor: '#5c0f1b',
      customModelScale: 1.0,
      customModelYOffset: -1.4,
      relationshipStatus: 'professional',
      intimacyLevel: 0,
      hired: false,
      assignedToStage: false,
    };
    onCreateDancer(newStarlet);
    setSelectedId(newId);
    playChime(659.25, 'triangle', 0.25);
    showBanner('New Actor persona created!');
  };

  const showBanner = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(null), 3000);
  };

  // Test Voice Synthesis via Gemini TTS API
  const handleTestVoice = async () => {
    if (!testText.trim()) return;
    setIsGeneratingVoice(true);
    setVoiceTestAudioBase64(null);

    try {
      const response = await fetch('/api/audition/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          voiceName: currentDancer.voiceName,
          voiceStyle: currentDancer.voiceStyle,
        }),
      });

      const data = await response.json();
      if (data.success && data.audioBase64) {
        setVoiceTestAudioBase64(data.audioBase64);
        await playPCM24kAudio(
          data.audioBase64,
          () => setIsPlayingAudio(true),
          () => setIsPlayingAudio(false)
        );
      } else {
        throw new Error(data.error || 'TTS synthesis failed');
      }
    } catch (err: any) {
      console.error('Error in Voice Studio test:', err);
      // Fallback web audio chime
      playChime(587.33, 'sine', 0.3);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // Test OpenAI-compatible API connection
  const handleTestLLMConnection = async () => {
    setIsTestingLLM(true);
    setLlmTestStatus(null);

    try {
      const res = await fetch('/api/llm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmConfig),
      });
      const data = await res.json();
      if (data.success) {
        setLlmTestStatus({ success: true, message: data.message || 'API Connected successfully!' });
        playChime(880, 'sine', 0.2);
      } else {
        setLlmTestStatus({ success: false, message: data.error || 'Failed to connect to endpoint' });
      }
    } catch (err: any) {
      setLlmTestStatus({ success: false, message: err?.message || 'Network error connecting to API' });
    } finally {
      setIsTestingLLM(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentDancer, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentDancer.stageName.replace(/\s+/g, '_')}_Persona.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showBanner('Starlet persona exported to JSON!');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.name && imported.stageName) {
          const newDancer = {
            ...imported,
            id: 'imported_' + Date.now(),
            hired: false,
            assignedToStage: false,
          };
          onCreateDancer(newDancer);
          setSelectedId(newDancer.id);
          showBanner(`Imported "${newDancer.stageName}" successfully!`);
        }
      } catch (err) {
        alert('Invalid Starlet JSON profile');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 text-white animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/40 text-[#d4af37] text-xs font-serif uppercase tracking-[0.2em] mb-2">
            <Sliders size={13} /> Persona & 3D Studio Editor
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-white font-light italic">
            Character Voice, Intonation & 3D Model Studio
          </h1>
          <p className="text-xs md:text-sm text-white/50 font-sans mt-1">
            Customize character personalities, voice intonations, 3D GLTF models (from chatgpt-56-sol or external sources), and OpenAI-compatible storyline APIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-serif text-white/80 flex items-center gap-1.5 transition-all"
            title="Export Starlet JSON"
          >
            <Download size={14} className="text-[#d4af37]" /> Export Persona
          </button>

          <label className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-serif text-white/80 flex items-center gap-1.5 cursor-pointer transition-all">
            <Upload size={14} className="text-[#d4af37]" /> Import JSON
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={() => onGoToAudition(currentDancer.id)}
            className="px-4 py-2 rounded-xl bg-[#d4af37] hover:brightness-110 text-black text-xs font-serif font-semibold tracking-wider flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Sparkles size={14} /> Audition This Starlet
          </button>
        </div>
      </div>

      {/* Save / Feedback Banner */}
      <AnimatePresence>
        {saveBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-3 rounded-xl bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] text-xs font-serif flex items-center gap-2"
          >
            <Check size={16} /> {saveBanner}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Starlet Character Selector Strip */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-[0.2em] font-serif text-white/60">
            Select Starlet Persona ({dancers.length})
          </span>
          <button
            onClick={handleCreateNewStarlet}
            className="text-xs font-serif text-[#d4af37] hover:underline flex items-center gap-1"
          >
            <Plus size={13} /> Draft New Starlet
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {dancers.map((dancer) => {
            const isSelected = dancer.id === selectedId;
            return (
              <button
                key={dancer.id}
                onClick={() => {
                  setSelectedId(dancer.id);
                  playChime(523.25, 'sine', 0.15);
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex items-center gap-3 ${
                  isSelected
                    ? 'bg-[#1a1714] border-[#d4af37] shadow-lg shadow-[#d4af37]/10'
                    : 'bg-[#0a0a0a] border-white/10 hover:border-white/20'
                }`}
              >
                <img
                  src={dancer.portrait}
                  alt={dancer.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-white/20 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-xs text-white font-medium truncate">{dancer.name}</div>
                  <div className="text-[10px] text-[#d4af37] truncate">{dancer.stageName}</div>
                  <div className="text-[9px] text-white/40 truncate font-mono">Voice: {dancer.voiceName}</div>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#d4af37]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Studio Tabs & Control Panels (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 gap-2 pb-2 overflow-x-auto">
            <TabButton
              active={activeTab === 'voice'}
              icon={<Volume2 size={16} />}
              label="Voice & Intonation"
              onClick={() => setActiveTab('voice')}
            />
            <TabButton
              active={activeTab === 'persona'}
              icon={<User size={16} />}
              label="Persona & Lore"
              onClick={() => setActiveTab('persona')}
            />
            <TabButton
              active={activeTab === 'model3d'}
              icon={<Box size={16} />}
              label="3D Model & Looks"
              onClick={() => setActiveTab('model3d')}
            />
            <TabButton
              active={activeTab === 'llm'}
              icon={<Globe size={16} />}
              label="External LLM & Story"
              onClick={() => setActiveTab('llm')}
            />
          </div>

          {/* TAB 1: Voice & Intonation Studio */}
          {activeTab === 'voice' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0b0a09] border border-white/10 rounded-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-serif text-lg text-white font-medium">Character Vocal Persona</h3>
                  <p className="text-xs text-white/50">
                    Gemini speech synthesis voice model and nuanced French burlesque intonation.
                  </p>
                </div>
                <div className="px-3 py-1 bg-[#d4af37]/10 rounded-full border border-[#d4af37]/30 text-[#d4af37] text-xs font-mono">
                  {currentDancer.voiceName}
                </div>
              </div>

              {/* Voice Model Selector Grid */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-serif text-white/70">
                  Select Base Voice Model
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleFieldChange('voiceName', v.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentDancer.voiceName === v.id
                          ? 'bg-[#d4af37]/15 border-[#d4af37] text-white'
                          : 'bg-[#141210] border-white/10 hover:border-white/20 text-white/70'
                      }`}
                    >
                      <div className="font-serif text-xs font-medium text-[#d4af37] mb-1">{v.name}</div>
                      <div className="text-[10px] text-white/50 leading-relaxed">{v.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Style & Intonation Custom Directive */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase tracking-wider font-serif text-white/70">
                    Voice Style & Intonation Prompt
                  </label>
                  <span className="text-[10px] text-white/40">Fed directly to Gemini TTS</span>
                </div>
                <textarea
                  value={currentDancer.voiceStyle}
                  onChange={(e) => handleFieldChange('voiceStyle', e.target.value)}
                  rows={2}
                  className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#d4af37] focus:outline-none transition-all resize-none font-sans"
                  placeholder="e.g. Seductive French burlesque starlet with delicate vocal fry, melodic lilt, and dramatic pauses"
                />

                {/* Quick Style Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {VOICE_PRESET_STYLES.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleFieldChange('voiceStyle', preset)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-left truncate max-w-xs"
                    >
                      Preset {idx + 1}: {preset.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch & Cadence Intonation Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-serif">
                    <span className="text-white/70">Intonation Pitch</span>
                    <span className="text-[#d4af37] font-mono">{(currentDancer.intonationPitch || 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.25"
                    step="0.05"
                    value={currentDancer.intonationPitch || 1.0}
                    onChange={(e) => handleFieldChange('intonationPitch', parseFloat(e.target.value))}
                    className="w-full accent-[#d4af37] bg-white/10 rounded-lg h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-white/30">
                    <span>Deeper Alto</span>
                    <span>Standard</span>
                    <span>Higher Soprano</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-serif">
                    <span className="text-white/70">Delivery Cadence / Tempo</span>
                    <span className="text-[#d4af37] font-mono">{(currentDancer.intonationSpeed || 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.25"
                    step="0.05"
                    value={currentDancer.intonationSpeed || 1.0}
                    onChange={(e) => handleFieldChange('intonationSpeed', parseFloat(e.target.value))}
                    className="w-full accent-[#d4af37] bg-white/10 rounded-lg h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-white/30">
                    <span>Sensual Slow</span>
                    <span>Natural</span>
                    <span>Brisk Flapper</span>
                  </div>
                </div>
              </div>

              {/* Interactive Live Voice Tester */}
              <div className="bg-[#141210] border border-[#d4af37]/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-serif text-[#d4af37]">
                    <Mic size={14} /> Live Voice Audition Tester
                  </div>
                  {isPlayingAudio && (
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-3 bg-[#d4af37] animate-pulse" />
                      <span className="w-1 h-4 bg-[#d4af37] animate-pulse delay-75" />
                      <span className="w-1 h-2 bg-[#d4af37] animate-pulse delay-150" />
                      <span className="text-[10px] text-[#d4af37] font-mono ml-1">Speaking...</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#d4af37] focus:outline-none"
                    placeholder="Enter spoken dialogue to test..."
                  />
                  <button
                    onClick={handleTestVoice}
                    disabled={isGeneratingVoice}
                    className="px-4 py-2 bg-[#d4af37] hover:brightness-110 disabled:opacity-50 text-black rounded-lg text-xs font-serif font-semibold flex items-center gap-1.5 shadow transition-all flex-shrink-0"
                  >
                    {isGeneratingVoice ? (
                      <>
                        <RotateCcw size={13} className="animate-spin" /> Synthesizing...
                      </>
                    ) : (
                      <>
                        <Play size={13} fill="currentColor" /> Audition Voice
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Persona & Lore Studio */}
          {activeTab === 'persona' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0b0a09] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <div>
                <h3 className="font-serif text-lg text-white font-medium">Personality & Narrative Lore</h3>
                <p className="text-xs text-white/50">
                  Configure her Cabaret persona, backstory, and dialogue behavior.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-serif text-white/70">Performer Real Name</label>
                  <input
                    type="text"
                    value={currentDancer.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-serif text-white/70">Stage Name / Moniker</label>
                  <input
                    type="text"
                    value={currentDancer.stageName}
                    onChange={(e) => handleFieldChange('stageName', e.target.value)}
                    className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-serif text-white/70">Cabaret Title</label>
                  <input
                    type="text"
                    value={currentDancer.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-serif text-white/70">Signature Specialty</label>
                  <input
                    type="text"
                    value={currentDancer.specialty}
                    onChange={(e) => handleFieldChange('specialty', e.target.value)}
                    className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-serif text-white/70">Backstory & Bio</label>
                <textarea
                  value={currentDancer.bio}
                  onChange={(e) => handleFieldChange('bio', e.target.value)}
                  rows={2}
                  className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-serif text-white/70">Personality Traits & Temperament</label>
                <textarea
                  value={currentDancer.personality}
                  onChange={(e) => handleFieldChange('personality', e.target.value)}
                  rows={2}
                  className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-serif text-white/70">Initial Audition Greeting</label>
                <textarea
                  value={currentDancer.greeting}
                  onChange={(e) => handleFieldChange('greeting', e.target.value)}
                  rows={2}
                  className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none resize-none"
                />
              </div>

              {/* Portrait Image URL */}
              <div className="space-y-1">
                <label className="text-xs font-serif text-white/70">Portrait Image URL</label>
                <input
                  type="text"
                  value={currentDancer.portrait}
                  onChange={(e) => {
                    handleFieldChange('portrait', e.target.value);
                    handleFieldChange('image', e.target.value);
                  }}
                  className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none font-mono"
                />
              </div>

              {/* Relationship Status & Intimacy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-serif text-white/70">Relationship Status</label>
                  <select
                    value={currentDancer.relationshipStatus || 'professional'}
                    onChange={(e) => handleFieldChange('relationshipStatus', e.target.value)}
                    className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none"
                  >
                    <option value="professional">Professional</option>
                    <option value="confidant">Confidant</option>
                    <option value="rivalry">Rivalry</option>
                    <option value="romance">Romance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-serif text-white/70">
                    Intimacy Level (0-100): {currentDancer.intimacyLevel || 0}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={currentDancer.intimacyLevel || 0}
                    onChange={(e) => handleFieldChange('intimacyLevel', parseInt(e.target.value, 10))}
                    className="w-full accent-[#d4af37] bg-white/10 rounded-lg h-1.5 cursor-pointer mt-2"
                  />
                </div>
              </div>

              {/* Stats Multipliers */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-[#141210] border border-white/10 p-3 rounded-xl">
                  <div className="text-[10px] text-white/40 uppercase">Hiring Price</div>
                  <input
                    type="number"
                    value={currentDancer.hiringPrice}
                    onChange={(e) => handleFieldChange('hiringPrice', parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-mono text-[#d4af37] focus:outline-none mt-1"
                  />
                </div>
                <div className="bg-[#141210] border border-white/10 p-3 rounded-xl">
                  <div className="text-[10px] text-white/40 uppercase">Bonus TPS</div>
                  <input
                    type="number"
                    value={currentDancer.bonusTps}
                    onChange={(e) => handleFieldChange('bonusTps', parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-mono text-emerald-400 focus:outline-none mt-1"
                  />
                </div>
                <div className="bg-[#141210] border border-white/10 p-3 rounded-xl">
                  <div className="text-[10px] text-white/40 uppercase">Happiness Boost</div>
                  <input
                    type="number"
                    value={currentDancer.happinessBonus}
                    onChange={(e) => handleFieldChange('happinessBonus', parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-mono text-rose-400 focus:outline-none mt-1"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: 3D Model & Visuals Studio (chatgpt-56-sol conversion support) */}
          {activeTab === 'model3d' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0b0a09] border border-white/10 rounded-2xl p-6 space-y-6"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-serif text-[#d4af37] mb-1">
                  <Box size={14} /> 3D Model Import & Haute Burlesque Styling
                </div>
                <h3 className="font-serif text-lg text-white font-medium">Custom 3D Model & Color Palettes</h3>
                <p className="text-xs text-white/50">
                  Import custom 3D models converted via chatgpt-56-sol or external GLTF/GLB sources, or customize the procedural Haute Couture stage performer.
                </p>
              </div>

              {/* Custom Model GLTF URL (chatgpt-56-sol conversion) */}
              <div className="bg-[#141210] border border-[#d4af37]/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-serif text-white font-medium flex items-center gap-1.5">
                    <Upload size={13} className="text-[#d4af37]" /> Custom 3D Model URL (GLTF / GLB)
                  </label>
                  <span className="text-[10px] text-[#d4af37] font-mono">chatgpt-56-sol Ready</span>
                </div>

                <input
                  type="text"
                  value={currentDancer.customModelUrl || ''}
                  onChange={(e) => handleFieldChange('customModelUrl', e.target.value)}
                  placeholder="https://example.com/models/dancer.glb (Leave empty to use Procedural Haute Couture Model)"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#d4af37] focus:outline-none font-mono"
                />

                <p className="text-[10px] text-white/40 leading-relaxed">
                  Tip: Models converted by the chatgpt-56-sol agent can be hosted online or referenced via HTTPS GLTF/GLB URLs. If empty, the high-fidelity procedural Cancan performer is rendered.
                </p>

                {currentDancer.customModelUrl && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-serif">
                        <span className="text-white/70">Model Scale</span>
                        <span className="text-[#d4af37] font-mono">{(currentDancer.customModelScale || 1.0).toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="2.5"
                        step="0.1"
                        value={currentDancer.customModelScale || 1.0}
                        onChange={(e) => handleFieldChange('customModelScale', parseFloat(e.target.value))}
                        className="w-full accent-[#d4af37] bg-white/10 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-serif">
                        <span className="text-white/70">Y-Offset</span>
                        <span className="text-[#d4af37] font-mono">{(currentDancer.customModelYOffset || -1.4).toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-3.0"
                        max="0.5"
                        step="0.1"
                        value={currentDancer.customModelYOffset || -1.4}
                        onChange={(e) => handleFieldChange('customModelYOffset', parseFloat(e.target.value))}
                        className="w-full accent-[#d4af37] bg-white/10 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Animation Clip Mapping for Custom GLTF/GLB */}
              {currentDancer.customModelUrl && (
                <div className="bg-[#141210] border border-white/10 rounded-xl p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-serif text-white font-medium flex items-center gap-1.5">
                      <Play size={13} className="text-[#d4af37]" /> Skeletal Animation Clip Mapping
                    </h4>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      Map embedded GLB clips to stage actions. Leave blank for smart automatic detection.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-serif text-white/70 uppercase tracking-wider">
                        Idle Clip Name
                      </label>
                      <input
                        type="text"
                        value={currentDancer.customModelAnimations?.idle || ''}
                        onChange={(e) =>
                          handleFieldChange('customModelAnimations', {
                            ...(currentDancer.customModelAnimations || {}),
                            idle: e.target.value,
                          })
                        }
                        placeholder="e.g. Idle, Stand, Breathe"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:border-[#d4af37] focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-serif text-white/70 uppercase tracking-wider">
                        Dance Routine Clip Name
                      </label>
                      <input
                        type="text"
                        value={currentDancer.customModelAnimations?.dance || ''}
                        onChange={(e) =>
                          handleFieldChange('customModelAnimations', {
                            ...(currentDancer.customModelAnimations || {}),
                            dance: e.target.value,
                          })
                        }
                        placeholder="e.g. Dance, Cancan, Choreo"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:border-[#d4af37] focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-serif text-white/70 uppercase tracking-wider">
                        Encore Bow Clip Name
                      </label>
                      <input
                        type="text"
                        value={currentDancer.customModelAnimations?.bow || ''}
                        onChange={(e) =>
                          handleFieldChange('customModelAnimations', {
                            ...(currentDancer.customModelAnimations || {}),
                            bow: e.target.value,
                          })
                        }
                        placeholder="e.g. Bow, Curtsy, Curtsey"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:border-[#d4af37] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Discovered Clips Inspector */}
                  {discoveredClips.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/60">
                          Detected in GLB ({discoveredClips.length} clip{discoveredClips.length > 1 ? 's' : ''}):
                        </span>
                        <span className="text-[#d4af37] font-mono">Hover to assign</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {discoveredClips.map((clipName) => (
                          <div
                            key={clipName}
                            className="group flex items-center bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] font-mono text-white/80 hover:border-[#d4af37]/60 transition-all"
                          >
                            <span className="truncate max-w-[130px]">{clipName}</span>
                            <div className="hidden group-hover:flex items-center gap-1 ml-2 pl-1 border-l border-white/10">
                              <button
                                onClick={() =>
                                  handleFieldChange('customModelAnimations', {
                                    ...(currentDancer.customModelAnimations || {}),
                                    idle: clipName,
                                  })
                                }
                                title="Set as Idle clip"
                                className="px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-[#d4af37] hover:bg-[#d4af37] hover:text-black font-sans"
                              >
                                Idle
                              </button>
                              <button
                                onClick={() =>
                                  handleFieldChange('customModelAnimations', {
                                    ...(currentDancer.customModelAnimations || {}),
                                    dance: clipName,
                                  })
                                }
                                title="Set as Dance clip"
                                className="px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-[#d4af37] hover:bg-[#d4af37] hover:text-black font-sans"
                              >
                                Dance
                              </button>
                              <button
                                onClick={() =>
                                  handleFieldChange('customModelAnimations', {
                                    ...(currentDancer.customModelAnimations || {}),
                                    bow: clipName,
                                  })
                                }
                                title="Set as Bow clip"
                                className="px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-[#d4af37] hover:bg-[#d4af37] hover:text-black font-sans"
                              >
                                Bow
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Procedural Aesthetic Colors */}
              <div className="space-y-4 pt-2">
                {/* Corset Velvet Color */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-serif">
                    <span className="text-white/80">Corset Velvet Material Tone</span>
                    <span className="font-mono text-[#d4af37]">{currentDancer.corsetColor || '#151414'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {COLOR_PALETTES.corset.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => handleFieldChange('corsetColor', c.hex)}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          currentDancer.corsetColor === c.hex ? 'scale-125 border-[#d4af37] ring-2 ring-[#d4af37]/40' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={currentDancer.corsetColor || '#151414'}
                      onChange={(e) => handleFieldChange('corsetColor', e.target.value)}
                      className="w-7 h-7 rounded-full border border-white/20 bg-transparent cursor-pointer ml-2"
                    />
                  </div>
                </div>

                {/* Feather Plume Color */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-serif">
                    <span className="text-white/80">Ostrich Plumes & Fan Silk Tint</span>
                    <span className="font-mono text-[#d4af37]">{currentDancer.plumeColor || '#d4af37'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {COLOR_PALETTES.plume.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => handleFieldChange('plumeColor', c.hex)}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          currentDancer.plumeColor === c.hex ? 'scale-125 border-[#d4af37] ring-2 ring-[#d4af37]/40' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={currentDancer.plumeColor || '#d4af37'}
                      onChange={(e) => handleFieldChange('plumeColor', e.target.value)}
                      className="w-7 h-7 rounded-full border border-white/20 bg-transparent cursor-pointer ml-2"
                    />
                  </div>
                </div>

                {/* Skirt Accent Color */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-serif">
                    <span className="text-white/80">Cancan Skirt Satin Accent</span>
                    <span className="font-mono text-[#d4af37]">{currentDancer.accentColor || '#5c0f1b'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {COLOR_PALETTES.accent.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => handleFieldChange('accentColor', c.hex)}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          currentDancer.accentColor === c.hex ? 'scale-125 border-[#d4af37] ring-2 ring-[#d4af37]/40' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={currentDancer.accentColor || '#5c0f1b'}
                      onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                      className="w-7 h-7 rounded-full border border-white/20 bg-transparent cursor-pointer ml-2"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: External LLM & Storyline API Connection */}
          {activeTab === 'llm' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0b0a09] border border-white/10 rounded-2xl p-6 space-y-6"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-serif text-[#d4af37] mb-1">
                  <Globe size={14} /> External LLM & OpenAI-Compatible Connection
                </div>
                <h3 className="font-serif text-lg text-white font-medium">Audition Dialogue & Storyline Engine</h3>
                <p className="text-xs text-white/50">
                  Connect any OpenAI-compatible API endpoint (OpenAI, OpenRouter, Ollama, LM Studio, Groq) or use the internal Gemini 3.7 server engine.
                </p>
              </div>

              {/* Provider Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onUpdateLLMConfig({ ...llmConfig, provider: 'gemini' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    llmConfig.provider === 'gemini'
                      ? 'bg-[#d4af37]/15 border-[#d4af37] text-white'
                      : 'bg-[#141210] border-white/10 text-white/60 hover:border-white/20'
                  }`}
                >
                  <div className="font-serif text-xs font-medium text-[#d4af37]">Internal Gemini 3.7 Engine</div>
                  <div className="text-[10px] text-white/50 mt-1">High-speed, zero-config server-side AI</div>
                </button>

                <button
                  onClick={() => onUpdateLLMConfig({ ...llmConfig, provider: 'openai-compatible' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    llmConfig.provider === 'openai-compatible'
                      ? 'bg-[#d4af37]/15 border-[#d4af37] text-white'
                      : 'bg-[#141210] border-white/10 text-white/60 hover:border-white/20'
                  }`}
                >
                  <div className="font-serif text-xs font-medium text-[#d4af37]">OpenAI-Compatible External API</div>
                  <div className="text-[10px] text-white/50 mt-1">Custom endpoint, OpenRouter, Ollama, LM Studio</div>
                </button>
              </div>

              {/* Endpoint and API Config */}
              {llmConfig.provider === 'openai-compatible' && (
                <div className="space-y-4 bg-[#141210] border border-white/10 rounded-xl p-4">
                  <div className="space-y-1">
                    <label className="text-xs font-serif text-white/80">API Endpoint URL</label>
                    <input
                      type="text"
                      value={llmConfig.endpoint}
                      onChange={(e) => onUpdateLLMConfig({ ...llmConfig, endpoint: e.target.value })}
                      placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#d4af37] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-serif text-white/80">Model Identifier</label>
                      <input
                        type="text"
                        value={llmConfig.model}
                        onChange={(e) => onUpdateLLMConfig({ ...llmConfig, model: e.target.value })}
                        placeholder="gpt-4o-mini, claude-3-5-sonnet, mistral, etc."
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#d4af37] focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-serif text-white/80">API Key (Optional / Private)</label>
                      <input
                        type="password"
                        value={llmConfig.apiKey}
                        onChange={(e) => onUpdateLLMConfig({ ...llmConfig, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#d4af37] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Test Connection Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={handleTestLLMConnection}
                      disabled={isTestingLLM}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-serif text-[#d4af37] flex items-center gap-1.5 transition-all"
                    >
                      {isTestingLLM ? (
                        <>
                          <RotateCcw size={13} className="animate-spin" /> Pinging API...
                        </>
                      ) : (
                        <>
                          <Globe size={13} /> Test API Connection
                        </>
                      )}
                    </button>

                    {llmTestStatus && (
                      <span
                        className={`text-xs font-mono ${
                          llmTestStatus.success ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {llmTestStatus.message}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Global Storyline Prompt Customizer */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase tracking-wider font-serif text-white/70">
                    Cabaret Storyline & Setting Directives
                  </label>
                  <span className="text-[10px] text-white/40">Injected into character dialogue prompts</span>
                </div>
                <textarea
                  value={llmConfig.customStorylinePrompt || ''}
                  onChange={(e) => onUpdateLLMConfig({ ...llmConfig, customStorylinePrompt: e.target.value })}
                  rows={3}
                  className="w-full bg-[#141210] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#d4af37] focus:outline-none resize-none font-sans"
                  placeholder="e.g. Set in a 1928 clandestine Montmartre speakeasy where the French police and high society patrons mingle under crystal chandeliers."
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Live 3D Canvas Preview & Animation Studio (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0b0a09] border border-[#d4af37]/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-[#d4af37] uppercase tracking-[0.2em] font-sans">
                  Live Stage Preview
                </span>
                <h3 className="font-serif text-xl text-white font-light italic">
                  {currentDancer.stageName}
                </h3>
              </div>
              <span className="text-xs text-white/40 font-mono">
                {currentDancer.customModelUrl ? 'Custom 3D Model' : 'Haute Procedural'}
              </span>
            </div>

            {/* 3D Model Stage Canvas */}
            <div className="w-full h-80 bg-[#050505] rounded-xl border border-white/10 relative overflow-hidden">
              <CanvasErrorBoundary>
                <Canvas camera={{ position: [0, 0.4, 5.2], fov: 42 }}>
                  <ambientLight intensity={0.7} color="#fff6e8" />
                  <spotLight position={[0, 6, 4]} angle={0.45} penumbra={0.8} intensity={3.5} color="#f7e1a0" />
                  <directionalLight position={[4, 3, -3]} intensity={1.8} color="#d4af37" />
                  <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#6b121c" />
                  <pointLight position={[0, -1.8, 2.5]} intensity={1.0} color="#ffeedb" />

                  <Suspense fallback={null}>
                    <StarletModel
                      action={previewAction}
                      customModelUrl={currentDancer.customModelUrl}
                      customModelScale={currentDancer.customModelScale}
                      customModelYOffset={currentDancer.customModelYOffset}
                      customModelAnimations={currentDancer.customModelAnimations}
                      onClipsDiscovered={setDiscoveredClips}
                      corsetColor={currentDancer.corsetColor}
                      plumeColor={currentDancer.plumeColor}
                      accentColor={currentDancer.accentColor}
                    />
                    <ContactShadows position={[0, -1.4, 0]} opacity={0.75} scale={8} blur={2.0} far={3.0} />
                  </Suspense>

                  <OrbitControls
                    enableZoom={true}
                    enablePan={false}
                    maxPolarAngle={Math.PI / 2 + 0.05}
                    minPolarAngle={Math.PI / 2 - 0.25}
                  />
                </Canvas>
              </CanvasErrorBoundary>

              <div className="absolute bottom-2 left-3 text-[9px] text-white/40 font-sans pointer-events-none">
                Drag to orbit 360° • Scroll to zoom
              </div>
            </div>

            {/* Animation Preview Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-serif text-white/60">
                Test 3D Animation Routine
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPreviewAction('idle')}
                  className={`py-2 rounded-lg text-xs font-serif transition-all border ${
                    previewAction === 'idle'
                      ? 'bg-[#d4af37] text-black border-[#d4af37] font-semibold'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Sensual Idle
                </button>
                <button
                  onClick={() => setPreviewAction('dance')}
                  className={`py-2 rounded-lg text-xs font-serif transition-all border ${
                    previewAction === 'dance'
                      ? 'bg-[#d4af37] text-black border-[#d4af37] font-semibold'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Cancan Kicks
                </button>
                <button
                  onClick={() => setPreviewAction('bow')}
                  className={`py-2 rounded-lg text-xs font-serif transition-all border ${
                    previewAction === 'bow'
                      ? 'bg-[#d4af37] text-black border-[#d4af37] font-semibold'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Encore Curtsy
                </button>
              </div>
            </div>

            {/* Quick Profile Summary Card */}
            <div className="bg-[#141210] border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={currentDancer.portrait}
                  alt={currentDancer.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-[#d4af37]/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-serif text-white font-medium truncate">{currentDancer.name}</div>
                  <div className="text-[10px] text-[#d4af37] uppercase tracking-wider">{currentDancer.stageName}</div>
                  <div className="text-[10px] text-white/50 truncate">{currentDancer.specialty}</div>
                </div>
              </div>
              <p className="text-[11px] text-white/60 italic font-serif leading-relaxed line-clamp-2">
                "{currentDancer.greeting}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-serif text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
      active
        ? 'bg-[#d4af37] text-black font-semibold shadow-md'
        : 'text-white/60 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
