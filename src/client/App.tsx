import React, { useState, useEffect } from 'react';
import { Member, MenuItem, RewardItem, ProgramConfig, CartItem, CheckoutResult } from './types';
import { fetchHealth, fetchMenuItems, fetchRewardItems, fetchConfig, processCheckout, getMemberById } from './api/client';
import { Header } from './components/Header';
import { MemberLookup } from './components/MemberLookup';
import { MemberProfile } from './components/MemberProfile';
import { MenuCatalog } from './components/MenuCatalog';
import { CartSummary } from './components/CartSummary';
import { LedgerModal } from './components/LedgerModal';
import { NewMemberModal } from './components/NewMemberModal';
import { ConfigModal } from './components/ConfigModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { RecentOrdersModal } from './components/RecentOrdersModal';

export const App: React.FC = () => {
  // Global Data
  const [memberCount, setMemberCount] = useState(0);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [config, setConfig] = useState<ProgramConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Counter State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CARD');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  // Modals
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(false);
  const [isOrderSuccessOpen, setIsOrderSuccessOpen] = useState(false);

  // Initial Load
  const initApp = async () => {
    try {
      const [health, menu, rewards, cfg] = await Promise.all([
        fetchHealth(),
        fetchMenuItems(),
        fetchRewardItems(),
        fetchConfig()
      ]);
      setMemberCount(health.memberCount);
      setMenuItems(menu);
      setRewardItems(rewards);
      setConfig(cfg);
    } catch (e) {
      console.error('Initialization error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  // Cart Operations
  const handleAddToCart = (item: MenuItem, isRedemption: boolean) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.menuItemId === item.id && ci.isRedemption === isRedemption
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }

      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: 1,
          isRedemption,
          pointsCost: item.rewardPointsCost || 0
        }
      ];
    });
  };

  const handleSelectRewardToRedeem = (reward: RewardItem) => {
    // Find matching menu item or create cart redemption
    const matchingMenuItem = menuItems.find(
      (m) => m.name.toLowerCase().includes(reward.name.toLowerCase().replace('free ', ''))
    ) || menuItems[0];

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.menuItemId === matchingMenuItem.id && ci.isRedemption === true
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }

      return [
        ...prev,
        {
          menuItemId: matchingMenuItem.id,
          name: reward.name,
          category: reward.category,
          price: reward.dollarValue,
          quantity: 1,
          isRedemption: true,
          pointsCost: reward.pointsCost
        }
      ];
    });
  };

  const handleUpdateQuantity = (menuItemId: string, isRedemption: boolean, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.menuItemId === menuItemId && item.isRedemption === isRedemption) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (menuItemId: string, isRedemption: boolean) => {
    setCart((prev) =>
      prev.filter((item) => !(item.menuItemId === menuItemId && item.isRedemption === isRedemption))
    );
  };

  const handleToggleRedemption = (menuItemId: string) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.menuItemId === menuItemId) {
          return {
            ...item,
            isRedemption: !item.isRedemption
          };
        }
        return item;
      });
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Checkout Submission
  const handleCheckout = async () => {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);

    try {
      const result = await processCheckout({
        memberId: selectedMember?.id,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          isRedemption: c.isRedemption,
          pointsCost: c.pointsCost
        })),
        paymentMethod
      });

      setCheckoutResult(result);
      setIsOrderSuccessOpen(true);
      setCart([]);

      // Refresh member balance & counts
      if (selectedMember) {
        const refreshed = await getMemberById(selectedMember.id);
        setSelectedMember(refreshed);
      }
      const health = await fetchHealth();
      setMemberCount(health.memberCount);
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-lg text-slate-300">Loading AuraCafe Loyalty Counter...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-slate-100">
      {/* Top Navigation */}
      <Header
        memberCount={memberCount}
        onOpenNewMember={() => setIsNewMemberOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenRecentOrders={() => setIsRecentOrdersOpen(true)}
      />

      {/* Main Counter Workspace */}
      <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto">
        {/* Left Column: Member Lookup / Profile & Menu Catalog (7 or 8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Member Search or Selected Member Profile */}
          {selectedMember ? (
            <MemberProfile
              member={selectedMember}
              rewards={rewardItems}
              onDeselect={() => setSelectedMember(null)}
              onOpenLedger={() => setIsLedgerOpen(true)}
              onSelectRewardToRedeem={handleSelectRewardToRedeem}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base text-white">Customer Loyalty Lookup</h2>
                <span className="text-xs text-slate-400">Search by phone number for live balance</span>
              </div>
              <MemberLookup
                selectedMember={selectedMember}
                onSelectMember={(m) => setSelectedMember(m)}
                onOpenNewMember={() => setIsNewMemberOpen(true)}
              />
            </div>
          )}

          {/* Cafe Menu Catalog */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h2 className="font-bold text-base text-white">Cafe POS Menu</h2>
              <span className="text-xs text-slate-400">
                {selectedMember
                  ? `Ordering for ${selectedMember.name} (${selectedMember.tierStatus.multiplier}x Earn Speed)`
                  : 'Guest Mode • Lookup member to earn points'}
              </span>
            </div>

            <MenuCatalog
              menuItems={menuItems}
              selectedMember={selectedMember}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>

        {/* Right Column: Order Summary & Checkout (4 cols) */}
        <div className="lg:col-span-4 h-full">
          <CartSummary
            cart={cart}
            selectedMember={selectedMember}
            config={config}
            paymentMethod={paymentMethod}
            isCheckingOut={isCheckingOut}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onToggleRedemption={handleToggleRedemption}
            onSetPaymentMethod={setPaymentMethod}
            onClearCart={handleClearCart}
            onCheckout={handleCheckout}
          />
        </div>
      </main>

      {/* Modals */}
      {selectedMember && (
        <LedgerModal
          member={selectedMember}
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
        />
      )}

      <NewMemberModal
        isOpen={isNewMemberOpen}
        onClose={() => setIsNewMemberOpen(false)}
        onMemberCreated={(newMember) => {
          setSelectedMember(newMember);
          setMemberCount((prev) => prev + 1);
        }}
      />

      <ConfigModal
        config={config}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigUpdated={(updated) => setConfig(updated)}
      />

      <RecentOrdersModal
        isOpen={isRecentOrdersOpen}
        onClose={() => setIsRecentOrdersOpen(false)}
      />

      <OrderSuccessModal
        result={checkoutResult}
        selectedMember={selectedMember}
        onClose={() => {
          setIsOrderSuccessOpen(false);
          setCheckoutResult(null);
        }}
      />
    </div>
  );
};
export default App;
