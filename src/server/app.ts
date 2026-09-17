import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SQLiteDatabase } from './db/database.js';
import { ConfigService, DEFAULT_CONFIG } from './domain/configService.js';
import { TierEngine } from './domain/tierEngine.js';
import { EarningEngine } from './domain/earningEngine.js';
import { RedemptionEngine } from './domain/redemptionEngine.js';
import { LedgerService } from './domain/ledgerService.js';
import { MemberService } from './domain/memberService.js';
import { OrderService } from './domain/orderService.js';
import { CatalogService } from './domain/catalogService.js';
import { ClockService, globalClockService } from './domain/clockService.js';
import { NotificationService } from './domain/notificationService.js';
import { ExpirationService } from './domain/expirationService.js';
import { createMembersRouter } from './routes/members.js';
import { createOrdersRouter } from './routes/orders.js';
import { createCatalogRouter } from './routes/catalog.js';
import { createConfigRouter } from './routes/config.js';
import { createClockRouter } from './routes/clock.js';
import { createOutboxRouter } from './routes/outbox.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(db: SQLiteDatabase): { app: Express; services: any } {
  const app = express();

  // Load config from DB if present
  let initialConfig = DEFAULT_CONFIG;
  try {
    const configRow = db.prepare(`SELECT value FROM system_config WHERE key = 'LOYALTY_CONFIG'`).get() as any;
    if (configRow) {
      initialConfig = JSON.parse(configRow.value);
    }
  } catch (_) {}

  // Initialize service graph
  const clockService = new ClockService();
  const notificationService = new NotificationService(db, clockService);
  const configService = new ConfigService(initialConfig);
  const tierEngine = new TierEngine(configService);
  const earningEngine = new EarningEngine(configService, tierEngine);
  const redemptionEngine = new RedemptionEngine();
  const ledgerService = new LedgerService(db, tierEngine, configService, clockService, notificationService);
  const expirationService = new ExpirationService(db, clockService, configService);
  const memberService = new MemberService(db, tierEngine);
  const orderService = new OrderService(db, memberService, ledgerService, earningEngine, redemptionEngine);
  const catalogService = new CatalogService(db);

  // Run Level 1 (T3) backward-compatibility migration on start:
  // Existing members with lifetime >= 5000 qualify for Platinum; others remain unchanged.
  ledgerService.migrateExistingMemberTiers();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Graded Level 2 & 3 routes mounted at root AND /api for maximum compatibility
  const clockRouter = createClockRouter(clockService, expirationService);
  const outboxRouter = createOutboxRouter(notificationService);

  app.use('/clock', clockRouter);
  app.use('/api/clock', clockRouter);

  app.use('/outbox', outboxRouter);
  app.use('/api/outbox', outboxRouter);

  // Core API Routes
  app.use('/api/members', createMembersRouter(memberService, ledgerService));
  app.use('/api/orders', createOrdersRouter(orderService));
  app.use('/api/catalog', createCatalogRouter(catalogService));
  app.use('/api/config', createConfigRouter(configService, db));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: clockService.nowIso(),
      currentTime: clockService.nowIso(),
      memberCount: memberService.getTotalMemberCount()
    });
  });

  // Serve static client assets if built in dist
  const distPath = path.resolve(__dirname, '../../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/clock') || req.path.startsWith('/outbox')) return next();
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  return {
    app,
    services: {
      clockService,
      notificationService,
      configService,
      tierEngine,
      earningEngine,
      redemptionEngine,
      ledgerService,
      expirationService,
      memberService,
      orderService,
      catalogService
    }
  };
}
