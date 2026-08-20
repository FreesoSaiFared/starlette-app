import React from 'react';
import { Sparkles, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { WardrobeItem } from '../types';

interface WardrobeScreenProps {
  items: WardrobeItem[];
  tribute: number;
  onPurchase: (id: string) => void;
  onPurchaseSet: (setId: string) => void;
}

export const WardrobeScreen: React.FC<WardrobeScreenProps> = ({ items, tribute, onPurchase, onPurchaseSet }) => {
  const generalItems = items.filter(i => !i.setId);
  const revueSetItems = items.filter(i => i.setId === 'midnight-revue');
  
  const isSetOwned = revueSetItems.length > 0 && revueSetItems.every(i => i.owned);
  const unownedSetItems = revueSetItems.filter(i => !i.owned);
  const setRemainingPrice = unownedSetItems.reduce((sum, i) => sum + i.price, 0);
  const setOriginalPrice = revueSetItems.reduce((sum, i) => sum + i.price, 0);

  return (
    <div className="px-12 pb-12 animate-fade-in flex flex-col gap-12 max-w-5xl mx-auto">
      <section className="text-left mb-6">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif text-6xl font-light leading-[0.9] tracking-tight mb-4 italic text-white"
        >
          Exclusive <br /> <span className="not-italic ml-16">Acquisitions</span>
        </motion.h1>
        <p className="max-w-md text-lg text-white/50 leading-relaxed font-light mb-12">
          Curate your collection for tonight's exhibition. Only the finest, carefully sourced materials.
        </p>
      </section>

      {/* Item Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {generalItems.map((item, index) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="gold-frame flex flex-col rounded-none group hover:border-[#d4af37] transition-all"
          >
            <div className="relative h-72 overflow-hidden border-b border-white/10 p-8 flex items-center justify-center bg-[#050505]">
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" 
              />
            </div>

            <div className="p-8 flex flex-col justify-between flex-grow">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-serif text-2xl font-light tracking-tight text-white mb-2 italic">{item.name}</h3>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-sans">
                    {item.price.toLocaleString()} <span className="text-white/40 ml-1">CR</span>
                  </div>
                </div>
                <p className="text-sm font-light leading-relaxed text-white/50 mb-8 border-l border-white/20 pl-4 py-1">
                  {item.description}
                </p>
              </div>
              
              <button 
                onClick={() => !item.owned && onPurchase(item.id)}
                disabled={item.owned || tribute < item.price}
                className={`w-full px-10 py-4 border text-[11px] uppercase tracking-[0.2em] font-sans transition-colors ${
                  item.owned 
                    ? 'border-white/10 text-white/30 cursor-not-allowed bg-transparent' 
                    : tribute >= item.price 
                      ? 'border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black' 
                      : 'border-white/20 text-white/40 cursor-not-allowed hover:bg-transparent hover:text-white/40'
                }`}
              >
                {item.owned ? 'Archived' : 'Acquire Piece'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Featured Collection Section */}
      {revueSetItems.length > 0 && (
        <section className="mt-12 bg-[#0a0a0a] border-t border-b border-white/10 flex flex-col md:flex-row items-stretch">
          <div className="w-full md:w-1/2 overflow-hidden border-r border-white/10 p-12 bg-[#050505] flex items-center justify-center">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHP_XgMaK4q9At9TGOHzXXBjg-syaZ3CZ4wijdb_7lMosin5UN23173WUV2qFNBCCVGNYK3HXmeEFfuMTD3gJfP3GV_JPd730qEfEVTq-H2MYfTFcrYNJvWoW636P3YzqddC8wGVwzY-2-zV0t7APP-2mWLxYvh4nXO9uNcHDmGBPCujfqc5EHAu5eo0OWXWCA7EiZeDYZRVlhh_cb6kwno8VECRGSl7hVe-zXIXBLGchuQzshHd3nBenTD6RYKFyKqSixf8QXvcY" 
              alt="Collection" 
              className="w-full h-full object-cover opacity-80" 
            />
          </div>
          <div className="flex-1 flex flex-col justify-center p-12 text-left">
            <div className="font-sans text-[11px] uppercase tracking-[0.4em] text-[#d4af37] block mb-4">
              Curator's Choice Collection
            </div>
            <h3 className="font-serif text-5xl font-light text-white mb-6 italic tracking-tight">The Midnight Revue</h3>
            <p className="text-lg text-white/50 leading-relaxed font-light mb-8">
              A complete ensemble consisting of {revueSetItems.length} pieces, carefully matched. <br /> Includes: {revueSetItems.map(i => i.name).join(', ')}.
            </p>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => !isSetOwned && onPurchaseSet('midnight-revue')}
                disabled={isSetOwned || tribute < setRemainingPrice}
                className={`px-10 py-4 border text-[11px] uppercase tracking-[0.2em] font-sans transition-colors ${
                  isSetOwned
                    ? 'border-white/10 text-white/30 cursor-not-allowed bg-transparent'
                    : tribute >= setRemainingPrice
                      ? 'border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black'
                      : 'border-white/20 text-white/40 cursor-not-allowed hover:bg-transparent hover:text-white/40'
                }`}
              >
                {isSetOwned ? 'Collection Archived' : `Acquire Set (${unownedSetItems.length} Piece${unownedSetItems.length > 1 ? 's' : ''})`}
              </button>
              {!isSetOwned && (
                <>
                  <div className="h-[1px] w-12 bg-white/20"></div>
                  <div className="flex flex-col">
                    {setRemainingPrice < setOriginalPrice && (
                       <span className="text-[10px] uppercase line-through text-white/20 font-sans">{setOriginalPrice.toLocaleString()} CR</span>
                    )}
                    <span className="text-[14px] uppercase tracking-[0.2em] text-[#d4af37] font-sans">
                      {setRemainingPrice.toLocaleString()} CR
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
