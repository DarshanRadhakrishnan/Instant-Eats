# Phase 3 Commands - Quick Reference

## 🚀 Deployment Commands

### Database Setup
```bash
# Navigate to order service
cd services/order-service

# Create and apply migration
npx prisma migrate dev --name add_smart_cancellation

# Seed cancellation policies
psql -U postgres -d order_db -f prisma/seed_cancellation_policies.sql

# Verify policies loaded
psql -U postgres -d order_db -c "SELECT * FROM \"CancellationPolicy\" WHERE \"isActive\" = true;"
```

### Service Setup
```bash
# Install dependencies
npm install

# Build
npm run build

# Start development
npm run dev

# Start production
npm start
```

---

## 🧪 Testing Commands

### Test Single Endpoint - Get Cancellation Info
```bash
# Check if order can be cancelled
curl -X GET "http://localhost:3002/orders/order-123/cancellation-info?city=bangalore"

# Pretty print response
curl -s -X GET "http://localhost:3002/orders/order-123/cancellation-info?city=bangalore" | jq .
```

### Test Single Endpoint - Cancel Order
```bash
# Cancel order
curl -X DELETE "http://localhost:3002/orders/order-123/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "bangalore",
    "cancelledBy": "customer",
    "reason": "Changed my mind"
  }'

# Pretty print response
curl -s -X DELETE "http://localhost:3002/orders/order-123/cancel" \
  -H "Content-Type: application/json" \
  -d '{"city":"bangalore","cancelledBy":"customer","reason":"Test"}' | jq .
```

### Create Test Order First
```bash
# Create order to test with
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
```

---

## 📊 Database Queries

### View Active Cancellation Policies
```sql
SELECT * FROM "CancellationPolicy" WHERE "isActive" = true;
```

### View Cancellation Records
```sql
SELECT * FROM "OrderCancellation" ORDER BY "cancelledAt" DESC LIMIT 10;
```

### Check Order Status
```sql
SELECT id, status, "totalAmount", "createdAt" FROM "Order" WHERE id = 'order-123';
```

### View Order Cancellation Details
```sql
SELECT * FROM "OrderCancellation" WHERE "orderId" = 'order-123';
```

### Daily Cancellation Statistics
```sql
SELECT 
  DATE("cancelledAt") as date,
  COUNT(*) as total_cancellations,
  SUM("refundAmount") as total_refunds,
  AVG("refundAmount") as avg_refund,
  COUNT(CASE WHEN "cancelledBy" = 'customer' THEN 1 END) as customer_cancellations,
  COUNT(CASE WHEN "cancelledBy" = 'restaurant' THEN 1 END) as restaurant_cancellations
FROM "OrderCancellation"
GROUP BY DATE("cancelledAt")
ORDER BY date DESC;
```

### Check Cancellation by Status
```sql
SELECT 
  o.status, 
  COUNT(oc.id) as cancellations,
  AVG(oc."refundAmount") as avg_refund
FROM "OrderCancellation" oc
JOIN "Order" o ON oc."orderId" = o.id
GROUP BY o.status;
```

### Verify Indexes
```sql
-- List all indexes
SELECT * FROM pg_indexes WHERE tablename IN ('Order', 'OrderCancellation', 'CancellationPolicy');

-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM "CancellationPolicy" WHERE status = 'confirmed';
```

---

## 🔍 Debugging Commands

### Check Service Health
```bash
curl http://localhost:3002/health
```

### View Recent Logs
```bash
# If using npm run dev (will show in console)
# If using npm start (check system logs or use journalctl)

# For Docker
docker logs order-service
docker logs -f order-service  # Follow logs
```

### Database Connection Test
```bash
# Test PostgreSQL connection
psql -U postgres -d order_db -c "SELECT NOW();"

# List all tables
psql -U postgres -d order_db -c "\dt"
```

### Test External Services

#### Payment Service
```bash
curl -X POST "http://localhost:3004/refunds" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order",
    "customerId": "test-cust",
    "refundAmount": 100,
    "reason": "Test"
  }'
```

#### Notification Service
```bash
curl -X POST "http://localhost:3005/send" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test-cust",
    "type": "order_cancelled",
    "message": "Test notification"
  }'
```

---

## 📁 Documentation Navigation

### Quick Links
```bash
# From root directory
cat PHASE_3_FINAL_SUMMARY.md              # This file overview
cat PHASE_3_QUICK_REFERENCE.md             # API quick reference
cat PHASE_3_SMART_CANCELLATION.md          # Full documentation
cat PHASE_3_TESTING_GUIDE.md               # Test scenarios
cat PHASE_3_COMPLETION_SUMMARY.md          # Deployment checklist
cat PHASE_3_IMPLEMENTATION_INDEX.md        # Complete index
cat PHASE_3_VALIDATION_CHECKLIST.md        # Validation status
```

---

## ⚙️ Environment Variables

### Required (.env file)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/order_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
PAYMENT_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
PORT=3002
```

### Optional
```env
NODE_ENV=development    # or production
LOG_LEVEL=info         # debug, info, warn, error
```

---

## 🐛 Common Troubleshooting

### Migration Fails
```bash
# Check database connection
psql -U postgres -d order_db -c "SELECT NOW();"

# Reset migrations (careful!)
npx prisma migrate resolve --rolled-back "add_smart_cancellation"
npx prisma migrate dev --name add_smart_cancellation
```

### Policies Not Found
```sql
-- Check if seeded
SELECT COUNT(*) FROM "CancellationPolicy";

-- Re-seed if empty
\i prisma/seed_cancellation_policies.sql
```

### Connection Refused
```bash
# Check if service is running
lsof -i :3002

# Check port availability
netstat -tlnp | grep 3002

# Kill existing process
kill -9 $(lsof -t -i:3002)
```

### Prisma Client Issues
```bash
# Regenerate Prisma Client
npx prisma generate

# Clear and reinstall
rm -rf node_modules .prisma
npm install
```

---

## 📈 Performance Testing

### Load Test - 100 Requests
```bash
ab -n 100 -c 10 \
  "http://localhost:3002/orders/order-123/cancellation-info?city=bangalore"
```

### Load Test - 1000 Requests
```bash
ab -n 1000 -c 50 \
  "http://localhost:3002/orders/order-123/cancellation-info?city=bangalore"
```

### Monitor Performance During Load
```bash
# In another terminal, monitor queries
watch -n 1 "psql -U postgres -d order_db -c 'SELECT count(*) FROM pg_stat_activity;'"
```

---

## 🔄 Deployment Workflow

### Step-by-Step
```bash
# 1. Backup
pg_dump order_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Update code (git pull, etc.)
git pull origin main

# 3. Migrate database
cd services/order-service
npx prisma migrate deploy

# 4. Seed initial data
psql -U postgres -d order_db -f prisma/seed_cancellation_policies.sql

# 5. Install dependencies
npm install

# 6. Build
npm run build

# 7. Test
npm test  # if test script exists

# 8. Start service
npm start

# 9. Verify health
curl http://localhost:3002/health

# 10. Monitor logs
docker logs -f order-service
```

---

## 📊 Monitoring Checklist

### Daily
- [ ] Check error rates
- [ ] Monitor response times
- [ ] Verify cancellation processing
- [ ] Check refund success rate

### Weekly
- [ ] Review cancellation trends
- [ ] Analyze refund amounts
- [ ] Check database size
- [ ] Review performance metrics

### Monthly
- [ ] Cleanup old records (if needed)
- [ ] Review capacity planning
- [ ] Audit integrations
- [ ] Performance tuning

---

## 🚨 Emergency Procedures

### Rollback Deployment
```bash
# Stop current service
systemctl stop order-service
# or
docker stop order-service

# Restore database
psql -U postgres -d order_db < backup_YYYYMMDD.sql

# Deploy previous version
git checkout previous-tag

# Start service
npm start
# or
docker start order-service
```

### Clear Stuck Processes
```bash
# Find all Node processes on port 3002
lsof -i :3002

# Kill them
kill -9 PID
```

### Database Issues
```bash
# Check connections
psql -U postgres -d order_db -c "SELECT * FROM pg_stat_activity;"

# Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'order_db' AND pid <> pg_backend_pid();

# Vacuum database
VACUUM ANALYZE;
```

---

## 📝 Useful Commands Summary

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Build for production
npm test             # Run tests (if configured)

# Database
npx prisma studio   # Open Prisma Studio
npx prisma generate # Regenerate Client
npx prisma format   # Format schema.prisma

# Debugging
node --inspect dist/index.js  # Debug mode
DEBUG=* npm run dev            # Verbose logging

# Docker
docker build -t order-service .
docker run -p 3002:3002 order-service
docker logs -f order-service
```

---

## 🎯 Success Indicators

### Healthy Service
- ✅ Health check returns 200
- ✅ GET /cancellation-info responds in <20ms
- ✅ DELETE /cancel responds in <100ms
- ✅ No error logs
- ✅ RabbitMQ connected
- ✅ Payment service calls succeeding

### Performance Targets
- ✅ 95th percentile <50ms
- ✅ 500+ concurrent users supported
- ✅ >100 requests/sec throughput
- ✅ Database indexes effective

### Data Quality
- ✅ All cancellations recorded
- ✅ Refund amounts accurate
- ✅ Events published
- ✅ Notifications sent

---

*Quick Reference: Phase 3 Commands*  
*Last Updated: January 2024*
