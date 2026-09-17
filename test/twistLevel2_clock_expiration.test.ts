import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, SQLiteDatabase } from '../src/server/db/database.js';
import { ClockService } from '../src/server/domain/clockService.js';
import { ExpirationService } from '../src/server/domain/expirationService.js';
import { LedgerService } from '../src/server/domain/ledgerService.js';
import { MemberService } from '../src/server/domain/memberService.js';
import { TierEngine } from '../src/server/domain/tierEngine.js';
import { ConfigService, DEFAULT_CONFIG } from '../src/server/domain/configService.js';

describe('Level 2 — T2 (automation): 90-Day Points Expiration via Clock', () => {
  let db: SQLiteDatabase;
  let clockService: ClockService;
  let configService: ConfigService;
  let tierEngine: TierEngine;
  let ledgerService: LedgerService;
  let memberService: MemberService;
  let expirationService: ExpirationService;

  beforeEach(async () => {
    db = await getDatabase('', true);
    clockService = new ClockService();
    // Start at a baseline fixed date
    clockService.setClock('2026-01-01T00:00:00.000Z');

    configService = new ConfigService(DEFAULT_CONFIG);
    tierEngine = new TierEngine(configService);
    ledgerService = new LedgerService(db, tierEngine, configService, clockService);
    memberService = new MemberService(db, tierEngine);
    expirationService = new ExpirationService(db, clockService, configService);
  });

  it('expires stale points older than 90 days when clock advances', () => {
    // 1. Member earns 500 points on Jan 1, 2026
    const member = memberService.registerMember({
      phoneNumber: '5551112222',
      name: 'Aging Points Member',
      initialPoints: 0
    });

    ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 500,
      timestamp: '2026-01-01T12:00:00.000Z'
    });

    const mJan = memberService.getMemberById(member.id)!;
    expect(mJan.currentBalance).toBe(500);

    // 2. Advance clock to Day 60 (March 2, 2026) -> points are NOT expired yet
    clockService.setClock('2026-03-02T00:00:00.000Z');
    const result60 = expirationService.runExpirationJob();
    expect(result60.totalPointsExpired).toBe(0);
    expect(memberService.getMemberById(member.id)!.currentBalance).toBe(500);

    // 3. Member earns another 200 fresh points on Day 60
    ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 200,
      timestamp: '2026-03-02T12:00:00.000Z'
    });

    expect(memberService.getMemberById(member.id)!.currentBalance).toBe(700);

    // 4. Advance clock to Day 95 (April 6, 2026) -> First 500 points are > 90 days old and expire, 200 points remain active!
    clockService.setClock('2026-04-06T00:00:00.000Z');
    const result95 = expirationService.runExpirationJob();

    expect(result95.totalPointsExpired).toBe(500);
    expect(result95.membersWithExpiredPoints).toBe(1);

    const mAfter = memberService.getMemberById(member.id)!;
    expect(mAfter.currentBalance).toBe(200); // 700 - 500 = 200
    expect(mAfter.lifetimePoints).toBe(700); // Lifetime tier points NEVER decrease!

    // 5. Verify 100% financial ledger consistency
    const reconciliation = ledgerService.reconcileMemberBalance(member.id);
    expect(reconciliation.isConsistent).toBe(true);
    expect(reconciliation.discrepancy).toBe(0);
    expect(reconciliation.materializedBalance).toBe(200);
  });

  it('correctly accounts for FIFO redemptions so already-used points do not double expire', () => {
    // Member earns 300 pts on Jan 1
    const member = memberService.registerMember({
      phoneNumber: '5553334444',
      name: 'Redeemed Member',
      initialPoints: 0
    });

    ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 300,
      timestamp: '2026-01-01T00:00:00.000Z'
    });

    // Member redeems 200 pts on Feb 1 (spends from the Jan 1 batch)
    ledgerService.recordTransaction({
      memberId: member.id,
      type: 'REDEEM',
      points: -200,
      timestamp: '2026-02-01T00:00:00.000Z'
    });

    expect(memberService.getMemberById(member.id)!.currentBalance).toBe(100);

    // Advance clock past 90 days (April 15, 2026)
    clockService.setClock('2026-04-15T00:00:00.000Z');
    const result = expirationService.runExpirationJob();

    // Only the unredeemed 100 points expire, NOT the full 300!
    expect(result.totalPointsExpired).toBe(100);
    expect(memberService.getMemberById(member.id)!.currentBalance).toBe(0);

    const reconciliation = ledgerService.reconcileMemberBalance(member.id);
    expect(reconciliation.isConsistent).toBe(true);
  });
});
