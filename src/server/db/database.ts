import initSqlJs, { Database as SqlJsDatabase, Statement } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_FILE_PATH = path.resolve(DATA_DIR, 'cafe_loyalty.sqlite');

export interface PreparedStatement {
  get(...params: any[]): any;
  all(...params: any[]): any[];
  run(...params: any[]): { changes: number };
}

export class SQLiteDatabase {
  private db: SqlJsDatabase;
  private filePath?: string;
  private autoSave: boolean;
  private inTransaction: boolean = false;

  constructor(db: SqlJsDatabase, filePath?: string, autoSave = true) {
    this.db = db;
    this.filePath = filePath;
    this.autoSave = autoSave;
  }

  public getRawDb(): SqlJsDatabase {
    return this.db;
  }

  public exec(sql: string): void {
    this.db.exec(sql);
    this.persist();
  }

  public prepare(sql: string): PreparedStatement {
    const rawDb = this.db;
    const persistFn = () => this.persist();

    return {
      get(...params: any[]): any {
        const stmt = rawDb.prepare(sql);
        try {
          const bound = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          stmt.bind(bound);
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },
      all(...params: any[]): any[] {
        const stmt = rawDb.prepare(sql);
        const results: any[] = [];
        try {
          const bound = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          stmt.bind(bound);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      },
      run(...params: any[]): { changes: number } {
        const bound = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        rawDb.run(sql, bound);
        const changes = rawDb.getRowsModified();
        persistFn();
        return { changes };
      }
    };
  }

  public transaction<T>(fn: () => T): () => T {
    return () => {
      if (this.inTransaction) {
        return fn();
      }
      this.inTransaction = true;
      this.db.exec('BEGIN TRANSACTION;');
      try {
        const result = fn();
        this.db.exec('COMMIT;');
        this.inTransaction = false;
        this.persist();
        return result;
      } catch (error) {
        try {
          this.db.exec('ROLLBACK;');
        } catch (_) {}
        this.inTransaction = false;
        throw error;
      }
    };
  }

  public persist(): void {
    if (!this.autoSave || this.inTransaction || !this.filePath) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.filePath, buffer);
    } catch (e) {
      console.error('Failed to persist database to disk:', e);
    }
  }

  public save(): void {
    if (!this.filePath) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.filePath, buffer);
  }
}

let dbInstance: SQLiteDatabase | null = null;

export async function getDatabase(filePath: string = DB_FILE_PATH, isMemory = false): Promise<SQLiteDatabase> {
  if (dbInstance && !isMemory) {
    return dbInstance;
  }

  const SQL = await initSqlJs();
  let sqlDb: SqlJsDatabase;

  if (!isMemory && fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  const db = new SQLiteDatabase(sqlDb, isMemory ? undefined : filePath, !isMemory);
  initializeSchema(db);

  if (!isMemory) {
    dbInstance = db;
  }
  return db;
}

export function initializeSchema(db: SQLiteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      current_balance INTEGER NOT NULL DEFAULT 0,
      lifetime_points INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'BRONZE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone_number);
    CREATE INDEX IF NOT EXISTS idx_members_tier ON members(tier);
    CREATE INDEX IF NOT EXISTS idx_members_lifetime_pts ON members(lifetime_points);

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      type TEXT NOT NULL,
      points INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_trans_member_id ON loyalty_transactions(member_id);
    CREATE INDEX IF NOT EXISTS idx_trans_created_at ON loyalty_transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_trans_type ON loyalty_transactions(type);

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      recipient TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'TIER_UPGRADE',
      previous_tier TEXT NOT NULL,
      new_tier TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_member ON outbox(member_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_created ON outbox(created_at);

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT,
      is_reward_eligible INTEGER NOT NULL DEFAULT 1,
      reward_points_cost INTEGER
    );

    CREATE TABLE IF NOT EXISTS reward_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      points_cost INTEGER NOT NULL,
      dollar_value REAL NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      member_id TEXT,
      gross_amount REAL NOT NULL,
      redeemed_value REAL NOT NULL DEFAULT 0,
      net_paid_amount REAL NOT NULL,
      points_earned INTEGER NOT NULL DEFAULT 0,
      points_redeemed INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'CARD',
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TEXT NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      is_redemption INTEGER NOT NULL DEFAULT 0,
      points_cost INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
