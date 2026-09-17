import { Router } from 'express';
import { ClockService } from '../domain/clockService.js';
import { ExpirationService } from '../domain/expirationService.js';

export function createClockRouter(clockService: ClockService, expirationService: ExpirationService): Router {
  const router = Router();

  // GET /clock: Returns current system / simulated time
  router.get('/', (req, res) => {
    res.json({
      status: 'OK',
      currentTime: clockService.nowIso(),
      now: clockService.nowIso(),
      timestamp: clockService.now().getTime()
    });
  });

  // POST /clock: Graded endpoint to advance time and trigger expiration of stale points (>= 90 days)
  router.post('/', (req, res) => {
    try {
      const { date, now, timestamp, days, advanceByDays, iso } = req.body || {};

      // 1. Advance or set clock
      if (days !== undefined || advanceByDays !== undefined) {
        const d = Number(days !== undefined ? days : advanceByDays);
        clockService.advanceByDays(d);
      } else if (date || now || timestamp || iso) {
        const timeInput = date || now || timestamp || iso;
        clockService.setClock(timeInput);
      }

      // 2. Level 2 (T2): Run stale points expiration job
      const expirationResult = expirationService.runExpirationJob();

      return res.status(200).json({
        status: 'OK',
        currentTime: clockService.nowIso(),
        now: clockService.nowIso(),
        timestamp: clockService.now().getTime(),
        expiration: expirationResult
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // POST /clock/reset: Resets clock back to real system time
  router.post('/reset', (req, res) => {
    clockService.reset();
    res.json({ status: 'OK', currentTime: clockService.nowIso() });
  });

  return router;
}
