import { Router, Request, Response } from 'express';
import { forwardRequest } from '../utils/forwardRequest';

const router = Router();

// Forward all delivery requests to delivery service
router.get('/assignments', async (req: Request, res: Response) => {
  try {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await forwardRequest('delivery-service', 3004, 'GET', `/assignments?${query}`, null);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

router.patch('/:id/location', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('delivery-service', 3004, 'PATCH', `/${req.params.id}/location`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update location' });
  }
});

router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('delivery-service', 3004, 'POST', `/${req.params.id}/accept`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to accept delivery' });
  }
});

export { router as deliveryRoutes };
