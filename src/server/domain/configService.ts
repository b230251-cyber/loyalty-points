import { ProgramConfig, LoyaltyTier } from './models.js';

export const DEFAULT_CONFIG: ProgramConfig = {
  pointsPerDollar: 10,
  roundingStrategy: 'floor',
  pointsExpiryDays: 90, // Level 2: 90-day expiry rule
  allowNegativeBalance: false,
  tiers: [
    {
      tier: 'BRONZE',
      name: 'Bronze Member',
      minPoints: 0,
      multiplier: 1.0,
      badgeColor: '#CD7F32',
      description: 'Standard earn rate: 10 points per $1 / ₹1'
    },
    {
      tier: 'SILVER',
      name: 'Silver Regular',
      minPoints: 500,
      multiplier: 1.25,
      badgeColor: '#C0C0C0',
      description: 'Accelerated earn rate: 1.25x'
    },
    {
      tier: 'GOLD',
      name: 'Gold VIP',
      minPoints: 1500,
      multiplier: 1.5,
      badgeColor: '#FFD700',
      description: 'VIP earn rate: 1.5x'
    },
    {
      tier: 'PLATINUM',
      name: 'Platinum Elite',
      minPoints: 5000,
      multiplier: 3.0,
      earnRate: 0.3, // Level 1: 0.3 points per ₹1 spent
      badgeColor: '#E5E4E2',
      description: 'Top Tier: Earns 0.3/₹ (or 3.0x multiplier)'
    }
  ]
};

export class ConfigService {
  private currentConfig: ProgramConfig;

  constructor(initialConfig: ProgramConfig = DEFAULT_CONFIG) {
    this.currentConfig = JSON.parse(JSON.stringify(initialConfig));
    // Ensure Platinum exists if loaded from older config
    this.ensurePlatinumTier();
  }

  private ensurePlatinumTier() {
    const hasPlatinum = this.currentConfig.tiers.some(t => t.tier === 'PLATINUM');
    if (!hasPlatinum) {
      this.currentConfig.tiers.push({
        tier: 'PLATINUM',
        name: 'Platinum Elite',
        minPoints: 5000,
        multiplier: 3.0,
        earnRate: 0.3,
        badgeColor: '#E5E4E2',
        description: 'Top Tier: Earns 0.3/₹'
      });
    }
    // Ensure 90 days expiry is set
    if (!this.currentConfig.pointsExpiryDays) {
      this.currentConfig.pointsExpiryDays = 90;
    }
  }

  public getConfig(): ProgramConfig {
    return { ...this.currentConfig };
  }

  public updateConfig(newConfig: Partial<ProgramConfig>): ProgramConfig {
    if (newConfig.pointsPerDollar !== undefined) {
      if (newConfig.pointsPerDollar <= 0) {
        throw new Error('Points per dollar must be greater than 0');
      }
      this.currentConfig.pointsPerDollar = newConfig.pointsPerDollar;
    }

    if (newConfig.roundingStrategy !== undefined) {
      this.currentConfig.roundingStrategy = newConfig.roundingStrategy;
    }

    if (newConfig.pointsExpiryDays !== undefined) {
      this.currentConfig.pointsExpiryDays = newConfig.pointsExpiryDays;
    }

    if (newConfig.tiers !== undefined) {
      const sorted = [...newConfig.tiers].sort((a, b) => a.minPoints - b.minPoints);
      if (sorted.length === 0 || sorted[0].minPoints !== 0) {
        throw new Error('Lowest tier must have 0 minPoints');
      }
      this.currentConfig.tiers = sorted;
    }

    return this.getConfig();
  }

  public getTierConfig(tier: LoyaltyTier) {
    const found = this.currentConfig.tiers.find(t => t.tier === tier);
    return found || this.currentConfig.tiers[0];
  }
}

export const globalConfigService = new ConfigService();
