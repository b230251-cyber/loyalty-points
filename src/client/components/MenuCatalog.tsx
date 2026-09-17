import React, { useState } from 'react';
import { MenuItem, Member } from '../types';
import { Coffee, Cookie, CupSoda, Utensils, ShoppingBag, Plus, Gift } from 'lucide-react';

interface MenuCatalogProps {
  menuItems: MenuItem[];
  selectedMember: Member | null;
  onAddToCart: (item: MenuItem, isRedemption: boolean) => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Items', icon: ShoppingBag },
  { id: 'COFFEE', label: 'Artisan Coffee', icon: Coffee },
  { id: 'PASTRY', label: 'Bakery & Pastry', icon: Cookie },
  { id: 'DRINK', label: 'Specialty Drinks', icon: CupSoda },
  { id: 'FOOD', label: 'Food & Paninis', icon: Utensils },
  { id: 'MERCH', label: 'Merchandise', icon: ShoppingBag }
];

export const MenuCatalog: React.FC<MenuCatalogProps> = ({
  menuItems,
  selectedMember,
  onAddToCart
}) => {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const filteredItems = activeCategory === 'ALL'
    ? menuItems
    : menuItems.filter((i) => i.category === activeCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'COFFEE': return <Coffee className="w-4 h-4" />;
      case 'PASTRY': return <Cookie className="w-4 h-4" />;
      case 'DRINK': return <CupSoda className="w-4 h-4" />;
      case 'FOOD': return <Utensils className="w-4 h-4" />;
      case 'MERCH': default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Menu Item Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mt-3 overflow-y-auto pr-1">
        {filteredItems.map((item) => {
          const canRedeem = selectedMember && item.isRewardEligible && item.rewardPointsCost && selectedMember.currentBalance >= item.rewardPointsCost;

          return (
            <div
              key={item.id}
              className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg group"
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <span className="p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:text-amber-400 transition-colors">
                    {getCategoryIcon(item.category)}
                  </span>
                  <span className="font-extrabold text-base text-white tracking-tight">
                    ${item.price.toFixed(2)}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                  {item.name}
                </h3>
                
                {item.rewardPointsCost && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 font-mono mt-0.5">
                    <Gift className="w-3 h-3 text-amber-400" /> {item.rewardPointsCost} pts to redeem
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80">
                {/* Standard Cash/Card Add */}
                <button
                  onClick={() => onAddToCart(item, false)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-200 hover:text-slate-950 font-bold text-xs transition-all border border-slate-700 hover:border-amber-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add (${item.price.toFixed(2)})</span>
                </button>

                {/* Redeem button if eligible */}
                {canRedeem && (
                  <button
                    onClick={() => onAddToCart(item, true)}
                    className="flex items-center justify-center p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-xs transition-all border border-emerald-500/40"
                    title={`Redeem for ${item.rewardPointsCost} points`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
