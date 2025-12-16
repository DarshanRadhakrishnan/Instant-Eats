-- Smart Cancellation System - Initial Data Setup
-- Run this after running: prisma migrate dev --name add_smart_cancellation

-- Insert default cancellation policies
INSERT INTO "CancellationPolicy" (
  "id",
  "status",
  "maxCancellationTime",
  "refundPercentage",
  "cancellationFee",
  "description",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'cuid_pending',
    'pending',
    2,
    100,
    0,
    'Full refund - order not yet confirmed by restaurant',
    true,
    NOW(),
    NOW()
  ),
  (
    'cuid_confirmed',
    'confirmed',
    5,
    100,
    0,
    'Full refund - limited time window before food preparation',
    true,
    NOW(),
    NOW()
  ),
  (
    'cuid_preparing',
    'preparing',
    15,
    80,
    5,
    '80% refund minus ₹5 fee - food preparation already started',
    true,
    NOW(),
    NOW()
  ),
  (
    'cuid_ready',
    'ready',
    0,
    0,
    0,
    'No cancellation allowed - food is ready for pickup',
    true,
    NOW(),
    NOW()
  ),
  (
    'cuid_picked_up',
    'picked_up',
    0,
    0,
    0,
    'No cancellation allowed - food is out for delivery',
    true,
    NOW(),
    NOW()
  );

-- Verify insertion
SELECT * FROM "CancellationPolicy" WHERE "isActive" = true;
