import React from 'react';
import { CartItem, Member, ProgramConfig } from '../types';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Sparkles, Gift, AlertCircle, ArrowRight } from 'lucide-react';

interface CartSummaryProps {
  cart: CartItem[];
  selectedMember: Member | null;
  config: ProgramConfig;
  paymentMethod: 'CASH' | 'CARD';
  isCheckingOut: boolean;
  onUpdateQuantity: (menuItemId: string, isRedemption: boolean, delta: number) => void;
  onRemoveItem: (menuItemId: string, isRedemption: boolean) => void;
  onToggleRedemption: (menuItemId: string) => void;
  onSetPaymentMethod: (method: 'CASH' | 'CARD') => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  cart,
  selectedMember,
  config,
  paymentMethod,
  isCheckingOut,
  onUpdateQuantity,
  onRemoveItem,
  onToggleRedemption,
  onSetPaymentMethod,
  onClearCart,
  onCheckout
}) => {
  // Calculations
  const grossAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalPointsCost = cart.reduce((sum, item) => sum + (item.isRedemption ? item.pointsCost * item.quantity : 0), 0);
  const redeemedDollarValue = cart.reduce((sum, item) => sum + (item.isRedemption ? item.price * item.quantity : 0), 0);
  const netPaidAmount = Math.max(0, grossAmount - redeemedDollarValue);

  // Points to be earned on net paid amount
  const tierMultiplier = selectedMember?.tierStatus.multiplier || 1.0;
  const pointsToEarn = selectedMember && netPaidAmount > 0
    ? Math.floor(netPaidAmount * config.pointsPerDollar * tierMultiplier)
    : 0;

  // Validation
  const hasInsufficientPoints = selectedMember && totalPointsCost > selectedMember.currentBalance;
  const isRedemptionWithoutMember = !selectedMember && totalPointsCost > 0;
  const canSubmit = cart.length > 0 && !hasInsufficientPoints && !isRedemptionWithoutMember && !isCheckingOut;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full shadow-2xl">
      {/* Top Title & Clear button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-base text-white">Current Order</h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold">
            {cart.reduce((s, i) => s + i.quantity, 0)} items
          </span>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 min-h-[160px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
            <ShoppingCart className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-400">Your cart is empty</p>
            <p className="text-xs text-slate-500 mt-1">Select items from the cafe menu or redeem rewards</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={`${item.menuItemId}-${item.isRedemption}`}
              className={`p-3 rounded-xl border transition-all ${
                item.isRedemption
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-800/40 border-slate-750'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{item.name}</span>
                    {item.isRedemption && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                        Free (Redeemed)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {item.isRedemption ? (
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {(item.pointsCost * item.quantity).toLocaleString()} pts ({item.pointsCost} ea)
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-amber-400">
                        ${(item.price * item.quantity).toFixed(2)} (${item.price.toFixed(2)} ea)
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg p-1 border border-slate-700/60">
                  <button
                    onClick={() => onUpdateQuantity(item.menuItemId, item.isRedemption, -1)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs font-bold px-1.5 text-slate-200">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.menuItemId, item.isRedemption, 1)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Line item actions */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-xs">
                {selectedMember && item.pointsCost > 0 ? (
                  <button
                    onClick={() => onToggleRedemption(item.menuItemId)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-amber-400 underline transition-colors"
                  >
                    {item.isRedemption ? 'Switch to Pay Cash' : `Switch to Redeem (${item.pointsCost} pts)`}
                  </button>
                ) : (
                  <div></div>
                )}

                <button
                  onClick={() => onRemoveItem(item.menuItemId, item.isRedemption)}
                  className="text-slate-500 hover:text-red-400 p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Warnings */}
      {hasInsufficientPoints && (
        <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Insufficient points! Required: <strong>{totalPointsCost} pts</strong>, Available: <strong>{selectedMember?.currentBalance} pts</strong>.
          </span>
        </div>
      )}

      {isRedemptionWithoutMember && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Look up or register a member to redeem free rewards.</span>
        </div>
      )}

      {/* Financial Breakdown & Points Projection */}
      <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Gross Order Value</span>
          <span className="font-mono text-slate-200">${grossAmount.toFixed(2)}</span>
        </div>

        {totalPointsCost > 0 && (
          <div className="flex justify-between text-emerald-400 font-medium">
            <span>Points Redeemed ({totalPointsCost} pts)</span>
            <span className="font-mono">-${redeemedDollarValue.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-800/80">
          <span>Net Amount Due</span>
          <span className="font-mono text-lg text-amber-400">${netPaidAmount.toFixed(2)}</span>
        </div>

        {/* Live Points Earned Projection */}
        {selectedMember ? (
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-bold text-slate-200 block text-xs">Points to be Earned</span>
                <span className="text-[10px] text-slate-400">
                  {tierMultiplier}x {selectedMember.tier} rate
                </span>
              </div>
            </div>
            <span className="text-base font-extrabold text-amber-400 font-mono">
              +{pointsToEarn.toLocaleString()} pts
            </span>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-slate-800/40 text-[11px] text-slate-400 text-center">
            Look up a member to earn loyalty points on this order.
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
        <button
          onClick={() => onSetPaymentMethod('CARD')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            paymentMethod === 'CARD'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Credit / Debit</span>
        </button>

        <button
          onClick={() => onSetPaymentMethod('CASH')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            paymentMethod === 'CASH'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Cash</span>
        </button>
      </div>

      {/* Complete Order Button */}
      <button
        onClick={onCheckout}
        disabled={!canSubmit}
        className={`w-full mt-3 py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
          canSubmit
            ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 hover:brightness-110 shadow-amber-500/25 active:scale-[0.98]'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
        }`}
      >
        {isCheckingOut ? (
          <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <span>Charge ${netPaidAmount.toFixed(2)} & Record Points</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};
