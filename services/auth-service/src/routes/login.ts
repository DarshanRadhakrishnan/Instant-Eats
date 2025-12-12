/**
 * Login Route - Handles user authentication with dual token system
 * Features:
 * - Failed login attempt tracking with account locking
 * - Dual token system (access + refresh)
 * - Device tracking
 * - Login history logging
 * - Account status verification
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { TokenService } from '../services/tokenService';
import { getPrismaClient } from '../services/prismaService';
import { TOKEN_CONFIG } from '../config/tokens';

interface LoginRequest {
  email: string;
  password: string;
  city: string;
  deviceName?: string;
}

export async function loginRoute(req: Request, res: Response) {
  try {
    const { email, password, city, deviceName }: LoginRequest = req.body;

    // Input validation
    if (!email || !password || !city) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and city are required'
      });
    }

    const prisma = getPrismaClient(city);

    // Extract device info
    const deviceInfo = {
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: (req.headers['user-agent'] as string) || 'Unknown',
      deviceName: deviceName || undefined
    };

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Log failed attempt if user doesn't exist
    if (!user) {
      await prisma.loginHistory.create({
        data: {
          email,
          success: false,
          failureReason: 'invalid_email',
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          timestamp: new Date()
        }
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          email,
          success: false,
          failureReason: 'account_locked',
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          timestamp: new Date()
        }
      });

      const minutesRemaining = Math.ceil(
        (user.accountLockedUntil.getTime() - Date.now()) / (1000 * 60)
      );

      return res.status(423).json({
        success: false,
        error:
          'Account temporarily locked due to multiple failed login attempts',
        lockedUntil: user.accountLockedUntil,
        minutesRemaining
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          ...(shouldLock && {
            accountLockedUntil: new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          })
        }
      });

      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          email,
          success: false,
          failureReason: 'invalid_password',
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          timestamp: new Date()
        }
      });

      return res.status(401).json({
        success: false,
        error: shouldLock
          ? 'Too many failed attempts. Account locked for 15 minutes.'
          : `Invalid credentials. ${5 - failedAttempts} attempts remaining.`,
        attemptsRemaining: shouldLock ? 0 : 5 - failedAttempts
      });
    }

    // Check account status
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Account suspended. Please contact support.'
      });
    }

    if (
      user.accountStatus === 'pending' &&
      user.role !== 'customer'
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Account pending verification. You will be notified once approved.'
      });
    }

    // ✅ Successful login - reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLogin: new Date(),
        lastLoginIp: deviceInfo.ipAddress
      }
    });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      city: user.city
    };

    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const refreshToken = await TokenService.generateRefreshToken(
      tokenPayload,
      deviceInfo
    );

    // Log successful login
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        email,
        success: true,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        timestamp: new Date()
      }
    });

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (will be different for each role)
      path: '/auth' // Only sent to /auth/* endpoints
    });

    // Send response with access token in body
    const accessTokenConfig =
      TOKEN_CONFIG.ACCESS_TOKEN[
        user.role as keyof typeof TOKEN_CONFIG.ACCESS_TOKEN
      ];

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountStatus: user.accountStatus,
        accessToken, // Store in memory (React state)
        expiresIn: accessTokenConfig.expiresIn,
        refreshToken // For testing only - normally use HttpOnly cookie
      }
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
