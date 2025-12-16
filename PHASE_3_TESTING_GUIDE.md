# Phase 3 Smart Cancellation System - Testing Guide

## Test Environment Setup

### Prerequisites
```bash
# 1. Start all required services
docker-compose up -d

# 2. Ensure databases are initialized
cd services/order-service
npx prisma migrate dev

# 3. Insert cancellation policies
psql -U postgres -d order_db -f prisma/seed_cancellation_policies.sql

# 4. Start order service
npm run dev
```

## Test Scenarios

### Test Suite 1: Cancellation Info Endpoint

#### Test 1.1: Get Cancellation Info - PENDING Status (Cancellable)
**Setup:** Create order in PENDING status
```bash
# First, create an order
curl -X POST "http://localhost:3002/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-001",
    "restaurantId": "rest-001",
    "items": [{"id": "item-1", "quantity": 2}],
    "deliveryAddress": "123 Main St",
    "city": "bangalore",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "totalAmount": 500
  }'

# Response: Get orderId from response (e.g., "order-uuid-123")
```

**Test Execution:**
```bash
curl -X GET "http://localhost:3002/orders/order-uuid-123/cancellation-info?city=bangalore"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid-123",
    "orderStatus": "pending",
    "orderTotal": 500,
    "createdAt": "2024-01-15T10:00:00Z",
    "canCancel": true,
    "reason": "Order can be cancelled. Full refund - order not yet confirmed by restaurant",
    "refundAmount": 500,
    "refundPercentage": 100,
    "cancellationFee": 0,
    "minutesElapsed": 0,
    "maxAllowedMinutes": 2
  }
}
```

**Validation:**
- ✅ `canCancel` = true
- ✅ `refundAmount` = 500 (100% of total)
- ✅ `cancellationFee` = 0

---

#### Test 1.2: Get Cancellation Info - CONFIRMED Status (Within Window)
**Setup:** Update order to CONFIRMED status
```bash
curl -X PATCH "http://localhost:3002/orders/order-uuid-123/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "city": "bangalore"
  }'
```

**Test Execution:**
```bash
curl -X GET "http://localhost:3002/orders/order-uuid-123/cancellation-info?city=bangalore"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid-123",
    "orderStatus": "confirmed",
    "orderTotal": 500,
    "createdAt": "2024-01-15T10:00:00Z",
    "canCancel": true,
    "reason": "Order can be cancelled. Full refund - limited time window before food preparation",
    "refundAmount": 500,
    "refundPercentage": 100,
    "cancellationFee": 0,
    "minutesElapsed": 3,
    "maxAllowedMinutes": 5
  }
}
```

**Validation:**
- ✅ `canCancel` = true
- ✅ `refundAmount` = 500
- ✅ `minutesElapsed` ≤ 5

---

#### Test 1.3: Get Cancellation Info - PREPARING Status (With Fee)
**Setup:** Update order to PREPARING status
```bash
curl -X PATCH "http://localhost:3002/orders/order-uuid-123/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "preparing",
    "city": "bangalore"
  }'
```

**Test Execution:**
```bash
curl -X GET "http://localhost:3002/orders/order-uuid-123/cancellation-info?city=bangalore"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid-123",
    "orderStatus": "preparing",
    "orderTotal": 500,
    "createdAt": "2024-01-15T10:00:00Z",
    "canCancel": true,
    "reason": "Order can be cancelled. 80% refund minus ₹5 fee - food preparation already started",
    "refundAmount": 395,
    "refundPercentage": 80,
    "cancellationFee": 5,
    "minutesElapsed": 8,
    "maxAllowedMinutes": 15
  }
}
```

**Validation:**
- ✅ `canCancel` = true
- ✅ `refundAmount` = 395 (500 × 0.8 - 5)
- ✅ `cancellationFee` = 5

---

#### Test 1.4: Get Cancellation Info - READY Status (Not Cancellable)
**Setup:** Update order to READY status
```bash
curl -X PATCH "http://localhost:3002/orders/order-uuid-123/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ready",
    "city": "bangalore"
  }'
```

**Test Execution:**
```bash
curl -X GET "http://localhost:3002/orders/order-uuid-123/cancellation-info?city=bangalore"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid-123",
    "orderStatus": "ready",
    "orderTotal": 500,
    "createdAt": "2024-01-15T10:00:00Z",
    "canCancel": false,
    "reason": "No cancellation allowed - food is ready for pickup",
    "refundAmount": 0,
    "refundPercentage": 0,
    "cancellationFee": 0
  }
}
```

**Validation:**
- ✅ `canCancel` = false
- ✅ `refundAmount` = 0

---

#### Test 1.5: Get Cancellation Info - Window Closed
**Setup:** Create PENDING order and wait >2 minutes OR mock time
```bash
# Mock using database (for testing)
UPDATE "Order" SET "createdAt" = NOW() - INTERVAL '3 minutes' WHERE id = 'order-uuid-123';
UPDATE "Order" SET status = 'pending' WHERE id = 'order-uuid-123';
```

**Test Execution:**
```bash
curl -X GET "http://localhost:3002/orders/order-uuid-123/cancellation-info?city=bangalore"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid-123",
    "orderStatus": "pending",
    "orderTotal": 500,
    "createdAt": "2024-01-15T09:57:00Z",
    "canCancel": false,
    "reason": "Cancellation window closed. Max allowed: 2min, elapsed: 3min",
    "refundAmount": 0,
    "refundPercentage": 0,
    "cancellationFee": 0
  }
}
```

**Validation:**
- ✅ `canCancel` = false
- ✅ Window validation working correctly

---

### Test Suite 2: Cancel Order Endpoint

#### Test 2.1: Cancel PENDING Order (Full Refund)
**Setup:** Create new PENDING order
```bash
curl -X POST "http://localhost:3002/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-002",
    "restaurantId": "rest-002",
    "items": [{"id": "item-1", "quantity": 1}],
    "deliveryAddress": "456 Oak Ave",
    "city": "bangalore",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "totalAmount": 600
  }'
# Note: save order-uuid-456
```

**Test Execution:**
```bash
curl -X DELETE "http://localhost:3002/orders/order-uuid-456/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "bangalore",
    "cancelledBy": "customer",
    "reason": "Changed my mind"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "cancellation": {
      "id": "cancellation-id-1",
      "orderId": "order-uuid-456",
      "cancelledBy": "customer",
      "cancelledAt": "2024-01-15T10:30:00Z",
      "reason": "Changed my mind",
      "refundAmount": 600,
      "refundPercentage": 100,
      "cancellationFee": 0,
      "paymentRefundId": "refund-12345",
      "notificationSent": true,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "refundInfo": {
      "refundAmount": 600,
      "refundPercentage": 100,
      "cancellationFee": 0,
      "paymentRefundId": "refund-12345"
    }
  }
}
```

**Validation:**
- ✅ Order status updated to 'cancelled'
- ✅ Refund amount = 600
- ✅ Payment service called
- ✅ Notification sent
- ✅ RabbitMQ event published

**Database Checks:**
```sql
-- Verify order cancelled
SELECT id, status FROM "Order" WHERE id = 'order-uuid-456';
-- Expected: cancelled

-- Verify cancellation record
SELECT * FROM "OrderCancellation" WHERE orderId = 'order-uuid-456';
```

---

#### Test 2.2: Cancel PREPARING Order (With Fee)
**Setup:** Create and update order to PREPARING
```bash
curl -X POST "http://localhost:3002/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-003",
    "restaurantId": "rest-003",
    "items": [{"id": "item-1", "quantity": 2}],
    "deliveryAddress": "789 Pine Rd",
    "city": "bangalore",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "totalAmount": 800
  }'

# Update to PREPARING
curl -X PATCH "http://localhost:3002/orders/order-uuid-789/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "preparing", "city": "bangalore"}'
```

**Test Execution:**
```bash
curl -X DELETE "http://localhost:3002/orders/order-uuid-789/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "bangalore",
    "cancelledBy": "customer",
    "reason": "Food taking too long"
  }'
```

**Expected Response (Refund Calculation):**
```
Refund = (800 × 0.8) - 5 = 640 - 5 = 635
```

```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "refundInfo": {
      "refundAmount": 635,
      "refundPercentage": 80,
      "cancellationFee": 5,
      "paymentRefundId": "refund-12346"
    }
  }
}
```

**Validation:**
- ✅ Refund amount = 635
- ✅ Fee deducted correctly

---

#### Test 2.3: Attempt to Cancel Already-Cancelled Order
**Setup:** Use previously cancelled order
```bash
curl -X DELETE "http://localhost:3002/orders/order-uuid-456/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "bangalore",
    "cancelledBy": "customer",
    "reason": "Second attempt"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Order is already cancelled"
}
```

**Validation:**
- ✅ Idempotency check working
- ✅ Prevents duplicate cancellations

---

#### Test 2.4: Attempt to Cancel READY Order (Window Closed)
**Setup:** Create and update order to READY
```bash
curl -X PATCH "http://localhost:3002/orders/order-uuid-abc/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "ready", "city": "bangalore"}'
```

**Test Execution:**
```bash
curl -X DELETE "http://localhost:3002/orders/order-uuid-abc/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "bangalore",
    "cancelledBy": "customer",
    "reason": "Order ready"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "No cancellation allowed - food is ready for pickup",
  "data": {
    "canCancel": false,
    "reason": "No cancellation allowed - food is ready for pickup",
    "refundAmount": 0,
    "refundPercentage": 0,
    "cancellationFee": 0
  }
}
```

**Validation:**
- ✅ Cannot cancel non-cancellable status
- ✅ Prevents improper cancellations

---

#### Test 2.5: Cancel by Restaurant
**Test Execution:**
```bash
curl -X DELETE "http://localhost:3002/orders/order-uuid-456/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "bangalore",
    "cancelledBy": "restaurant",
    "reason": "Out of ingredients"
  }'
```

**Validation:**
- ✅ `cancelledBy` = "restaurant"
- ✅ Same refund calculation applies
- ✅ Event published with correct cancelledBy value

---

### Test Suite 3: Error Handling

#### Test 3.1: Invalid Order ID
```bash
curl -X GET "http://localhost:3002/orders/invalid-id/cancellation-info?city=bangalore"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

#### Test 3.2: Missing City Parameter
```bash
curl -X DELETE "http://localhost:3002/orders/order-uuid-456/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "cancelledBy": "customer",
    "reason": "Test"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "City and cancelledBy are required"
}
```

---

#### Test 3.3: Payment Service Unavailable
**Setup:** Stop payment service or mock failure

**Test Execution:**
```bash
curl -X DELETE "http://localhost:3002/orders/order-uuid-new/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "bangalore",
    "cancelledBy": "customer",
    "reason": "Test"
  }'
```

**Expected Behavior:**
- ✅ Cancellation still processes
- ✅ `paymentRefundId` = null
- ✅ Error logged
- ✅ Manual refund handling required

---

### Test Suite 4: Performance Tests

#### Test 4.1: Load Test - Concurrent Cancellations
```bash
# Using Apache Bench (ab)
ab -n 1000 -c 50 -p data.json -T application/json \
  "http://localhost:3002/orders/order-uuid-456/cancel"
```

**Expected Performance:**
- Response time: <100ms (p95)
- Throughput: >100 req/sec
- No 5xx errors

---

#### Test 4.2: Database Query Performance
```sql
-- Check indexes are being used
EXPLAIN ANALYZE
SELECT * FROM "CancellationPolicy" WHERE status = 'confirmed';

-- Should use index, not sequential scan
EXPLAIN ANALYZE
SELECT * FROM "OrderCancellation" 
WHERE orderId = 'order-uuid-456';
```

**Expected:** Index scan with <1ms execution

---

## Monitoring Queries

### Monitor Cancellations in Real-Time
```sql
SELECT 
  DATE(cancelledAt) as date,
  COUNT(*) as total_cancellations,
  SUM(refundAmount) as total_refunds,
  AVG(refundAmount) as avg_refund,
  COUNT(CASE WHEN cancelledBy = 'customer' THEN 1 END) as customer_cancellations,
  COUNT(CASE WHEN cancelledBy = 'restaurant' THEN 1 END) as restaurant_cancellations
FROM "OrderCancellation"
GROUP BY DATE(cancelledAt)
ORDER BY date DESC;
```

### Check Policy Usage
```sql
SELECT 
  cp.status,
  cp.maxCancellationTime,
  cp.refundPercentage,
  COUNT(oc.id) as cancellations_using_policy,
  AVG(oc.refundAmount) as avg_refund
FROM "CancellationPolicy" cp
LEFT JOIN "OrderCancellation" oc ON cp.status = (SELECT status FROM "Order" WHERE id = oc.orderId)
WHERE cp.isActive = true
GROUP BY cp.status;
```

---

## Regression Testing Checklist

- [ ] GET /orders/:id works (existing functionality)
- [ ] POST /orders works (existing functionality)
- [ ] PATCH /orders/:id/status works (existing functionality)
- [ ] GET /orders/:id/cancellation-info returns correct info
- [ ] DELETE /orders/:id/cancel processes cancellation
- [ ] Refund calculation is accurate
- [ ] Payment service integration works
- [ ] Notification service integration works
- [ ] RabbitMQ events are published
- [ ] Database records are created correctly
- [ ] Indexes improve query performance
- [ ] Error handling works for all edge cases
- [ ] No regression in existing endpoints

---

## Documentation Generated
- ✅ PHASE_3_SMART_CANCELLATION.md
- ✅ PHASE_3_TESTING_GUIDE.md (this file)
- ✅ seed_cancellation_policies.sql
