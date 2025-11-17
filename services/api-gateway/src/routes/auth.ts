import { Router, Request, Response } from 'express';
import { forwardRequest } from '../utils/forwardRequest';

const router = Router();

// Forward all auth requests to auth service
router.post('/register', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('auth-service', 3001, 'POST', '/register', req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to register' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('auth-service', 3001, 'POST', '/login', req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to login' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest('auth-service', 3001, 'POST', '/refresh', req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to refresh token' });
  }
});

export { router as authRoutes };
