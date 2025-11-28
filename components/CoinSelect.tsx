import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Coin } from '../types';

interface CoinSelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (coin: Coin) => void;
  coins: Coin[];
  title: string;
  selectedTicker?: string;
}

const CoinSelect: React.FC<CoinSelectProps> = ({ isOpen, onClose, onSelect, coins, title, selectedTicker }) => {
  const [search, setSearch] = useState('');
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to selected item when modal opens
  useEffect(() => {
    if (isOpen && selectedTicker && selectedRef.current) {
      // Small timeout to allow render to complete and animation to start
      setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, selectedTicker]);

  if (!isOpen) return null;

  // Add null checks for coin name/ticker to fix "Cannot read properties of undefined (reading 'toLowerCase')"
  const filteredCoins = coins.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.ticker || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 animate-in slide-in-from-bottom duration-300 text-white font-['League_Spartan']">
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
      </div>
      
      <div className="p-4 bg-gray-900">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search coins..."
            className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredCoins.map((coin) => {
          const isSelected = selectedTicker === coin.ticker;
          return (
            <button
              key={coin.ticker}
              ref={isSelected ? selectedRef : null}
              onClick={() => {
                onSelect(coin);
                onClose();
                setSearch('');
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors mb-1 ${
                isSelected 
                  ? 'bg-orange-900/20 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
                  : 'hover:bg-gray-900 border border-transparent'
              }`}
            >
              <div className="flex items-center">
                <img 
                  src={coin.image} 
                  alt={coin.name} 
                  className="w-10 h-10 rounded-full mr-4 bg-gray-800"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${coin.ticker}&background=random&color=fff&size=128`;
                  }}
                />
                <div className="flex flex-col items-start">
                  <span className={`text-base font-bold ${isSelected ? 'text-orange-400' : 'text-white'}`}>
                    {coin.ticker.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-400">{coin.name}</span>
                </div>
              </div>
              {isSelected && <Check size={20} className="text-orange-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CoinSelect;