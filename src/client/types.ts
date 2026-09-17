export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TierConfig {
  tier: LoyaltyTier;
  name: string;
  minPoints: number;
  multiplier: number;
  earnRate?: number;
  badgeColor: string;
  description: string;
}

export interface ProgramConfig {
  pointsPerDollar: number;
  roundingStrategy: 'floor' | 'round' | 'ceil';
  tiers: TierConfig[];
  pointsExpiryDays: number | null;
  allowNegativeBalance: boolean;
}

export interface TierStatus {
  currentTier: LoyaltyTier;
  currentTierConfig: TierConfig;
  multiplier: number;
  earnRate?: number;
  nextTier: LoyaltyTier | null;
  nextTierConfig: TierConfig | null;
  pointsToNextTier: number;
  progressPercentage: number;
}

export interface Member {
  id: string;
  phoneNumber: string;
  formattedPhone: string;
  name: string;
  email?: string;
  currentBalance: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  tierStatus: TierStatus;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'REFUND' | 'EXPIRE';

export interface LoyaltyTransaction {
  id: string;
  memberId: string;
  type: TransactionType;
  points: number;
  balanceAfter: number;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
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

export interface CartItem {
  menuItemId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  isRedemption: boolean;
  pointsCost: number;
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

export interface ReconciliationData {
  memberId: string;
  materializedBalance: number;
  calculatedLedgerBalance: number;
  isConsistent: boolean;
  discrepancy: number;
  totalTransactionsCount: number;
}
