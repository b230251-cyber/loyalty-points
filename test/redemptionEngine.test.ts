import { describe, it, expect } from 'vitest';
import { RedemptionEngine } from '../src/server/domain/redemptionEngine.js';
import { RewardItem } from '../src/server/domain/models.js';

describe('RedemptionEngine Unit Tests', () => {
  const redemptionEngine = new RedemptionEngine();

  const mockRewards: RewardItem[] = [
    { id: '1', name: 'Free Espresso', category: 'COFFEE', pointsCost: 60, dollarValue: 3.50, description: '', isActive: true },
    { id: '2', name: 'Free Pastry', category: 'PASTRY', pointsCost: 80, dollarValue: 4.00, description: '', isActive: true },
    { id: '3', name: 'Free Panini', category: 'FOOD', pointsCost: 225, dollarValue: 9.75, description: '', isActive: true }
  ];

  it('approves redemption when member has sufficient points', () => {
    // Member has 200 points, redeems Espresso (60) + Pastry (80) = 140 points
    const result = redemptionEngine.validateRedemption(200, [mockRewards[0], mockRewards[1]]);
    expect(result.canRedeem).toBe(true);
    expect(result.totalPointsCost).toBe(140);
    expect(result.remainingBalance).toBe(60);
    expect(result.insufficientPoints).toBe(0);
  });

  it('rejects redemption when member has insufficient points', () => {
    // Member has 100 points, tries to redeem Panini (225)
    const result = redemptionEngine.validateRedemption(100, [mockRewards[2]]);
    expect(result.canRedeem).toBe(false);
    expect(result.totalPointsCost).toBe(225);
    expect(result.insufficientPoints).toBe(125);
    expect(result.error).toBeDefined();
  });

  it('correctly filters affordable rewards from catalog', () => {
    const affordable = redemptionEngine.getAffordableRewards(85, mockRewards);
    expect(affordable.length).toBe(2); // Espresso (60) & Pastry (80)
    expect(affordable.map(r => r.name)).toEqual(['Free Espresso', 'Free Pastry']);
  });
});
