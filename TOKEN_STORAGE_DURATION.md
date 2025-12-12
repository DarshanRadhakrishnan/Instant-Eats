# 🔐 Token Storage & Duration Implementation Guide

**Date Implemented:** December 12, 2025  
**Status:** ✅ Complete  

---

## 📊 Token System Overview

### Dual Token Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LOGIN REQUEST                           │
│              (email, password, city, device)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │  ✅ Credentials Verified               │
        │  ✅ Device Info Captured               │
        │  ✅ Failed Attempts Checked            │
        │  ✅ Account Status Verified            │
        └────────────────┬───────────────────────┘
                         │
         ┌───────────────┴────────────────┐
         │                                │
         ▼                                ▼
    ACCESS TOKEN                 REFRESH TOKEN
    (Short-lived)                (Long-lived)
    ┌──────────────┐             ┌──────────────┐
    │ 15m-2h       │             │ 7-30 days    │
    │ In memory    │             │ DB + Cookie  │
    │ Stateless    │             │ Revocable    │
    │ JWT          │             │ Hashed       │
    └──────────────┘             └──────────────┘
         │                            │
         │ Response Body              │ HttpOnly Cookie
         └──────────────┬─────────────┘
                        │
                        ▼
            ┌──────────────────────────┐
            │   CLIENT (Frontend)      │
            │ - Store access in state  │
            │ - Cookie auto-included   │
            └──────────────────────────┘
```

---

## ⏰ Token Duration by User Type

| Feature | Customers | Restaurant Owners | Delivery Partners |
|---------|-----------|-------------------|-------------------|
| **Access Token** | 15 minutes | 30 minutes | 2 hours |
| **Refresh Token** | 7 days | 30 days | 30 days |
| **Max Sessions** | 5 devices | 3 devices | 2 devices |
| **Typical Usage** | Mobile app | Web dashboard | Mobile delivery app |
| **Activity** | Frequent | Regular | Active (long deliveries) |

---

## 📁 Files Created/Updated

### 1. **config/tokens.ts** (NEW)
**Location:** `services/auth-service/src/config/tokens.ts`

Contains:
- `TOKEN_CONFIG` - Access & refresh token durations
- `MAX_SESSIONS` - Max active sessions per user type
- `JWT_SECRETS` - Secret keys for token signing
- Email verification & password reset tokens

```typescript
// Example:
TOKEN_CONFIG.ACCESS_TOKEN.customer = { expiresIn: '15m' }
TOKEN_CONFIG.REFRESH_TOKEN.customer = { expiresIn: '7d' }
TOKEN_CONFIG.MAX_SESSIONS.customer = 5
```

### 2. **services/tokenService.ts** (NEW)
**Location:** `services/auth-service/src/services/tokenService.ts`

Core service with methods:
- `generateAccessToken()` - Create short-lived JWT
- `generateRefreshToken()` - Create long-lived DB token
- `verifyAccessToken()` - Validate access tokens
- `verifyRefreshToken()` - Validate refresh tokens
- `revokeRefreshToken()` - Logout from one device
- `revokeAllUserTokens()` - Logout from all devices

### 3. **routes/login.ts** (UPDATED)
**Location:** `services/auth-service/src/routes/login.ts`

Enhanced with:
- ✅ Dual token generation
- ✅ Failed login attempt tracking
- ✅ Account locking (5 attempts = 15 min lock)
- ✅ Login history logging
- ✅ HttpOnly cookie for refresh token
- ✅ Device info tracking

### 4. **routes/refresh.ts** (UPDATED)
**Location:** `services/auth-service/src/routes/refresh.ts`

Implements:
- Access token refresh endpoint
- Automatic token rotation
- Refresh token validation

### 5. **routes/logout.ts** (NEW)
**Location:** `services/auth-service/src/routes/logout.ts`

Provides endpoints:
- `POST /auth/logout` - Logout from current device
- `POST /auth/logout-all` - Logout from all devices
- `GET /auth/sessions` - View active sessions
- `DELETE /auth/sessions/:id` - Revoke specific session

### 6. **prisma/schema.prisma** (UPDATED)
**Changes:**
- Added `RefreshToken` model (stores hashed tokens in DB)
- Added `LoginHistory` model (audit trail)
- Enhanced `User` model with:
  - `failedLoginAttempts`
  - `accountLockedUntil`
  - `lastLogin`, `lastLoginIp`
  - `twoFactorEnabled`, `twoFactorSecret`

### 7. **src/index.ts** (UPDATED)
**Changes:**
- Registered `refreshRouter`
- Registered `logoutRouter`
- Updated health check endpoint

### 8. **.env.example** (UPDATED)
**New variables:**
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `EMAIL_SECRET`
- `PASSWORD_RESET_SECRET`
- Token duration configs
- Max sessions configs

---

## 🔄 Login Flow with Dual Tokens

### Step 1: User Submits Credentials
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "city": "San Francisco",
    "deviceName": "Chrome on MacBook"
  }'
```

### Step 2: Server Validates & Generates Tokens

```typescript
// Check credentials, device, and account status
const user = await prisma.user.findUnique({ where: { email } });
if (!validPassword) {
  // Increment failed attempts
  // Lock account if >= 5 attempts
}

// Generate tokens
const accessToken = TokenService.generateAccessToken(payload); // 15m
const refreshToken = await TokenService.generateRefreshToken(payload, deviceInfo); // 7 days

// Store refresh token hash in DB with device info
```

### Step 3: Server Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "user123",
    "email": "user@example.com",
    "role": "customer",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

**Headers:**
```
Set-Cookie: refreshToken=abc123def456...; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=604800
```

### Step 4: Client Usage

```typescript
// React: Store in state, NOT localStorage
const [accessToken, setAccessToken] = useState(null);

// Make API request
fetch('https://api.example.com/orders', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include' // ✅ Include HttpOnly cookie
});

// Browser automatically includes refreshToken cookie
```

---

## 🔄 Token Refresh Flow

### When Access Token Expires

```
Client tries to access protected resource
          ↓
Gets 401 Unauthorized
          ↓
Sends refresh request with refreshToken cookie
          ↓
POST /auth/refresh
{
  "city": "San Francisco"
}
          ↓
Server validates refresh token in DB
          ↓
Generates new access token (15m)
          ↓
Returns new access token
```

### Example Frontend Implementation

```typescript
// Auto-refresh before expiry (React)
useEffect(() => {
  if (!accessToken) return;

  // Refresh 1 minute before expiry (14 min for 15 min token)
  const timeout = setTimeout(async () => {
    const response = await fetch('http://localhost:3001/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ✅ Send HttpOnly cookie
      body: JSON.stringify({ city: userCity })
    });

    const data = await response.json();
    if (data.success) {
      setAccessToken(data.data.accessToken);
    } else {
      // Refresh token expired, logout user
      logout();
    }
  }, 14 * 60 * 1000); // 14 minutes

  return () => clearTimeout(timeout);
}, [accessToken]);
```

---

## 🚪 Logout Flow

### Option 1: Logout from Current Device

```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "abc123def456..."
  }' \
  -b "refreshToken=abc123def456..."
```

**Result:**
- Current refresh token revoked (isRevoked = true)
- Other devices remain active
- Access token continues working until expiry

### Option 2: Logout from All Devices

```bash
curl -X POST http://localhost:3001/auth/logout-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -b "refreshToken=abc123def456..."
```

**Result:**
- All refresh tokens revoked
- All devices logged out immediately
- User must login again on all devices

### Option 3: View Active Sessions

```bash
curl http://localhost:3001/auth/sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -b "refreshToken=abc123def456..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeSessions": 2,
    "sessions": [
      {
        "id": "session123",
        "deviceInfo": "Chrome on MacBook",
        "ipAddress": "192.168.1.1",
        "lastUsedAt": "2025-12-12T10:30:00Z",
        "createdAt": "2025-12-12T10:00:00Z"
      },
      {
        "id": "session456",
        "deviceInfo": "Safari on iPhone",
        "ipAddress": "192.168.1.50",
        "lastUsedAt": "2025-12-12T09:15:00Z",
        "createdAt": "2025-12-11T14:30:00Z"
      }
    ]
  }
}
```

### Option 4: Revoke Specific Session

```bash
curl -X DELETE http://localhost:3001/auth/sessions/session456 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -b "refreshToken=abc123def456..."
```

---

## 🔐 Security Features Implemented

### 1. Access Token (15m - 2h)
- ✅ Short expiry = limited damage if compromised
- ✅ Stored in memory only (not localStorage)
- ✅ Stateless JWT (fast verification)
- ✅ Unique tokenId per token

### 2. Refresh Token (7-30 days)
- ✅ Stored in database (hashable & revocable)
- ✅ HttpOnly cookie (XSS protection)
- ✅ Secure flag (HTTPS only in production)
- ✅ SameSite=Strict (CSRF protection)
- ✅ Hash stored in DB (never plain text)

### 3. Login Security
- ✅ Failed attempt tracking
- ✅ Account locking (5 attempts → 15 min lock)
- ✅ Device information tracking
- ✅ IP address logging
- ✅ Login history audit trail

### 4. Session Management
- ✅ Max sessions per user (5 for customers, 3 for restaurant, 2 for delivery)
- ✅ Automatic revocation of oldest session when limit exceeded
- ✅ Single device logout (one refresh token)
- ✅ All devices logout (all refresh tokens)
- ✅ View and revoke specific sessions

### 5. Token Rotation
- ✅ Auto-refresh access token before expiry
- ✅ Refresh token can be rotated
- ✅ Old tokens can be invalidated

---

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd services/auth-service
npm install
```

### 2. Generate Encryption Keys
```bash
# Generate JWT secrets (minimum 32 characters)
openssl rand -base64 32
# Example output: kj3lh4kl5jh6kj7lh8kj9lh0kj1lh2kj3lh4kl5jh6kj7lh8=

# Generate another one for refresh token secret
openssl rand -base64 32
# Example output: qw9er8ty7ui6op5as4df3gh2jk1lz9xc8vb7nm6qw5er4ty=
```

### 3. Update .env
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and add the generated secrets:
JWT_ACCESS_SECRET=kj3lh4kl5jh6kj7lh8kj9lh0kj1lh2kj3lh4kl5jh6kj7lh8=
JWT_REFRESH_SECRET=qw9er8ty7ui6op5as4df3gh2jk1lz9xc8vb7nm6qw5er4ty=
EMAIL_SECRET=zx9cv8bn7mk6lq5ws4ed3rf2tg1yh0ju9ki8ol7pq6wr5es=
PASSWORD_RESET_SECRET=as0qw9ed8rf7tg6yh5uj4ik3ol2pm1lk0qw9ed8rf7tg6yh=

# Update database URLs
POSTGRES_SHARD_A_URL=postgresql://user:password@localhost:5432/shard_a
POSTGRES_SHARD_B_URL=postgresql://user:password@localhost:5433/shard_b
POSTGRES_SHARD_C_URL=postgresql://user:password@localhost:5434/shard_c
```

### 4. Run Database Migrations
```bash
# Create and migrate databases
npm run prisma:migrate:shardA
npm run prisma:migrate:shardB
npm run prisma:migrate:shardC
```

### 5. Start Auth Service
```bash
npm run dev
# Output: ✅ Auth Service is running on port 3001
```

---

## 🧪 Testing the Token System

### Test 1: Login with Valid Credentials
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "SecurePassword123!",
    "city": "San Francisco",
    "deviceName": "Test Device"
  }' \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "...",
    "email": "customer@example.com",
    "role": "customer",
    "accessToken": "eyJ...",
    "expiresIn": "15m"
  }
}
```

**Expected Cookie Header:**
```
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/auth
```

### Test 2: Token Refresh
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"city": "San Francisco"}' \
  -b "refreshToken=..." \
  -v
```

### Test 3: Failed Login Attempts
```bash
# First 4 attempts (fail)
for i in {1..4}; do
  curl -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "customer@example.com",
      "password": "WrongPassword",
      "city": "San Francisco"
    }'
done

# 5th attempt (account locked)
# Expected: 423 "Account temporarily locked"
```

### Test 4: Session Management
```bash
# Get active sessions
curl http://localhost:3001/auth/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b "refreshToken=$REFRESH_TOKEN"

# Logout from one device
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"refreshToken": "$REFRESH_TOKEN"}' \
  -b "refreshToken=$REFRESH_TOKEN"

# Logout from all devices
curl -X POST http://localhost:3001/auth/logout-all \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b "refreshToken=$REFRESH_TOKEN"
```

---

## 📊 Database Schema Changes

### RefreshToken Model
```sql
CREATE TABLE "RefreshToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,  -- Hashed token
  "deviceInfo" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now(),
  "lastUsedAt" TIMESTAMP DEFAULT now(),
  "isRevoked" BOOLEAN DEFAULT false,
  "revokedAt" TIMESTAMP,
  "revokedReason" TEXT,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE INDEX idx_refreshtoken_userid ON "RefreshToken"("userId");
CREATE INDEX idx_refreshtoken_token ON "RefreshToken"("token");
```

### LoginHistory Model
```sql
CREATE TABLE "LoginHistory" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "failureReason" TEXT,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT,
  "deviceInfo" TEXT,
  "location" TEXT,
  "timestamp" TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE INDEX idx_loginhistory_userid ON "LoginHistory"("userId");
CREATE INDEX idx_loginhistory_email ON "LoginHistory"("email");
CREATE INDEX idx_loginhistory_timestamp ON "LoginHistory"("timestamp");
```

### User Model Enhancements
```sql
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "lastLogin" TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "lastLoginIp" TEXT;
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INT DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "accountLockedUntil" TIMESTAMP;
```

---

## 🚀 Production Deployment Checklist

- [ ] Generate strong JWT secrets (min 32 chars)
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS (secure flag = true)
- [ ] Configure SameSite cookie policy
- [ ] Setup database backups
- [ ] Enable login history archiving
- [ ] Monitor failed login attempts
- [ ] Setup email notifications for account lockouts
- [ ] Configure token secret rotation schedule
- [ ] Setup monitoring/alerting for token service
- [ ] Test token refresh in production
- [ ] Test logout from all devices
- [ ] Performance test with load (token generation)
- [ ] Setup session cleanup job (expired tokens)

---

## 🔍 Troubleshooting

### Problem: Token refresh returns 401
**Solution:**
1. Check if refresh token exists in database: `SELECT * FROM "RefreshToken" WHERE token = hash('...')`
2. Verify `isRevoked = false`
3. Check `expiresAt > now()`
4. Ensure HttpOnly cookie is being sent with requests

### Problem: Account locked after login attempts
**Solution:**
- Account locks for 15 minutes after 5 failed attempts
- Check `failedLoginAttempts` in User table
- Clear attempts after successful login

### Problem: Token still works after logout
**Solution:**
- Access tokens continue working until expiry (stateless JWT)
- Only refresh tokens are revoked
- This is intentional - logout revokes ability to get new access tokens
- To invalidate all access tokens immediately, implement token blacklist (optional)

### Problem: Cookie not being set
**Checklist:**
- [ ] Is NODE_ENV=production? (secure flag requires HTTPS)
- [ ] Is path=/auth correct?
- [ ] Is credentials: 'include' in fetch?
- [ ] Is withCredentials: true in Axios?

---

## 📚 Related Documentation

- [AUTH_DOCUMENTATION_INDEX.md](AUTH_DOCUMENTATION_INDEX.md) - Complete documentation index
- [THREE_TIER_AUTH_API.md](THREE_TIER_AUTH_API.md) - API endpoint reference
- [THREE_TIER_IMPLEMENTATION_GUIDE.md](THREE_TIER_IMPLEMENTATION_GUIDE.md) - Complete setup guide

---

**Implementation Complete ✅**  
*Token storage and duration system fully implemented with dual token architecture, security features, and session management.*
