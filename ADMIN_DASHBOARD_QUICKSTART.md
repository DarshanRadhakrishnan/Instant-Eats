# Admin Dashboard - Quick Start Guide

## 🚀 Start the Admin Dashboard

### Option 1: Docker (Recommended)

```bash
# Start all services including admin dashboard
docker-compose up -d

# Admin Dashboard API: http://localhost:3006
# Check status
curl http://localhost:3006/health
```

### Option 2: Local Development

#### Backend (Admin Dashboard Service)

```bash
cd services/admin-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Running on http://localhost:3006
```

#### Frontend (React Dashboard)

```bash
cd frontend-admin

# Install dependencies
npm install

# Start React dev server
npm start

# Opens at http://localhost:3000
# API calls go to http://localhost:3006
```

## 📊 Accessing the Dashboard

### API Endpoints

```
http://localhost:3006/api/dashboard/overview          # Complete overview
http://localhost:3006/api/dashboard/services          # Services health
http://localhost:3006/api/dashboard/shards            # Database shards
http://localhost:3006/api/dashboard/circuit-breakers  # Circuit breakers
http://localhost:3006/api/dashboard/cache             # Cache analytics
```

### Web Interface (Frontend)

```
http://localhost:3000  (if running React locally)
```

## 🎯 What You Can Monitor

### 1. System Overview
```bash
curl http://localhost:3006/api/dashboard/overview | jq

# Response includes:
# - All shards (US-East, US-West, EU-Central)
# - All services status
# - Circuit breaker states
# - Cache statistics
```

### 2. Services Health
```bash
curl http://localhost:3006/api/dashboard/services | jq

# Shows:
# - auth-service (3001)
# - order-service (3002)
# - restaurant-service (3003)
# - delivery-service (3004)
# - tracking-service (3005)
# - api-gateway (3000)
```

### 3. Database Shards
```bash
curl http://localhost:3006/api/dashboard/shards | jq

# Shows:
# Shard-A: US-East    (postgres-shard-a:5432)
# Shard-B: US-West    (postgres-shard-b:5433)
# Shard-C: EU-Central (postgres-shard-c:5434)
```

### 4. Circuit Breaker Status
```bash
curl http://localhost:3006/api/dashboard/circuit-breakers | jq

# Shows state for each service:
# - CLOSED (healthy)
# - OPEN (down)
# - HALF-OPEN (testing recovery)
```

### 5. Cache Analytics
```bash
curl http://localhost:3006/api/dashboard/cache | jq

# Shows:
# - Total cache entries
# - Memory used
# - Top cached keys
# - Cache hit rate
```

## 🛠️ Common Tasks

### Check All Services are Running

```bash
# Check admin dashboard
curl http://localhost:3006/health

# Check API gateway
curl http://localhost:3000/health

# Check auth service
curl http://localhost:3001/health

# Check order service
curl http://localhost:3002/health
```

### Get Complete Dashboard Data

```bash
curl http://localhost:3006/api/dashboard/overview | jq '.' | less
```

### Monitor Circuit Breaker

```bash
# Get circuit breaker stats
curl http://localhost:3006/api/dashboard/circuit-breakers | jq '.circuitBreakers[0]'

# Reset circuit breaker if needed
curl -X POST http://localhost:3006/api/dashboard/circuit-breaker/reset \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"order-service"}'
```

### View Cache Performance

```bash
# Get cache analytics
curl http://localhost:3006/api/dashboard/cache | jq '.cache'

# Shows top keys:
# cache:order-service:/?status=pending
# cache:restaurant-service:/?city=NYC
# etc.
```

## 📈 Real-time Monitoring

The dashboard auto-refreshes every 5-10 seconds with latest metrics.

**Monitoring intervals:**
- Overview: 10s
- Services: 5s
- Circuit Breakers: 5s
- Cache: 5s
- Shards: 10s

## 🔍 Verify Implementation

### 1. Services Connected

```bash
# All microservices should show up
curl http://localhost:3006/api/dashboard/services | jq '.services | length'

# Should return: 6 (auth, order, restaurant, delivery, tracking, api-gateway)
```

### 2. Shards Available

```bash
# Should see 3 shards
curl http://localhost:3006/api/dashboard/shards | jq '.shards | length'

# Should return: 3 (Shard-A, Shard-B, Shard-C)
```

### 3. Circuit Breakers Active

```bash
# Should see circuit breakers for each service
curl http://localhost:3006/api/dashboard/circuit-breakers | jq '.circuitBreakers | length'

# Should return: > 0
```

### 4. Cache Running

```bash
# Should show cache stats if Redis is running
curl http://localhost:3006/api/dashboard/cache | jq '.cache'

# Should see:
# - totalKeys
# - memoryUsed
# - topKeys (array)
```

## 🐛 Troubleshooting

### Admin Dashboard Won't Start

```bash
# Check if port 3006 is available
lsof -i :3006

# Check logs
docker logs admin-dashboard

# Or manually:
cd services/admin-dashboard
npm install
npm run dev
```

### Services Show as Down

```bash
# Check if services are running
docker ps | grep -E 'order-service|auth-service|restaurant'

# Check if they're accessible
curl http://localhost:3002/health  # order-service
curl http://localhost:3001/health  # auth-service
curl http://localhost:3003/health  # restaurant-service
```

### Circuit Breakers Not Showing

```bash
# Check if API Gateway is accessible
curl http://localhost:3000/stats/circuit-breakers

# Should return circuit breaker stats
```

### Cache Analytics Empty

```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG

# Check Redis connection
docker logs redis

# Check if cache entries exist
redis-cli KEYS "cache:*" | wc -l
```

## 📊 Dashboard Views

### Overview Tab
- System summary metrics
- Region-wise shard distribution
- Service status grid
- Circuit breaker table

### Services Tab
- Individual service health
- Response times
- Last check timestamp
- Service metrics

### Shards Tab
- All database shards
- Region distribution
- Shard status
- Connection details

### Circuit Breakers Tab
- Circuit state for each service
- Failure/success statistics
- Manual reset buttons
- State explanations

### Cache Tab
- Cache entries count
- Memory usage
- Top cached keys
- Cache strategy docs

## 🎯 Key Metrics to Monitor

1. **Healthy Services**: Should be 6/6 (all green)
2. **Circuit Breaker States**: Should be mostly CLOSED (green)
3. **Cache Hit Rate**: Should be 85%+ (green)
4. **Shard Status**: All should be healthy
5. **Response Times**: Should be < 200ms typically

## 🚀 Next Steps

1. ✅ Dashboard is running
2. ✅ Monitor all services
3. ✅ Track circuit breakers
4. ✅ View cache analytics
5. ⬜ Set up alerts
6. ⬜ Add authentication
7. ⬜ Integrate with monitoring tools

## 📚 Documentation

- [Admin Dashboard README](./README.md)
- [API Gateway Circuit Breaker](../api-gateway/CIRCUIT_BREAKER_AND_CACHING.md)
- [Circuit Breaker Reference](../api-gateway/QUICK_REFERENCE.md)

---

**Ready to monitor!** 🎉 Start with `docker-compose up -d` and open http://localhost:3006 (or frontend on 3000)
