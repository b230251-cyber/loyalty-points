import { describe, it, expect, beforeEach } from 'vitest';
import { EarningEngine } from '../src/server/domain/earningEngine.js';
import { ConfigService, DEFAULT_CONFIG } from '../src/server/domain/configService.js';
import { TierEngine } from '../src/server/domain/tierEngine.js';

describe('EarningEngine Unit Tests', () => {
  let configService: ConfigService;
  let tierEngine: TierEngine;
  let earningEngine: EarningEngine;

  beforeEach(() => {
    configService = new ConfigService(DEFAULT_CONFIG);
    tierEngine = new TierEngine(configService);
    earningEngine = new EarningEngine(configService, tierEngine);
  });

  it('calculates points correctly for Bronze tier (1.0x multiplier)', () => {
    // $10.00 spent @ 10 pts/$ * 1.0x = 100 points
    const result = earningEngine.calculatePoints(10.00, 'BRONZE');
    expect(result.pointsEarned).toBe(100);
    expect(result.basePoints).toBe(100);
    expect(result.multiplier).toBe(1.0);
  });

  it('calculates points correctly for Silver tier (1.25x multiplier)', () => {
    // $10.00 spent @ 10 pts/$ * 1.25x = 125 points
    const result = earningEngine.calculatePoints(10.00, 'SILVER');
    expect(result.pointsEarned).toBe(125);
    expect(result.multiplier).toBe(1.25);
  });

  it('calculates points correctly for Gold tier (1.5x multiplier)', () => {
    // $10.00 spent @ 10 pts/$ * 1.5x = 150 points
    const result = earningEngine.calculatePoints(10.00, 'GOLD');
    expect(result.pointsEarned).toBe(150);
    expect(result.multiplier).toBe(1.5);
  });

  it('handles fractional amounts and floor rounding accurately', () => {
    // $4.75 spent @ Silver (1.25x) -> 4.75 * 10 * 1.25 = 59.375 -> floor to 59 points
    const result = earningEngine.calculatePoints(4.75, 'SILVER');
    expect(result.pointsEarned).toBe(59);
  });

  it('supports configurable points per dollar rate', () => {
    configService.updateConfig({ pointsPerDollar: 20 });
    // $5.00 spent @ 20 pts/$ * 1.0x = 100 points
    const result = earningEngine.calculatePoints(5.00, 'BRONZE');
    expect(result.pointsEarned).toBe(100);
  });

  it('returns 0 points for $0 spend', () => {
    const result = earningEngine.calculatePoints(0, 'GOLD');
    expect(result.pointsEarned).toBe(0);
  });

  it('throws error on negative spend', () => {
    expect(() => earningEngine.calculatePoints(-5, 'BRONZE')).toThrow();
  });
});
