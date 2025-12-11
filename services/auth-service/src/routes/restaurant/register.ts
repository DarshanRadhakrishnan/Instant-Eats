/**
 * Restaurant Owner Registration - Complete Multi-Step Process
 * Step 1: Basic Account Creation
 * Step 2: Business Information
 * Step 3: Document Upload
 * Step 4: Bank Details
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../../services/prismaService';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { encryptData } from '../../services/encryptionService';
import { uploadFile, validateFileType, validateFileSize } from '../../services/fileUpload';

const router = Router();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF allowed.'));
    }
  }
});

// ==================== STEP 1: Basic Account ====================
/**
 * Step 1: Restaurant Owner Account Creation
 * POST /auth/restaurant/register/step1
 */
router.post('/restaurant/register/step1', async (req: AuthRequest, res: Response) => {
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
    if (!email || !password || !confirmPassword || !firstName || !phoneNumber || !city) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
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
    
    // Validate phone number format (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
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
    
    // Create restaurant owner account
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || '',
        phoneNumber,
        role: 'restaurant_owner',
        city,
        authProvider: 'local',
        emailVerified: false,
        accountStatus: 'pending' // NOT active until verification
      }
    });
    
    // Generate JWT (30-day expiry for multi-step process)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        city: user.city,
        accountStatus: user.accountStatus
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Account created. Please complete business registration.',
      data: {
        userId: user.id,
        email: user.email,
        token,
        nextStep: 'business_information'
      }
    });
    
  } catch (error: any) {
    console.error('Restaurant registration step 1 error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== STEP 2: Business Information ====================
/**
 * Step 2: Business Information
 * POST /auth/restaurant/register/step2
 */
router.post('/restaurant/register/step2', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const {
      restaurantName,
      businessType,
      cuisine,
      description,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      businessPhone,
      businessEmail,
      openingTime,
      closingTime,
      workingDays,
      ownerName,
      ownerPhone,
      ownerEmail,
      ownerAadhar
    } = req.body;
    
    // Validation
    if (!restaurantName || !businessType || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing'
      });
    }
    
    // Validate Aadhar format (12 digits)
    if (ownerAadhar && !/^\d{12}$/.test(ownerAadhar)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Aadhar number format (must be 12 digits)'
      });
    }
    
    // Validate pincode
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pincode format (must be 6 digits)'
      });
    }
    
    const prisma = getPrismaClient(city);
    
    // Check if profile already exists
    const existing = await prisma.restaurantProfile.findUnique({
      where: { userId }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Business profile already exists'
      });
    }
    
    // Create restaurant profile
    const profile = await prisma.restaurantProfile.create({
      data: {
        id: uuidv4(),
        userId,
        restaurantName,
        businessType,
        cuisine: cuisine || [],
        description,
        address,
        city,
        state,
        pincode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        businessPhone,
        businessEmail: businessEmail || req.user.email,
        openingTime,
        closingTime,
        workingDays: workingDays || [],
        ownerName,
        ownerPhone,
        ownerEmail,
        ownerAadhar: ownerAadhar ? encryptData(ownerAadhar) : null,
        verificationStatus: 'pending'
      }
    });
    
    res.json({
      success: true,
      message: 'Business information saved',
      data: {
        profileId: profile.id,
        nextStep: 'document_upload'
      }
    });
    
  } catch (error: any) {
    console.error('Restaurant registration step 2 error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== STEP 3: Document Upload ====================
/**
 * Step 3: Upload Documents (FSSAI, GST, PAN, etc.)
 * POST /auth/restaurant/register/step3
 */
router.post(
  '/restaurant/register/step3',
  authenticateJWT,
  upload.fields([
    { name: 'fssaiLicense', maxCount: 1 },
    { name: 'gstCertificate', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'shopEstablishment', maxCount: 1 },
    { name: 'restaurantImages', maxCount: 5 }
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.userId;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const {
        fssaiNumber,
        fssaiExpiry,
        gstNumber
      } = req.body;
      
      // Validation
      if (!fssaiNumber || !files?.['fssaiLicense']) {
        return res.status(400).json({
          success: false,
          error: 'FSSAI license number and certificate are required'
        });
      }
      
      // Validate FSSAI number (14 digits)
      if (!/^\d{14}$/.test(fssaiNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid FSSAI number format (must be 14 digits)'
        });
      }
      
      const prisma = getPrismaClient(req.user.city);
      
      // Upload files
      const fileUrls: any = {};
      
      for (const [fieldname, fileArray] of Object.entries(files || {})) {
        if (fieldname === 'restaurantImages') {
          fileUrls[fieldname] = [];
          for (const file of fileArray) {
            if (validateFileSize(file, 5)) {
              const url = await uploadFile(file, `restaurants/${userId}/images/`);
              fileUrls[fieldname].push(url);
            }
          }
        } else {
          const file = fileArray[0];
          if (validateFileSize(file, 5)) {
            const url = await uploadFile(file, `restaurants/${userId}/documents/`);
            fileUrls[fieldname] = url;
          }
        }
      }
      
      // Update restaurant profile
      const profile = await prisma.restaurantProfile.update({
        where: { userId },
        data: {
          fssaiNumber,
          fssaiExpiry: fssaiExpiry ? new Date(fssaiExpiry) : null,
          fssaiLicense: fileUrls['fssaiLicense'],
          gstNumber,
          gstCertificate: fileUrls['gstCertificate'],
          panCard: fileUrls['panCard'],
          shopEstablishment: fileUrls['shopEstablishment'],
          restaurantImages: fileUrls['restaurantImages'] || [],
          verificationStatus: 'documents_submitted',
          updatedAt: new Date()
        }
      });
      
      res.json({
        success: true,
        message: 'Documents uploaded successfully',
        data: {
          nextStep: 'bank_details'
        }
      });
      
    } catch (error: any) {
      console.error('Restaurant document upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ==================== STEP 4: Bank Details ====================
/**
 * Step 4: Bank Details & Account Finalization
 * POST /auth/restaurant/register/step4
 */
router.post('/restaurant/register/step4', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const {
      bankAccountName,
      bankAccountNumber,
      confirmAccountNumber,
      ifscCode,
      bankName,
      branchName
    } = req.body;
    
    // Validation
    if (!bankAccountName || !bankAccountNumber || !confirmAccountNumber || !ifscCode) {
      return res.status(400).json({
        success: false,
        error: 'All bank details are required'
      });
    }
    
    if (bankAccountNumber !== confirmAccountNumber) {
      return res.status(400).json({
        success: false,
        error: 'Account numbers do not match'
      });
    }
    
    // Validate IFSC code format (AAAA0123456)
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IFSC code format'
      });
    }
    
    const prisma = getPrismaClient(req.user.city);
    
    // Encrypt account number
    const encryptedAccountNumber = encryptData(bankAccountNumber);
    
    // Update restaurant profile
    const profile = await prisma.restaurantProfile.update({
      where: { userId },
      data: {
        bankAccountName,
        bankAccountNumber: encryptedAccountNumber,
        ifscCode: ifscCode.toUpperCase(),
        bankName,
        branchName,
        verificationStatus: 'under_review',
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Registration complete! Your application is under review.',
      data: {
        status: 'under_review',
        estimatedReviewTime: '24-48 hours',
        nextSteps: [
          'Our team will verify your documents',
          'You will receive an email once approved',
          'You can then add menu items and go live'
        ]
      }
    });
    
  } catch (error: any) {
    console.error('Restaurant bank details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get Restaurant Registration Status
 * GET /auth/restaurant/registration/status
 */
router.get('/restaurant/registration/status', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const prisma = getPrismaClient(req.user.city);
    
    const profile = await prisma.restaurantProfile.findUnique({
      where: { userId },
      select: {
        verificationStatus: true,
        rejectionReason: true,
        restaurantName: true,
        fssaiNumber: true,
        bankAccountName: true,
        updatedAt: true
      }
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Please complete Step 2 first.'
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error: any) {
    console.error('Get registration status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as restaurantRegisterRouter };
