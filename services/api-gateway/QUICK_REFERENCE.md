# Circuit Breaker & Caching - Quick Reference

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd services/api-gateway
npm install
```

### 2. Configure Environment
```bash
# Copy example config
cp .env.example .env

# Edit .env with your settings
REDIS_HOST=localhost
CACHE_TTL=300
```

### 3. Start Redis (if not using Docker)
```bash
# Install Redis locally or use Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or with Docker Compose
docker-compose up -d redis
```

### 4. Start API Gateway
```bash
npm run dev
```

## 📊 Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Gateway health check |
| `/stats/circuit-breakers` | GET | View all circuit breaker states |
| `/orders` | GET | Get orders (cached) |
| `/orders/:id` | GET | Get order detail (cached) |
| `/restaurants` | GET | Get restaurants (cached) |
| `/restaurants/:id/menu` | GET | Get menu (cached) |

## 🔍 Debugging

### Check Circuit Breaker Status
```bash
curl http://localhost:3000/stats/circuit-breakers | jq
```

### Test Cache Hit/Miss
```bash
# First call (MISS)
curl -i http://localhost:3000/orders/123

# Second call (HIT)
curl -i http://localhost:3000/orders/123

# Look for X-Cache header
```

### View Redis Cache
```bash
# Connect to Redis CLI
redis-cli

# View all keys
KEYS *

# Get specific cache value
GET "cache:order-service:/?status=pending"

# Clear all cache
FLUSHDB
```

### Check Logs
```bash
# API Gateway logs
docker logs api-gateway

# Look for:
# ✅ Cache HIT
# ✅ Cache SET
# ⚠️  Circuit breaker OPEN
# 🔄 Circuit breaker HALF-OPEN
# ✅ Circuit breaker CLOSED
```

## ⚙️ Configuration Reference

### Cache Settings
```env
REDIS_HOST=redis              # Redis hostname
REDIS_PORT=6379              # Redis port
CACHE_TTL=300                # Cache duration (seconds)
```

### Circuit Breaker Settings
```env
CIRCUIT_BREAKER_TIMEOUT=10000              # Request timeout
CIRCUIT_BREAKER_ERROR_THRESHOLD=50         # Error % to open
CIRCUIT_BREAKER_RESET_TIMEOUT=30000        # Recovery check interval
```

## 💡 Common Use Cases

### Cache Only Specific Routes
Modify `forwardRequest` call - skip cache by passing empty data:
```typescript
// This will not cache (even though GET)
const response = await forwardRequest(
  'service', 3000, 'GET', '/endpoint', null, ''
);
```

### Adjust Cache TTL Per Route
```typescript
// Temporarily override in route handler
const response = await forwardRequest(...);
// Then manually cache with custom TTL
await setCacheValue(key, JSON.stringify(response.data), 600); // 10 min
```

### Monitor Specific Service
```bash
curl http://localhost:3000/stats/circuit-breakers | jq '.circuitBreakers[] | select(.serviceName=="order-service")'
```

### Reset Failing Circuit Breaker
```typescript
import { resetCircuitBreaker } from './utils/circuitBreaker';

// In route handler or scheduled task
resetCircuitBreaker('order-service');
```

## 🐛 Troubleshooting

### "Cannot connect to Redis"
```bash
# Check Redis is running
redis-cli ping

# If Docker: check network
docker network ls
docker inspect <network>

# Check REDIS_HOST matches docker service name
```

### Circuit Breaker Always Open
```bash
# Check backend service is running
curl http://localhost:3002/health

# Check circuit breaker config (error threshold)
# Lower threshold = more sensitive
```

### Cache Not Working
```bash
# Check Redis connection
redis-cli

# Verify cache key format
KEYS "cache:*"

# Check TTL
TTL "cache:order-service:/123"
```

### High Memory Usage
```bash
# Check cache size
INFO memory

# Clear cache
redis-cli FLUSHDB

# Reduce CACHE_TTL in .env
```

## 📈 Performance Tuning

### For High Traffic
```env
CACHE_TTL=600              # Increase to 10 minutes
CIRCUIT_BREAKER_ERROR_THRESHOLD=30  # More aggressive
CIRCUIT_BREAKER_RESET_TIMEOUT=60000  # Longer recovery window
```

### For Real-time Data
```env
CACHE_TTL=60               # 1 minute cache
CIRCUIT_BREAKER_ERROR_THRESHOLD=70  # More lenient
```

### For Slow Services
```env
CIRCUIT_BREAKER_TIMEOUT=30000         # Longer timeout
CIRCUIT_BREAKER_RESET_TIMEOUT=60000   # Longer recovery
```

## 📚 Files Changed

1. `package.json` - Added opossum & redis deps
2. `src/utils/circuitBreaker.ts` - NEW: Circuit breaker logic
3. `src/utils/cache.ts` - NEW: Redis cache logic
4. `src/utils/forwardRequest.ts` - UPDATED: Added CB & cache
5. `src/middleware/caching.ts` - NEW: Cache middleware
6. `src/index.ts` - UPDATED: Initialize Redis
7. `docker-compose.yml` - UPDATED: Redis config for API Gateway
8. `.env.example` - NEW: Configuration template

## 🔗 Next Steps

1. ✅ Dependencies installed and configured
2. ✅ Circuit breaker implemented
3. ✅ Redis caching enabled
4. ⬜ Test the implementation
5. ⬜ Monitor production metrics
6. ⬜ Adjust settings for your workload
