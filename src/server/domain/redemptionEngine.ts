import { RewardItem, Member } from './models.js';

export interface RedemptionValidationResult {
  canRedeem: boolean;
  totalPointsCost: number;
  remainingBalance: number;
  insufficientPoints: number;
  error?: string;
  validRewards: RewardItem[];
}

export class RedemptionEngine {
  /**
   * Validates if a member has enough live points balance to redeem selected rewards.
   */
  public validateRedemption(
    currentBalance: number,
    rewardsToRedeem: RewardItem[]
  ): RedemptionValidationResult {
    const totalPointsCost = rewardsToRedeem.reduce((sum, item) => sum + item.pointsCost, 0);

    if (totalPointsCost === 0) {
      return {
        canRedeem: true,
        totalPointsCost: 0,
        remainingBalance: currentBalance,
        insufficientPoints: 0,
        validRewards: []
      };
    }

    if (currentBalance < totalPointsCost) {
      const insufficientPoints = totalPointsCost - currentBalance;
      return {
        canRedeem: false,
        totalPointsCost,
        remainingBalance: currentBalance,
        insufficientPoints,
        error: `Insufficient points balance. Member has ${currentBalance} points, but ${totalPointsCost} points are required (short by ${insufficientPoints} pts).`,
        validRewards: rewardsToRedeem
      };
    }

    return {
      canRedeem: true,
      totalPointsCost,
      remainingBalance: currentBalance - totalPointsCost,
      insufficientPoints: 0,
      validRewards: rewardsToRedeem
    };
  }

  /**
   * Identifies all rewards the member currently qualifies to redeem with their balance.
   */
  public getAffordableRewards(currentBalance: number, catalog: RewardItem[]): RewardItem[] {
    return catalog.filter(item => item.isActive && item.pointsCost <= currentBalance);
  }
}

export const globalRedemptionEngine = new RedemptionEngine();
