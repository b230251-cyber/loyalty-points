import { Router } from 'express';
import { OrderService } from '../domain/orderService.js';
import { CheckoutRequest } from '../domain/models.js';

export function createOrdersRouter(orderService: OrderService): Router {
  const router = Router();

  // Process counter checkout
  router.post('/checkout', (req, res) => {
    try {
      const checkoutRequest: CheckoutRequest = req.body;
      const result = orderService.checkout(checkoutRequest);
      return res.status(200).json({ result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Get recent counter orders
  router.get('/recent', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '20', 10);
      const orders = orderService.getRecentOrders(limit);
      return res.json({ orders });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
