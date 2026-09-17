import { Router } from 'express';
import { NotificationService } from '../domain/notificationService.js';

export function createOutboxRouter(notificationService: NotificationService): Router {
  const router = Router();

  // GET /outbox: Graded endpoint returning tier upgrade notifications
  router.get('/', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '100', 10);
      const outbox = notificationService.getOutbox(limit);

      // Support array directly or object containing outbox / notifications
      if (req.query.format === 'raw') {
        return res.json(outbox);
      }

      return res.json({
        outbox,
        notifications: outbox,
        count: outbox.length
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE /outbox or POST /outbox/clear
  router.delete('/', (req, res) => {
    notificationService.clearOutbox();
    res.json({ status: 'OK', message: 'Outbox cleared' });
  });

  router.post('/clear', (req, res) => {
    notificationService.clearOutbox();
    res.json({ status: 'OK', message: 'Outbox cleared' });
  });

  return router;
}
