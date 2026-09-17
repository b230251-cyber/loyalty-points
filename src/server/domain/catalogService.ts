import { SQLiteDatabase } from '../db/database.js';
import { MenuItem, RewardItem } from './models.js';
import crypto from 'crypto';

export class CatalogService {
  constructor(private db: SQLiteDatabase) {}

  public setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  public getMenuItems(): MenuItem[] {
    const rows = this.db.prepare(`SELECT * FROM menu_items ORDER BY category, name`).all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: Number(r.price),
      imageUrl: r.image_url || undefined,
      isRewardEligible: Boolean(r.is_reward_eligible),
      rewardPointsCost: r.reward_points_cost ? Number(r.reward_points_cost) : undefined
    }));
  }

  public getRewardItems(): RewardItem[] {
    const rows = this.db.prepare(`SELECT * FROM reward_items WHERE is_active = 1 ORDER BY points_cost ASC`).all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      pointsCost: Number(r.points_cost),
      dollarValue: Number(r.dollar_value),
      description: r.description,
      imageUrl: r.image_url || undefined,
      isActive: Boolean(r.is_active)
    }));
  }

  public addMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
    const id = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO menu_items (id, name, category, price, image_url, is_reward_eligible, reward_points_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      item.name,
      item.category,
      item.price,
      item.imageUrl || null,
      item.isRewardEligible ? 1 : 0,
      item.rewardPointsCost || null
    );

    return { id, ...item };
  }

  public addRewardItem(item: Omit<RewardItem, 'id'>): RewardItem {
    const id = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO reward_items (id, name, category, points_cost, dollar_value, description, image_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      item.name,
      item.category,
      item.pointsCost,
      item.dollarValue,
      item.description,
      item.imageUrl || null,
      item.isActive ? 1 : 0
    );

    return { id, ...item };
  }
}
