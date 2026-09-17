import { SQLiteDatabase } from '../db/database.js';
import { CheckoutRequest, CheckoutResult, LoyaltyTransaction, LoyaltyTier } from './models.js';
import { MemberService } from './memberService.js';
import { LedgerService } from './ledgerService.js';
import { EarningEngine, globalEarningEngine } from './earningEngine.js';
import { RedemptionEngine, globalRedemptionEngine } from './redemptionEngine.js';
import crypto from 'crypto';

export class OrderService {
  constructor(
    private db: SQLiteDatabase,
    private memberService: MemberService,
    private ledgerService: LedgerService,
    private earningEngine: EarningEngine = globalEarningEngine,
    private redemptionEngine: RedemptionEngine = globalRedemptionEngine
  ) {}

  public setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Processes a counter order atomically:
   * 1. Validates items & redemption points
   * 2. Deducts redemption points from ledger
   * 3. Calculates points earned on net cash/card spent
   * 4. Credits earned points to ledger
   * 5. Promotes tier if threshold reached
   * 6. Creates order record and audit entries
   */
  public checkout(request: CheckoutRequest): CheckoutResult {
    const { memberId, items, paymentMethod, appliedRewardIds = [] } = request;

    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Calculate gross amount, points to redeem, and net cash required
    let grossAmount = 0;
    let pointsToRedeem = 0;
    let redeemedDollarValue = 0;

    for (const item of items) {
      const lineGross = item.price * item.quantity;
      grossAmount += lineGross;

      if (item.isRedemption) {
        const itemPoints = (item.pointsCost || 0) * item.quantity;
        pointsToRedeem += itemPoints;
        redeemedDollarValue += lineGross;
      }
    }

    const netPaidAmount = Math.max(0, grossAmount - redeemedDollarValue);

    // 2. If guest checkout (no member)
    if (!memberId) {
      if (pointsToRedeem > 0) {
        throw new Error('Cannot redeem points without a registered member selected.');
      }

      this.db.transaction(() => {
        this.db.prepare(`
          INSERT INTO orders (
            id, member_id, gross_amount, redeemed_value, net_paid_amount, points_earned, points_redeemed, payment_method, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(orderId, null, grossAmount, 0, netPaidAmount, 0, 0, paymentMethod, 'COMPLETED', now);

        for (const item of items) {
          this.db.prepare(`
            INSERT INTO order_items (
              id, order_id, menu_item_id, name, price, quantity, is_redemption, points_cost
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(crypto.randomUUID(), orderId, item.menuItemId, item.name, item.price, item.quantity, 0, 0);
        }
      })();

      return {
        orderId,
        grossAmount,
        redeemedValue: 0,
        netPaidAmount,
        pointsEarned: 0,
        pointsRedeemed: 0,
        previousBalance: 0,
        newBalance: 0,
        previousTier: 'BRONZE',
        newTier: 'BRONZE',
        tierUpgraded: false,
        transactions: [],
        timestamp: now
      };
    }

    // 3. Member checkout: Execute inside atomic SQLite transaction
    const executeCheckout = this.db.transaction(() => {
      const member = this.memberService.getMemberById(memberId);
      if (!member) {
        throw new Error(`Member with ID ${memberId} not found`);
      }

      const initialBalance = member.currentBalance;
      const initialTier = member.tier;
      const transactions: LoyaltyTransaction[] = [];

      // Step A: Validate and deduct redemption points
      if (pointsToRedeem > 0) {
        if (initialBalance < pointsToRedeem) {
          throw new Error(
            `Insufficient points balance. Member has ${initialBalance} points, but ${pointsToRedeem} points are required for this redemption.`
          );
        }

        const redeemResult = this.ledgerService.recordTransaction({
          memberId,
          type: 'REDEEM',
          points: -pointsToRedeem,
          referenceId: orderId,
          metadata: {
            orderId,
            redeemedValue: redeemedDollarValue,
            items: items.filter(i => i.isRedemption)
          }
        });

        transactions.push(redeemResult.transaction);
      }

      // Step B: Calculate and award points earned on net cash/card spent
      let pointsEarned = 0;
      let finalMember = this.memberService.getMemberById(memberId)!;

      if (netPaidAmount > 0) {
        const calculation = this.earningEngine.calculatePoints(netPaidAmount, finalMember.tier);
        pointsEarned = calculation.pointsEarned;

        if (pointsEarned > 0) {
          const earnResult = this.ledgerService.recordTransaction({
            memberId,
            type: 'EARN',
            points: pointsEarned,
            referenceId: orderId,
            metadata: {
              orderId,
              netPaidAmount,
              basePoints: calculation.basePoints,
              multiplier: calculation.multiplier,
              tierAtTimeOfEarn: finalMember.tier
            }
          });

          transactions.push(earnResult.transaction);
          finalMember = earnResult.member as any;
        }
      }

      // Step C: Persist Order and Line Items
      this.db.prepare(`
        INSERT INTO orders (
          id, member_id, gross_amount, redeemed_value, net_paid_amount, points_earned, points_redeemed, payment_method, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        memberId,
        grossAmount,
        redeemedDollarValue,
        netPaidAmount,
        pointsEarned,
        pointsToRedeem,
        paymentMethod,
        'COMPLETED',
        now
      );

      for (const item of items) {
        this.db.prepare(`
          INSERT INTO order_items (
            id, order_id, menu_item_id, name, price, quantity, is_redemption, points_cost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          orderId,
          item.menuItemId,
          item.name,
          item.price,
          item.quantity,
          item.isRedemption ? 1 : 0,
          item.pointsCost || 0
        );
      }

      const refreshedMember = this.memberService.getMemberById(memberId)!;

      return {
        orderId,
        memberId,
        grossAmount,
        redeemedValue: redeemedDollarValue,
        netPaidAmount,
        pointsEarned,
        pointsRedeemed: pointsToRedeem,
        previousBalance: initialBalance,
        newBalance: refreshedMember.currentBalance,
        previousTier: initialTier,
        newTier: refreshedMember.tier,
        tierUpgraded: refreshedMember.tier !== initialTier,
        transactions,
        timestamp: now
      };
    });

    return executeCheckout();
  }

  /**
   * Retrieves recent orders.
   */
  public getRecentOrders(limit = 20): any[] {
    const orders = this.db.prepare(`
      SELECT o.*, m.name as member_name, m.phone_number as member_phone
      FROM orders o
      LEFT JOIN members m ON o.member_id = m.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return orders.map(o => ({
      id: o.id,
      memberId: o.member_id,
      memberName: o.member_name,
      memberPhone: o.member_phone,
      grossAmount: Number(o.gross_amount),
      redeemedValue: Number(o.redeemed_value),
      netPaidAmount: Number(o.net_paid_amount),
      pointsEarned: Number(o.points_earned),
      pointsRedeemed: Number(o.points_redeemed),
      paymentMethod: o.payment_method,
      status: o.status,
      createdAt: o.created_at
    }));
  }
}
