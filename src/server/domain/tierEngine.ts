import { LoyaltyTier, TierConfig, ProgramConfig } from './models.js';
import { ConfigService, globalConfigService } from './configService.js';

export interface TierEvaluationResult {
  currentTier: LoyaltyTier;
  currentTierConfig: TierConfig;
  multiplier: number;
  earnRate?: number;
  nextTier: LoyaltyTier | null;
  nextTierConfig: TierConfig | null;
  pointsToNextTier: number;
  progressPercentage: number;
}

export class TierEngine {
  constructor(private configService: ConfigService = globalConfigService) {}

  /**
   * Evaluates a member's tier based on their lifetime qualifying points.
   * Bronze: >= 0
   * Silver: >= 500
   * Gold: >= 1500
   * Platinum: >= 5000
   * Note: Lifetime points never decrease on redemption, ensuring member status is preserved.
   */
  public evaluateTier(lifetimePoints: number): LoyaltyTier {
    const config = this.configService.getConfig();
    const sortedTiers = [...config.tiers].sort((a, b) => b.minPoints - a.minPoints);

    for (const tierConfig of sortedTiers) {
      if (lifetimePoints >= tierConfig.minPoints) {
        return tierConfig.tier;
      }
    }

    return 'BRONZE';
  }

  /**
   * Returns comprehensive tier status, multiplier, next tier goal, and progress percentage.
   */
  public getTierStatus(lifetimePoints: number): TierEvaluationResult {
    const config = this.configService.getConfig();
    const sortedAsc = [...config.tiers].sort((a, b) => a.minPoints - b.minPoints);
    const currentTier = this.evaluateTier(lifetimePoints);
    
    const currentIndex = sortedAsc.findIndex(t => t.tier === currentTier);
    const currentTierConfig = sortedAsc[currentIndex] || sortedAsc[0];
    
    const nextTierConfig = currentIndex < sortedAsc.length - 1 ? sortedAsc[currentIndex + 1] : null;
    const nextTier = nextTierConfig ? nextTierConfig.tier : null;

    let pointsToNextTier = 0;
    let progressPercentage = 100;

    if (nextTierConfig) {
      const tierRange = nextTierConfig.minPoints - currentTierConfig.minPoints;
      const pointsIntoCurrentTier = Math.max(0, lifetimePoints - currentTierConfig.minPoints);
      pointsToNextTier = Math.max(0, nextTierConfig.minPoints - lifetimePoints);
      progressPercentage = Math.min(100, Math.round((pointsIntoCurrentTier / tierRange) * 100));
    }

    return {
      currentTier,
      currentTierConfig,
      multiplier: currentTierConfig.multiplier,
      earnRate: currentTierConfig.earnRate,
      nextTier,
      nextTierConfig,
      pointsToNextTier,
      progressPercentage
    };
  }

  /**
   * Returns the points multiplier for a given tier.
   */
  public getMultiplier(tier: LoyaltyTier): number {
    const tierConfig = this.configService.getTierConfig(tier);
    return tierConfig.multiplier;
  }

  public getEarnRate(tier: LoyaltyTier): number | undefined {
    const tierConfig = this.configService.getTierConfig(tier);
    return tierConfig.earnRate;
  }
}

export const globalTierEngine = new TierEngine();
