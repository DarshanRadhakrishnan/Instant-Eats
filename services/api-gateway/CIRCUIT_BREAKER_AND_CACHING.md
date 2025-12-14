# Circuit Breakers & Redis Caching - API Gateway Implementation

## Overview

The API Gateway now includes two critical production features:

1. **Circuit Breaker Pattern** (using Opossum) - Prevents cascading failures
2. **Redis Caching** - Improves performance and reduces backend load

## 🔌 Circuit Breaker Pattern (Opossum)

### How It Works

The circuit breaker monitors requests to backend services and has three states:

```
CLOSED ──────→ OPEN ──────→ HALF-OPEN ──────→ CLOSED
(Normal)   (Too many      (Testing)        (Recovered)
           failures)
```

**States:**
- **CLOSED**: Normal operation - requests pass through
- **OPEN**: Service is down - requests fail immediately without trying
- **HALF-OPEN**: Testing recovery - allows limited requests to test service health

### Configuration

Edit `.env`:

```env
CIRCUIT_BREAKER_TIMEOUT=10000              # Request timeout (ms)
CIRCUIT_BREAKER_ERROR_THRESHOLD=50         # Open at 50% error rate
CIRCUIT_BREAKER_RESET_TIMEOUT=30000        # Try recovery after 30 seconds
```

### Benefits

✅ Prevents cascading failures across microservices
✅ Reduces load on failing services (fail fast)
✅ Automatic recovery detection
✅ Real-time monitoring via `/stats/circuit-breakers` endpoint

### Example Response (Circuit Open)

```json
{
  "status": 503,
  "data": {
    "success": false,
    "error": "Service 'order-service' is temporarily unavailable (circuit breaker open)"
  }
}
```

## 📦 Redis Caching

### How It Works

GET requests are cached in Redis with automatic TTL expiration.

```
GET Request
    ↓
Check Redis Cache
    ↓
Cache HIT? ──→ YES → Return cached response (with X-Cache: HIT header)
    ↓
    NO
    ↓
Call Backend Service via Circuit Breaker
    ↓
Store successful response in Redis (TTL: 5 minutes default)
    ↓
Return response to client
```

### Configuration

Edit `.env`:

```env
REDIS_HOST=redis                  # Redis host (docker-compose service name)
REDIS_PORT=6379                   # Redis port
CACHE_TTL=300                      # Cache expiration time (seconds)
```

### Cache Headers

All responses include cache indicators:

```
X-Cache: HIT                       # Served from Redis cache
X-Cache: MISS                      # Served from backend service
X-Cache-Source: Redis             # Cache was used
Cache-Control: public, max-age=300 # Browser caching headers
```

### What Gets Cached

✅ GET requests with 200 status codes
✅ Responses include request path and query parameters
✅ Each unique request has its own cache entry

### What Doesn't Get Cached

❌ POST, PATCH, DELETE requests
❌ Non-200 responses
❌ Failed requests

### Example Cache Keys

```
cache:order-service:/?status=pending
cache:restaurant-service:/:id/menu
cache:delivery-service:/assignments?driver_id=123
```

## 🚀 Monitoring & Debugging

### Circuit Breaker Stats

```bash
curl http://localhost:3000/stats/circuit-breakers
```

Response:
```json
{
  "circuitBreakers": [
    {
      "serviceName": "order-service",
      "state": "CLOSED",
      "stats": {
        "fires": 150,
        "failures": 5,
        "successes": 145,
        "timeouts": 0,
        "fallbacks": 0
      }
    }
  ]
}
```

### Console Logs

**Circuit Breaker Events:**
```
✅ Circuit breaker CLOSED for order-service: Service recovered
⚠️  Circuit breaker OPEN for order-service: Too many failures detected
🔄 Circuit breaker HALF-OPEN for order-service: Attempting recovery...
```

**Cache Events:**
```
✅ Cache HIT for key: cache:order-service:/?status=pending
✅ Cache SET for key: cache:order-service:/?status=pending (TTL: 300s)
```

## 📝 Code Examples

### Using Circuit Breaker & Cache in Routes

```typescript
import { forwardRequest } from '../utils/forwardRequest';

// GET request (will be cached)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest(
      'order-service',
      3002,
      'GET',
      `/${req.params.id}`,
      null,
      ''  // Query string (empty for no query)
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// POST request (won't be cached)
router.post('/', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest(
      'order-service',
      3002,
      'POST',
      '/',
      req.body,
      ''  // Query string parameter
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});
```

### Accessing Circuit Breaker Utilities (Advanced)

```typescript
import { 
  getCircuitBreaker, 
  getAllCircuitBreakerStats,
  resetCircuitBreaker 
} from './utils/circuitBreaker';

// Get circuit breaker for a service
const breaker = getCircuitBreaker('order-service');

// Check if breaker is open
if (breaker.opened) {
  console.log('Service is down!');
}

// Get all stats
const allStats = getAllCircuitBreakerStats();

// Manual reset
resetCircuitBreaker('order-service');
```

### Accessing Cache Utilities (Advanced)

```typescript
import { 
  getCacheValue, 
  setCacheValue, 
  deleteCacheValue,
  generateCacheKey,
  clearAllCache 
} from './utils/cache';

// Generate cache key
const key = generateCacheKey('order-service', '/123', '');

// Get value
const cached = await getCacheValue(key);

// Set value with 10-minute TTL
await setCacheValue(key, JSON.stringify(data), 600);

// Delete specific value
await deleteCacheValue(key);

// Clear all cache
await clearAllCache();
```

## 🐳 Docker Setup

### Update docker-compose.yml

Add Redis service:

```yaml
services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - CACHE_TTL=300
    depends_on:
      - redis
    networks:
      - instant-eats

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - instant-eats
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:

networks:
  instant-eats:
```

### Start Services

```bash
docker-compose up -d redis
docker-compose up -d api-gateway
```

## 📊 Performance Impact

### Caching Benefits

| Scenario | Without Cache | With Cache |
|----------|--------------|-----------|
| 100 identical GET requests | 100 backend calls | 1 backend call + 99 cache hits |
| Request latency | ~100-200ms | ~5-10ms (cache hit) |
| Backend load | 100% | ~1% |
| Redis storage | N/A | ~1-10MB (typical) |

### Circuit Breaker Benefits

| Scenario | Without CB | With CB |
|----------|-----------|---------|
| Service down | 30+ cascading failures | 0-2 failures, then fast-fail |
| Recovery time | Manual restart needed | Auto-recovery in 30s |
| Error messages | Generic timeouts | Specific "service unavailable" |

## ⚠️ Important Notes

1. **Cache Invalidation**: Cache TTL is set to 5 minutes by default. Modify `CACHE_TTL` for different requirements.

2. **Circuit Breaker Tuning**: Adjust error thresholds based on your service reliability:
   - Lenient (80%): For unreliable services
   - Normal (50%): For typical services
   - Strict (30%): For critical services

3. **Redis Persistence**: Data in Redis is lost on restart unless configured otherwise. For production, enable RDB or AOF.

4. **Memory Limits**: Set Redis `maxmemory-policy` in production to handle cache growth.

5. **Monitoring**: Implement alerts for:
   - Circuit breaker state changes
   - High cache miss rates
   - Redis connection failures

## 🧪 Testing

### Test Circuit Breaker

```bash
# Trigger failures on order-service
# Then check stats
curl http://localhost:3000/stats/circuit-breakers

# Circuit should transition to OPEN after failures
```

### Test Cache

```bash
# First request (cache miss)
curl http://localhost:3000/orders/123

# Check header
# X-Cache: MISS

# Second request (cache hit)
curl http://localhost:3000/orders/123

# Check header
# X-Cache: HIT
```

## 📚 Dependencies

- **opossum**: ^8.1.0 - Circuit breaker pattern
- **redis**: ^4.6.0 - Redis client for Node.js

Install with:
```bash
npm install opossum redis
```

## 🔗 Related Files

- [forwardRequest.ts](src/utils/forwardRequest.ts) - Request forwarding with CB & cache
- [circuitBreaker.ts](src/utils/circuitBreaker.ts) - Circuit breaker implementation
- [cache.ts](src/utils/cache.ts) - Redis cache implementation
- [caching.ts](src/middleware/caching.ts) - Cache middleware
- [index.ts](src/index.ts) - Gateway initialization
