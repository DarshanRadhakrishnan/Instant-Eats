/**
 * Token Configuration for Three-Tier Authentication System
 * Defines access token duration, refresh token duration, and security settings
 */

export const TOKEN_CONFIG = {
  // Access tokens (short-lived, stateless, in memory)
  ACCESS_TOKEN: {
    customer: {
      expiresIn: '15m', // 15 minutes - short window for security
      type: 'access'
    },
    restaurant_owner: {
      expiresIn: '30m', // 30 minutes - dashboard usage
      type: 'access'
    },
    delivery_partner: {
      expiresIn: '2h', // 2 hours - long deliveries
      type: 'access'
    },
    admin: {
      expiresIn: '1h', // 1 hour - admin panel
      type: 'access'
    }
  },

  // Refresh tokens (long-lived, stored in database, in HttpOnly cookies)
  REFRESH_TOKEN: {
    customer: {
      expiresIn: '7d', // 7 days
      type: 'refresh'
    },
    restaurant_owner: {
      expiresIn: '30d', // 30 days
      type: 'refresh'
    },
    delivery_partner: {
      expiresIn: '30d', // 30 days
      type: 'refresh'
    },
    admin: {
      expiresIn: '30d', // 30 days
      type: 'refresh'
    }
  },

  // Email verification tokens
  EMAIL_VERIFICATION: {
    expiresIn: '24h'
  },

  // Password reset tokens
  PASSWORD_RESET: {
    expiresIn: '1h'
  },

  // Maximum active sessions per user (devices)
  MAX_SESSIONS: {
    customer: 5, // 5 devices
    restaurant_owner: 3, // 3 devices
    delivery_partner: 2, // 2 devices (phone + tablet)
    admin: 3 // 3 devices
  }
};

export const JWT_SECRETS = {
  ACCESS_TOKEN_SECRET:
    process.env.JWT_ACCESS_SECRET ||
    'access-secret-key-change-in-production-min-32-chars',
  REFRESH_TOKEN_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    'refresh-secret-key-change-in-production-min-32-chars',
  EMAIL_VERIFICATION_SECRET:
    process.env.EMAIL_SECRET || 'email-secret-key-change-in-production',
  PASSWORD_RESET_SECRET:
    process.env.PASSWORD_RESET_SECRET ||
    'password-reset-secret-change-in-production'
};

/**
 * SECURITY NOTES:
 *
 * ✅ Access Token (15min - 2hrs):
 *    - Sent in response body
 *    - Stored in memory (React state)
 *    - Stateless (JWT)
 *    - Short expiry = limited damage window if compromised
 *
 * ✅ Refresh Token (7-30 days):
 *    - Sent as HttpOnly cookie
 *    - Stored in database (can be revoked)
 *    - Can be invalidated immediately
 *    - Protected from XSS attacks
 *
 * 🔐 Token Rotation:
 *    - Access token auto-refreshed before expiry
 *    - Old refresh tokens can be revoked
 *    - Session tracking per device
 *
 * 🛡️ Security Best Practices:
 *    - NEVER store access tokens in localStorage
 *    - ALWAYS use HttpOnly cookies for refresh tokens
 *    - Implement CSRF protection
 *    - Use HTTPS in production
 *    - Rotate secrets regularly
 *    - Monitor failed login attempts
 *    - Lock accounts after 5 failed attempts (15 min)
 */
