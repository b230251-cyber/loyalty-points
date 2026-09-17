import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, SQLiteDatabase } from '../src/server/db/database.js';
import { MemberService } from '../src/server/domain/memberService.js';
import { TierEngine } from '../src/server/domain/tierEngine.js';
import { normalizePhoneNumber, formatPhoneNumber } from '../src/server/domain/phoneUtils.js';

describe('Phone Lookup & Member Search Tests', () => {
  let db: SQLiteDatabase;
  let memberService: MemberService;
  let tierEngine: TierEngine;

  beforeEach(async () => {
    db = await getDatabase('', true);
    tierEngine = new TierEngine();
    memberService = new MemberService(db, tierEngine);
  });

  it('normalizes various phone number formats to standard digits', () => {
    expect(normalizePhoneNumber('(555) 123-4567')).toBe('5551234567');
    expect(normalizePhoneNumber('+1-555-123-4567')).toBe('15551234567');
    expect(normalizePhoneNumber('555.123.4567')).toBe('5551234567');
    expect(normalizePhoneNumber(' 555 123 4567 ')).toBe('5551234567');
  });

  it('formats digits to clean counter display string', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
  });

  it('finds members by exact phone, prefix phone, or formatted input', () => {
    memberService.registerMember({
      phoneNumber: '5551234567',
      name: 'John Coffee',
      initialPoints: 100
    });

    memberService.registerMember({
      phoneNumber: '5551239999',
      name: 'Jane Espresso',
      initialPoints: 200
    });

    // 1. Search by formatted string
    const byFormatted = memberService.searchMembersByPhone('(555) 123-4567');
    expect(byFormatted.length).toBe(1);
    expect(byFormatted[0].name).toBe('John Coffee');

    // 2. Search by prefix
    const byPrefix = memberService.searchMembersByPhone('555123');
    expect(byPrefix.length).toBe(2);

    // 3. Search via general search method
    const generalSearch = memberService.searchMembers('555 123');
    expect(generalSearch.length).toBe(2);
  });

  it('performs rapid lookups on a large dataset of 5,000 members', () => {
    // Seed 5,000 members in transaction
    const insertTransaction = db.transaction(() => {
      for (let i = 1; i <= 5000; i++) {
        const phone = `415${String(1000000 + i).slice(1)}`;
        db.prepare(`
          INSERT INTO members (id, phone_number, name, email, current_balance, lifetime_points, tier, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(`m-${i}`, phone, `Member ${i}`, `m${i}@cafe.com`, 100, 100, 'BRONZE', '2026-01-01', '2026-01-01');
      }
    });

    insertTransaction();

    const start = performance.now();
    const results = memberService.searchMembersByPhone('4150042');
    const elapsedMs = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].phoneNumber.startsWith('4150042')).toBe(true);
    // Ensure lookup took well under 25ms
    expect(elapsedMs).toBeLessThan(25);
  });
});
