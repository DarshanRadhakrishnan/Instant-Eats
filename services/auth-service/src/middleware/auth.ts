/**
 * JWT Authentication Middleware
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
    city: string;
    accountStatus: string;
  };
}

/**
 * Verify JWT token from Authorization header
 */
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      city: decoded.city,
      accountStatus: decoded.accountStatus
    };
    
    next();
  } catch (error: any) {
    console.error('JWT verification error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

/**
 * Verify user role
 */
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    next();
  };
};

/**
 * Verify account status
 */
export const requireActiveAccount = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user.accountStatus !== 'active') {
    return res.status(403).json({
      success: false,
      error: `Your account is ${req.user.accountStatus}. Please complete the verification process.`,
      accountStatus: req.user.accountStatus
    });
  }
  next();
};
