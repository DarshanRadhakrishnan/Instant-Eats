/**
 * Customer Google OAuth Authentication
 */

import { Router, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../../services/prismaService';
import { AuthRequest } from '../../middleware/auth';

const router = Router();

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Step 1: Initiate Google OAuth Flow
 * GET /auth/customer/google
 */
router.get('/customer/google', (req: AuthRequest, res: Response) => {
  try {
    const city = (req.query.city as string) || 'default';
    
    const authUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: JSON.stringify({
        city,
        role: 'customer'
      })
    });
    
    res.json({
      success: true,
      message: 'Google OAuth URL generated',
      authUrl
    });
  } catch (error: any) {
    console.error('Google OAuth init error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Step 2: Handle Google OAuth Callback
 * GET /auth/customer/google/callback
 */
router.get('/customer/google/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=No authorization code`);
    }
    
    const stateData = JSON.parse(state as string);
    const city = stateData.city;
    
    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code as string);
    
    if (!tokens.id_token) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=No ID token`);
    }
    
    // Verify ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    if (!payload?.email_verified) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?message=Email not verified by Google`
      );
    }
    
    const prisma = getPrismaClient(city);
    
    // Check if user exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: payload.email },
          { googleId: payload.sub }
        ]
      }
    });
    
    const isNewUser = !user;
    
    if (!user) {
      // Create new customer account
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: payload.email!,
          password: '', // No password for OAuth
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          phoneNumber: null,
          role: 'customer',
          city,
          googleId: payload.sub,
          authProvider: 'google',
          profilePicture: payload.picture,
          emailVerified: true,
          accountStatus: 'active' // Customers are immediately active
        }
      });
    } else if (!user.googleId) {
      // Link existing account to Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.sub,
          profilePicture: payload.picture || user.profilePicture,
          emailVerified: true
        }
      });
    }
    
    // Generate JWT
    const jwtToken = jwt.sign(
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
    
    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${jwtToken}&newUser=${isNewUser}&firstName=${user.firstName}`;
    res.redirect(redirectUrl);
    
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    const errorUrl = `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
});

export { router as customerGoogleAuthRouter };
