# 🚀 Quick Reference - Three-Tier Auth System

## 📱 CUSTOMER REGISTRATION (2 seconds)

### Option 1: Google OAuth
```bash
# Frontend requests Google OAuth URL
GET /auth/customer/google?city=NewYork

# User authenticates with Google
# Redirects to: /auth/customer/google/callback?code=...&state=...

# Frontend receives token from URL
# localStorage.setItem('authToken', token)
```

### Option 2: Email/Password
```bash
POST /auth/customer/register
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "city": "NewYork"
}

# Response: { token, userId, email }
# Status: IMMEDIATELY ACTIVE ✅
```

### Login
```bash
POST /auth/customer/login
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "city": "NewYork"
}
```

---

## 🏪 RESTAURANT OWNER REGISTRATION (20 min + 24-48h approval)

### Step 1: Create Account (2 min)
```bash
POST /auth/restaurant/register/step1
{
  "email": "owner@rest.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "Raj",
  "phoneNumber": "9876543210",
  "city": "NewYork"
}

# Status: PENDING
```

### Step 2: Business Info (5 min)
```bash
POST /auth/restaurant/register/step2
Authorization: Bearer {token}
{
  "restaurantName": "Taj Mahal",
  "businessType": "restaurant",
  "cuisine": ["Indian", "North Indian"],
  "address": "123 Food St",
  "city": "NewYork",
  "state": "NY",
  "pincode": "100001",
  "businessPhone": "9876543210",
  "openingTime": "11:00",
  "closingTime": "23:00",
  "workingDays": ["Mon", "Tue", "Wed", ...],
  "ownerName": "Raj Kumar",
  "ownerAadhar": "123456789012"  # Encrypted ✅
}
```

### Step 3: Upload Documents (10 min)
```bash
POST /auth/restaurant/register/step3
Authorization: Bearer {token}
Content-Type: multipart/form-data

fssaiNumber: "14AT00AI000001"
fssaiExpiry: "2025-12-31"
fssaiLicense: [File]
gstNumber: "27AAPCT1234Q1Z0"
gstCertificate: [File]
panCard: [File]
restaurantImages: [File, File, ...]

# Allowed: JPG, PNG, PDF (Max 5MB each)
```

### Step 4: Bank Details (3 min)
```bash
POST /auth/restaurant/register/step4
Authorization: Bearer {token}
{
  "bankAccountName": "Taj Mahal Restaurant",
  "bankAccountNumber": "1234567890123456",  # Encrypted ✅
  "confirmAccountNumber": "1234567890123456",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank"
}

# Status: UNDER REVIEW → Wait 24-48h for approval
```

### Check Status
```bash
GET /auth/restaurant/registration/status
Authorization: Bearer {token}

# Returns: verificationStatus, rejectionReason, updatedAt
```

---

## 🚚 DELIVERY PARTNER REGISTRATION (23 min + 3-5 days approval)

### Step 1: Create Account (2 min)
```bash
POST /auth/delivery/register/step1
{
  "email": "rider@delivery.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "phoneNumber": "9876543210",
  "city": "NewYork"
}
```

### Step 2: Personal Details (5 min)
```bash
POST /auth/delivery/register/step2
Authorization: Bearer {token}
{
  "fullName": "Arjun Singh",
  "dateOfBirth": "1995-05-15",
  "gender": "male",
  "aadharNumber": "123456789012",        # Encrypted ✅
  "panNumber": "ABCDE1234F",             # Encrypted ✅
  "currentAddress": "123 Main St",
  "city": "NewYork",
  "state": "NY",
  "pincode": "100001",
  "emergencyName": "Sharma Singh",
  "emergencyPhone": "9876543211"
}
```

### Step 3: Vehicle Details (3 min)
```bash
POST /auth/delivery/register/step3
Authorization: Bearer {token}
{
  "vehicleType": "bike",                 # bike, scooter, cycle, car
  "vehicleNumber": "DL01AB1234",
  "vehicleModel": "Honda CB 200",
  "vehicleYear": 2022,
  "drivingLicense": "DL0120220000123456", # Encrypted ✅
  "licenseExpiry": "2026-12-31"
}
```

### Step 4: Upload Documents (10 min)
```bash
POST /auth/delivery/register/step4
Authorization: Bearer {token}
Content-Type: multipart/form-data

aadharFront: [File] (required)
aadharBack: [File] (required)
panCard: [File] (optional)
licenseFront: [File] (required)
licenseBack: [File] (required)
vehicleRC: [File] (required)
vehicleInsurance: [File] (required)
insuranceExpiry: "2026-12-31"
photo: [File] (required)
```

### Step 5: Bank & UPI (3 min)
```bash
POST /auth/delivery/register/step5
Authorization: Bearer {token}
{
  "bankAccountName": "Arjun Singh",
  "bankAccountNumber": "9876543210123456", # Encrypted ✅
  "confirmAccountNumber": "9876543210123456",
  "ifscCode": "ICIC0000001",
  "upiId": "arjun@upi"
}

# Status: UNDER REVIEW
# Police verification initiated
# Background check starts (3-5 days)
# Training scheduled
```

### Check Status
```bash
GET /auth/delivery/registration/status
Authorization: Bearer {token}

# Returns: verificationStatus, policeVerification, trainingCompleted
```

---

## 🔐 AUTHENTICATION HEADER

Use with all protected endpoints:
```bash
Authorization: Bearer {token_from_registration_or_login}

Example:
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  http://localhost:3001/auth/restaurant/registration/status
```

---

## ⚡ COMMON RESPONSES

### Success
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Unauthorized
```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

### Account Not Active
```json
{
  "success": false,
  "error": "Your account is pending. Please complete the verification process.",
  "accountStatus": "pending"
}
```

---

## 🔑 ENVIRONMENT SETUP

```bash
# Copy to .env from .env.example

# Google OAuth
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/customer/google/callback

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your-64-hex-characters-here

# JWT
JWT_SECRET=your-32-char-secret-min
JWT_EXPIRY=24h

# Database URLs
POSTGRES_SHARD_A_URL=postgresql://postgres:postgres@localhost:5432/shard_a
POSTGRES_SHARD_B_URL=postgresql://postgres:postgres@localhost:5433/shard_b
POSTGRES_SHARD_C_URL=postgresql://postgres:postgres@localhost:5434/shard_c

# URLs
FRONTEND_URL=http://localhost:5173
AUTH_SERVICE_URL=http://localhost:3001

# Files
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5
```

---

## 🚀 QUICK START

```bash
# 1. Install dependencies
cd services/auth-service
npm install

# 2. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy to ENCRYPTION_KEY in .env

# 3. Setup Google OAuth
# Get credentials from Google Cloud Console
# Add to .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# 4. Run migrations
npm run prisma:migrate:shardA
npm run prisma:migrate:shardB
npm run prisma:migrate:shardC

# 5. Start service
npm run dev

# Service runs on http://localhost:3001
```

---

## 📊 STATUS CODES

| Status | Customer | Restaurant | Delivery | Meaning |
|--------|----------|------------|----------|---------|
| active | ✅ Can use | ✅ Can use | ✅ Can use | Verified & approved |
| pending | ✅ Can use | ❌ Can't use | ❌ Can't use | Verification in progress |
| suspended | ❌ Blocked | ❌ Blocked | ❌ Blocked | Temporarily disabled |
| rejected | ❌ Denied | ❌ Denied | ❌ Denied | Application rejected |

---

## 📋 FIELD ENCRYPTION

These fields are automatically encrypted with AES-256-CBC:

**Restaurant Owner:**
- ownerAadhar
- bankAccountNumber

**Delivery Partner:**
- aadharNumber
- panNumber
- drivingLicense
- bankAccountNumber

Encryption is transparent - just pass plain value, service handles it.

---

## 🧪 TESTING EXAMPLES

### Test Customer Registration
```bash
curl -X POST http://localhost:3001/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "confirmPassword": "TestPass123!",
    "firstName": "John",
    "city": "NewYork"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3001/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "city": "NewYork"
  }'
```

### Test Protected Route (with token)
```bash
curl http://localhost:3001/auth/restaurant/registration/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## 🎯 IMPORTANT NOTES

1. **Encryption Key is Critical** - Change from default before production
2. **Google OAuth Needs Setup** - Get credentials from Google Cloud
3. **Passwords Min 8 chars** - Both for registration and login
4. **Phone Format** - Indian format: 10 digits starting with 6-9
5. **HTTPS Required** - For OAuth to work in production
6. **Files Max 5MB** - Each document has size limit
7. **Status Transitions** - Are one-way (pending → approved/rejected)
8. **Token Expiry** - Customers: 7 days, Others: 30 days during registration

---

## 📚 FULL DOCUMENTATION

- **API Docs:** `THREE_TIER_AUTH_API.md` - Complete endpoint reference
- **Setup Guide:** `THREE_TIER_IMPLEMENTATION_GUIDE.md` - Detailed setup
- **Summary:** `THREE_TIER_AUTH_SUMMARY.md` - Overview and features
- **Changelog:** `CHANGELOG.md` - What was implemented

---

**Ready to register users!** 🎉
