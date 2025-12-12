/**
 * Token Refresh Route - Allows clients to refresh access tokens using refresh tokens
 * Used when access token expires (15m-2h depending on role)
 * Refresh token stored in HttpOnly cookie, never expires until revoked
 */

import { Router, Request, Response } from 'express';
import { TokenService } from '../services/tokenService';
import { TOKEN_CONFIG } from '../config/tokens';

const router = Router();

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken, city } = req.body;

    // Validate input
    if (!refreshToken || !city) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token and city are required'
      });
    }

    // Verify refresh token
    const payload = await TokenService.verifyRefreshToken(refreshToken, city);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    // Generate new access token
    const newAccessToken = TokenService.generateAccessToken(payload);

    const accessTokenConfig =
      TOKEN_CONFIG.ACCESS_TOKEN[
        payload.role as keyof typeof TOKEN_CONFIG.ACCESS_TOKEN
      ];

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: accessTokenConfig.expiresIn
      }
    });
  } catch (error: any) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Token refresh failed'
    });
  }
});

export { router as refreshRouter };
