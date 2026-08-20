import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Play, Edit, Plus, MessageSquare, Send, FastForward, Film } from 'lucide-react';
import { playChime } from '../utils/audio';
import { DramaScenario, AuditionDialogueMessage, LLMConfig } from '../types';

interface DemandsScreenProps {
  onReturnToStage: () => void;
  onGoToAuditions: () => void;
  llmConfig: LLMConfig;
}

const DEFAULT_SCENARIOS: DramaScenario[] = [
  {
    id: 'scen_1',
    title: 'The Rehearsal Breakdown',
    description: 'A tense late-night rehearsal where the lead actor refuses to perform the ending as written.',
    systemPrompt: 'You are the lead actor. You are exhausted, frustrated with the script, and feel the director is pushing you too hard without understanding the character.',
    startingMessage: "I can't do this again. The motivation here makes zero sense. Do you actually want me to feel something, or just hit my mark and cry?",
    participants: ['lead'],
  },
  {
    id: 'scen_2',
    title: 'Contract Renegotiation',
    description: 'The producer and the star\'s agent corner you before the big shoot.',
    systemPrompt: 'You play both the aggressive Agent and the anxious Producer. They are trying to force the Director to cut a controversial scene to secure a wider release.',
    startingMessage: "*The agent slams a folder on the table* We need to talk about scene 44. It's out. My client won't do it, and the studio agrees.",
    participants: ['agent', 'producer'],
  }
];

export const DemandsScreen: React.FC<DemandsScreenProps> = ({ onReturnToStage, onGoToAuditions, llmConfig }) => {
  const [scenarios, setScenarios] = useState<DramaScenario[]>(() => {
    const saved = localStorage.getItem('aurelian_scenarios');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_SCENARIOS;
  });

  const [activeScenario, setActiveScenario] = useState<DramaScenario | null>(null);
  const [messages, setMessages] = useState<AuditionDialogueMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<DramaScenario | null>(null);

  useEffect(() => {
    localStorage.setItem('aurelian_scenarios', JSON.stringify(scenarios));
  }, [scenarios]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleStartScenario = (scenario: DramaScenario) => {
    setActiveScenario(scenario);
    setMessages([
      {
        id: 'msg_start',
        speaker: 'narrator',
        text: `[SCENARIO START: ${scenario.title}]`,
        timestamp: Date.now(),
      },
      {
        id: 'msg_0',
        speaker: 'candidate',
        text: scenario.startingMessage,
        emotion: 'dramatic',
        timestamp: Date.now() + 1,
      }
    ]);
    setSuggestedOptions([
      "Take a deep breath and respond calmly.",
      "Push back. You're the director.",
      "Ask them to explain what they mean."
    ]);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !activeScenario) return;

    const newMsg: AuditionDialogueMessage = {
      id: Date.now().toString(),
      speaker: 'director',
      text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, newMsg];
    setMessages(newHistory);
    setInputValue('');
    setSuggestedOptions([]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/scenario/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: activeScenario,
          history: newHistory.map((m) => ({ speaker: m.speaker, text: m.text })),
          userMessage: text,
          llmConfig,
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const { reply, speaker, emotion, stageDirection, suggestedOptions: opts } = data.data;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + '_reply',
            speaker: speaker === 'Narrator' ? 'narrator' : 'candidate',
            text: reply,
            emotion,
            stageDirection,
            timestamp: Date.now(),
          },
        ]);
        if (opts) setSuggestedOptions(opts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const saveScenario = () => {
    if (!editForm) return;
    if (editForm.id.startsWith('new_')) {
      setScenarios([...scenarios, { ...editForm, id: 'scen_' + Date.now() }]);
    } else {
      setScenarios(scenarios.map(s => s.id === editForm.id ? editForm : s));
    }
    setIsEditing(false);
  };

  if (activeScenario) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-80px)] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-serif text-white">{activeScenario.title}</h2>
            <p className="text-xs text-white/50">{activeScenario.description}</p>
          </div>
          <button
            onClick={() => setActiveScenario(null)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-serif text-[#d4af37]"
          >
            End Scenario
          </button>
        </div>

        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${
                msg.speaker === 'director' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              {msg.speaker === 'narrator' ? (
                <div className="w-full text-center text-[10px] uppercase tracking-widest text-white/40 my-2">
                  {msg.text}
                </div>
              ) : (
                <>
                  <div className="text-[10px] text-white/40 mb-1 font-serif uppercase tracking-wider px-1">
                    {msg.speaker === 'director' ? 'You (Director)' : msg.speaker}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      msg.speaker === 'director'
                        ? 'bg-[#d4af37] text-black rounded-tr-sm'
                        : 'bg-[#1a1a1a] border border-white/10 text-white rounded-tl-sm'
                    }`}
                  >
                    {msg.stageDirection && (
                      <div className="text-[11px] opacity-70 italic mb-1.5 font-serif">
                        {msg.stageDirection}
                      </div>
                    )}
                    <p className="text-sm font-sans leading-relaxed">{msg.text}</p>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-center gap-2 text-white/40 text-xs font-serif p-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce delay-75" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce delay-150" />
              <span className="ml-2">Scenario unfolding...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          {suggestedOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestedOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(opt)}
                  disabled={isTyping}
                  className="text-[10px] px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 transition-all text-left"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              placeholder="Direct the scene... what do you say or do?"
              className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:border-[#d4af37] focus:outline-none"
              disabled={isTyping}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isTyping || !inputValue.trim()}
              className="px-5 bg-[#d4af37] hover:brightness-110 disabled:opacity-50 text-black rounded-xl flex items-center justify-center transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEditing && editForm) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8 animate-fade-in text-white">
        <h2 className="text-2xl font-serif mb-6">{editForm.id.startsWith('new') ? 'Create' : 'Edit'} Scenario</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-1 block">Title</label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-[#d4af37] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-1 block">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={2}
              className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-[#d4af37] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-1 block">System Prompt (AI Directives)</label>
            <textarea
              value={editForm.systemPrompt}
              onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
              rows={3}
              placeholder="Tell the AI how to act, who is in the scene, and what the conflict is..."
              className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-[#d4af37] outline-none font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-1 block">Starting Message</label>
            <textarea
              value={editForm.startingMessage}
              onChange={(e) => setEditForm({ ...editForm, startingMessage: e.target.value })}
              rows={2}
              className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-[#d4af37] outline-none"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              onClick={saveScenario}
              className="px-6 py-2 bg-[#d4af37] text-black rounded-xl text-sm font-semibold hover:brightness-110"
            >
              Save Scenario
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 text-white">
      {/* Top Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/40 text-[#d4af37] text-xs font-serif uppercase tracking-[0.2em]"
        >
          <Film size={14} /> The Writer's Room
        </motion.div>

        <h1 className="font-serif text-4xl md:text-5xl font-light text-white tracking-tight italic">
          Drama Scenarios
        </h1>
        <p className="font-serif text-lg md:text-xl text-[#d4af37]/80 italic font-light">
          Step into interactive visual-novel scenes and shape the narrative.
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditForm({
              id: 'new_' + Date.now(),
              title: 'New Scene',
              description: '',
              systemPrompt: '',
              startingMessage: '',
              participants: [],
            });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-xs hover:bg-white/10 transition-all text-[#d4af37]"
        >
          <Plus size={14} /> Create Custom Scenario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="bg-[#0e0e0e] border border-white/10 p-6 rounded-2xl flex flex-col relative group hover:border-[#d4af37]/40 transition-all">
            <h3 className="font-serif text-xl text-white mb-2">{scenario.title}</h3>
            <p className="text-sm text-white/50 mb-6 flex-1">{scenario.description}</p>
            
            <div className="flex items-center gap-3 mt-auto">
              <button
                onClick={() => handleStartScenario(scenario)}
                className="flex-1 bg-[#d4af37] text-black py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all text-sm"
              >
                <Play size={16} fill="currentColor" /> Play Scene
              </button>
              <button
                onClick={() => {
                  setEditForm(scenario);
                  setIsEditing(true);
                }}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/70"
              >
                <Edit size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Navigation CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-white/10 pt-8">
        <button
          onClick={() => {
            playChime(523.25, 'sine', 0.2);
            onReturnToStage();
          }}
          className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full font-serif uppercase tracking-widest text-xs transition-all"
        >
          Return to Stage
        </button>
      </div>
    </div>
  );
};
