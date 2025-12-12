/**
 * Logout Routes - Handles single device and all devices logout
 * Features:
 * - Logout from current device (revoke one refresh token)
 * - Logout from all devices (revoke all refresh tokens)
 * - View active sessions
 * - Revoke specific sessions
 */

import { Router, Request, Response } from 'express';
import { TokenService } from '../services/tokenService';
import { authenticateJWT } from '../middleware/auth';
import { getPrismaClient } from '../services/prismaService';

const router = Router();

/**
 * POST /logout - Logout from current device
 */
router.post('/logout', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const city = (req as any).user.city;

    if (refreshToken) {
      await TokenService.revokeRefreshToken(refreshToken, city, 'user_logout');
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Logout failed'
    });
  }
});

/**
 * POST /logout-all - Logout from all devices
 */
router.post(
  '/logout-all',
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const city = (req as any).user.city;

      await TokenService.revokeAllUserTokens(userId, city);

      res.json({
        success: true,
        message: 'Logged out from all devices'
      });
    } catch (error: any) {
      console.error('❌ Logout all error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Logout failed'
      });
    }
  }
);

/**
 * GET /sessions - Get active sessions for current user
 */
router.get('/sessions', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const city = (req as any).user.city;
    const prisma = getPrismaClient(city);

    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true
      },
      orderBy: { lastUsedAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        activeSessions: sessions.length,
        sessions
      }
    });
  } catch (error: any) {
    console.error('❌ Sessions fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sessions'
    });
  }
});

/**
 * DELETE /sessions/:sessionId - Revoke specific session
 */
router.delete(
  '/sessions/:sessionId',
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user.userId;
      const city = (req as any).user.city;
      const prisma = getPrismaClient(city);

      // Verify user can only revoke their own sessions
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          id: sessionId,
          userId
        }
      });

      if (!tokenRecord) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      await prisma.refreshToken.update({
        where: { id: sessionId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'user_revoked'
        }
      });

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error: any) {
      console.error('❌ Session revoke error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to revoke session'
      });
    }
  }
);

export { router as logoutRouter };
