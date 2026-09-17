import { SQLiteDatabase } from '../db/database.js';
import { LoyaltyTransaction, TransactionType, LoyaltyTier, Member } from './models.js';
import { TierEngine, globalTierEngine } from './tierEngine.js';
import { ConfigService, globalConfigService } from './configService.js';
import { ClockService, globalClockService } from './clockService.js';
import { NotificationService } from './notificationService.js';
import crypto from 'crypto';

export interface RecordTransactionParams {
  memberId: string;
  type: TransactionType;
  points: number; // positive for EARN, negative for REDEEM/EXPIRE
  referenceId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface ReconciliationResult {
  memberId: string;
  materializedBalance: number;
  calculatedLedgerBalance: number;
  isConsistent: boolean;
  discrepancy: number;
  totalTransactionsCount: number;
}

export class LedgerService {
  private notificationService?: NotificationService;

  constructor(
    private db: SQLiteDatabase,
    private tierEngine: TierEngine = globalTierEngine,
    private configService: ConfigService = globalConfigService,
    private clockService: ClockService = globalClockService,
    notificationService?: NotificationService
  ) {
    this.notificationService = notificationService;
  }

  public setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  public setNotificationService(service: NotificationService) {
    this.notificationService = service;
  }

  /**
   * Records a new transaction into the immutable ledger and atomically updates the member's live balance and tier.
   * When a member crosses into a new tier, enqueues an outbox notification.
   */
  public recordTransaction(params: RecordTransactionParams): {
    transaction: LoyaltyTransaction;
    member: Member;
    tierUpgraded: boolean;
    previousTier: LoyaltyTier;
  } {
    const { memberId, type, points, referenceId, metadata, timestamp } = params;

    // Run atomically inside SQLite transaction
    const execute = this.db.transaction(() => {
      // 1. Fetch current member
      const memberRow = this.db
        .prepare(`SELECT * FROM members WHERE id = ?`)
        .get(memberId) as any;

      if (!memberRow) {
        throw new Error(`Member with ID ${memberId} not found`);
      }

      const currentBalance = Number(memberRow.current_balance);
      const lifetimePoints = Number(memberRow.lifetime_points);
      const previousTier = memberRow.tier as LoyaltyTier;

      // 2. Validate balance constraints
      const newBalance = currentBalance + points;
      const config = this.configService.getConfig();

      if (newBalance < 0 && !config.allowNegativeBalance) {
        throw new Error(
          `Insufficient points balance. Current balance is ${currentBalance}, attempted to deduct ${Math.abs(points)} points.`
        );
      }

      // 3. Update lifetime points: only EARN and positive ADJUSTMENT contribute to lifetime qualifying tier points
      let newLifetimePoints = lifetimePoints;
      if (type === 'EARN' || (type === 'ADJUSTMENT' && points > 0)) {
        newLifetimePoints += points;
      }

      // 4. Evaluate new tier based on lifetime points
      const newTier = this.tierEngine.evaluateTier(newLifetimePoints);
      const tierUpgraded = newTier !== previousTier && this.getTierRank(newTier) > this.getTierRank(previousTier);

      // 5. Generate immutable transaction entry
      const transactionId = crypto.randomUUID();
      const now = timestamp || this.clockService.nowIso();

      this.db
        .prepare(`
          INSERT INTO loyalty_transactions (
            id, member_id, type, points, balance_after, reference_id, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          transactionId,
          memberId,
          type,
          points,
          newBalance,
          referenceId || null,
          metadata ? JSON.stringify(metadata) : null,
          now
        );

      // 6. Update member materialized balance & tier
      this.db
        .prepare(`
          UPDATE members
          SET current_balance = ?,
              lifetime_points = ?,
              tier = ?,
              updated_at = ?
          WHERE id = ?
        `)
        .run(newBalance, newLifetimePoints, newTier, now, memberId);

      const updatedMember: Member = {
        id: memberId,
        phoneNumber: memberRow.phone_number,
        name: memberRow.name,
        email: memberRow.email,
        currentBalance: newBalance,
        lifetimePoints: newLifetimePoints,
        tier: newTier,
        createdAt: memberRow.created_at,
        updatedAt: now
      };

      // 7. Level 3 (T1): If tier upgraded, queue outbox notification
      if (tierUpgraded && this.notificationService) {
        this.notificationService.queueTierUpgradeNotification(
          updatedMember,
          previousTier,
          newTier,
          {
            transactionId,
            referenceId,
            pointsEarned: points,
            lifetimePoints: newLifetimePoints
          }
        );
      }

      const transaction: LoyaltyTransaction = {
        id: transactionId,
        memberId,
        type,
        points,
        balanceAfter: newBalance,
        referenceId,
        metadata,
        createdAt: now
      };

      return {
        transaction,
        member: updatedMember,
        tierUpgraded,
        previousTier
      };
    });

    return execute();
  }

  /**
   * Backward-compatibility migration:
   * Re-evaluates existing members' tiers according to newly added tiers (e.g. Platinum).
   * Existing balances and qualifying tier status are preserved and only upgraded if they now qualify.
   */
  public migrateExistingMemberTiers(): { migratedCount: number; upgradedMembers: Member[] } {
    const members = this.db.prepare(`SELECT * FROM members`).all() as any[];
    const upgradedMembers: Member[] = [];

    const execute = this.db.transaction(() => {
      for (const m of members) {
        const lifetime = Number(m.lifetime_points);
        const currentTier = m.tier as LoyaltyTier;
        const qualifyingTier = this.tierEngine.evaluateTier(lifetime);

        if (qualifyingTier !== currentTier && this.getTierRank(qualifyingTier) > this.getTierRank(currentTier)) {
          const now = this.clockService.nowIso();
          this.db.prepare(`UPDATE members SET tier = ?, updated_at = ? WHERE id = ?`).run(qualifyingTier, now, m.id);

          const updatedMember: Member = {
            id: m.id,
            phoneNumber: m.phone_number,
            name: m.name,
            email: m.email,
            currentBalance: Number(m.current_balance),
            lifetimePoints: lifetime,
            tier: qualifyingTier,
            createdAt: m.created_at,
            updatedAt: now
          };

          upgradedMembers.push(updatedMember);

          if (this.notificationService) {
            this.notificationService.queueTierUpgradeNotification(
              updatedMember,
              currentTier,
              qualifyingTier,
              { reason: 'Backward compatibility tier qualification' }
            );
          }
        }
      }
    });

    execute();
    return { migratedCount: upgradedMembers.length, upgradedMembers };
  }

  /**
   * Retrieves transaction history for a member.
   */
  public getMemberTransactions(memberId: string, limit = 50, offset = 0): LoyaltyTransaction[] {
    const rows = this.db
      .prepare(`
        SELECT * FROM loyalty_transactions
        WHERE member_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(memberId, limit, offset) as any[];

    return rows.map(r => ({
      id: r.id,
      memberId: r.member_id,
      type: r.type as TransactionType,
      points: Number(r.points),
      balanceAfter: Number(r.balance_after),
      referenceId: r.reference_id,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      createdAt: r.created_at
    }));
  }

  /**
   * Reconciles the materialized balance against the sum of all historical ledger entries.
   */
  public reconcileMemberBalance(memberId: string): ReconciliationResult {
    const member = this.db
      .prepare(`SELECT current_balance FROM members WHERE id = ?`)
      .get(memberId) as any;

    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    const ledgerSummary = this.db
      .prepare(`
        SELECT 
          COALESCE(SUM(points), 0) as total_points,
          COUNT(*) as tx_count
        FROM loyalty_transactions
        WHERE member_id = ?
      `)
      .get(memberId) as any;

    const materializedBalance = Number(member.current_balance);
    const calculatedLedgerBalance = Number(ledgerSummary.total_points);
    const discrepancy = materializedBalance - calculatedLedgerBalance;

    return {
      memberId,
      materializedBalance,
      calculatedLedgerBalance,
      isConsistent: discrepancy === 0,
      discrepancy,
      totalTransactionsCount: Number(ledgerSummary.tx_count)
    };
  }

  public getTierRank(tier: LoyaltyTier): number {
    switch (tier) {
      case 'PLATINUM': return 4;
      case 'GOLD': return 3;
      case 'SILVER': return 2;
      case 'BRONZE': default: return 1;
    }
  }
}
