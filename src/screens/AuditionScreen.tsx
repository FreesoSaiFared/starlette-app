import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  UserCheck,
  Award,
  Flame,
  Heart,
  Crown,
  Play,
  RefreshCw,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { DancerCandidate, AuditionDialogueMessage } from '../types';
import { playPCM24kAudio, playChime, playContractSignedSfx, createSpeechRecognizer } from '../utils/audio';

interface AuditionScreenProps {
  candidates: DancerCandidate[];
  tribute: number;
  onHireDancer: (candidate: DancerCandidate) => void;
  onSelectDancer?: (id: string) => void;
}

export const AuditionScreen: React.FC<AuditionScreenProps> = ({
  candidates,
  tribute,
  onHireDancer,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<DancerCandidate>(candidates[0]);
  const [messages, setMessages] = useState<AuditionDialogueMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([
    'Tell me of your finest Parisian triumph.',
    'What sets your routine apart from every other starlet in town?',
    'Our patrons expect pure magnetic drama. Can you deliver?',
  ]);
  const [chemistry, setChemistry] = useState<number>(50);
  const [emotion, setEmotion] = useState<'neutral' | 'flirty' | 'amused' | 'dramatic' | 'impressed' | 'thoughtful'>('flirty');
  const [stageDirection, setStageDirection] = useState<string>('*gazes through the ambient chandelier haze with a confident smile*');
  
  // Voice & Audio States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPerformingSolo, setIsPerformingSolo] = useState(false);
  const [hiredSuccess, setHiredSuccess] = useState(false);

  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const recognizerRef = useRef<any>(null);

  // Initialize conversation when candidate changes
  useEffect(() => {
    setMessages([
      {
        id: 'msg-init',
        speaker: 'candidate',
        text: selectedCandidate.greeting,
        emotion: 'flirty',
        stageDirection: `*${selectedCandidate.name} steps into the private salon, adjusting her attire with poise*`,
        timestamp: Date.now(),
      },
    ]);
    setChemistry(55);
    setEmotion('flirty');
    setStageDirection(`*${selectedCandidate.name} observes the director with keen curiosity*`);
    setSuggestedOptions([
      'What drew you to audition for The Aurelian Starlet?',
      'Let us talk about your signature routine.',
      'Show me the passion you would bring to our grand finale.',
    ]);
    setHiredSuccess(false);

    // Speak initial greeting if voice is enabled
    if (voiceEnabled) {
      triggerTTS(selectedCandidate.greeting, selectedCandidate.voiceName, selectedCandidate.voiceStyle);
    }
  }, [selectedCandidate.id]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, liveTranscript, isLoading]);

  // Set up Speech Recognition for Live Voice
  useEffect(() => {
    recognizerRef.current = createSpeechRecognizer(
      (transcript, isFinal) => {
        setLiveTranscript(transcript);
        if (isFinal && transcript.trim().length > 0) {
          handleSendMessage(transcript);
          setLiveTranscript('');
          recognizerRef.current?.stop();
          setIsListening(false);
        }
      },
      (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      }
    );

    return () => {
      recognizerRef.current?.stop();
      if (activeAudioSourceRef.current) {
        try {
          activeAudioSourceRef.current.stop();
        } catch (e) {}
      }
    };
  }, [selectedCandidate, messages]);

  const triggerTTS = async (text: string, voiceName: string, voiceStyle: string) => {
    try {
      if (activeAudioSourceRef.current) {
        try {
          activeAudioSourceRef.current.stop();
        } catch (e) {}
      }

      const res = await fetch('/api/audition/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName, voiceStyle }),
      });

      const data = await res.json();
      if (data.success && data.audioBase64) {
        const source = await playPCM24kAudio(
          data.audioBase64,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
        activeAudioSourceRef.current = source;
      }
    } catch (err) {
      console.warn('TTS playback error:', err);
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    playChime(440, 'sine', 0.2);
    const userMsg: AuditionDialogueMessage = {
      id: `user-${Date.now()}`,
      speaker: 'director',
      text: textToSend,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/audition/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: selectedCandidate,
          history: newHistory.slice(-6).map((m) => ({
            speaker: m.speaker,
            text: m.text,
          })),
          userMessage: textToSend,
        }),
      });

      const result = await response.json();
      const aiData = result.data || result.fallback;

      const candidateMsg: AuditionDialogueMessage = {
        id: `cand-${Date.now()}`,
        speaker: 'candidate',
        text: aiData.reply,
        emotion: aiData.emotion || 'flirty',
        stageDirection: aiData.stageDirection,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, candidateMsg]);
      setEmotion(aiData.emotion || 'flirty');
      if (aiData.stageDirection) setStageDirection(aiData.stageDirection);
      if (aiData.chemistryDelta) {
        setChemistry((prev) => Math.min(100, Math.max(10, prev + aiData.chemistryDelta)));
      }
      if (aiData.suggestedOptions && aiData.suggestedOptions.length > 0) {
        setSuggestedOptions(aiData.suggestedOptions);
      }

      if (voiceEnabled && aiData.reply) {
        triggerTTS(aiData.reply, selectedCandidate.voiceName, selectedCandidate.voiceStyle);
      }
    } catch (err) {
      console.error('Error during interview interaction:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSoloPerformanceRequest = async () => {
    setIsPerformingSolo(true);
    playChime(659.25, 'triangle', 0.4);

    const userMsg: AuditionDialogueMessage = {
      id: `solo-req-${Date.now()}`,
      speaker: 'director',
      text: `Let us see your signature craft. Perform your solo for the salon.`,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/audition/solo-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate: selectedCandidate }),
      });
      const data = await res.json();

      const soloMsg: AuditionDialogueMessage = {
        id: `solo-act-${Date.now()}`,
        speaker: 'narrator',
        text: data.narration || `${selectedCandidate.name} executes her mesmerizing signature solo routine, filling the salon with breathless allure.`,
        emotion: 'dramatic',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, soloMsg]);
      setChemistry((prev) => Math.min(100, prev + 15));
      setStageDirection(`*${selectedCandidate.name} executes a breathless, dramatic curtsy as the final chord fades*`);

      // Character closing line
      const replyLine = "There, mon cher Directeur. That is but a taste of the fire I bring to your stage.";
      const followUpMsg: AuditionDialogueMessage = {
        id: `solo-cand-${Date.now()}`,
        speaker: 'candidate',
        text: replyLine,
        emotion: 'flirty',
        stageDirection: `*smiles breathlessly, catching her breath under the salon spotlight*`,
        timestamp: Date.now() + 10,
      };

      setMessages((prev) => [...prev, followUpMsg]);
      if (voiceEnabled) {
        triggerTTS(replyLine, selectedCandidate.voiceName, selectedCandidate.voiceStyle);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsPerformingSolo(false);
    }
  };

  const toggleMic = () => {
    if (!recognizerRef.current?.isSupported) {
      alert('Speech recognition is not supported in this browser environment. You can use the choice cards or text input to interview the starlet!');
      return;
    }

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognizerRef.current?.start();
    }
  };

  const handleHireClick = () => {
    if (tribute < selectedCandidate.hiringPrice) return;
    playContractSignedSfx();
    onHireDancer(selectedCandidate);
    setHiredSuccess(true);
  };

  const canAfford = tribute >= selectedCandidate.hiringPrice;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 text-white">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="text-[#d4af37]" size={22} />
            <h1 className="font-serif text-2xl md:text-3xl tracking-tight text-white font-light">
              THE AUDITION SALON
            </h1>
          </div>
          <p className="text-white/60 text-xs md:text-sm font-sans tracking-wide mt-1">
            Interview, hear, and recruit prospective burlesque starlets to expand your Troupe.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#111] border border-[#d4af37]/30 px-4 py-2 rounded-lg flex items-center gap-3">
            <Flame className="text-[#d4af37]" size={18} />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/50">Cabaret Treasury</div>
              <div className="text-sm font-serif font-bold text-[#d4af37]">{tribute.toLocaleString()} Tribute</div>
            </div>
          </div>

          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2.5 rounded-lg border transition-all ${
              voiceEnabled
                ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
            title={voiceEnabled ? 'Voice Generation Active' : 'Voice Generation Muted'}
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* Candidate Carousel Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {candidates.map((cand) => {
          const isSelected = cand.id === selectedCandidate.id;
          return (
            <button
              key={cand.id}
              onClick={() => {
                setSelectedCandidate(cand);
                playChime(523.25, 'sine', 0.15);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex items-center gap-3 ${
                isSelected
                  ? 'bg-gradient-to-r from-[#22170f] to-[#14100c] border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'bg-[#0d0d0d] border-white/10 hover:border-white/30 text-white/70'
              }`}
            >
              <img
                src={cand.portrait}
                alt={cand.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover border border-white/20"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-serif font-medium text-white truncate">{cand.name}</div>
                  {cand.hired && <CheckCircle2 size={14} className="text-[#d4af37] shrink-0" />}
                </div>
                <div className="text-[10px] text-[#d4af37] tracking-wider uppercase truncate">{cand.title}</div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  {cand.hired ? (
                    <span className="text-emerald-400 font-medium">Hired in Troupe</span>
                  ) : (
                    <span>{cand.hiringPrice.toLocaleString()} Tribute</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Visual Novel & Live Voice Interview Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Starlet Portrait, Live Emotion & Audio Visualizer */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden border border-[#d4af37]/40 bg-[#080808] aspect-[3/4] flex items-center justify-center shadow-2xl">
            {/* Ambient Lighting Glow */}
            <div className="absolute inset-0 bg-radial from-[#d4af37]/15 via-transparent to-black pointer-events-none" />

            <img
              src={selectedCandidate.image}
              alt={selectedCandidate.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top filter contrast-[1.05] brightness-95"
            />

            {/* Speaking Waveform Overlay */}
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-4 left-4 right-4 bg-black/75 backdrop-blur-md border border-[#d4af37]/60 rounded-full px-4 py-2 flex items-center justify-between shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#d4af37] animate-spin" />
                  <span className="text-[11px] font-serif text-[#d4af37] uppercase tracking-widest">
                    {selectedCandidate.name} is speaking...
                  </span>
                </div>
                <div className="flex items-center gap-1 h-3">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ['20%', '100%', '30%'] }}
                      transition={{ repeat: Infinity, duration: 0.6 + i * 0.1, ease: 'easeInOut' }}
                      className="w-1 bg-[#d4af37] rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Emotion Badge */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] uppercase font-sans tracking-widest text-[#d4af37]">
                  Audition Impression
                </span>
                <span className="text-xs font-mono text-white font-medium">{chemistry}%</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#8b6508] via-[#d4af37] to-amber-200 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${chemistry}%` }}
                />
              </div>

              {stageDirection && (
                <div className="mt-2 text-[11px] font-serif italic text-white/70 tracking-wide text-center">
                  {stageDirection}
                </div>
              )}
            </div>
          </div>

          {/* Hiring / Troupe Contract Offer Box */}
          <div className="bg-[#0f0e0c] border border-[#d4af37]/30 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-white/50">Audition Perk</div>
                <div className="text-xs font-serif text-[#d4af37] font-medium">{selectedCandidate.specialty}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-emerald-400">Yield</div>
                <div className="text-xs font-mono text-white">+{selectedCandidate.bonusTps} Tribute/s</div>
              </div>
            </div>

            {selectedCandidate.hired ? (
              <div className="w-full py-3 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-emerald-400 text-center text-xs uppercase tracking-widest font-serif flex items-center justify-center gap-2">
                <UserCheck size={16} /> Hired to Cabaret Troupe
              </div>
            ) : (
              <button
                onClick={handleHireClick}
                disabled={!canAfford}
                className={`w-full py-3 rounded-lg font-serif uppercase tracking-[0.15em] text-xs font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  canAfford
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-[0.98]'
                    : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                }`}
              >
                <Crown size={16} />
                Sign Troupe Contract ({selectedCandidate.hiringPrice.toLocaleString()} Tribute)
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Visual Novel Dialogue History & Live Interaction Controls */}
        <div className="lg:col-span-7 flex flex-col bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden h-[620px]">
          {/* Visual Novel Top Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-[#0e0e0e] flex justify-between items-center">
            <div>
              <h2 className="font-serif text-lg text-white font-medium">{selectedCandidate.name}</h2>
              <p className="text-[11px] text-[#d4af37] uppercase tracking-wider font-sans">
                {selectedCandidate.title} • Voice: {selectedCandidate.voiceName}
              </p>
            </div>

            <button
              onClick={handleSoloPerformanceRequest}
              disabled={isLoading || isPerformingSolo}
              className="px-3.5 py-1.5 bg-[#d4af37]/15 hover:bg-[#d4af37]/30 border border-[#d4af37]/50 rounded-full text-xs font-serif text-[#d4af37] uppercase tracking-widest flex items-center gap-1.5 transition-all"
            >
              <Sparkles size={14} /> Request Solo Dance
            </button>
          </div>

          {/* Dialogue Transcript Window */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 font-serif">
            {messages.map((msg) => {
              if (msg.speaker === 'narrator') {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-[#14120f] border border-[#d4af37]/30 text-amber-200/90 text-sm italic tracking-wide leading-relaxed shadow-inner"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] uppercase font-sans tracking-widest text-[#d4af37]">
                      <Sparkles size={12} /> Theatrical Demonstration
                    </div>
                    {msg.text}
                  </motion.div>
                );
              }

              if (msg.speaker === 'director') {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col items-end"
                  >
                    <div className="text-[10px] uppercase font-sans tracking-widest text-white/40 mb-1">
                      Director's Inquiry
                    </div>
                    <div className="max-w-[85%] bg-[#1a1a1a] border border-white/20 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed">
                      {msg.text}
                    </div>
                  </motion.div>
                );
              }

              // Candidate speech
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col items-start"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-sans tracking-widest text-[#d4af37] font-semibold">
                      {selectedCandidate.name}
                    </span>
                    {msg.emotion && (
                      <span className="text-[9px] uppercase tracking-wider text-white/40 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                        {msg.emotion}
                      </span>
                    )}
                  </div>

                  <div className="max-w-[90%] bg-gradient-to-br from-[#18130e] to-[#0f0c08] border border-[#d4af37]/40 text-amber-100 rounded-2xl rounded-tl-none px-5 py-4 text-sm md:text-base leading-relaxed shadow-lg relative">
                    <span className="text-xl text-[#d4af37]/40 leading-none mr-1 font-serif">“</span>
                    {msg.text}
                    <span className="text-xl text-[#d4af37]/40 leading-none ml-1 font-serif">”</span>

                    {/* Replay Voice Button */}
                    <button
                      onClick={() =>
                        triggerTTS(msg.text, selectedCandidate.voiceName, selectedCandidate.voiceStyle)
                      }
                      className="absolute top-3 right-3 text-[#d4af37]/60 hover:text-[#d4af37] transition-all p-1"
                      title="Replay Voice Line"
                    >
                      <Play size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* Live Listening Transcript */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-3 animate-pulse"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span>Listening to Director: {liveTranscript || 'Speak your question now...'}</span>
              </motion.div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-white/50 text-xs italic py-2">
                <RefreshCw size={14} className="animate-spin text-[#d4af37]" />
                <span>{selectedCandidate.name} is formulating her reply...</span>
              </div>
            )}
          </div>

          {/* Interactive Choice Branches (Visual Novel Choices) */}
          <div className="p-4 bg-[#0d0d0d] border-t border-white/10 space-y-3">
            <div className="text-[10px] uppercase font-sans tracking-widest text-white/50 mb-1">
              Interview Prompts & Choices
            </div>

            <div className="grid grid-cols-1 gap-2">
              {suggestedOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(opt)}
                  disabled={isLoading}
                  className="text-left px-3.5 py-2 rounded-lg bg-[#141414] hover:bg-[#221b14] border border-white/10 hover:border-[#d4af37]/50 text-xs font-serif text-white/90 hover:text-[#d4af37] transition-all duration-200 flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{opt}</span>
                  <Zap size={13} className="text-white/30 group-hover:text-[#d4af37] shrink-0" />
                </button>
              ))}
            </div>

            {/* Custom Input & Live Voice Mic */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={toggleMic}
                className={`p-3 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
                  isListening
                    ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    : 'bg-[#181818] border-white/15 text-white/70 hover:text-white hover:border-[#d4af37]'
                }`}
                title={isListening ? 'Stop Listening' : 'Speak to Starlet with Live Microphone'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage(inputText);
                  }}
                  placeholder="Ask a custom question to the starlet..."
                  className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                className="p-3 bg-[#d4af37] hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 text-black rounded-xl transition-all shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
