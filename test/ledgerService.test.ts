import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, SQLiteDatabase } from '../src/server/db/database.js';
import { LedgerService } from '../src/server/domain/ledgerService.js';
import { MemberService } from '../src/server/domain/memberService.js';
import { OrderService } from '../src/server/domain/orderService.js';
import { TierEngine } from '../src/server/domain/tierEngine.js';
import { ConfigService, DEFAULT_CONFIG } from '../src/server/domain/configService.js';
import { EarningEngine } from '../src/server/domain/earningEngine.js';
import { RedemptionEngine } from '../src/server/domain/redemptionEngine.js';

describe('LedgerService & Financial Consistency Integration Tests', () => {
  let db: SQLiteDatabase;
  let configService: ConfigService;
  let tierEngine: TierEngine;
  let earningEngine: EarningEngine;
  let redemptionEngine: RedemptionEngine;
  let ledgerService: LedgerService;
  let memberService: MemberService;
  let orderService: OrderService;

  beforeEach(async () => {
    // Fresh in-memory database for every test
    db = await getDatabase('', true);
    configService = new ConfigService(DEFAULT_CONFIG);
    tierEngine = new TierEngine(configService);
    earningEngine = new EarningEngine(configService, tierEngine);
    redemptionEngine = new RedemptionEngine();
    ledgerService = new LedgerService(db, tierEngine, configService);
    memberService = new MemberService(db, tierEngine);
    orderService = new OrderService(db, memberService, ledgerService, earningEngine, redemptionEngine);
  });

  it('records transactions into append-only ledger and updates balance atomically', () => {
    const member = memberService.registerMember({
      phoneNumber: '5551112233',
      name: 'Test Member',
      initialPoints: 0
    });

    // 1. Earn 100 points
    const earn1 = ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 100,
      metadata: { order: 'order-1' }
    });

    expect(earn1.member.currentBalance).toBe(100);
    expect(earn1.member.lifetimePoints).toBe(100);
    expect(earn1.transaction.balanceAfter).toBe(100);

    // 2. Earn 450 more points -> reaches 550 lifetime points -> triggers SILVER promotion!
    const earn2 = ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 450,
      metadata: { order: 'order-2' }
    });

    expect(earn2.member.currentBalance).toBe(550);
    expect(earn2.member.lifetimePoints).toBe(550);
    expect(earn2.member.tier).toBe('SILVER');
    expect(earn2.tierUpgraded).toBe(true);

    // 3. Redeem 200 points -> balance becomes 350, but lifetime points stays 550 and tier stays SILVER
    const redeem = ledgerService.recordTransaction({
      memberId: member.id,
      type: 'REDEEM',
      points: -200,
      metadata: { order: 'order-3' }
    });

    expect(redeem.member.currentBalance).toBe(350);
    expect(redeem.member.lifetimePoints).toBe(550); // Lifetime points NOT reduced
    expect(redeem.member.tier).toBe('SILVER'); // Tier remains Silver!

    // 4. Verify full ledger reconciliation: materialized balance must exactly equal sum of ledger transactions
    const reconciliation = ledgerService.reconcileMemberBalance(member.id);
    expect(reconciliation.isConsistent).toBe(true);
    expect(reconciliation.discrepancy).toBe(0);
    expect(reconciliation.materializedBalance).toBe(350);
    expect(reconciliation.calculatedLedgerBalance).toBe(350);
    expect(reconciliation.totalTransactionsCount).toBe(3);
  });

  it('rejects transactions that would cause a negative balance', () => {
    const member = memberService.registerMember({
      phoneNumber: '5552223344',
      name: 'Zero Balance Member',
      initialPoints: 50
    });

    expect(() => {
      ledgerService.recordTransaction({
        memberId: member.id,
        type: 'REDEEM',
        points: -100
      });
    }).toThrow(/Insufficient points balance/);

    // Ensure member balance remained untouched
    const current = memberService.getMemberById(member.id)!;
    expect(current.currentBalance).toBe(50);
  });

  it('processes full counter checkout with redemption and points earning simultaneously', () => {
    // Create member with 300 points (Silver)
    const member = memberService.registerMember({
      phoneNumber: '5559998877',
      name: 'Combined Checkout Member',
      initialPoints: 600 // Silver tier (1.25x earn multiplier)
    });

    // Checkout with:
    // 1. Paid item: $10.00 sandwich
    // 2. Redeemed item: $4.00 coffee costing 100 points
    const result = orderService.checkout({
      memberId: member.id,
      paymentMethod: 'CARD',
      items: [
        { menuItemId: 'm1', name: 'Sandwich', price: 10.00, quantity: 1, isRedemption: false },
        { menuItemId: 'm2', name: 'Latte', price: 4.00, quantity: 1, isRedemption: true, pointsCost: 100 }
      ]
    });

    expect(result.grossAmount).toBe(14.00);
    expect(result.redeemedValue).toBe(4.00);
    expect(result.netPaidAmount).toBe(10.00);
    expect(result.pointsRedeemed).toBe(100);
    // Paid $10 on Silver (1.25x) -> 10 * 10 * 1.25 = 125 points earned
    expect(result.pointsEarned).toBe(125);
    
    // Balance progression: 600 - 100 + 125 = 625 points
    expect(result.newBalance).toBe(625);

    // Verify reconciliation
    const reconciliation = ledgerService.reconcileMemberBalance(member.id);
    expect(reconciliation.isConsistent).toBe(true);
    expect(reconciliation.materializedBalance).toBe(625);
  });
});
