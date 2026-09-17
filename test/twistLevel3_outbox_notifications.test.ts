import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, SQLiteDatabase } from '../src/server/db/database.js';
import { ClockService } from '../src/server/domain/clockService.js';
import { NotificationService } from '../src/server/domain/notificationService.js';
import { LedgerService } from '../src/server/domain/ledgerService.js';
import { MemberService } from '../src/server/domain/memberService.js';
import { TierEngine } from '../src/server/domain/tierEngine.js';
import { ConfigService, DEFAULT_CONFIG } from '../src/server/domain/configService.js';

describe('Level 3 — T1 (integrate): Outbox Notifications on Tier Level-Up (/outbox)', () => {
  let db: SQLiteDatabase;
  let clockService: ClockService;
  let notificationService: NotificationService;
  let configService: ConfigService;
  let tierEngine: TierEngine;
  let ledgerService: LedgerService;
  let memberService: MemberService;

  beforeEach(async () => {
    db = await getDatabase('', true);
    clockService = new ClockService();
    notificationService = new NotificationService(db, clockService);
    configService = new ConfigService(DEFAULT_CONFIG);
    tierEngine = new TierEngine(configService);
    ledgerService = new LedgerService(db, tierEngine, configService, clockService, notificationService);
    memberService = new MemberService(db, tierEngine);
  });

  it('queues a notification in /outbox when a member crosses from Bronze to Silver', () => {
    const member = memberService.registerMember({
      phoneNumber: '5559998888',
      name: 'Upgrade Customer',
      initialPoints: 400
    });

    // Currently Bronze, no upgrade notifications yet
    expect(notificationService.getOutbox().length).toBe(0);

    // Earn 150 points -> total 550 lifetime points -> Crosses into SILVER!
    ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 150
    });

    const outbox = notificationService.getOutbox();
    expect(outbox.length).toBe(1);
    expect(outbox[0].memberId).toBe(member.id);
    expect(outbox[0].phoneNumber).toBe('5559998888');
    expect(outbox[0].previousTier).toBe('BRONZE');
    expect(outbox[0].newTier).toBe('SILVER');
    expect(outbox[0].type).toBe('TIER_UPGRADE');
    expect(outbox[0].status).toBe('PENDING');
  });

  it('queues successive notifications when advancing from Silver to Gold and Gold to Platinum', () => {
    const member = memberService.registerMember({
      phoneNumber: '5557776666',
      name: 'Super Spender',
      initialPoints: 1400 // Silver
    });

    // 1. Cross to GOLD (1400 + 200 = 1600 pts)
    ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 200
    });

    let outbox = notificationService.getOutbox();
    expect(outbox.length).toBe(1);
    expect(outbox[0].previousTier).toBe('SILVER');
    expect(outbox[0].newTier).toBe('GOLD');

    // 2. Cross to PLATINUM (1600 + 3500 = 5100 pts)
    ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 3500
    });

    outbox = notificationService.getOutbox();
    expect(outbox.length).toBe(2);
    expect(outbox[0].previousTier).toBe('GOLD');
    expect(outbox[0].newTier).toBe('PLATINUM');
  });

  it('does NOT queue a notification when points are earned within the same tier', () => {
    const member = memberService.registerMember({
      phoneNumber: '5552221111',
      name: 'Regular Customer',
      initialPoints: 100
    });

    // Earn 50 points -> total 150 (still Bronze)
    ledgerService.recordTransaction({
      memberId: member.id,
      type: 'EARN',
      points: 50
    });

    expect(notificationService.getOutbox().length).toBe(0);
  });
});
