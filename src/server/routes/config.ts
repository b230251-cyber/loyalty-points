import { Router } from 'express';
import { ConfigService } from '../domain/configService.js';
import { SQLiteDatabase } from '../db/database.js';

export function createConfigRouter(configService: ConfigService, db: SQLiteDatabase): Router {
  const router = Router();

  // Get current loyalty program configuration
  router.get('/', (req, res) => {
    try {
      const config = configService.getConfig();
      return res.json({ config });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Update loyalty program configuration (rate, tiers, multipliers)
  router.put('/', (req, res) => {
    try {
      const updated = configService.updateConfig(req.body);
      
      // Persist in system_config table
      db.prepare(`
        INSERT OR REPLACE INTO system_config (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('LOYALTY_CONFIG', JSON.stringify(updated), new Date().toISOString());

      return res.json({ config: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  return router;
}
