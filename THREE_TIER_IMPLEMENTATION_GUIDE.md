# Three-Tier Authentication Implementation Guide

## 🎯 Quick Summary

This document implements a complete registration and authentication system with three user types:

1. **Customers** - Fast OAuth + Email/Password registration
2. **Restaurant Owners** - Multi-step business verification
3. **Delivery Partners** - Comprehensive document verification

---

## 📁 Files Created/Modified

### New Files Created

```
services/auth-service/
├── src/
│   ├── middleware/
│   │   └── auth.ts                    (JWT authentication & authorization)
│   ├── services/
│   │   ├── encryptionService.ts       (AES-256 encryption for sensitive data)
│   │   └── fileUpload.ts              (File upload handling)
│   └── routes/
│       ├── customer/
│       │   ├── googleAuth.ts          (Google OAuth flow)
│       │   └── emailAuth.ts           (Email/Password registration & login)
│       ├── restaurant/
│       │   └── register.ts            (Steps 1-4: Account → Bank Details)
│       └── delivery/
│           └── register.ts            (Steps 1-5: Account → Bank Details)
├── prisma/
│   └── schema.prisma                  (Updated: 3 new models)
└── package.json                       (Updated: New dependencies)

Root:
├── .env.example                       (Updated: OAuth, encryption, file upload)
├── THREE_TIER_AUTH_API.md             (Complete API documentation)
└── IMPLEMENTATION_GUIDE.md            (This file)
```

### Modified Files

- `services/auth-service/src/index.ts` - New route registrations
- `services/auth-service/package.json` - New dependencies
- `.env.example` - Google OAuth, encryption, file upload configs

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd services/auth-service
npm install

# New dependencies added:
# - multer (file uploads)
# - google-auth-library (OAuth)
# - uuid (unique identifiers)
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/customer/google/callback

# Encryption Key (CRITICAL - 64 hex characters)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Update Database Schema

```bash
# Apply Prisma migrations to all three shards
npm run prisma:migrate:shardA
npm run prisma:migrate:shardB
npm run prisma:migrate:shardC
```

This creates three new tables in each shard:
- `User` (enhanced with OAuth fields)
- `RestaurantProfile` (4-step registration)
- `DeliveryPartnerProfile` (5-step registration)

### 4. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable OAuth 2.0
4. Create OAuth 2.0 credentials (Web Application)
5. Add authorized redirect URIs:
   - `http://localhost:3001/auth/customer/google/callback`
   - `https://yourdomain.com/auth/customer/google/callback` (production)
6. Copy Client ID and Secret to `.env`

### 5. Start the Service

```bash
npm run dev

# Or with nodemon
npm run dev:watch
```

Service starts on `http://localhost:3001`

---

## 👥 User Registration Flows

### Customer Registration (Fastest)

**Option A: Google OAuth**
```
1. User clicks "Login with Google"
2. Frontend requests: GET /auth/customer/google?city=NewYork
3. Redirect to Google authentication
4. Google redirects back with code
5. Service validates token
6. JWT token generated
7. User immediately active ✅
```

**Option B: Email/Password**
```
1. POST /auth/customer/register
   {email, password, firstName, city}
2. Validate inputs
3. Hash password with bcrypt
4. Create user with authProvider: "local"
5. JWT token generated
6. User immediately active ✅
```

**Response Time:** 2 seconds

---

### Restaurant Owner Registration (Strict)

**Step 1: Account Creation** (2 minutes)
```
POST /auth/restaurant/register/step1
{email, password, firstName, phoneNumber, city}
→ Account created with status "pending"
→ Token generated (30-day expiry)
```

**Step 2: Business Information** (5 minutes)
```
POST /auth/restaurant/register/step2
{restaurantName, address, city, ownerDetails, FSSAI number, etc.}
→ RestaurantProfile created
→ Status: "pending"
```

**Step 3: Document Upload** (10 minutes)
```
POST /auth/restaurant/register/step3
{fssaiLicense (PDF), GST cert, PAN, images}
→ Files uploaded to /uploads/restaurants/{userId}/
→ Status: "documents_submitted"
→ Admin notification triggered
```

**Step 4: Bank Details** (3 minutes)
```
POST /auth/restaurant/register/step4
{bankAccountNumber (encrypted), IFSC, account name}
→ Account details encrypted
→ Status: "under_review"
→ Registration complete!
```

**Complete Flow Time:** 20 minutes (user) + 24-48 hours (admin verification)

**Admin Verification:**
- Check FSSAI validity
- Verify GST registration
- Confirm restaurant location
- Review bank details
- Approve or reject

---

### Delivery Partner Registration (Strictest)

**Step 1: Account Creation** (2 minutes)
```
POST /auth/delivery/register/step1
{email, password, phoneNumber, city}
→ Account created, status "pending"
```

**Step 2: Personal Details** (5 minutes)
```
POST /auth/delivery/register/step2
{fullName, dateOfBirth, aadhar, address, emergencyContact}
→ Aadhar encrypted
→ Profile created
```

**Step 3: Vehicle Details** (3 minutes)
```
POST /auth/delivery/register/step3
{vehicleType, vehicleNumber, drivingLicense}
→ Vehicle info stored (encrypted)
```

**Step 4: Document Upload** (10 minutes)
```
POST /auth/delivery/register/step4
{aadharFront, aadharBack, license, RC, insurance, photo}
→ All documents uploaded
→ Status: "documents_submitted"
```

**Step 5: Bank Details** (3 minutes)
```
POST /auth/delivery/register/step5
{bankAccountNumber, IFSC, UPI}
→ Status: "under_review"
→ Background verification initiated
```

**Complete Flow Time:** 23 minutes (user) + 3-5 days (verification)

**Verification Process:**
1. Police verification initiated (2-3 days)
2. Background check (1-2 days)
3. Training scheduled
4. Account activated

---

## 🔐 Data Security

### Encrypted Fields

The following fields are automatically encrypted using AES-256-CBC:

**Restaurant Owner:**
- Owner Aadhar Number
- Bank Account Number

**Delivery Partner:**
- Aadhar Number
- PAN Number
- Driving License
- Bank Account Number

**Encryption Format:**
```
Encrypted Value = IV (16 bytes, hex) + ":" + Encrypted Data (hex)
Example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:x9y8z7w6v5u4t3s2r1q0..."
```

### Encryption/Decryption Usage

```typescript
import { encryptData, decryptData } from './services/encryptionService';

// Encrypt
const encryptedAadhar = encryptData('123456789012');

// Store in database
await prisma.user.update({
  where: { id: userId },
  data: { aadharNumber: encryptedAadhar }
});

// Decrypt when needed
const decrypted = decryptData(storedEncryptedValue);
```

### Password Security

Passwords are hashed using bcryptjs with salt rounds = 10:

```typescript
const hashedPassword = await bcrypt.hash(password, 10);
```

Never store plain passwords or log them.

---

## 📁 File Upload Handling

### Storage Structure

Files are organized by user and document type:

```
uploads/
├── restaurants/
│   └── {userId}/
│       ├── documents/
│       │   ├── fssai_certificate_abc123.pdf
│       │   ├── gst_certificate_def456.pdf
│       │   └── pan_card_ghi789.jpg
│       └── images/
│           ├── restaurant_photo_001.jpg
│           └── restaurant_photo_002.jpg
└── delivery-partners/
    └── {userId}/
        └── documents/
            ├── aadhar_front_123.jpg
            ├── aadhar_back_456.jpg
            ├── license_front_789.jpg
            └── vehicle_rc_012.pdf
```

### File Upload API

```typescript
import { uploadFile, deleteFile } from './services/fileUpload';

// Upload
const fileUrl = await uploadFile(file, `restaurants/${userId}/documents/`);
// Returns: '/restaurants/550e8400.../documents/abc123def456.pdf'

// Delete
deleteFile('/restaurants/550e8400.../documents/abc123def456.pdf');
```

### Validation

Automatic validation for:
- **File Type:** JPG, PNG, PDF only
- **File Size:** Max 5MB per file
- **MIME Type:** Checked on server side
- **Virus Scanning:** (Can be integrated with ClamAV or similar)

---

## 🔑 JWT Token Structure

**Customer Token:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "customer@example.com",
  "role": "customer",
  "city": "NewYork",
  "accountStatus": "active"
}
```

**Restaurant Owner Token:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "email": "owner@restaurant.com",
  "role": "restaurant_owner",
  "city": "NewYork",
  "accountStatus": "pending"  // Changes to "active" after approval
}
```

**Delivery Partner Token:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440002",
  "email": "rider@delivery.com",
  "role": "delivery_partner",
  "city": "NewYork",
  "accountStatus": "pending"  // Changes to "active" after training
}
```

---

## 🛡️ Middleware

### JWT Authentication

```typescript
import { authenticateJWT } from './middleware/auth';

// Protect routes
app.post('/restaurant/register/step2', authenticateJWT, handler);

// In handler:
const userId = req.user.userId;
const email = req.user.email;
const role = req.user.role;
```

### Role-Based Authorization

```typescript
import { authorizeRole } from './middleware/auth';

// Only restaurant owners
app.post('/restaurant/action', 
  authenticateJWT,
  authorizeRole(['restaurant_owner']),
  handler
);
```

### Account Status Verification

```typescript
import { requireActiveAccount } from './middleware/auth';

// Only for active accounts
app.post('/order/create',
  authenticateJWT,
  requireActiveAccount,
  handler
);
```

---

## 📊 Database Schema

### User Table (Enhanced)

```sql
id              STRING PRIMARY KEY
email           STRING UNIQUE
password        STRING
firstName       STRING
lastName        STRING
phoneNumber     STRING?
role            STRING ('customer', 'restaurant_owner', 'delivery_partner')
city            STRING
googleId        STRING? UNIQUE
authProvider    STRING? ('local', 'google')
profilePicture  STRING?
emailVerified   BOOLEAN DEFAULT false
accountStatus   STRING DEFAULT 'pending'
createdAt       DATETIME
updatedAt       DATETIME
```

### RestaurantProfile Table

```sql
id                  STRING PRIMARY KEY
userId              STRING UNIQUE (FK → User.id)
restaurantName      STRING
businessType        STRING
cuisine             STRING[]
address             STRING
city, state, pincode STRING
openingTime         STRING
closingTime         STRING
workingDays         STRING[]

-- Owner Details
ownerName           STRING
ownerAadhar         STRING (ENCRYPTED)

-- Documents (4-step)
fssaiNumber         STRING
fssaiLicense        STRING (URL)
fssaiExpiry         DATETIME
gstNumber           STRING
gstCertificate      STRING (URL)
panCard             STRING (URL)

-- Bank (4-step)
bankAccountName     STRING
bankAccountNumber   STRING (ENCRYPTED)
ifscCode            STRING

-- Verification
verificationStatus  STRING ('pending', 'documents_submitted', 'under_review', 'approved', 'rejected')
rejectionReason     STRING?
verifiedAt          DATETIME?
```

### DeliveryPartnerProfile Table

```sql
id                    STRING PRIMARY KEY
userId                STRING UNIQUE (FK → User.id)

-- Personal (2-step)
fullName              STRING
dateOfBirth           DATETIME
aadharNumber          STRING (ENCRYPTED)
panNumber             STRING (ENCRYPTED)
address               STRING
city, state, pincode  STRING

-- Vehicle (3-step)
vehicleType           STRING
vehicleNumber         STRING
vehicleModel          STRING
drivingLicense        STRING (ENCRYPTED)
licenseExpiry         DATETIME

-- Documents (4-step)
aadharFront           STRING (URL)
aadharBack            STRING (URL)
licenseFront          STRING (URL)
licenseBack           STRING (URL)
vehicleRC             STRING (URL)
vehicleInsurance      STRING (URL)
photo                 STRING (URL)

-- Bank (5-step)
bankAccountName       STRING
bankAccountNumber     STRING (ENCRYPTED)
ifscCode              STRING
upiId                 STRING

-- Verification
verificationStatus    STRING
policeVerification    STRING ('pending', 'initiated', 'completed', 'failed')
backgroundCheckStatus STRING
trainingCompleted     BOOLEAN
verifiedAt            DATETIME?

-- Operational
isAvailable           BOOLEAN
currentOrderId        STRING?
totalDeliveries       INT
rating                FLOAT
earningsTotal         FLOAT
accountStatus         STRING ('inactive', 'active', 'suspended')
```

---

## ✅ Testing the System

### 1. Test Customer Google OAuth

```bash
# Get OAuth URL
curl http://localhost:3001/auth/customer/google?city=NewYork

# Manually visit the returned authUrl in browser
# Google authenticates
# Redirected back with token
# Check localStorage for 'authToken'
```

### 2. Test Customer Email Registration

```bash
curl -X POST http://localhost:3001/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "John",
    "city": "NewYork"
  }'
```

### 3. Test Restaurant Registration

```bash
# Step 1: Create account
TOKEN=$(curl -X POST http://localhost:3001/auth/restaurant/register/step1 \
  -H "Content-Type: application/json" \
  -d '{...}' | jq -r '.data.token')

# Step 2: Add business info
curl -X POST http://localhost:3001/auth/restaurant/register/step2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...}'

# Step 3: Upload documents
curl -X POST http://localhost:3001/auth/restaurant/register/step3 \
  -H "Authorization: Bearer $TOKEN" \
  -F "fssaiLicense=@/path/to/fssai.pdf" \
  -F "fssaiNumber=14AT00AI000001" \
  -F "restaurantImages=@/path/to/image.jpg"

# Step 4: Bank details
curl -X POST http://localhost:3001/auth/restaurant/register/step4 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...}'
```

### 4. Test Delivery Partner Registration

```bash
# Similar to restaurant, but 5 steps instead of 4
# Follow same pattern with different endpoints
```

---

## 🐛 Troubleshooting

### Issue: Encryption key not set
**Solution:** Generate and set `ENCRYPTION_KEY` in `.env`
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: Google OAuth redirect mismatch
**Solution:** Ensure `GOOGLE_REDIRECT_URI` matches exactly in:
- Google Cloud Console settings
- `.env` file
- Frontend implementation

### Issue: File upload fails
**Solution:**
1. Check `uploads/` directory exists and is writable
2. Verify file size < 5MB
3. Check file MIME type is in allowed list

### Issue: JWT token expired
**Solution:** Tokens expire based on role:
- Customers: 7 days
- Restaurant/Delivery: 30 days (during registration)
- Generate refresh endpoint if needed

### Issue: Database sharding errors
**Solution:** Ensure all three shards have identical schemas:
```bash
npm run prisma:migrate:shardA
npm run prisma:migrate:shardB
npm run prisma:migrate:shardC
```

---

## 🚀 Next Steps

1. **Email Verification** - Send verification emails to customers
2. **SMS Notifications** - Send status updates to delivery partners
3. **Admin Dashboard** - Create interface for approving registrations
4. **Photo Verification** - Add face recognition for delivery partners
5. **Background Check Integration** - Integrate with verification services
6. **Payment Setup** - Configure payment methods for restaurant payouts

---

## 📚 Related Documentation

- [THREE_TIER_AUTH_API.md](./THREE_TIER_AUTH_API.md) - Complete API documentation
- [README.md](./README.md) - Project overview
- [DEVELOPER_CHECKLIST.md](./DEVELOPER_CHECKLIST.md) - Development workflows

