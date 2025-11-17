import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface RefreshRequest {
  token: string;
}

export async function refreshRoute(req: Request, res: Response) {
  try {
    const { token }: RefreshRequest = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    // Verify existing token
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key',
      { ignoreExpiration: true }
    );

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        city: decoded.city,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token: newToken },
    });
  } catch (error: any) {
    console.error('Refresh error:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Token refresh failed',
    });
  }
}
