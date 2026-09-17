# 🤖 AI Development & Interaction Logs: Cafe Rewards Programme

This document records the complete AI interaction, prompts, architectural decisions, implementation milestones, testing history, and twist adaptations during the development of the **Cafe Loyalty Rewards Programme & POS Counter**.

---

## 📌 Milestone 1: Initial Requirement Analysis & Implementation Planning

### User Prompt:
> *"I’ve been given the following requirement for a coding assessment: A cafe chain’s rewards programme. Members earn points on every purchase and redeem them for free items. Regulars reach higher tiers – Silver, then Gold – that earn faster. The counter needs to record a purchase, add the right points, let a member redeem, and always show the correct live balance. Staff look a member up by phone number, and the member list is long. Build the counter something so every member’s points balance is always exactly right... Before writing any code, please go through the requirement carefully and tell me what needs to be built or required. Break it down into main features, business rules, data we need to store, important edge cases, technical challenges... suggest reasonable assumptions that we can make while keeping rules configurable... Then propose a simple, maintainable architecture and tech stack for the project. I'm planning to run and submit this through GitHub Codespaces... For now only analyze the requirement and give me the implementation plan. Don't start coding yet."*

### AI Response & Actions:
1. **Architectural Analysis**:
   - Identified the need for an **Append-Only Immutable Double-Entry Ledger** (`loyalty_transactions`) to ensure 100% financial balance consistency with zero floating-point drift.
   - Designed the separation between **Spendable Points Balance** and **Lifetime Qualifying Tier Points** so redeeming rewards never demotes customer tier status.
   - Designed canonical **E.164 / normalized digit phone indexing** with B-Tree search to achieve sub-4ms lookups over 15,000+ members.
   - Proposed a zero-dependency WebAssembly SQLite storage layer with Node.js/Express + React/Tailwind frontend, fully self-contained for instant startup in GitHub Codespaces.
2. Created the detailed `implementation_plan.md` artifact.

---

## 📌 Milestone 2: Core Domain Engine & POS Counter Implementation

### User Prompt:
> *Approved implementation plan.*

### AI Response & Actions:
1. **Database & Schema**:
   - Initialized `SQLiteDatabase` with WebAssembly engine (`sql.js`), enabling pure portability without native C++ compiler hurdles.
   - Created tables: `members`, `loyalty_transactions`, `menu_items`, `reward_items`, `orders`, `order_items`, and `system_config`.
2. **Domain Services**:
   - `LedgerService`: ACID transactions, append-only entries (`EARN`, `REDEEM`, `ADJUSTMENT`), point-in-time balance snapshots, and on-demand balance reconciliation.
   - `TierEngine`: Tier threshold progression (Bronze, Silver, Gold) and live progress calculation.
   - `EarningEngine`: Base points calculation with tier multipliers and configurable rounding (`floor`, `round`, `ceil`).
   - `RedemptionEngine`: Atomic balance validation and reward eligibility checks.
   - `MemberService`: Fast phone normalization, prefix matching, and member management.
   - `OrderService`: Multi-item counter checkout supporting split transactions (earning points only on net paid amount).
3. **Interactive POS Counter Client**:
   - Modern Coffeehouse POS UI (dark slate, gold/silver/bronze highlights, Plus Jakarta Sans font).
   - Live phone lookup with instant suggestions.
   - Member profile card with glowing live balance and progress bar.
   - Menu catalog with quick-add buttons and 1-click reward redemptions.
   - Modals for Audit Ledger, New Member Registration, and Dynamic Rule Configuration.
4. **Automated Vitest Tests**: Created 22 unit, integration, and concurrency test cases.

---

## 📌 Milestone 3: Implementing Assessment Twists (Levels 1, 2, and 3)

### User Prompt:
> *"Some constraints or twists are there in the project. Implement them carefully and modify the project you have made.*
> - *Level 1 — T3 (backward-compat): 'Add a new top tier Platinum (lifetime ≥ 5000, earns 0.3/₹). Existing members’ tiers and balances must be unchanged unless they now qualify.'*
> - *Level 2 — T2 (automation): 'Points expire if unused for 90 days; a job expires stale points and adjusts balances.' Graded via POST /clock.*
> - *Level 3 — T1 (integrate): 'When a member crosses into a new tier, notify them via the Notification Service.' Graded via /outbox."*

### AI Response & Actions:

#### 1. Level 1 — T3 (backward-compat): Platinum Tier ($\ge$ 5000 pts, 0.3/₹ earn rate)
- Updated `LoyaltyTier` type to `'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'`.
- Configured Platinum threshold at $\ge 5,000$ lifetime qualifying points with explicit `earnRate: 0.3` (earns 0.3 points per ₹1 spent; e.g. ₹100 spend = 30 points).
- Implemented `migrateExistingMemberTiers()` in `LedgerService`: automatically checks and upgrades existing members who have $\ge 5,000$ lifetime points without altering their spendable balances or modifying members below 5,000.
- Added test suite: `test/twistLevel1_platinum.test.ts`.

#### 2. Level 2 — T2 (automation): 90-Day Points Expiration (Graded via `POST /clock`)
- Created `ClockService` to manage simulated time and date offsets.
- Created `ExpirationService`: performs FIFO points accounting on `EARN` transactions older than 90 days (`createdAt <= cutoffDate`), appends `EXPIRE` entries with negative point deltas to the immutable ledger, and deducts expired points from the member's live balance while preserving lifetime qualifying tier points.
- Mounted graded routes: **`POST /clock`** and **`GET /clock`** (also accessible under `/api/clock`).
  - Supports payloads: `{"days": 90}`, `{"advanceByDays": 90}`, `{"date": "2026-06-01T00:00:00Z"}`, `{"now": "..."}`.
- Added test suite: `test/twistLevel2_clock_expiration.test.ts`.

#### 3. Level 3 — T1 (integrate): Outbox Notifications on Tier Level-Up (Graded via `GET /outbox`)
- Created `outbox` table in SQLite schema.
- Created `NotificationService`: automatically logs `TIER_UPGRADE` records whenever an `EARN` or migration transaction causes a member to cross into a higher tier (Bronze $\to$ Silver, Silver $\to$ Gold, Gold $\to$ Platinum).
- Mounted graded routes: **`GET /outbox`** (and `DELETE /outbox`, `/api/outbox`).
  - Returns outbox messages containing `memberId`, `phoneNumber`, `recipient`, `previousTier`, `newTier`, `message`, and timestamp.
- Added test suite: `test/twistLevel3_outbox_notifications.test.ts`.

---

## 📌 Milestone 4: Comprehensive End-to-End API Verification

### User Prompt:
> *"I just want to do one final check of the application to make sure everything works the way the company expects... Please check the things like platinum 5000 lifetime points case as given in twists, points expiry, tier notifications. Please use the actual endpoints that the company will test, especially POST /clock and GET /outbox... Once you're done, tell me the final test result, the command I should use to start the project in a fresh Codespace, and whether everything is ready for me to push to GitHub and submit."*

### AI Response & Actions:
1. Executed full automated Vitest test suite (**30 / 30 tests passing across 9 test suites in 1.34s**):
   ```
   ✓ test/tierEngine.test.ts (3 tests)
   ✓ test/twistLevel3_outbox_notifications.test.ts (3 tests)
   ✓ test/twistLevel1_platinum.test.ts (3 tests)
   ✓ test/ledgerService.test.ts (3 tests)
   ✓ test/twistLevel2_clock_expiration.test.ts (2 tests)
   ✓ test/concurrency.test.ts (2 tests)
   ✓ test/phoneLookup.test.ts (4 tests)
   ✓ test/earningEngine.test.ts (7 tests)
   ✓ test/redemptionEngine.test.ts (3 tests)
   ```
2. Executed programmatic end-to-end evaluation against `http://localhost:3000`:
   - Member registration & search: Passed.
   - Earn & promotion to Silver: Passed.
   - `GET /outbox` verification for Silver notification: Passed.
   - Earn to 5,000 points & Platinum promotion: Passed.
   - Platinum ₹100 spend earning exact 30 points (0.3/₹): Passed.
   - 0-discrepancy ledger reconciliation: Passed.
   - `POST /clock` with `{"days": 95}` expiring stale points: Passed.
   - Lifetime points & Platinum tier preservation after expiration: Passed.

---

## 📌 Milestone 5: GitHub Push & Submission Preparation

### User Prompt:
> *Provided GitHub Personal Access Token to complete remote push to `https://github.com/b230251-cyber/loyalty-points.git`.*

### AI Response & Actions:
1. Initialized git repository on branch `main`.
2. Staged all source code, tests, documentation, and configuration.
3. Created clean commit: `feat: complete cafe loyalty rewards program with tiers, ledger consistency, clock expiration, and outbox notifications`.
4. Successfully pushed the repository to GitHub:
   - Remote URL: **`https://github.com/b230251-cyber/loyalty-points.git`**
   - Branch: **`main`**
5. Cleaned local remote URL to ensure no credentials or tokens are stored in plaintext.

---

## 🏆 Final Verification Summary

- **Total Automated Tests**: 30 / 30 Passed (100% pass rate)
- **Graded Endpoints**: `POST /clock`, `GET /outbox`, `/api/members/*`, `/api/orders/*`, `/api/catalog/*`, `/api/config`
- **Port**: 3000
- **Codespaces Startup Command**: `npm install && npm start`
- **GitHub Repository**: [https://github.com/b230251-cyber/loyalty-points/tree/main](https://github.com/b230251-cyber/loyalty-points/tree/main)
