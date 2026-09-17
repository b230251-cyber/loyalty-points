import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, SQLiteDatabase } from '../src/server/db/database.js';
import { LedgerService } from '../src/server/domain/ledgerService.js';
import { MemberService } from '../src/server/domain/memberService.js';
import { OrderService } from '../src/server/domain/orderService.js';
import { TierEngine } from '../src/server/domain/tierEngine.js';
import { ConfigService, DEFAULT_CONFIG } from '../src/server/domain/configService.js';
import { EarningEngine } from '../src/server/domain/earningEngine.js';
import { RedemptionEngine } from '../src/server/domain/redemptionEngine.js';

describe('Concurrency and Race Condition Prevention Tests', () => {
  let db: SQLiteDatabase;
  let ledgerService: LedgerService;
  let memberService: MemberService;
  let orderService: OrderService;

  beforeEach(async () => {
    db = await getDatabase('', true);
    const configService = new ConfigService(DEFAULT_CONFIG);
    const tierEngine = new TierEngine(configService);
    const earningEngine = new EarningEngine(configService, tierEngine);
    const redemptionEngine = new RedemptionEngine();
    ledgerService = new LedgerService(db, tierEngine, configService);
    memberService = new MemberService(db, tierEngine);
    orderService = new OrderService(db, memberService, ledgerService, earningEngine, redemptionEngine);
  });

  it('handles multiple rapid sequential checkouts without balance drift or race conditions', () => {
    const member = memberService.registerMember({
      phoneNumber: '5557778888',
      name: 'Concurrent Member',
      initialPoints: 500
    });

    // Simulate 10 rapid transactions in sequence (mix of earn and redeem)
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        orderService.checkout({
          memberId: member.id,
          paymentMethod: 'CARD',
          items: [{ menuItemId: 'm1', name: 'Coffee', price: 5.00, quantity: 1, isRedemption: false }]
        });
      } else {
        orderService.checkout({
          memberId: member.id,
          paymentMethod: 'CARD',
          items: [{ menuItemId: 'm2', name: 'Pastry', price: 4.00, quantity: 1, isRedemption: true, pointsCost: 80 }]
        });
      }
    }

    // Check reconciliation
    const reconciliation = ledgerService.reconcileMemberBalance(member.id);
    expect(reconciliation.isConsistent).toBe(true);
    expect(reconciliation.discrepancy).toBe(0);

    const refreshed = memberService.getMemberById(member.id)!;
    expect(refreshed.currentBalance).toBe(reconciliation.materializedBalance);
  });

  it('prevents double spending if redemption exceeds available points across calls', () => {
    const member = memberService.registerMember({
      phoneNumber: '5559990000',
      name: 'Single Item Balance',
      initialPoints: 100
    });

    // First redemption succeeds (spends 80 pts -> leaves 20 pts)
    const order1 = orderService.checkout({
      memberId: member.id,
      paymentMethod: 'CARD',
      items: [{ menuItemId: 'm1', name: 'Item 1', price: 4.00, quantity: 1, isRedemption: true, pointsCost: 80 }]
    });
    expect(order1.newBalance).toBe(20);

    // Second redemption requires 80 pts, but member only has 20 pts -> MUST fail atomically
    expect(() => {
      orderService.checkout({
        memberId: member.id,
        paymentMethod: 'CARD',
        items: [{ menuItemId: 'm2', name: 'Item 2', price: 4.00, quantity: 1, isRedemption: true, pointsCost: 80 }]
      });
    }).toThrow(/Insufficient points balance/);

    // Balance remains exactly 20
    const finalMember = memberService.getMemberById(member.id)!;
    expect(finalMember.currentBalance).toBe(20);
    
    // Ledger is consistent
    const reconciliation = ledgerService.reconcileMemberBalance(member.id);
    expect(reconciliation.isConsistent).toBe(true);
    expect(reconciliation.materializedBalance).toBe(20);
  });
});
