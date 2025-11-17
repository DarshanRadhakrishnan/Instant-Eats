import { Router, Request, Response } from 'express';
import { forwardRequest } from '../utils/forwardRequest';

const router = Router();

// Forward all restaurant requests to restaurant service
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await forwardRequest('restaurant-service', 3003, 'GET', `/?${query}`, null);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurants' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('restaurant-service', 3003, 'GET', `/${req.params.id}`, null);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant' });
  }
});

router.get('/:id/menu', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('restaurant-service', 3003, 'GET', `/${req.params.id}/menu`, null);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch menu' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('restaurant-service', 3003, 'POST', '/', req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create restaurant' });
  }
});

export { router as restaurantRoutes };
