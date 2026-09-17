import { describe, it, expect, beforeEach } from 'vitest';
import { TierEngine } from '../src/server/domain/tierEngine.js';
import { ConfigService, DEFAULT_CONFIG } from '../src/server/domain/configService.js';

describe('TierEngine Unit Tests', () => {
  let configService: ConfigService;
  let tierEngine: TierEngine;

  beforeEach(() => {
    configService = new ConfigService(DEFAULT_CONFIG);
    tierEngine = new TierEngine(configService);
  });

  it('evaluates tier thresholds correctly across all 4 tiers', () => {
    expect(tierEngine.evaluateTier(0)).toBe('BRONZE');
    expect(tierEngine.evaluateTier(499)).toBe('BRONZE');
    expect(tierEngine.evaluateTier(500)).toBe('SILVER');
    expect(tierEngine.evaluateTier(1499)).toBe('SILVER');
    expect(tierEngine.evaluateTier(1500)).toBe('GOLD');
    expect(tierEngine.evaluateTier(4999)).toBe('GOLD');
    expect(tierEngine.evaluateTier(5000)).toBe('PLATINUM');
    expect(tierEngine.evaluateTier(10000)).toBe('PLATINUM');
  });

  it('calculates progress percentage and points remaining to next tier', () => {
    // Member with 250 lifetime points is halfway to Silver (500)
    const statusBronze = tierEngine.getTierStatus(250);
    expect(statusBronze.currentTier).toBe('BRONZE');
    expect(statusBronze.nextTier).toBe('SILVER');
    expect(statusBronze.pointsToNextTier).toBe(250);
    expect(statusBronze.progressPercentage).toBe(50);

    // Member with 1000 lifetime points is halfway through Silver (500 to 1500)
    const statusSilver = tierEngine.getTierStatus(1000);
    expect(statusSilver.currentTier).toBe('SILVER');
    expect(statusSilver.nextTier).toBe('GOLD');
    expect(statusSilver.pointsToNextTier).toBe(500);
    expect(statusSilver.progressPercentage).toBe(50);

    // Member with 2000 points is Gold (next is Platinum at 5000)
    const statusGold = tierEngine.getTierStatus(2000);
    expect(statusGold.currentTier).toBe('GOLD');
    expect(statusGold.nextTier).toBe('PLATINUM');
    expect(statusGold.pointsToNextTier).toBe(3000);

    // Member with 6000 points is Platinum (top tier)
    const statusPlatinum = tierEngine.getTierStatus(6000);
    expect(statusPlatinum.currentTier).toBe('PLATINUM');
    expect(statusPlatinum.nextTier).toBeNull();
    expect(statusPlatinum.pointsToNextTier).toBe(0);
    expect(statusPlatinum.progressPercentage).toBe(100);
  });

  it('respects dynamically updated tier thresholds', () => {
    configService.updateConfig({
      tiers: [
        { tier: 'BRONZE', name: 'Bronze', minPoints: 0, multiplier: 1.0, badgeColor: '#CD7F32', description: '' },
        { tier: 'SILVER', name: 'Silver', minPoints: 300, multiplier: 1.3, badgeColor: '#C0C0C0', description: '' },
        { tier: 'GOLD', name: 'Gold', minPoints: 800, multiplier: 2.0, badgeColor: '#FFD700', description: '' }
      ]
    });

    expect(tierEngine.evaluateTier(300)).toBe('SILVER');
    expect(tierEngine.evaluateTier(800)).toBe('GOLD');
    expect(tierEngine.getMultiplier('GOLD')).toBe(2.0);
  });
});
