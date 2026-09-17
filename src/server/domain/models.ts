export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TierConfig {
  tier: LoyaltyTier;
  name: string;
  minPoints: number; // Lifetime qualifying points needed
  multiplier: number; // e.g. 1.0, 1.25, 1.5, 3.0
  earnRate?: number; // e.g. 0.3 per unit currency (0.3/₹)
  badgeColor: string;
  description: string;
}

export interface ProgramConfig {
  pointsPerDollar: number; // e.g. 10 or 1 point per currency unit
  roundingStrategy: 'floor' | 'round' | 'ceil';
  tiers: TierConfig[];
  pointsExpiryDays: number; // e.g. 90 days
  allowNegativeBalance: boolean;
}

export interface Member {
  id: string;
  phoneNumber: string; // Normalized clean digits or E.164
  name: string;
  email?: string;
  currentBalance: number; // Spendable points balance
  lifetimePoints: number; // Total points earned historically (never decreases on redemption)
  tier: LoyaltyTier;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'REFUND' | 'EXPIRE';

export interface LoyaltyTransaction {
  id: string;
  memberId: string;
  type: TransactionType;
  points: number; // positive for EARN/ADJUSTMENT, negative for REDEEM/EXPIRE
  balanceAfter: number; // snapshot of balance immediately after this transaction
  referenceId?: string; // e.g., orderId
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface OutboxNotification {
  id: string;
  memberId: string;
  phoneNumber: string;
  recipient: string; // phone or email
  type: string; // 'TIER_UPGRADE'
  previousTier: LoyaltyTier;
  newTier: LoyaltyTier;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
  status: 'PENDING' | 'SENT';
}

export interface RewardItem {
  id: string;
  name: string;
  category: 'COFFEE' | 'PASTRY' | 'DRINK' | 'FOOD' | 'MERCH';
  pointsCost: number;
  dollarValue: number;
  description: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'COFFEE' | 'PASTRY' | 'DRINK' | 'FOOD' | 'MERCH';
  price: number;
  imageUrl?: string;
  isRewardEligible: boolean;
  rewardPointsCost?: number;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isRedemption?: boolean;
  pointsCost?: number;
}

export interface CheckoutRequest {
  memberId?: string;
  items: OrderItem[];
  paymentMethod: 'CASH' | 'CARD';
  appliedRewardIds?: string[];
  idempotencyKey?: string;
}

export interface CheckoutResult {
  orderId: string;
  memberId?: string;
  grossAmount: number;
  redeemedValue: number;
  netPaidAmount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  previousBalance: number;
  newBalance: number;
  previousTier: LoyaltyTier;
  newTier: LoyaltyTier;
  tierUpgraded: boolean;
  transactions: LoyaltyTransaction[];
  timestamp: string;
}
