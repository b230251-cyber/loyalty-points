import { LoyaltyTier } from './models.js';
import { ConfigService, globalConfigService } from './configService.js';
import { TierEngine, globalTierEngine } from './tierEngine.js';

export interface PointsCalculationResult {
  netPaidAmount: number;
  basePoints: number;
  multiplier: number;
  earnRate?: number;
  tier: LoyaltyTier;
  pointsEarned: number;
  calculationDetails: {
    pointsPerDollar: number;
    roundingStrategy: string;
    rawCalculatedPoints: number;
  };
}

export class EarningEngine {
  constructor(
    private configService: ConfigService = globalConfigService,
    private tierEngine: TierEngine = globalTierEngine
  ) {}

  /**
   * Calculates points earned on an eligible purchase.
   * Platinum tier earns 0.3/₹ (or 0.3 points per currency unit).
   */
  public calculatePoints(netPaidAmount: number, tier: LoyaltyTier): PointsCalculationResult {
    if (netPaidAmount < 0) {
      throw new Error('Net paid amount cannot be negative');
    }

    const tierConfig = this.configService.getTierConfig(tier);
    const config = this.configService.getConfig();

    if (netPaidAmount === 0) {
      return {
        netPaidAmount: 0,
        basePoints: 0,
        multiplier: tierConfig.multiplier,
        earnRate: tierConfig.earnRate,
        tier,
        pointsEarned: 0,
        calculationDetails: {
          pointsPerDollar: config.pointsPerDollar,
          roundingStrategy: config.roundingStrategy,
          rawCalculatedPoints: 0
        }
      };
    }

    const cents = Math.round(netPaidAmount * 100);
    let rawCalculatedPoints: number;

    if (tierConfig.earnRate !== undefined) {
      // Direct earn rate, e.g. 0.3 per ₹1 -> cents * 0.3 / 100
      rawCalculatedPoints = (cents * tierConfig.earnRate) / 100;
    } else {
      rawCalculatedPoints = (cents * config.pointsPerDollar * tierConfig.multiplier) / 100;
    }

    let pointsEarned: number;
    switch (config.roundingStrategy) {
      case 'round':
        pointsEarned = Math.round(rawCalculatedPoints);
        break;
      case 'ceil':
        pointsEarned = Math.ceil(rawCalculatedPoints);
        break;
      case 'floor':
      default:
        pointsEarned = Math.floor(rawCalculatedPoints);
        break;
    }

    const basePoints = Math.floor((cents * config.pointsPerDollar) / 100);

    return {
      netPaidAmount,
      basePoints,
      multiplier: tierConfig.multiplier,
      earnRate: tierConfig.earnRate,
      tier,
      pointsEarned,
      calculationDetails: {
        pointsPerDollar: config.pointsPerDollar,
        roundingStrategy: config.roundingStrategy,
        rawCalculatedPoints
      }
    };
  }
}

export const globalEarningEngine = new EarningEngine();
