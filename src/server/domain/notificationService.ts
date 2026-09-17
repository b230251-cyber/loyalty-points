import { SQLiteDatabase } from '../db/database.js';
import { LoyaltyTier, Member, OutboxNotification } from './models.js';
import { ClockService, globalClockService } from './clockService.js';
import crypto from 'crypto';

export class NotificationService {
  constructor(
    private db: SQLiteDatabase,
    private clockService: ClockService = globalClockService
  ) {}

  public setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Enqueues an outbox notification when a member crosses into a higher tier.
   */
  public queueTierUpgradeNotification(
    member: Member,
    previousTier: LoyaltyTier,
    newTier: LoyaltyTier,
    metadata?: Record<string, any>
  ): OutboxNotification {
    const id = crypto.randomUUID();
    const now = this.clockService.nowIso();
    const message = `Congratulations ${member.name}! You've reached ${newTier} tier status in the AuraCafe Rewards Programme.`;

    this.db.prepare(`
      INSERT INTO outbox (
        id, member_id, phone_number, recipient, type, previous_tier, new_tier, message, metadata, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      member.id,
      member.phoneNumber,
      member.phoneNumber,
      'TIER_UPGRADE',
      previousTier,
      newTier,
      message,
      metadata ? JSON.stringify(metadata) : null,
      'PENDING',
      now
    );

    return {
      id,
      memberId: member.id,
      phoneNumber: member.phoneNumber,
      recipient: member.phoneNumber,
      type: 'TIER_UPGRADE',
      previousTier,
      newTier,
      message,
      metadata,
      status: 'PENDING',
      createdAt: now
    };
  }

  /**
   * Retrieves all outbox notifications (graded via /outbox).
   */
  public getOutbox(limit = 100): OutboxNotification[] {
    const rows = this.db.prepare(`
      SELECT * FROM outbox 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      id: r.id,
      memberId: r.member_id,
      phoneNumber: r.phone_number,
      recipient: r.recipient || r.phone_number,
      type: r.type,
      previousTier: r.previous_tier as LoyaltyTier,
      newTier: r.new_tier as LoyaltyTier,
      message: r.message,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      status: r.status,
      createdAt: r.created_at
    }));
  }

  /**
   * Clears outbox records (useful for test resets).
   */
  public clearOutbox(): void {
    this.db.exec(`DELETE FROM outbox;`);
  }
}
