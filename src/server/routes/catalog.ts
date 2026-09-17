import { Router } from 'express';
import { CatalogService } from '../domain/catalogService.js';

export function createCatalogRouter(catalogService: CatalogService): Router {
  const router = Router();

  // Get all menu items
  router.get('/menu', (req, res) => {
    try {
      const items = catalogService.getMenuItems();
      return res.json({ items });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get all active rewards
  router.get('/rewards', (req, res) => {
    try {
      const rewards = catalogService.getRewardItems();
      return res.json({ rewards });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
