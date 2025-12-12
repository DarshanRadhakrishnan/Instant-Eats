import express from 'express';
import { customerGoogleAuthRouter } from './routes/customer/googleAuth';
import { customerEmailAuthRouter } from './routes/customer/emailAuth';
import { restaurantRegisterRouter } from './routes/restaurant/register';
import { deliveryPartnerRegisterRouter } from './routes/delivery/register';
import { loginRoute } from './routes/login';
import { refreshRouter } from './routes/refresh';
import { logoutRouter } from './routes/logout';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    registrationTypes: ['customer', 'restaurant_owner', 'delivery_partner'],
    tokenSystem: 'Dual token (access + refresh)',
    securityFeatures: [
      'Access token in memory',
      'Refresh token in HttpOnly cookie',
      'Account locking after 5 failed attempts',
      'Device tracking',
      'Login history'
    ]
  });
});

// ==================== CUSTOMER ROUTES ====================
// Google OAuth
app.use('/auth', customerGoogleAuthRouter);

// Email/Password
app.use('/auth', customerEmailAuthRouter);

// ==================== LOGIN & TOKEN MANAGEMENT ====================
// Login endpoint (provides access + refresh tokens)
app.post('/auth/login', loginRoute);

// Refresh access token endpoint
app.use('/auth', refreshRouter);

// Logout endpoints (logout from device, all devices, manage sessions)
app.use('/auth', logoutRouter);

// ==================== RESTAURANT OWNER ROUTES ====================
// Step 1: Account Creation
// Step 2: Business Information
// Step 3: Document Upload
// Step 4: Bank Details
app.use('/auth', restaurantRegisterRouter);

// ==================== DELIVERY PARTNER ROUTES ====================
// Step 1: Account Creation
// Step 2: Personal Details
// Step 3: Vehicle Details
// Step 4: Document Upload
// Step 5: Bank Details
app.use('/auth', deliveryPartnerRegisterRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Auth Service is running on port ${PORT}`);
  console.log(`🔐 Supported registration types: Customer, Restaurant Owner, Delivery Partner`);
  console.log(`🔒 Token System: Dual token (access + refresh)`);
  console.log(`📍 Security Features: Account locking, device tracking, login history`);
});

