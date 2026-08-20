import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { CinematicScreen } from './screens/CinematicScreen';
import { StageScreen } from './screens/StageScreen';
import { AuditionScreen } from './screens/AuditionScreen';
import { TroupeScreen } from './screens/TroupeScreen';
import { WardrobeScreen } from './screens/WardrobeScreen';
import { DemandsScreen } from './screens/DemandsScreen';
import { StudioEditorScreen } from './screens/StudioEditorScreen';
import { CrisisOverlay } from './components/CrisisOverlay';
import { StarletStats, GameView, WardrobeItem, Crisis, DancerCandidate, LLMConfig } from './types';
import { INITIAL_DANCERS } from './data/dancers';

const INITIAL_STATS: StarletStats = {
  happiness: 85,
  reaction: 92,
  tribute: 3500, // Generous starting funds so the player can immediately test and enjoy hiring a starlet
  tributePerSecond: 15,
};

const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'gemini',
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: '',
  temperature: 0.7,
  customStorylinePrompt:
    'Set in a lavish 1920s Parisian cabaret at the foot of Montmartre. Romantic, theatrical, witty, filled with champagne toasts, sparkling chandeliers, and haute couture.',
};

const WARDROBE_ITEMS: WardrobeItem[] = [
  {
    id: 'choker',
    name: 'Diamond Choker',
    description: 'A cascade of brilliance for the most demanding necklines.',
    price: 4500,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
    owned: false,
  },
  {
    id: 'headpiece',
    name: 'Feathered Headpiece',
    description: 'Towering ostrich plumes to command every eye in the house.',
    price: 2800,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    owned: false,
  },
  {
    id: 'garters',
    name: 'Silk Garters',
    description: 'Hand-stitched lace details for the ultimate private luxury.',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    owned: false,
  },
  {
    id: 'revue-corset',
    name: 'Sequined Corset',
    description: 'A structural masterpiece covered in obsidian sequins.',
    price: 6000,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    owned: false,
    setId: 'midnight-revue',
  },
  {
    id: 'revue-gloves',
    name: 'Matching Gloves',
    description: 'Elbow-length silk gloves tailored for dramatic gestures.',
    price: 2000,
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    owned: false,
    setId: 'midnight-revue',
  },
  {
    id: 'revue-cane',
    name: 'Signature Cane',
    description: 'A polished ebony cane with a solid gold handle.',
    price: 4000,
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    owned: false,
    setId: 'midnight-revue',
  },
];

export default function App() {
  const [stats, setStats] = useState<StarletStats>(INITIAL_STATS);
  const [view, setView] = useState<GameView>('cinematic');
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(WARDROBE_ITEMS);
  const [dancers, setDancers] = useState<DancerCandidate[]>(INITIAL_DANCERS);
  const [activeCrisis, setActiveCrisis] = useState<Crisis | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem('aurelian_llm_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_LLM_CONFIG;
  });

  const handleUpdateLLMConfig = (config: LLMConfig) => {
    setLlmConfig(config);
    localStorage.setItem('aurelian_llm_config', JSON.stringify(config));
  };

  const handleUpdateDancer = (updated: DancerCandidate) => {
    setDancers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleCreateDancer = (newDancer: DancerCandidate) => {
    setDancers((prev) => [newDancer, ...prev]);
  };

  const handleDeleteDancer = (id: string) => {
    setDancers((prev) => prev.filter((d) => d.id !== id));
  };

  // Recalculate tribute per second based on wardrobe and hired stage dancers
  const calculateTps = useCallback(
    (currentWardrobe: WardrobeItem[], currentDancers: DancerCandidate[]) => {
      const baseTps = 15;
      const wardrobeBonus = currentWardrobe.filter((w) => w.owned).length * 4;
      const dancersBonus = currentDancers
        .filter((d) => d.hired && d.assignedToStage)
        .reduce((sum, d) => sum + d.bonusTps, 0);
      return baseTps + wardrobeBonus + dancersBonus;
    },
    []
  );

  // Auto-generation of tribute
  useEffect(() => {
    const timer = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        tribute: prev.tribute + prev.tributePerSecond,
        happiness: Math.max(10, prev.happiness - 0.04),
        reaction: Math.max(20, prev.reaction - 0.08),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update TPS when wardrobe or dancers change
  useEffect(() => {
    const newTps = calculateTps(wardrobe, dancers);
    setStats((prev) => ({
      ...prev,
      tributePerSecond: newTps,
    }));
  }, [wardrobe, dancers, calculateTps]);

  // Random crisis generator (less frequent if dancers like Mireille are hired)
  useEffect(() => {
    const crisisTimer = setInterval(() => {
      const hasMireille = dancers.some((d) => d.id === 'mireille' && d.hired);
      const threshold = hasMireille ? 0.02 : 0.04;
      if (!activeCrisis && Math.random() < threshold) {
        triggerCrisis();
      }
    }, 18000);
    return () => clearInterval(crisisTimer);
  }, [activeCrisis, dancers]);

  const triggerCrisis = useCallback(() => {
    const crises: Crisis[] = [
      {
        id: 'orchestra',
        message: 'Mon cher Directeur, the orchestra strings are wildly off-tempo! Restore Parisian elegance at once!',
        level: 'MEDIUM',
        type: 'drama',
      },
      {
        id: 'spotlight',
        message: 'MON DIEU! The main spotlight operator is asleep! Recalibrate the stage lighting immediately!',
        level: 'CRITICAL',
        type: 'crisis',
      },
      {
        id: 'champagne',
        message: 'The backstage ice bucket is empty! The prima donna refuses to take the stage without chilled vintage Moët!',
        level: 'LOW',
        type: 'drama',
      },
    ];
    setActiveCrisis(crises[Math.floor(Math.random() * crises.length)]);
  }, []);

  const handleAction = (type: 'encourage' | 'applaud') => {
    if (type === 'encourage') {
      setStats((prev) => ({
        ...prev,
        happiness: Math.min(100, prev.happiness + 6),
      }));
    } else {
      setStats((prev) => ({
        ...prev,
        reaction: Math.min(100, prev.reaction + 6),
        tribute: prev.tribute + 60,
      }));
    }
  };

  const handleHireDancer = (candidateToHire: DancerCandidate) => {
    if (stats.tribute < candidateToHire.hiringPrice) return;

    setDancers((prev) =>
      prev.map((d) =>
        d.id === candidateToHire.id ? { ...d, hired: true, assignedToStage: true } : d
      )
    );

    setStats((prev) => ({
      ...prev,
      tribute: prev.tribute - candidateToHire.hiringPrice,
      happiness: Math.min(100, prev.happiness + candidateToHire.happinessBonus),
    }));
  };

  const handleToggleStageAssignment = (id: string) => {
    setDancers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, assignedToStage: !d.assignedToStage } : d))
    );
  };

  const handleRehearseTroupe = () => {
    setStats((prev) => ({
      ...prev,
      happiness: 100,
      reaction: Math.min(100, prev.reaction + 15),
      tribute: prev.tribute + 200,
    }));
  };

  const handlePurchase = (id: string) => {
    const item = wardrobe.find((i) => i.id === id);
    if (item && stats.tribute >= item.price && !item.owned) {
      setWardrobe((prev) => prev.map((i) => (i.id === id ? { ...i, owned: true } : i)));
      setStats((prev) => ({
        ...prev,
        tribute: prev.tribute - item.price,
        happiness: Math.min(100, prev.happiness + 10),
      }));
    }
  };

  const handlePurchaseSet = (setId: string) => {
    const setItems = wardrobe.filter((i) => i.setId === setId && !i.owned);
    const totalPrice = setItems.reduce((sum, item) => sum + item.price, 0);

    if (setItems.length > 0 && stats.tribute >= totalPrice) {
      setWardrobe((prev) => prev.map((i) => (i.setId === setId ? { ...i, owned: true } : i)));
      setStats((prev) => ({
        ...prev,
        tribute: prev.tribute - totalPrice,
        happiness: Math.min(100, prev.happiness + setItems.length * 10),
      }));
    }
  };

  const solveCrisis = (id: string) => {
    if (stats.tribute >= 300) {
      setStats((prev) => ({ ...prev, tribute: prev.tribute - 300, happiness: 100 }));
      setActiveCrisis(null);
    }
  };

  return (
    <div className="bg-background min-h-screen text-on-background font-sans">
      {view === 'cinematic' ? (
        <CinematicScreen onSkip={() => setView('stage')} />
      ) : (
        <Layout activeView={view} onViewChange={setView} tribute={stats.tribute}>
          {view === 'stage' && (
            <StageScreen
              stats={stats}
              hiredDancers={dancers}
              onAction={handleAction}
              onGoToAuditions={() => setView('auditions')}
            />
          )}

          {view === 'auditions' && (
            <AuditionScreen
              candidates={dancers}
              tribute={stats.tribute}
              onHireDancer={handleHireDancer}
              llmConfig={llmConfig}
              onOpenStudio={() => setView('studio')}
            />
          )}

          {view === 'studio' && (
            <StudioEditorScreen
              dancers={dancers}
              onUpdateDancer={handleUpdateDancer}
              onCreateDancer={handleCreateDancer}
              onDeleteDancer={handleDeleteDancer}
              llmConfig={llmConfig}
              onUpdateLLMConfig={handleUpdateLLMConfig}
              onGoToAudition={(dancerId) => {
                // Move selected dancer to top so it's active in audition
                setDancers((prev) => {
                  const target = prev.find((d) => d.id === dancerId);
                  if (!target) return prev;
                  return [target, ...prev.filter((d) => d.id !== dancerId)];
                });
                setView('auditions');
              }}
            />
          )}

          {view === 'troupe' && (
            <TroupeScreen
              dancers={dancers}
              tribute={stats.tribute}
              onToggleStageAssignment={handleToggleStageAssignment}
              onGoToAuditions={() => setView('auditions')}
              onRehearseTroupe={handleRehearseTroupe}
              onOpenStudio={() => setView('studio')}
            />
          )}

          {view === 'wardrobe' && (
            <WardrobeScreen
              items={wardrobe}
              tribute={stats.tribute}
              onPurchase={handlePurchase}
              onPurchaseSet={handlePurchaseSet}
            />
          )}

          {(view === 'demands' || view === 'gifts' || view === 'mirror') && (
            <DemandsScreen
              onReturnToStage={() => setView('stage')}
              onGoToAuditions={() => setView('auditions')}
            />
          )}
        </Layout>
      )}

      <CrisisOverlay
        crisis={activeCrisis}
        onSolve={solveCrisis}
        onClose={() => setActiveCrisis(null)}
      />
    </div>
  );
}
