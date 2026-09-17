import { SQLiteDatabase } from '../db/database.js';
import { Member, LoyaltyTier } from './models.js';
import { normalizePhoneNumber, formatPhoneNumber, isValidPhoneNumber } from './phoneUtils.js';
import { TierEngine, globalTierEngine, TierEvaluationResult } from './tierEngine.js';
import crypto from 'crypto';

export interface MemberWithTierStatus extends Member {
  formattedPhone: string;
  tierStatus: TierEvaluationResult;
}

export interface RegisterMemberParams {
  phoneNumber: string;
  name: string;
  email?: string;
  initialPoints?: number;
}

export class MemberService {
  constructor(
    private db: SQLiteDatabase,
    private tierEngine: TierEngine = globalTierEngine
  ) {}

  public setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Fast lookup of members by phone number.
   * Matches exact normalized digits, prefix match, or suffix match.
   * Uses SQLite index on phone_number.
   */
  public searchMembersByPhone(query: string, limit = 10): MemberWithTierStatus[] {
    const cleanQuery = normalizePhoneNumber(query);
    if (!cleanQuery) return [];

    const rows = this.db
      .prepare(`
        SELECT * FROM members 
        WHERE phone_number = ?
           OR phone_number LIKE ?
           OR phone_number LIKE ?
        ORDER BY 
          CASE 
            WHEN phone_number = ? THEN 1
            WHEN phone_number LIKE ? THEN 2
            ELSE 3
          END,
          name ASC
        LIMIT ?
      `)
      .all(
        cleanQuery,
        `${cleanQuery}%`,
        `%${cleanQuery}%`,
        cleanQuery,
        `${cleanQuery}%`,
        limit
      ) as any[];

    return rows.map(r => this.mapRowToMember(r));
  }

  /**
   * Searches members by name or phone for counter flexibility.
   */
  public searchMembers(query: string, limit = 10): MemberWithTierStatus[] {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cleanPhone = normalizePhoneNumber(trimmed);

    if (cleanPhone.length >= 3) {
      return this.searchMembersByPhone(cleanPhone, limit);
    }

    const rows = this.db
      .prepare(`
        SELECT * FROM members
        WHERE name LIKE ? OR email LIKE ?
        ORDER BY name ASC
        LIMIT ?
      `)
      .all(`%${trimmed}%`, `%${trimmed}%`, limit) as any[];

    return rows.map(r => this.mapRowToMember(r));
  }

  /**
   * Retrieves a member by ID.
   */
  public getMemberById(id: string): MemberWithTierStatus | null {
    const row = this.db.prepare(`SELECT * FROM members WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.mapRowToMember(row);
  }

  /**
   * Retrieves a member by exact phone number.
   */
  public getMemberByPhone(phoneNumber: string): MemberWithTierStatus | null {
    const cleanPhone = normalizePhoneNumber(phoneNumber);
    const row = this.db.prepare(`SELECT * FROM members WHERE phone_number = ?`).get(cleanPhone) as any;
    if (!row) return null;
    return this.mapRowToMember(row);
  }

  /**
   * Registers a new member.
   */
  public registerMember(params: RegisterMemberParams): MemberWithTierStatus {
    const cleanPhone = normalizePhoneNumber(params.phoneNumber);
    if (!isValidPhoneNumber(cleanPhone)) {
      throw new Error('Invalid phone number format. Please provide at least 7 to 15 digits.');
    }

    const trimmedName = params.name.trim();
    if (!trimmedName) {
      throw new Error('Member name is required.');
    }

    // Check for duplicate phone
    const existing = this.getMemberByPhone(cleanPhone);
    if (existing) {
      throw new Error(`A member is already registered with phone number ${formatPhoneNumber(cleanPhone)}`);
    }

    const memberId = crypto.randomUUID();
    const now = new Date().toISOString();
    const initialPoints = Math.max(0, params.initialPoints || 0);
    const initialTier = this.tierEngine.evaluateTier(initialPoints);

    const execute = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO members (
            id, phone_number, name, email, current_balance, lifetime_points, tier, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          memberId,
          cleanPhone,
          trimmedName,
          params.email ? params.email.trim() : null,
          initialPoints,
          initialPoints,
          initialTier,
          now,
          now
        );

      if (initialPoints > 0) {
        this.db
          .prepare(`
            INSERT INTO loyalty_transactions (
              id, member_id, type, points, balance_after, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            crypto.randomUUID(),
            memberId,
            'EARN',
            initialPoints,
            initialPoints,
            JSON.stringify({ note: 'Welcome bonus / Initial balance' }),
            now
          );
      }
    });

    execute();

    return this.getMemberById(memberId)!;
  }

  public getAllMembers(limit = 100, offset = 0): MemberWithTierStatus[] {
    const rows = this.db
      .prepare(`SELECT * FROM members ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as any[];
    return rows.map(r => this.mapRowToMember(r));
  }

  public getTotalMemberCount(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM members`).get() as any;
    return row ? Number(row.count) : 0;
  }

  private mapRowToMember(row: any): MemberWithTierStatus {
    const lifetimePoints = Number(row.lifetime_points);
    const currentBalance = Number(row.current_balance);
    const tierStatus = this.tierEngine.getTierStatus(lifetimePoints);

    return {
      id: row.id,
      phoneNumber: row.phone_number,
      formattedPhone: formatPhoneNumber(row.phone_number),
      name: row.name,
      email: row.email || undefined,
      currentBalance,
      lifetimePoints,
      tier: row.tier as LoyaltyTier,
      tierStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
