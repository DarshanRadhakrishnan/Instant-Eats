/**
 * Delivery Partner Registration - Multi-Step Document Verification
 * Step 1: Basic Account
 * Step 2: Personal Details + Aadhar
 * Step 3: Vehicle & License Details
 * Step 4: Document Upload
 * Step 5: Bank Details
 * Step 6: Background Check & Training
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../../services/prismaService';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { encryptData } from '../../services/encryptionService';
import { uploadFile } from '../../services/fileUpload';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ==================== STEP 1: Basic Account ====================
/**
 * Step 1: Delivery Partner Account Creation
 * POST /auth/delivery/register/step1
 */
router.post('/delivery/register/step1', async (req: AuthRequest, res: Response) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      phoneNumber,
      city
    } = req.body;
    
    // Validation
    if (!email || !password || !confirmPassword || !phoneNumber || !city) {
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
    
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
    
    const prisma = getPrismaClient(city);
    
    const existing = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password: hashedPassword,
        firstName: '',
        lastName: '',
        phoneNumber,
        role: 'delivery_partner',
        city,
        authProvider: 'local',
        emailVerified: false,
        accountStatus: 'pending'
      }
    });
    
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
      message: 'Account created. Please complete personal details.',
      data: {
        userId: user.id,
        email: user.email,
        token,
        nextStep: 'personal_details'
      }
    });
    
  } catch (error: any) {
    console.error('Delivery partner step 1 error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== STEP 2: Personal Details ====================
/**
 * Step 2: Personal Details & Aadhar
 * POST /auth/delivery/register/step2
 */
router.post('/delivery/register/step2', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const {
      fullName,
      dateOfBirth,
      gender,
      aadharNumber,
      panNumber,
      currentAddress,
      permanentAddress,
      city,
      state,
      pincode,
      emergencyName,
      emergencyRelation,
      emergencyPhone
    } = req.body;
    
    // Validation
    if (!fullName || !aadharNumber || !currentAddress || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing'
      });
    }
    
    // Validate Aadhar (12 digits)
    if (!/^\d{12}$/.test(aadharNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Aadhar number (must be 12 digits)'
      });
    }
    
    // Validate PAN if provided (10 characters)
    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PAN format'
      });
    }
    
    const prisma = getPrismaClient(city);
    
    // Check if profile exists
    const existing = await prisma.deliveryPartnerProfile.findUnique({
      where: { userId }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Profile already exists'
      });
    }
    
    const encryptedAadhar = encryptData(aadharNumber);
    const encryptedPAN = panNumber ? encryptData(panNumber) : null;
    
    const profile = await prisma.deliveryPartnerProfile.create({
      data: {
        id: uuidv4(),
        userId,
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        aadharNumber: encryptedAadhar,
        panNumber: encryptedPAN,
        currentAddress,
        permanentAddress: permanentAddress || currentAddress,
        city,
        state,
        pincode,
        emergencyName,
        emergencyRelation,
        emergencyPhone,
        
        // Placeholder values for step 3
        vehicleType: '',
        vehicleNumber: '',
        vehicleModel: '',
        vehicleYear: 0,
        drivingLicense: '',
        licenseExpiry: new Date(),
        
        verificationStatus: 'pending'
      }
    });
    
    res.json({
      success: true,
      message: 'Personal details saved',
      data: {
        profileId: profile.id,
        nextStep: 'vehicle_details'
      }
    });
    
  } catch (error: any) {
    console.error('Delivery partner step 2 error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== STEP 3: Vehicle Details ====================
/**
 * Step 3: Vehicle & License Details
 * POST /auth/delivery/register/step3
 */
router.post('/delivery/register/step3', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const {
      vehicleType,
      vehicleNumber,
      vehicleModel,
      vehicleYear,
      drivingLicense,
      licenseExpiry
    } = req.body;
    
    // Validation
    if (!vehicleType || !vehicleNumber || !vehicleModel || !vehicleYear || !drivingLicense || !licenseExpiry) {
      return res.status(400).json({
        success: false,
        error: 'All vehicle details are required'
      });
    }
    
    // Validate vehicle number format (typical Indian format)
    if (!/^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/.test(vehicleNumber.replace(/\s+/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vehicle number format'
      });
    }
    
    const prisma = getPrismaClient(req.user.city);
    
    const encryptedLicense = encryptData(drivingLicense);
    
    const profile = await prisma.deliveryPartnerProfile.update({
      where: { userId },
      data: {
        vehicleType,
        vehicleNumber: vehicleNumber.toUpperCase(),
        vehicleModel,
        vehicleYear: parseInt(vehicleYear),
        drivingLicense: encryptedLicense,
        licenseExpiry: new Date(licenseExpiry),
        verificationStatus: 'pending'
      }
    });
    
    res.json({
      success: true,
      message: 'Vehicle details saved',
      data: {
        nextStep: 'document_upload'
      }
    });
    
  } catch (error: any) {
    console.error('Delivery partner step 3 error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== STEP 4: Document Upload ====================
/**
 * Step 4: Upload Documents (Aadhar, License, RC, Insurance, Photo)
 * POST /auth/delivery/register/step4
 */
router.post(
  '/delivery/register/step4',
  authenticateJWT,
  upload.fields([
    { name: 'aadharFront', maxCount: 1 },
    { name: 'aadharBack', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'licenseFront', maxCount: 1 },
    { name: 'licenseBack', maxCount: 1 },
    { name: 'vehicleRC', maxCount: 1 },
    { name: 'vehicleInsurance', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.userId;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { insuranceExpiry } = req.body;
      
      // Validate required documents
      if (!files?.['aadharFront'] || !files?.['aadharBack']) {
        return res.status(400).json({
          success: false,
          error: 'Aadhar front and back are required'
        });
      }
      
      if (!files?.['licenseFront'] || !files?.['licenseBack']) {
        return res.status(400).json({
          success: false,
          error: 'License front and back are required'
        });
      }
      
      const prisma = getPrismaClient(req.user.city);
      
      // Upload files
      const fileUrls: any = {};
      for (const [fieldname, fileArray] of Object.entries(files || {})) {
        const file = fileArray[0];
        const url = await uploadFile(file, `delivery-partners/${userId}/documents/`);
        fileUrls[fieldname] = url;
      }
      
      // Update profile
      const profile = await prisma.deliveryPartnerProfile.update({
        where: { userId },
        data: {
          aadharFront: fileUrls['aadharFront'],
          aadharBack: fileUrls['aadharBack'],
          panCard: fileUrls['panCard'],
          licenseFront: fileUrls['licenseFront'],
          licenseBack: fileUrls['licenseBack'],
          vehicleRC: fileUrls['vehicleRC'],
          vehicleInsurance: fileUrls['vehicleInsurance'],
          photo: fileUrls['photo'],
          insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
          verificationStatus: 'documents_submitted'
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
      console.error('Delivery partner document upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ==================== STEP 5: Bank Details ====================
/**
 * Step 5: Bank Details & UPI
 * POST /auth/delivery/register/step5
 */
router.post('/delivery/register/step5', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const {
      bankAccountName,
      bankAccountNumber,
      confirmAccountNumber,
      ifscCode,
      upiId
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
    
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IFSC code format'
      });
    }
    
    const prisma = getPrismaClient(req.user.city);
    
    const encryptedAccountNumber = encryptData(bankAccountNumber);
    
    const profile = await prisma.deliveryPartnerProfile.update({
      where: { userId },
      data: {
        bankAccountName,
        bankAccountNumber: encryptedAccountNumber,
        ifscCode: ifscCode.toUpperCase(),
        upiId: upiId || null,
        verificationStatus: 'under_review'
      }
    });
    
    res.json({
      success: true,
      message: 'Bank details saved. Background verification initiated.',
      data: {
        status: 'under_review',
        estimatedReviewTime: '3-5 business days',
        nextSteps: [
          'Police verification will be initiated',
          'You will receive SMS updates on verification status',
          'Training will be scheduled once verified',
          'You can start accepting deliveries after training'
        ]
      }
    });
    
  } catch (error: any) {
    console.error('Delivery partner bank details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get Delivery Partner Registration Status
 * GET /auth/delivery/registration/status
 */
router.get('/delivery/registration/status', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const prisma = getPrismaClient(req.user.city);
    
    const profile = await prisma.deliveryPartnerProfile.findUnique({
      where: { userId },
      select: {
        fullName: true,
        vehicleType: true,
        verificationStatus: true,
        policeVerification: true,
        backgroundCheckStatus: true,
        trainingCompleted: true,
        rejectionReason: true,
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
    console.error('Get delivery partner status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as deliveryPartnerRegisterRouter };
