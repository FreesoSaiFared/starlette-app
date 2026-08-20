/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { CinematicScreen } from './screens/CinematicScreen';
import { StageScreen } from './screens/StageScreen';
import { WardrobeScreen } from './screens/WardrobeScreen';
import { CrisisOverlay } from './components/CrisisOverlay';
import { StarletStats, GameView, WardrobeItem, Crisis } from './types';

const INITIAL_STATS: StarletStats = {
  happiness: 85,
  reaction: 92,
  tribute: 1492,
  tributePerSecond: 12,
};

const WARDROBE_ITEMS: WardrobeItem[] = [
  {
    id: 'choker',
    name: 'Diamond Choker',
    description: 'A cascade of brilliance for the most demanding necklines.',
    price: 4500,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADPncJP5ILEEI3vCFsEm50nl2yLSel2LruIfpZGESxcNU-mAN05jlwUW2UkHSIN7V52O6uv4b9ydewTrbcABc4R4zLS6H5QdUYRUyToozOvKcbsWAzy5S1l-hKL-sKeXs5zMOH_6TWFQokeN-img34HjeS7dZhWbXRXYQWaQu7xHPpHACcG1oBZPExvoExItaugaRQhEWzs4ETENpkACoqOnaXV7M62P08ZmH42JsGnKGKQJHmvEjnFXXqD7R2RMGjcnQZrNfzAlI',
    owned: false,
  },
  {
    id: 'headpiece',
    name: 'Feathered Headpiece',
    description: 'Towering ostrich plumes to command every eye in the house.',
    price: 2800,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBP6DcA4dlNR8p_wHpImqWtODOAHHHcCE82j8ikLHj5N0tDkNkcAtNKVpiO5_U8zoQO7SssOAnsWFvsa2cBt4RO4UaZkCAEStCpsQFRSxZu7UI6MlGJ2eNPfVD5wH9DNvt801ZvcbBsxvEHueKfwveEq2EcgdB5-U1-WYpNbSO25MXS2L4rAEydY7zOov4z-zH2Ktuqz_E1ffVajnK9bkGNP-QCw1_6Bgqd6tXETnALQuppQsoOMApFo5PvXjfCRioD275iy0qybKw',
    owned: false,
  },
  {
    id: 'garters',
    name: 'Silk Garters',
    description: 'Hand-stitched lace details for the ultimate private luxury.',
    price: 1200,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxUxingsrYZevPVQ59HTnQHhL3UOFhlhs2Qq9y2bklIhJ2GoT7SCQA08MaWTyBkBRwEvsH6yf40U2htFjhxslP8EJRDqNO6u1jG6mSBIcke_BESUlsSJrYe9L1503g-C6NnogE05ZyxrA6S4MhrSEzrJ9TtO58QOvRUJB9EgdwiF2-kKSO5wuwUaITnUPlb4yKZMTkNLDgIHSbJFt4J_4XUO9e4F9_4ltbCd_YkALtcFBY5O9Y1gIX2P5fsmBvmy5VcF-uhO338t4',
    owned: false,
  },
  {
    id: 'revue-corset',
    name: 'Sequined Corset',
    description: 'A structural masterpiece covered in obsidian sequins.',
    price: 6000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHP_XgMaK4q9At9TGOHzXXBjg-syaZ3CZ4wijdb_7lMosin5UN23173WUV2qFNBCCVGNYK3HXmeEFfuMTD3gJfP3GV_JPd730qEfEVTq-H2MYfTFcrYNJvWoW636P3YzqddC8wGVwzY-2-zV0t7APP-2mWLxYvh4nXO9uNcHDmGBPCujfqc5EHAu5eo0OWXWCA7EiZeDYZRVlhh_cb6kwno8VECRGSl7hVe-zXIXBLGchuQzshHd3nBenTD6RYKFyKqSixf8QXvcY',
    owned: false,
    setId: 'midnight-revue'
  },
  {
    id: 'revue-gloves',
    name: 'Matching Gloves',
    description: 'Elbow-length silk gloves tailored for dramatic gestures.',
    price: 2000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxUxingsrYZevPVQ59HTnQHhL3UOFhlhs2Qq9y2bklIhJ2GoT7SCQA08MaWTyBkBRwEvsH6yf40U2htFjhxslP8EJRDqNO6u1jG6mSBIcke_BESUlsSJrYe9L1503g-C6NnogE05ZyxrA6S4MhrSEzrJ9TtO58QOvRUJB9EgdwiF2-kKSO5wuwUaITnUPlb4yKZMTkNLDgIHSbJFt4J_4XUO9e4F9_4ltbCd_YkALtcFBY5O9Y1gIX2P5fsmBvmy5VcF-uhO338t4',
    owned: false,
    setId: 'midnight-revue'
  },
  {
    id: 'revue-cane',
    name: 'Signature Cane',
    description: 'A polished ebony cane with a solid gold handle.',
    price: 4000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADPncJP5ILEEI3vCFsEm50nl2yLSel2LruIfpZGESxcNU-mAN05jlwUW2UkHSIN7V52O6uv4b9ydewTrbcABc4R4zLS6H5QdUYRUyToozOvKcbsWAzy5S1l-hKL-sKeXs5zMOH_6TWFQokeN-img34HjeS7dZhWbXRXYQWaQu7xHPpHACcG1oBZPExvoExItaugaRQhEWzs4ETENpkACoqOnaXV7M62P08ZmH42JsGnKGKQJHmvEjnFXXqD7R2RMGjcnQZrNfzAlI',
    owned: false,
    setId: 'midnight-revue'
  }
];

export default function App() {
  const [stats, setStats] = useState<StarletStats>(INITIAL_STATS);
  const [view, setView] = useState<GameView>('cinematic');
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(WARDROBE_ITEMS);
  const [activeCrisis, setActiveCrisis] = useState<Crisis | null>(null);

  // Auto-generation of tribute
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        tribute: prev.tribute + prev.tributePerSecond,
        // Stats decay over time
        happiness: Math.max(0, prev.happiness - 0.05),
        reaction: Math.max(0, prev.reaction - 0.1),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Random crisis generator
  useEffect(() => {
    const crisisTimer = setInterval(() => {
      if (!activeCrisis && Math.random() < 0.05) { // 5% chance every 15s
        triggerCrisis();
      }
    }, 15000);
    return () => clearInterval(crisisTimer);
  }, [activeCrisis]);

  const triggerCrisis = useCallback(() => {
    const crises: Crisis[] = [
      {
        id: 'orchestra',
        message: 'Mon petit agent, the orchestra is incompetent! Fix this travesty immediately!',
        level: 'MEDIUM',
        type: 'drama',
      },
      {
        id: 'spotlight',
        message: 'IDIOT! The spotlight is blinding me! FIX IT IMMEDIATELY OR I QUIT!',
        level: 'CRITICAL',
        type: 'crisis',
      },
    ];
    setActiveCrisis(crises[Math.floor(Math.random() * crises.length)]);
  }, []);

  const handleAction = (type: 'encourage' | 'applaud') => {
    if (type === 'encourage') {
      setStats(prev => ({
        ...prev,
        happiness: Math.min(100, prev.happiness + 5),
      }));
    } else {
      setStats(prev => ({
        ...prev,
        reaction: Math.min(100, prev.reaction + 5),
        tribute: prev.tribute + 50,
      }));
    }
  };

  const handlePurchase = (id: string) => {
    const item = wardrobe.find(i => i.id === id);
    if (item && stats.tribute >= item.price && !item.owned) {
      setWardrobe(prev => prev.map(i => i.id === id ? { ...i, owned: true } : i));
      setStats(prev => ({
        ...prev,
        tribute: prev.tribute - item.price,
        tributePerSecond: prev.tributePerSecond + 2,
        happiness: Math.min(100, prev.happiness + 10),
      }));
    }
  };

  const handlePurchaseSet = (setId: string) => {
    const setItems = wardrobe.filter(i => i.setId === setId && !i.owned);
    const totalPrice = setItems.reduce((sum, item) => sum + item.price, 0);

    if (setItems.length > 0 && stats.tribute >= totalPrice) {
      setWardrobe(prev => prev.map(i => i.setId === setId ? { ...i, owned: true } : i));
      setStats(prev => ({
        ...prev,
        tribute: prev.tribute - totalPrice,
        tributePerSecond: prev.tributePerSecond + (setItems.length * 2),
        happiness: Math.min(100, prev.happiness + (setItems.length * 10)),
      }));
    }
  };

  const solveCrisis = (id: string) => {
    if (stats.tribute >= 500) {
      setStats(prev => ({ ...prev, tribute: prev.tribute - 500, happiness: 100 }));
      setActiveCrisis(null);
    }
  };

  return (
    <div className="bg-background min-h-screen text-on-background font-sans">
      {view === 'cinematic' ? (
        <CinematicScreen onSkip={() => setView('stage')} />
      ) : (
        <Layout activeView={view} onViewChange={setView}>
          {view === 'stage' && (
            <StageScreen stats={stats} onAction={handleAction} />
          )}
          {view === 'wardrobe' && (
            <WardrobeScreen 
              items={wardrobe} 
              tribute={stats.tribute} 
              onPurchase={handlePurchase} 
              onPurchaseSet={handlePurchaseSet}
            />
          )}
          {/* Placeholders for other views */}
          {(view === 'demands' || view === 'gifts' || view === 'mirror') && (
            <div className="flex flex-col items-center justify-center pt-20 p-8 text-center gap-4">
              <h1 className="font-newsreader text-4xl text-secondary italic">Coming Soon</h1>
              <p className="font-serif text-on-surface-variant italic">
                The Starlet's whims for this section are still being drafted...
              </p>
              <button 
                onClick={() => setView('stage')}
                className="mt-4 px-8 py-3 bg-primary-container text-white rounded-full font-serif uppercase tracking-widest text-xs"
              >
                Return to Stage
              </button>
            </div>
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
