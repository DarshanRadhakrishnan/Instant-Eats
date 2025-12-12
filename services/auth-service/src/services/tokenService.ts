/**
 * Token Service - Handles JWT generation, verification, and refresh token management
 * Implements dual token system: short-lived access tokens + long-lived refresh tokens
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TOKEN_CONFIG, JWT_SECRETS } from '../config/tokens';
import { getPrismaClient } from './prismaService';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  city: string;
}

export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceName?: string;
}

export class TokenService {
  /**
   * Generate Access Token (short-lived, stateless)
   * @param payload - Token payload (userId, email, role, city)
   * @returns JWT access token
   */
  static generateAccessToken(payload: TokenPayload): string {
    const config =
      TOKEN_CONFIG.ACCESS_TOKEN[
        payload.role as keyof typeof TOKEN_CONFIG.ACCESS_TOKEN
      ];

    if (!config) {
      throw new Error(`Invalid role: ${payload.role}`);
    }

    return jwt.sign(
      {
        ...payload,
        type: 'access',
        tokenId: crypto.randomBytes(16).toString('hex') // Unique token ID
      },
      JWT_SECRETS.ACCESS_TOKEN_SECRET,
      {
        expiresIn: config.expiresIn,
        issuer: 'instant-eats',
        audience: payload.role
      }
    );
  }

  /**
   * Generate Refresh Token (long-lived, stored in database)
   * Automatically revokes oldest token if max sessions exceeded
   * @param payload - Token payload
   * @param deviceInfo - Device information (IP, user agent, device name)
   * @returns Plain refresh token (to be sent to client)
   */
  static async generateRefreshToken(
    payload: TokenPayload,
    deviceInfo: DeviceInfo
  ): Promise<string> {
    const config =
      TOKEN_CONFIG.REFRESH_TOKEN[
        payload.role as keyof typeof TOKEN_CONFIG.REFRESH_TOKEN
      ];

    if (!config) {
      throw new Error(`Invalid role: ${payload.role}`);
    }

    // Generate random token
    const tokenString = crypto.randomBytes(64).toString('hex');

    // Hash token before storing (never store plain tokens in DB)
    const hashedToken = crypto
      .createHash('sha256')
      .update(tokenString)
      .digest('hex');

    // Calculate expiry date
    const expiresAt = new Date();
    const expiryMatch = config.expiresIn.match(/(\d+)([dhm])/);
    if (expiryMatch) {
      const [, value, unit] = expiryMatch;
      const numValue = parseInt(value);
      if (unit === 'd') {
        expiresAt.setDate(expiresAt.getDate() + numValue);
      } else if (unit === 'h') {
        expiresAt.setHours(expiresAt.getHours() + numValue);
      } else if (unit === 'm') {
        expiresAt.setMinutes(expiresAt.getMinutes() + numValue);
      }
    }

    const prisma = getPrismaClient(payload.city);

    // Check session limit
    const existingTokens = await prisma.refreshToken.count({
      where: {
        userId: payload.userId,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      }
    });

    const maxSessions =
      TOKEN_CONFIG.MAX_SESSIONS[
        payload.role as keyof typeof TOKEN_CONFIG.MAX_SESSIONS
      ];

    // Revoke oldest token if max sessions exceeded
    if (existingTokens >= maxSessions) {
      const oldestToken = await prisma.refreshToken.findFirst({
        where: {
          userId: payload.userId,
          isRevoked: false
        },
        orderBy: { createdAt: 'asc' }
      });

      if (oldestToken) {
        await prisma.refreshToken.update({
          where: { id: oldestToken.id },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'max_sessions_exceeded'
          }
        });
      }
    }

    // Store hashed token in database
    await prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        token: hashedToken,
        deviceInfo:
          deviceInfo.deviceName || deviceInfo.userAgent || 'Unknown Device',
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        expiresAt
      }
    });

    // Return plain token to client (only time it's visible)
    return tokenString;
  }

  /**
   * Verify Access Token
   * @param token - JWT access token to verify
   * @returns Token payload if valid, null if invalid/expired
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRETS.ACCESS_TOKEN_SECRET) as any;

      if (decoded.type !== 'access') {
        return null;
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        city: decoded.city
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify Refresh Token
   * @param token - Plain refresh token (as sent by client)
   * @param city - User's city (for shard selection)
   * @returns Token payload if valid, null if invalid/expired/revoked
   */
  static async verifyRefreshToken(
    token: string,
    city: string
  ): Promise<TokenPayload | null> {
    try {
      // Hash the provided token (to match DB storage)
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const prisma = getPrismaClient(city);

      // Find token in database
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: hashedToken },
        include: { user: true }
      });

      if (!refreshToken) {
        return null;
      }

      // Check if revoked
      if (refreshToken.isRevoked) {
        return null;
      }

      // Check if expired
      if (refreshToken.expiresAt < new Date()) {
        // Auto-revoke expired token
        await prisma.refreshToken.update({
          where: { id: refreshToken.id },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'expired'
          }
        });
        return null;
      }

      // Update last used timestamp
      await prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: { lastUsedAt: new Date() }
      });

      return {
        userId: refreshToken.user.id,
        email: refreshToken.user.email,
        role: refreshToken.user.role,
        city: refreshToken.user.city
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke Single Refresh Token (logout from one device)
   * @param token - Plain refresh token to revoke
   * @param city - User's city (for shard selection)
   * @param reason - Reason for revocation
   * @returns true if successful
   */
  static async revokeRefreshToken(
    token: string,
    city: string,
    reason: string = 'user_logout'
  ): Promise<boolean> {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const prisma = getPrismaClient(city);

      await prisma.refreshToken.update({
        where: { token: hashedToken },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: reason
        }
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke All User Tokens (logout from all devices)
   * @param userId - User ID
   * @param city - User's city (for shard selection)
   */
  static async revokeAllUserTokens(
    userId: string,
    city: string
  ): Promise<void> {
    const prisma = getPrismaClient(city);

    await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'logout_all_devices'
      }
    });
  }

  /**
   * Generate Password Reset Token
   * @param email - User email
   * @returns JWT password reset token
   */
  static generatePasswordResetToken(email: string): string {
    return jwt.sign(
      { email, type: 'password_reset' },
      JWT_SECRETS.PASSWORD_RESET_SECRET,
      { expiresIn: TOKEN_CONFIG.PASSWORD_RESET.expiresIn }
    );
  }

  /**
   * Generate Email Verification Token
   * @param userId - User ID
   * @param email - User email
   * @returns JWT email verification token
   */
  static generateEmailVerificationToken(
    userId: string,
    email: string
  ): string {
    return jwt.sign(
      { userId, email, type: 'email_verification' },
      JWT_SECRETS.EMAIL_VERIFICATION_SECRET,
      { expiresIn: TOKEN_CONFIG.EMAIL_VERIFICATION.expiresIn }
    );
  }
}
