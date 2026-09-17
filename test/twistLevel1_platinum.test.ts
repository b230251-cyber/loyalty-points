import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, SQLiteDatabase } from '../src/server/db/database.js';
import { TierEngine } from '../src/server/domain/tierEngine.js';
import { EarningEngine } from '../src/server/domain/earningEngine.js';
import { ConfigService, DEFAULT_CONFIG } from '../src/server/domain/configService.js';
import { LedgerService } from '../src/server/domain/ledgerService.js';
import { MemberService } from '../src/server/domain/memberService.js';

describe('Level 1 — T3 (backward-compat): Platinum Tier (lifetime >= 5000, earns 0.3/₹)', () => {
  let db: SQLiteDatabase;
  let configService: ConfigService;
  let tierEngine: TierEngine;
  let earningEngine: EarningEngine;
  let ledgerService: LedgerService;
  let memberService: MemberService;

  beforeEach(async () => {
    db = await getDatabase('', true);
    configService = new ConfigService(DEFAULT_CONFIG);
    tierEngine = new TierEngine(configService);
    earningEngine = new EarningEngine(configService, tierEngine);
    ledgerService = new LedgerService(db, tierEngine, configService);
    memberService = new MemberService(db, tierEngine);
  });

  it('evaluates Platinum tier for members with lifetime >= 5000', () => {
    expect(tierEngine.evaluateTier(4999)).toBe('GOLD');
    expect(tierEngine.evaluateTier(5000)).toBe('PLATINUM');
    expect(tierEngine.evaluateTier(12000)).toBe('PLATINUM');
  });

  it('calculates Platinum earn rate at 0.3/₹ (0.3 points per rupee/dollar spent)', () => {
    // ₹100 spent @ Platinum (0.3/₹) -> 30 points
    const result100 = earningEngine.calculatePoints(100.0, 'PLATINUM');
    expect(result100.pointsEarned).toBe(30);

    // ₹50 spent @ Platinum (0.3/₹) -> 15 points
    const result50 = earningEngine.calculatePoints(50.0, 'PLATINUM');
    expect(result50.pointsEarned).toBe(15);

    // ₹12.50 spent @ Platinum (0.3/₹) -> floor(3.75) -> 3 points
    const result12_5 = earningEngine.calculatePoints(12.50, 'PLATINUM');
    expect(result12_5.pointsEarned).toBe(3);
  });

  it('preserves existing member balances and tiers unless they qualify for Platinum', () => {
    // 1. Existing Bronze Member (lifetime 300, balance 300)
    const bronze = memberService.registerMember({
      phoneNumber: '5550001',
      name: 'Existing Bronze',
      initialPoints: 300
    });

    // 2. Existing Gold Member (lifetime 2500, balance 1200)
    const gold = memberService.registerMember({
      phoneNumber: '5550002',
      name: 'Existing Gold',
      initialPoints: 2500
    });
    // simulate redemption
    ledgerService.recordTransaction({ memberId: gold.id, type: 'REDEEM', points: -1300 });

    // 3. Existing High-Spender Member who now qualifies for Platinum (lifetime 5500, balance 3000)
    const highSpender = memberService.registerMember({
      phoneNumber: '5550003',
      name: 'Existing High Spender',
      initialPoints: 5500
    });

    // Run backward-compatibility migration
    const migration = ledgerService.migrateExistingMemberTiers();

    // Verify Bronze is untouched
    const bronzeAfter = memberService.getMemberById(bronze.id)!;
    expect(bronzeAfter.tier).toBe('BRONZE');
    expect(bronzeAfter.currentBalance).toBe(300);

    // Verify Gold is untouched
    const goldAfter = memberService.getMemberById(gold.id)!;
    expect(goldAfter.tier).toBe('GOLD');
    expect(goldAfter.currentBalance).toBe(1200);

    // Verify High Spender qualified for Platinum
    const highSpenderAfter = memberService.getMemberById(highSpender.id)!;
    expect(highSpenderAfter.tier).toBe('PLATINUM');
    expect(highSpenderAfter.currentBalance).toBe(5500);
  });
});
