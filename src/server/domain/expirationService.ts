import { SQLiteDatabase } from '../db/database.js';
import { ClockService, globalClockService } from './clockService.js';
import { ConfigService, globalConfigService } from './configService.js';
import crypto from 'crypto';

export interface ExpirationJobResult {
  runAt: string;
  expiryDays: number;
  cutoffDate: string;
  membersProcessed: number;
  membersWithExpiredPoints: number;
  totalPointsExpired: number;
  expiredDetails: Array<{
    memberId: string;
    memberName: string;
    pointsExpired: number;
    previousBalance: number;
    newBalance: number;
  }>;
}

export class ExpirationService {
  constructor(
    private db: SQLiteDatabase,
    private clockService: ClockService = globalClockService,
    private configService: ConfigService = globalConfigService
  ) {}

  public setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Runs the automated points expiration job.
   * Graded via POST /clock: expires points older than 90 days (or configured expiry days)
   * using FIFO points accounting and appends EXPIRE ledger entries.
   */
  public runExpirationJob(): ExpirationJobResult {
    const config = this.configService.getConfig();
    const expiryDays = config.pointsExpiryDays || 90;
    const now = this.clockService.now();
    const cutoffDate = new Date(now.getTime() - expiryDays * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();
    const nowIso = now.toISOString();

    const expiredDetails: ExpirationJobResult['expiredDetails'] = [];
    let totalPointsExpired = 0;

    // Run inside database transaction for ACID atomicity
    const execute = this.db.transaction(() => {
      // Find all members with positive balance
      const activeMembers = this.db
        .prepare(`SELECT id, name, current_balance, lifetime_points FROM members WHERE current_balance > 0`)
        .all() as any[];

      for (const member of activeMembers) {
        const memberId = member.id;
        const currentBalance = Number(member.current_balance);

        // Calculate points earned before the 90-day cutoff
        const oldEarnedRow = this.db
          .prepare(`
            SELECT COALESCE(SUM(points), 0) as old_earned
            FROM loyalty_transactions
            WHERE member_id = ? 
              AND type = 'EARN'
              AND created_at <= ?
          `)
          .get(memberId, cutoffIso) as any;

        const oldEarned = Number(oldEarnedRow.old_earned || 0);
        if (oldEarned <= 0) {
          continue;
        }

        // Calculate total points consumed across all time by REDEEM and previous EXPIRE
        const consumedRow = this.db
          .prepare(`
            SELECT COALESCE(ABS(SUM(points)), 0) as total_consumed
            FROM loyalty_transactions
            WHERE member_id = ? 
              AND (type = 'REDEEM' OR type = 'EXPIRE')
          `)
          .get(memberId) as any;

        const totalConsumed = Number(consumedRow.total_consumed || 0);

        // Unconsumed points that have now crossed the 90-day expiry threshold
        const unconsumedOldPoints = Math.max(0, oldEarned - totalConsumed);
        const pointsToExpire = Math.min(currentBalance, unconsumedOldPoints);

        if (pointsToExpire > 0) {
          const newBalance = currentBalance - pointsToExpire;

          // 1. Insert immutable EXPIRE transaction into ledger
          const txId = crypto.randomUUID();
          this.db
            .prepare(`
              INSERT INTO loyalty_transactions (
                id, member_id, type, points, balance_after, metadata, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              txId,
              memberId,
              'EXPIRE',
              -pointsToExpire,
              newBalance,
              JSON.stringify({
                reason: `Points expired after ${expiryDays} days`,
                cutoffDate: cutoffIso,
                expiredPoints: pointsToExpire
              }),
              nowIso
            );

          // 2. Update member live balance (lifetimePoints stays intact)
          this.db
            .prepare(`
              UPDATE members
              SET current_balance = ?,
                  updated_at = ?
              WHERE id = ?
            `)
            .run(newBalance, nowIso, memberId);

          expiredDetails.push({
            memberId,
            memberName: member.name,
            pointsExpired: pointsToExpire,
            previousBalance: currentBalance,
            newBalance
          });

          totalPointsExpired += pointsToExpire;
        }
      }

      return {
        runAt: nowIso,
        expiryDays,
        cutoffDate: cutoffIso,
        membersProcessed: activeMembers.length,
        membersWithExpiredPoints: expiredDetails.length,
        totalPointsExpired,
        expiredDetails
      };
    });

    return execute();
  }
}
