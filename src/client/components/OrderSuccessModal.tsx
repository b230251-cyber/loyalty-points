import React from 'react';
import { CheckoutResult, Member } from '../types';
import { CheckCircle, Sparkles, Award, ArrowRight, Gift } from 'lucide-react';

interface OrderSuccessModalProps {
  result: CheckoutResult | null;
  selectedMember: Member | null;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  result,
  selectedMember,
  onClose
}) => {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-black text-center relative overflow-hidden">
        {/* Confetti / Glow background if tier upgraded */}
        {result.tierUpgraded && (
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/20 via-amber-500/10 to-transparent pointer-events-none animate-pulse"></div>
        )}

        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
          <CheckCircle className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-extrabold text-white tracking-tight">
          Checkout Completed!
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Order #{result.orderId.slice(0, 8)} • Paid ${result.netPaidAmount.toFixed(2)}
        </p>

        {/* Tier Upgrade Banner */}
        {result.tierUpgraded && (
          <div className="my-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-yellow-400/40 text-yellow-300">
            <div className="flex items-center justify-center gap-1.5 font-extrabold text-sm mb-0.5">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
              <span>TIER LEVEL UP!</span>
              <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
            </div>
            <p className="text-xs text-white">
              Promoted from <strong className="text-slate-300">{result.previousTier}</strong> to{' '}
              <strong className="text-yellow-400 text-sm uppercase">{result.newTier}</strong>!
            </p>
          </div>
        )}

        {/* Financial & Points Summary */}
        <div className="my-4 bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs text-left">
          {result.pointsEarned > 0 && (
            <div className="flex justify-between items-center text-emerald-400 font-bold">
              <span>Points Earned</span>
              <span className="text-sm font-mono font-extrabold">+{result.pointsEarned} pts</span>
            </div>
          )}

          {result.pointsRedeemed > 0 && (
            <div className="flex justify-between items-center text-amber-400 font-bold">
              <span>Points Redeemed</span>
              <span className="text-sm font-mono font-extrabold">-{result.pointsRedeemed} pts</span>
            </div>
          )}

          {result.memberId && (
            <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-white font-semibold">
              <span className="text-slate-300">New Live Balance</span>
              <span className="text-base font-extrabold text-amber-400 font-mono">
                {result.newBalance.toLocaleString()} pts
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
        >
          Next Customer
        </button>
      </div>
    </div>
  );
};
