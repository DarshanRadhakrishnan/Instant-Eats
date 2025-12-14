import { Router, Request, Response } from 'express';
import { forwardRequest } from '../utils/forwardRequest';

const router = Router();

// Forward all order requests to order service
router.post('/', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('order-service', 3002, 'POST', '/', req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('order-service', 3002, 'GET', `/${req.params.id}`, null, '');
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await forwardRequest('order-service', 3002, 'GET', '/', null, query);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('order-service', 3002, 'PATCH', `/${req.params.id}/status`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

export { router as orderRoutes };
