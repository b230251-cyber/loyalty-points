import React from 'react';
import { Coffee, UserPlus, Settings, Clock, ShieldCheck, Sparkles } from 'lucide-react';

interface HeaderProps {
  memberCount: number;
  onOpenNewMember: () => void;
  onOpenConfig: () => void;
  onOpenRecentOrders: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  memberCount,
  onOpenNewMember,
  onOpenConfig,
  onOpenRecentOrders
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        {/* Brand & Counter Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-extrabold">
            <Coffee className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-1.5">
                AuraCafe <span className="text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">POS Counter</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Ledger Active • {memberCount.toLocaleString()} Members Registered
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenRecentOrders}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all"
            title="View recent transactions"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Orders Log</span>
          </button>

          <button
            onClick={onOpenConfig}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all"
            title="Configure Tiers and Rates"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Tiers & Rules</span>
          </button>

          <button
            onClick={onOpenNewMember}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ New Member</span>
          </button>
        </div>
      </div>
    </header>
  );
};
