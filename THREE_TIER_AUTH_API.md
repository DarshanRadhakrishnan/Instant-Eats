# Three-Tier Registration & Authentication System

Complete API documentation for Instant Eats registration system with Customer, Restaurant Owner, and Delivery Partner flows.

---

## 🎯 Overview

```
CUSTOMER (Fast)              RESTAURANT (Strict)          DELIVERY (Strict)
└─ OAuth + Email            └─ Multi-Step Verification   └─ Document Verification
  ├─ Google OAuth             ├─ Step 1: Account          ├─ Step 1: Account
  └─ Email/Password           ├─ Step 2: Business Info    ├─ Step 2: Personal Details
                              ├─ Step 3: Documents        ├─ Step 3: Vehicle Details
                              └─ Step 4: Bank Details     ├─ Step 4: Documents
                                                          └─ Step 5: Bank Details
```

---

## 👥 CUSTOMER REGISTRATION

### Option 1: Google OAuth

#### 1. Get Google OAuth URL
```bash
GET /auth/customer/google?city=NewYork

Response:
{
  "success": true,
  "message": "Google OAuth URL generated",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### 2. Redirect to Google
- User clicks the `authUrl` link
- Authenticates with Google account
- Google redirects to callback

#### 3. Callback Handler (Automatic)
```
GET /auth/customer/google/callback?code=...&state=...
Redirects to: https://localhost:5173/auth/success?token=...&newUser=true
```

#### 4. Extract Token from Frontend
```javascript
// Frontend captures token from URL
const token = new URLSearchParams(window.location.search).get('token');
localStorage.setItem('authToken', token);
// Use token in Authorization header for subsequent requests
```

### Option 2: Email/Password Registration

#### Register Customer
```bash
POST /auth/customer/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "9876543210",
  "city": "NewYork"
}

Response (201):
{
  "success": true,
  "message": "Customer registered successfully",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "customer@example.com",
    "firstName": "John",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login Customer
```bash
POST /auth/customer/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "city": "NewYork"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "customer@example.com",
    "firstName": "John",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🏪 RESTAURANT OWNER REGISTRATION

### Step 1: Account Creation

```bash
POST /auth/restaurant/register/step1
Content-Type: application/json

{
  "email": "owner@restaurant.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "Raj",
  "lastName": "Kumar",
  "phoneNumber": "9876543210",
  "city": "NewYork"
}

Response (201):
{
  "success": true,
  "message": "Account created. Please complete business registration.",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "email": "owner@restaurant.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "nextStep": "business_information"
  }
}
```

**Note:** Account is in "pending" status. Full activation requires all 4 steps.

### Step 2: Business Information

```bash
POST /auth/restaurant/register/step2
Content-Type: application/json
Authorization: Bearer {token_from_step1}

{
  "restaurantName": "Taj Mahal Restaurant",
  "businessType": "restaurant",
  "cuisine": ["Indian", "North Indian", "Mughlai"],
  "description": "Premium Indian restaurant with authentic recipes",
  
  "address": "123 Food Street",
  "city": "NewYork",
  "state": "NY",
  "pincode": "100001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  
  "businessPhone": "9876543210",
  "businessEmail": "taj@restaurant.com",
  
  "openingTime": "11:00",
  "closingTime": "23:00",
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  
  "ownerName": "Raj Kumar",
  "ownerPhone": "9876543210",
  "ownerEmail": "raj@restaurant.com",
  "ownerAadhar": "123456789012"
}

Response (200):
{
  "success": true,
  "message": "Business information saved",
  "data": {
    "profileId": "650e8400-e29b-41d4-a716-446655440002",
    "nextStep": "document_upload"
  }
}
```

### Step 3: Document Upload

```bash
POST /auth/restaurant/register/step3
Content-Type: multipart/form-data
Authorization: Bearer {token_from_step1}

Form Fields:
- fssaiNumber: "14AT00AI000001" (required)
- fssaiExpiry: "2025-12-31"
- gstNumber: "27AAPCT1234Q1Z0" (optional but recommended)
- fssaiLicense: [File] (required)
- gstCertificate: [File] (optional)
- panCard: [File] (optional)
- shopEstablishment: [File] (optional)
- restaurantImages: [File1, File2, ...] (multiple, optional)

Response (200):
{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": {
    "nextStep": "bank_details"
  }
}
```

**Accepted File Types:** JPG, PNG, PDF (Max 5MB each)

### Step 4: Bank Details

```bash
POST /auth/restaurant/register/step4
Content-Type: application/json
Authorization: Bearer {token_from_step1}

{
  "bankAccountName": "Taj Mahal Restaurant",
  "bankAccountNumber": "1234567890123456",
  "confirmAccountNumber": "1234567890123456",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank",
  "branchName": "Manhattan Branch"
}

Response (200):
{
  "success": true,
  "message": "Registration complete! Your application is under review.",
  "data": {
    "status": "under_review",
    "estimatedReviewTime": "24-48 hours",
    "nextSteps": [
      "Our team will verify your documents",
      "You will receive an email once approved",
      "You can then add menu items and go live"
    ]
  }
}
```

### Check Registration Status

```bash
GET /auth/restaurant/registration/status
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "data": {
    "verificationStatus": "under_review",  // pending, documents_submitted, under_review, approved, rejected
    "rejectionReason": null,
    "restaurantName": "Taj Mahal Restaurant",
    "fssaiNumber": "14AT00AI000001",
    "bankAccountName": "Taj Mahal Restaurant",
    "updatedAt": "2024-12-11T10:30:00Z"
  }
}
```

---

## 🚚 DELIVERY PARTNER REGISTRATION

### Step 1: Account Creation

```bash
POST /auth/delivery/register/step1
Content-Type: application/json

{
  "email": "rider@delivery.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "phoneNumber": "9876543210",
  "city": "NewYork"
}

Response (201):
{
  "success": true,
  "message": "Account created. Please complete personal details.",
  "data": {
    "userId": "750e8400-e29b-41d4-a716-446655440003",
    "email": "rider@delivery.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "nextStep": "personal_details"
  }
}
```

### Step 2: Personal Details & Aadhar

```bash
POST /auth/delivery/register/step2
Content-Type: application/json
Authorization: Bearer {token_from_step1}

{
  "fullName": "Arjun Singh",
  "dateOfBirth": "1995-05-15",
  "gender": "male",
  "aadharNumber": "123456789012",
  "panNumber": "ABCDE1234F",
  
  "currentAddress": "123 Main Street, Apt 4B",
  "permanentAddress": "456 Village Road, Hometown",
  "city": "NewYork",
  "state": "NY",
  "pincode": "100001",
  
  "emergencyName": "Sharma Singh",
  "emergencyRelation": "Brother",
  "emergencyPhone": "9876543211"
}

Response (200):
{
  "success": true,
  "message": "Personal details saved",
  "data": {
    "profileId": "850e8400-e29b-41d4-a716-446655440004",
    "nextStep": "vehicle_details"
  }
}
```

### Step 3: Vehicle & License Details

```bash
POST /auth/delivery/register/step3
Content-Type: application/json
Authorization: Bearer {token_from_step1}

{
  "vehicleType": "bike",  // bike, scooter, cycle, car
  "vehicleNumber": "DL01AB1234",
  "vehicleModel": "Honda CB 200",
  "vehicleYear": 2022,
  "drivingLicense": "DL0120220000123456",
  "licenseExpiry": "2026-12-31"
}

Response (200):
{
  "success": true,
  "message": "Vehicle details saved",
  "data": {
    "nextStep": "document_upload"
  }
}
```

### Step 4: Document Upload

```bash
POST /auth/delivery/register/step4
Content-Type: multipart/form-data
Authorization: Bearer {token_from_step1}

Form Fields:
- aadharFront: [File] (required)
- aadharBack: [File] (required)
- panCard: [File] (optional)
- licenseFront: [File] (required)
- licenseBack: [File] (required)
- vehicleRC: [File] (required - Registration Certificate)
- vehicleInsurance: [File] (required)
- insuranceExpiry: "2026-12-31" (required)
- photo: [File] (required - Profile photo)

Response (200):
{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": {
    "nextStep": "bank_details"
  }
}
```

### Step 5: Bank Details & UPI

```bash
POST /auth/delivery/register/step5
Content-Type: application/json
Authorization: Bearer {token_from_step1}

{
  "bankAccountName": "Arjun Singh",
  "bankAccountNumber": "9876543210123456",
  "confirmAccountNumber": "9876543210123456",
  "ifscCode": "ICIC0000001",
  "upiId": "arjun@upi"
}

Response (200):
{
  "success": true,
  "message": "Bank details saved. Background verification initiated.",
  "data": {
    "status": "under_review",
    "estimatedReviewTime": "3-5 business days",
    "nextSteps": [
      "Police verification will be initiated",
      "You will receive SMS updates on verification status",
      "Training will be scheduled once verified",
      "You can start accepting deliveries after training"
    ]
  }
}
```

### Check Delivery Partner Status

```bash
GET /auth/delivery/registration/status
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "data": {
    "fullName": "Arjun Singh",
    "vehicleType": "bike",
    "verificationStatus": "under_review",  // pending, documents_submitted, under_review, approved, rejected
    "policeVerification": "pending",       // pending, initiated, completed, failed
    "backgroundCheckStatus": "pending",
    "trainingCompleted": false,
    "rejectionReason": null,
    "updatedAt": "2024-12-11T10:30:00Z"
  }
}
```

---

## 🔐 Authentication Headers

Use the JWT token received during registration/login for all authenticated requests:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ❌ Common Error Responses

### Missing Required Fields
```json
{
  "success": false,
  "error": "Email, password, firstName, and city are required"
}
```

### Invalid Format
```json
{
  "success": false,
  "error": "Invalid phone number format"
}
```

### Duplicate Email
```json
{
  "success": false,
  "error": "Email already registered"
}
```

### Account Suspended
```json
{
  "success": false,
  "error": "Your account is suspended. Please contact support.",
  "accountStatus": "suspended"
}
```

### Unauthorized (Missing Token)
```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

---

## 📋 Account Status Codes

| Status | Description | Can Login | Can Perform Actions |
|--------|-------------|-----------|-------------------|
| `active` | Account is verified and active | ✅ Yes | ✅ Yes |
| `pending` | Verification in progress | ✅ Yes (limited) | ⚠️ Limited |
| `suspended` | Temporarily disabled | ❌ No | ❌ No |
| `rejected` | Registration rejected | ❌ No | ❌ No |

---

## 📊 Verification Status Timeline

### Restaurant Owner
```
Step 1: Account Created (pending)
   ↓ (24h)
Step 2: Business Info (pending)
   ↓ (48h)
Step 3: Documents Submitted (documents_submitted)
   ↓ (24-48h admin review)
Step 4: Bank Details (under_review)
   ↓ (final approval)
Account: Active ✅
```

### Delivery Partner
```
Step 1: Account Created (pending)
   ↓ (24h)
Step 2: Personal Details (pending)
   ↓ (24h)
Step 3: Vehicle Details (pending)
   ↓ (24h)
Step 4: Documents Uploaded (documents_submitted)
   ↓ (3-5 days)
Step 5: Bank Details (under_review)
   → Police Verification Initiated
   → Background Check (3-5 days)
   → Training Scheduled (1-2 days)
   ↓ (final approval)
Account: Active ✅
```

### Customer
```
Account Created → Immediately Active ✅
```

---

## 🔒 Security Best Practices

1. **Always use HTTPS in production** - OAuth requires secure connection
2. **Store tokens securely** - Use httpOnly cookies or secure storage
3. **Validate all inputs** - File types, sizes, formats
4. **Encrypt sensitive data** - Aadhar, Bank Account, PAN, License numbers
5. **Set strong passwords** - Minimum 8 characters
6. **Implement rate limiting** - Prevent brute force attacks
7. **Monitor failed attempts** - Lock accounts after 5 failed attempts

---

## 📞 Support

For issues or questions:
- Email: support@instanteats.com
- Docs: https://docs.instanteats.com
- Issues: https://github.com/instanteats/issues
