import React from 'react';
import { Member, RewardItem } from '../types';
import { Award, Gift, History, CheckCircle2, TrendingUp, X, Sparkles, AlertCircle, Crown } from 'lucide-react';

interface MemberProfileProps {
  member: Member;
  rewards: RewardItem[];
  onDeselect: () => void;
  onOpenLedger: () => void;
  onSelectRewardToRedeem: (reward: RewardItem) => void;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({
  member,
  rewards,
  onDeselect,
  onOpenLedger,
  onSelectRewardToRedeem
}) => {
  const { currentBalance, lifetimePoints, tier, tierStatus } = member;

  const getTierTheme = (t: string) => {
    switch (t) {
      case 'PLATINUM':
        return {
          gradient: 'from-cyan-500/25 via-slate-300/15 to-indigo-600/10',
          border: 'border-cyan-400/50 shadow-cyan-500/10',
          badgeBg: 'bg-gradient-to-r from-cyan-300 to-slate-100 text-slate-950 font-black',
          textColor: 'text-cyan-300',
          barColor: 'bg-gradient-to-r from-cyan-400 via-slate-200 to-indigo-300'
        };
      case 'GOLD':
        return {
          gradient: 'from-amber-500/20 via-yellow-500/10 to-amber-600/5',
          border: 'border-yellow-500/40',
          badgeBg: 'bg-yellow-400 text-slate-950',
          textColor: 'text-yellow-400',
          barColor: 'bg-gradient-to-r from-yellow-500 to-amber-400'
        };
      case 'SILVER':
        return {
          gradient: 'from-slate-400/20 via-slate-300/10 to-slate-500/5',
          border: 'border-slate-400/40',
          badgeBg: 'bg-slate-200 text-slate-950',
          textColor: 'text-slate-200',
          barColor: 'bg-gradient-to-r from-slate-400 to-slate-200'
        };
      case 'BRONZE':
      default:
        return {
          gradient: 'from-amber-800/25 via-amber-700/10 to-amber-900/5',
          border: 'border-amber-700/40',
          badgeBg: 'bg-amber-600 text-white',
          textColor: 'text-amber-500',
          barColor: 'bg-gradient-to-r from-amber-700 to-amber-500'
        };
    }
  };

  const theme = getTierTheme(tier);

  // Available rewards the member can redeem right now
  const affordableRewards = rewards.filter((r) => r.isActive && r.pointsCost <= currentBalance);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradient} border ${theme.border} p-5 backdrop-blur-xl shadow-xl`}>
      {/* Top row: Name & Controls */}
      <div className="flex items-start justify-between pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">{member.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${theme.badgeBg} shadow-sm flex items-center gap-1`}>
              {tier === 'PLATINUM' && <Crown className="w-3.5 h-3.5 text-slate-950" />}
              {tier} MEMBER
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono mt-0.5">{member.formattedPhone}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLedger}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
            title="View Immutable Points Ledger & Audit"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Audit Ledger</span>
          </button>

          <button
            onClick={onDeselect}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors"
            title="Deselect Member"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle row: Live Balance & Multiplier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Live spendable balance */}
        <div className="bg-slate-950/50 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
              Live Spendable Balance
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
                {currentBalance.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-300">points</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 border border-amber-400/20">
            <Gift className="w-5 h-5" />
          </div>
        </div>

        {/* Multiplier & Tier status */}
        <div className="bg-slate-950/50 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
              Current Earn Speed
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-2xl font-extrabold ${theme.textColor} tracking-tight`}>
                {tierStatus.earnRate !== undefined ? `${tierStatus.earnRate}/₹ Earn Rate` : `${tierStatus.multiplier}x Multiplier`}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {tierStatus.earnRate !== undefined
                ? `(Earns ${tierStatus.earnRate} points per ₹1 spent)`
                : `(${tierStatus.multiplier * 10} points earned per $1 / ₹1)`}
            </span>
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300 border border-white/10">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tier Progress Bar */}
      <div className="mt-2 bg-slate-950/40 rounded-xl p-3 border border-white/5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Lifetime Qualifying: <strong className="text-white">{lifetimePoints.toLocaleString()} pts</strong></span>
          </div>
          <div className="font-semibold text-slate-300">
            {tierStatus.nextTier ? (
              <span>
                {tierStatus.pointsToNextTier} pts to <strong className="text-cyan-300">{tierStatus.nextTier}</strong>
              </span>
            ) : (
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Platinum Top Tier Reached!
              </span>
            )}
          </div>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.barColor}`}
            style={{ width: `${tierStatus.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Available Rewards Quick-Redeem Chips */}
      {affordableRewards.length > 0 ? (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Eligible Free Rewards ({affordableRewards.length})
            </span>
            <span className="text-[11px] text-slate-400">Click to add to cart as redemption</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {affordableRewards.map((reward) => (
              <button
                key={reward.id}
                onClick={() => onSelectRewardToRedeem(reward)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white transition-all text-xs font-semibold group shadow-sm hover:scale-[1.02]"
              >
                <span>{reward.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                  {reward.pointsCost} pts
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-2 text-xs text-slate-400 text-center">
          Needs {rewards[0] ? rewards[0].pointsCost - currentBalance : 60} more points for next reward.
        </div>
      )}
    </div>
  );
};
