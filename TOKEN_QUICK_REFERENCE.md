# 🔑 Token System Quick Reference

## Token Durations

```
CUSTOMER
├─ Access Token:   15 minutes
├─ Refresh Token:  7 days
└─ Max Sessions:   5 devices

RESTAURANT OWNER
├─ Access Token:   30 minutes
├─ Refresh Token:  30 days
└─ Max Sessions:   3 devices

DELIVERY PARTNER
├─ Access Token:   2 hours
├─ Refresh Token:  30 days
└─ Max Sessions:   2 devices
```

---

## API Endpoints Cheat Sheet

### Login
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "city": "San Francisco",
  "deviceName": "Chrome on MacBook" (optional)
}

Response:
{
  "accessToken": "eyJ...",
  "expiresIn": "15m",
  "refreshToken": "abc123..." (for testing)
}

Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
```

### Refresh Token
```bash
POST /auth/refresh
{
  "city": "San Francisco"
}

Response:
{
  "accessToken": "eyJ...",
  "expiresIn": "15m"
}
```

### Logout Current Device
```bash
POST /auth/logout
Authorization: Bearer <ACCESS_TOKEN>

Optional body:
{
  "refreshToken": "abc123..."
}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Logout All Devices
```bash
POST /auth/logout-all
Authorization: Bearer <ACCESS_TOKEN>

Response:
{
  "success": true,
  "message": "Logged out from all devices"
}
```

### View Active Sessions
```bash
GET /auth/sessions
Authorization: Bearer <ACCESS_TOKEN>

Response:
{
  "activeSessions": 2,
  "sessions": [
    {
      "id": "session123",
      "deviceInfo": "Chrome on MacBook",
      "ipAddress": "192.168.1.1",
      "lastUsedAt": "2025-12-12T10:30:00Z",
      "createdAt": "2025-12-12T10:00:00Z"
    }
  ]
}
```

### Revoke Specific Session
```bash
DELETE /auth/sessions/:sessionId
Authorization: Bearer <ACCESS_TOKEN>

Response:
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

## Frontend Integration Examples

### React with Axios
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true // ✅ Include HttpOnly cookie
});

// Store access token in state
const [accessToken, setAccessToken] = useState(null);

// Login
const login = async (email, password, city) => {
  const res = await api.post('/auth/login', {
    email,
    password,
    city
  });
  setAccessToken(res.data.data.accessToken);
};

// Use in requests
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// Auto-refresh before expiry
useEffect(() => {
  const timer = setTimeout(async () => {
    const res = await api.post('/auth/refresh', { city });
    setAccessToken(res.data.data.accessToken);
  }, 14 * 60 * 1000); // 14 min for 15 min token

  return () => clearTimeout(timer);
}, [accessToken]);

// Logout
const logout = async () => {
  await api.post('/auth/logout');
  setAccessToken(null);
};
```

### Fetch API
```typescript
// Login
const res = await fetch('/auth/login', {
  method: 'POST',
  credentials: 'include', // ✅ Include HttpOnly cookie
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, city })
});

const { accessToken } = await res.json();

// Make request with access token
const apiRes = await fetch('/api/orders', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include' // ✅ Include HttpOnly cookie
});
```

---

## Security Rules

### ✅ DO:
- Store access token in React state/memory
- Include credentials in fetch/axios
- Use HTTPS in production
- Generate strong JWT secrets (min 32 chars)
- Auto-refresh tokens before expiry
- Implement proper error handling

### ❌ DON'T:
- Store access token in localStorage
- Store access token in sessionStorage
- Log or expose refresh tokens
- Skip HTTPS in production
- Hardcode secrets in code
- Ignore 401 responses

---

## Error Handling

### 401 Unauthorized (Invalid/Expired Token)
```typescript
if (error.response.status === 401) {
  if (error.response.data.code === 'REFRESH_TOKEN_EXPIRED') {
    // Redirect to login
    window.location.href = '/login';
  } else {
    // Try to refresh
    const newToken = await refreshToken();
    if (!newToken) {
      window.location.href = '/login';
    }
  }
}
```

### 423 Locked Account
```typescript
if (error.response.status === 423) {
  const { minutesRemaining } = error.response.data;
  console.error(`Account locked for ${minutesRemaining} more minutes`);
}
```

### 403 Forbidden (Pending Verification)
```typescript
if (error.response.status === 403) {
  console.error(error.response.data.error);
  // Show message: "Account pending verification"
}
```

---

## Environment Variables

Required in `.env`:
```
JWT_ACCESS_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
EMAIL_SECRET=<min 32 chars>
PASSWORD_RESET_SECRET=<min 32 chars>

ACCESS_TOKEN_EXPIRY_CUSTOMER=15m
ACCESS_TOKEN_EXPIRY_RESTAURANT=30m
ACCESS_TOKEN_EXPIRY_DELIVERY=2h

REFRESH_TOKEN_EXPIRY_CUSTOMER=7d
REFRESH_TOKEN_EXPIRY_RESTAURANT=30d
REFRESH_TOKEN_EXPIRY_DELIVERY=30d

MAX_SESSIONS_CUSTOMER=5
MAX_SESSIONS_RESTAURANT=3
MAX_SESSIONS_DELIVERY=2

ACCOUNT_LOCK_THRESHOLD=5
ACCOUNT_LOCK_DURATION_MINUTES=15
```

---

## Database Queries

### Check refresh tokens for user
```sql
SELECT * FROM "RefreshToken"
WHERE "userId" = 'user123'
  AND "isRevoked" = false
  AND "expiresAt" > now()
ORDER BY "lastUsedAt" DESC;
```

### Check login history
```sql
SELECT * FROM "LoginHistory"
WHERE "userId" = 'user123'
ORDER BY "timestamp" DESC
LIMIT 20;
```

### Revoke all tokens for user
```sql
UPDATE "RefreshToken"
SET "isRevoked" = true,
    "revokedAt" = now(),
    "revokedReason" = 'admin_logout'
WHERE "userId" = 'user123'
  AND "isRevoked" = false;
```

### Find users with many failed attempts
```sql
SELECT * FROM "User"
WHERE "failedLoginAttempts" > 0
  AND "accountLockedUntil" > now()
ORDER BY "accountLockedUntil" DESC;
```

---

## Testing with cURL

### 1. Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "city": "San Francisco"
  }' \
  -c cookies.txt \
  -v
```

### 2. Extract tokens from response
```bash
# Save in variables
TOKEN="eyJ..."
REFRESH="abc123..."
```

### 3. Make authenticated request
```bash
curl http://localhost:3001/auth/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt \
  -v
```

### 4. Refresh token
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"city": "San Francisco"}' \
  -b cookies.txt \
  -v
```

### 5. Logout
```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt \
  -v
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Token still works after logout | Access tokens are stateless - wait for expiry or implement blacklist |
| Account locked forever | Check ACCOUNT_LOCK_DURATION_MINUTES in .env (should be 15) |
| Cookie not being set | Ensure NODE_ENV=production for secure flag, or development HTTPS |
| Token refresh returns 401 | Refresh token might be revoked or expired - check DB |
| Too many sessions error | Max sessions limit reached - user must logout from another device |

---

## Performance Notes

- **Token generation:** ~5ms (JWT signing)
- **Token verification:** ~2ms (JWT verification)
- **Refresh token lookup:** ~10-20ms (DB query with hash)
- **Max active tokens in DB:** Unlimited (cleanup old tokens periodically)

---

See [TOKEN_STORAGE_DURATION.md](TOKEN_STORAGE_DURATION.md) for complete documentation.
