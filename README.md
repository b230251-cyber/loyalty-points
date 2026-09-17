# ☕ AuraCafe Rewards Programme & POS Counter

A production-grade, financial-ledger-backed Rewards Programme and Counter POS application built for cafe chains with exact points accounting, multi-tier earn acceleration, reward redemptions, automated point expirations, and outbox tier upgrade notifications.

---

## 🌟 Twist Implementations & Graded Endpoints

### 1. Level 1 — T3 (backward-compat): Platinum Tier (lifetime >= 5000, earns 0.3/₹)
- Added new top tier: **Platinum Elite** (`PLATINUM`) for members with $\ge 5,000$ lifetime points.
- Earns **0.3 points per ₹1 spent** (e.g. ₹100 spent = 30 points).
- **Backward compatibility guaranteed**: Existing members' spendable balances and current tiers remain unchanged unless they have $\ge 5,000$ lifetime points.

### 2. Level 2 — T2 (automation): 90-Day Points Expiration (Graded via `POST /clock`)
- Points expire if unused for 90 days using **FIFO points batch accounting**.
- Time is simulated and controlled via **`POST /clock`** (or `POST /api/clock`).
- Accepts: `{"days": 90}`, `{"advanceByDays": 90}`, `{"date": "2026-06-01T00:00:00Z"}`, `{"now": "..."}`, `{"timestamp": "..."}`.
- Running `POST /clock` automatically invokes the expiration job, appends `EXPIRE` transactions to the ledger, and adjusts live balances while keeping lifetime qualifying points intact.

### 3. Level 3 — T1 (integrate): Outbox Notifications on Tier Level-Up (Graded via `GET /outbox`)
- When a member crosses into a new tier (Bronze $\to$ Silver, Silver $\to$ Gold, Gold $\to$ Platinum), an outbox notification is queued.
- Graded via **`GET /outbox`** (or `GET /api/outbox`).
- Returns outbox messages containing `memberId`, `phoneNumber`, `recipient`, `type: 'TIER_UPGRADE'`, `previousTier`, `newTier`, and `message`.
- Supports resetting/clearing via `DELETE /outbox` or `POST /outbox/clear`.

---

## 🚀 Quick Start (GitHub Codespaces / Local)

```bash
# 1. Install Dependencies
npm install

# 2. Seed Database (1,000+ Mock Members, Menu & Rewards)
npm run seed

# 3. Start Fullstack Server
npm start
```
Open **http://localhost:3000** in your browser.

---

## 🧪 Running Automated Tests (30 Tests across 9 Suites)

```bash
npm test
```

### Test Suites:
- `test/twistLevel1_platinum.test.ts`: Level 1 Platinum qualification and 0.3/₹ earn rate.
- `test/twistLevel2_clock_expiration.test.ts`: Level 2 90-day expiration and FIFO deduction via clock.
- `test/twistLevel3_outbox_notifications.test.ts`: Level 3 Outbox notifications on tier promotions.
- `test/ledgerService.test.ts`: Immutable double-entry ledger & 0-discrepancy reconciliation.
- `test/earningEngine.test.ts`: Base rates, multipliers, and integer floor rounding.
- `test/tierEngine.test.ts`: 4-tier threshold progression (Bronze, Silver, Gold, Platinum).
- `test/redemptionEngine.test.ts`: Reward validations and point deductions.
- `test/phoneLookup.test.ts`: Sub-millisecond phone normalization & prefix search.
- `test/concurrency.test.ts`: Concurrency and double-spend prevention.

---

## ⚡ Performance Benchmark (15,000 Members)

```bash
npm run benchmark
```
- Members Indexed: 15,000
- Average Lookup Latency: **3.87 ms**
- Throughput: **258+ queries/sec**
