import { getDatabase, SQLiteDatabase } from './database.js';
import { DEFAULT_CONFIG } from '../domain/configService.js';
import crypto from 'crypto';

const SAMPLE_MENU_ITEMS = [
  // COFFEE
  { name: 'Espresso Single', category: 'COFFEE', price: 3.25, isRewardEligible: true, rewardPointsCost: 60 },
  { name: 'Americano', category: 'COFFEE', price: 4.00, isRewardEligible: true, rewardPointsCost: 80 },
  { name: 'Flat White', category: 'COFFEE', price: 4.75, isRewardEligible: true, rewardPointsCost: 100 },
  { name: 'Oat Vanilla Latte', category: 'COFFEE', price: 5.50, isRewardEligible: true, rewardPointsCost: 120 },
  { name: 'Caramel Macchiato', category: 'COFFEE', price: 5.75, isRewardEligible: true, rewardPointsCost: 130 },
  { name: 'Cold Brew Reserve', category: 'COFFEE', price: 4.95, isRewardEligible: true, rewardPointsCost: 110 },
  { name: 'Nitro Cold Brew', category: 'COFFEE', price: 5.85, isRewardEligible: true, rewardPointsCost: 140 },

  // PASTRY
  { name: 'Butter Croissant', category: 'PASTRY', price: 3.75, isRewardEligible: true, rewardPointsCost: 80 },
  { name: 'Almond Croissant', category: 'PASTRY', price: 4.50, isRewardEligible: true, rewardPointsCost: 100 },
  { name: 'Blueberry Scone', category: 'PASTRY', price: 4.25, isRewardEligible: true, rewardPointsCost: 90 },
  { name: 'Cinnamon Swirl Bun', category: 'PASTRY', price: 4.95, isRewardEligible: true, rewardPointsCost: 110 },
  { name: 'Triple Chocolate Cookie', category: 'PASTRY', price: 3.50, isRewardEligible: true, rewardPointsCost: 75 },

  // DRINKS
  { name: 'Matcha Green Tea Latte', category: 'DRINK', price: 5.65, isRewardEligible: true, rewardPointsCost: 125 },
  { name: 'Chai Spiced Tea', category: 'DRINK', price: 4.85, isRewardEligible: true, rewardPointsCost: 105 },
  { name: 'Fresh Sparkling Lemonade', category: 'DRINK', price: 4.25, isRewardEligible: true, rewardPointsCost: 90 },
  { name: 'Artisan Hibiscus Berry Tea', category: 'DRINK', price: 4.15, isRewardEligible: true, rewardPointsCost: 85 },

  // FOOD
  { name: 'Avocado Sourdough Toast', category: 'FOOD', price: 8.95, isRewardEligible: true, rewardPointsCost: 200 },
  { name: 'Tuscan Chicken Panini', category: 'FOOD', price: 9.75, isRewardEligible: true, rewardPointsCost: 225 },
  { name: 'Egg & White Cheddar Brioche', category: 'FOOD', price: 7.50, isRewardEligible: true, rewardPointsCost: 180 },
  { name: 'Smoked Salmon Bagel', category: 'FOOD', price: 10.50, isRewardEligible: true, rewardPointsCost: 250 },

  // MERCH
  { name: 'Cafe Travel Tumbler 16oz', category: 'MERCH', price: 24.00, isRewardEligible: true, rewardPointsCost: 550 },
  { name: 'Single Origin Whole Beans (250g)', category: 'MERCH', price: 16.50, isRewardEligible: true, rewardPointsCost: 400 }
];

const SAMPLE_REWARDS = [
  { name: 'Free Espresso / Brewed Coffee', category: 'COFFEE', pointsCost: 60, dollarValue: 3.50, description: 'Any single espresso or batch brew coffee' },
  { name: 'Free Bakery Pastry or Cookie', category: 'PASTRY', pointsCost: 80, dollarValue: 4.00, description: 'Fresh croissant, cookie, or scone from our display' },
  { name: 'Free Handcrafted Latte or Specialty Drink', category: 'COFFEE', pointsCost: 120, dollarValue: 5.50, description: 'Any hot or iced latte with oat, almond, or dairy milk' },
  { name: 'Free Breakfast Sandwich or Toast', category: 'FOOD', pointsCost: 180, dollarValue: 7.50, description: 'Warm egg brioche or artisan sourdough toast' },
  { name: 'Free Gourmet Lunch Panini / Bagel', category: 'FOOD', pointsCost: 225, dollarValue: 9.75, description: 'Any freshly pressed panini or smoked salmon bagel' },
  { name: 'Free Cafe Travel Tumbler (16oz)', category: 'MERCH', pointsCost: 550, dollarValue: 24.00, description: 'Double-walled stainless steel insulated travel tumbler' }
];

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Sam', 'Chris', 'Pat', 'Casey', 'Riley', 'Jamie', 'Avery', 'Logan', 'Cameron', 'Dakota', 'Reese', 'Skyler', 'Finley', 'Rowan', 'Harper', 'Hayden', 'Elena', 'Marcus', 'Sophia', 'Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Elijah'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

export async function seedDatabase(db: SQLiteDatabase, memberCount = 1000) {
  console.log(`🌱 Starting seed process...`);

  // 1. Clear existing data
  db.exec(`
    DELETE FROM outbox;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM loyalty_transactions;
    DELETE FROM members;
    DELETE FROM menu_items;
    DELETE FROM reward_items;
    DELETE FROM system_config;
  `);

  // 2. Insert Program Config
  db.prepare(`
    INSERT INTO system_config (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run('LOYALTY_CONFIG', JSON.stringify(DEFAULT_CONFIG), new Date().toISOString());

  // 3. Insert Menu Items
  for (const item of SAMPLE_MENU_ITEMS) {
    db.prepare(`
      INSERT INTO menu_items (id, name, category, price, is_reward_eligible, reward_points_cost)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      item.name,
      item.category,
      item.price,
      item.isRewardEligible ? 1 : 0,
      item.rewardPointsCost || null
    );
  }

  // 4. Insert Rewards
  for (const reward of SAMPLE_REWARDS) {
    db.prepare(`
      INSERT INTO reward_items (id, name, category, points_cost, dollar_value, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      crypto.randomUUID(),
      reward.name,
      reward.category,
      reward.pointsCost,
      reward.dollarValue,
      reward.description
    );
  }

  // 5. Insert Curated Test Members
  const curatedMembers = [
    {
      phone: '5551234567',
      name: 'Alice Silver (Regular)',
      email: 'alice.silver@example.com',
      lifetime: 850,
      balance: 420,
      tier: 'SILVER'
    },
    {
      phone: '5559876543',
      name: 'Gerald Gold (VIP Member)',
      email: 'gerald.gold@example.com',
      lifetime: 2450,
      balance: 1350,
      tier: 'GOLD'
    },
    {
      phone: '5558889999',
      name: 'Patrick Platinum (Top Tier)',
      email: 'patrick.plat@example.com',
      lifetime: 5800,
      balance: 3200,
      tier: 'PLATINUM'
    },
    {
      phone: '5550001111',
      name: 'Brian Bronze (New Member)',
      email: 'brian.bronze@example.com',
      lifetime: 120,
      balance: 120,
      tier: 'BRONZE'
    },
    {
      phone: '5554443322',
      name: 'Sarah Threshold (Close to Silver)',
      email: 'sarah.almost@example.com',
      lifetime: 480,
      balance: 480,
      tier: 'BRONZE'
    }
  ];

  for (const m of curatedMembers) {
    const memberId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO members (id, phone_number, name, email, current_balance, lifetime_points, tier, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(memberId, m.phone, m.name, m.email, m.balance, m.lifetime, m.tier, now, now);

    db.prepare(`
      INSERT INTO loyalty_transactions (id, member_id, type, points, balance_after, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      memberId,
      'EARN',
      m.balance,
      m.balance,
      JSON.stringify({ note: 'Initial seeded balance & purchase history' }),
      now
    );
  }

  // 6. Generate Large Mock Member List
  console.log(`👥 Seeding ${memberCount} realistic members with normalized phone numbers and transaction ledger...`);

  const generateBulk = db.transaction(() => {
    for (let i = 1; i <= memberCount; i++) {
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
      const name = `${firstName} ${lastName} #${i}`;
      
      const areaCode = 200 + (i % 700);
      const prefix = 100 + (i % 900);
      const line = String(1000 + (i % 9000)).padStart(4, '0');
      const phone = `${areaCode}${prefix}${line}`;

      const rand = Math.random();
      let tier = 'BRONZE';
      let lifetime = Math.floor(Math.random() * 450);
      let balance = lifetime;

      if (rand > 0.95) {
        tier = 'PLATINUM';
        lifetime = 5000 + Math.floor(Math.random() * 4000);
        balance = Math.floor(lifetime * (0.3 + Math.random() * 0.5));
      } else if (rand > 0.80) {
        tier = 'GOLD';
        lifetime = 1500 + Math.floor(Math.random() * 3000);
        balance = Math.floor(lifetime * (0.3 + Math.random() * 0.5));
      } else if (rand > 0.55) {
        tier = 'SILVER';
        lifetime = 500 + Math.floor(Math.random() * 950);
        balance = Math.floor(lifetime * (0.4 + Math.random() * 0.5));
      }

      const memberId = crypto.randomUUID();
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 180 * 86400000)).toISOString();

      db.prepare(`
        INSERT INTO members (id, phone_number, name, email, current_balance, lifetime_points, tier, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memberId,
        phone,
        name,
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        balance,
        lifetime,
        tier,
        createdAt,
        createdAt
      );

      db.prepare(`
        INSERT INTO loyalty_transactions (id, member_id, type, points, balance_after, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        memberId,
        'EARN',
        balance,
        balance,
        JSON.stringify({ note: 'Seeded membership opening' }),
        createdAt
      );
    }
  });

  generateBulk();

  console.log(`✅ Seeding complete! Database initialized with menu items, rewards, and ${memberCount + curatedMembers.length} members.`);
}

if (process.argv[1]?.endsWith('seed.ts')) {
  const count = parseInt(process.argv[2] || '1000', 10);
  getDatabase().then(async (db) => {
    await seedDatabase(db, count);
    db.save();
    console.log('Saved to disk.');
    process.exit(0);
  }).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
