import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../services/prismaService';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'customer' | 'restaurant' | 'delivery_partner';
  city: string;
}

export async function registerRoute(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, phoneNumber, role, city }: RegisterRequest = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !role || !city) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Get appropriate prisma client based on city
    const prisma = getPrismaClient(city);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        role,
        city,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
}
