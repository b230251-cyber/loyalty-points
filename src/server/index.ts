import { getDatabase } from './db/database.js';
import { createApp } from './app.js';
import { seedDatabase } from './db/seed.js';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const db = await getDatabase();
    
    // Auto-seed if database is empty
    const memberCount = db.prepare(`SELECT COUNT(*) as count FROM members`).get() as any;
    if (!memberCount || Number(memberCount.count) === 0) {
      console.log('Database is empty, running initial seed...');
      await seedDatabase(db, 1000);
      db.save();
    }

    const { app } = createApp(db);

    app.listen(PORT, () => {
      console.log(`☕ Cafe Rewards Counter Server listening at http://localhost:${PORT}`);
      console.log(`📊 API ready: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
