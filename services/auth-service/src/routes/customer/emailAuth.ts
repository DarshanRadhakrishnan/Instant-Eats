/**
 * Customer Email/Password Authentication
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../../services/prismaService';
import { AuthRequest } from '../../middleware/auth';

const router = Router();

/**
 * Register Customer with Email/Password
 * POST /auth/customer/register
 */
router.post('/customer/register', async (req: AuthRequest, res: Response) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      phoneNumber,
      city
    } = req.body;
    
    // Validation
    if (!email || !password || !confirmPassword || !firstName || !city) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, firstName, and city are required'
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    const prisma = getPrismaClient(city);
    
    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create customer
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || '',
        phoneNumber: phoneNumber || null,
        role: 'customer',
        city,
        authProvider: 'local',
        emailVerified: false, // Should send verification email
        accountStatus: 'active' // Customers are immediately active
      }
    });
    
    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        city: user.city,
        accountStatus: user.accountStatus
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    // TODO: Send verification email
    
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        token
      }
    });
    
  } catch (error: any) {
    console.error('Customer registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Customer Login
 * POST /auth/customer/login
 */
router.post('/customer/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, city } = req.body;
    
    if (!email || !password || !city) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and city are required'
      });
    }
    
    const prisma = getPrismaClient(city);
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || user.role !== 'customer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Your account is ${user.accountStatus}`,
        accountStatus: user.accountStatus
      });
    }
    
    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        city: user.city,
        accountStatus: user.accountStatus
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        token
      }
    });
    
  } catch (error: any) {
    console.error('Customer login error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as customerEmailAuthRouter };
