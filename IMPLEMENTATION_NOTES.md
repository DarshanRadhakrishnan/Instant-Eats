# Implementation Notes & Architecture

## Completed Components

### ✅ Application-Level Sharding Implementation

**Location**: `shared/sharding/`

#### shardConfig.ts
- Defines 3 PostgreSQL shards with environment URLs
- Maps regions to shards for automatic routing
- Shards cover US, Canada, and Mexico regions
- Easy to add more shards by extending configuration

#### getShard.ts
- `getShardByRegion(city)`: Routes by city name (case-insensitive, fuzzy match)
- `getShardById(shardId)`: Direct shard access
- `determineUserShard(userId, city)`: User-specific routing
- `determineOrderShard(orderId, city)`: Order-specific routing
- `getShardByHash(key)`: Consistent hash-based fallback

**Usage Pattern**:
```typescript
const shard = getShardByRegion('san-francisco');
const prisma = getPrismaClient('san-francisco');
await prisma.user.findMany();
```

### ✅ API Gateway (Port 3000)

**Features**:
- HTTP forwarding to microservices
- Rate limiting middleware (10 req/s general, 5 req/s auth, 20 req/s orders)
- Request logging
- Error handling
- Shard-aware routing ready

**Routes**:
- `POST /auth/*` → Auth Service (3001)
- `GET/POST /orders/*` → Order Service (3002)
- `GET/POST /restaurants/*` → Restaurant Service (3003)
- `GET/POST/PATCH /delivery/*` → Delivery Service (3004)

### ✅ Auth Service (Port 3001)

**Features**:
- User registration with role-based access
- JWT token generation (default: 24h expiry)
- Bcrypt password hashing
- Token refresh endpoint
- Shard-aware user storage

**Endpoints**:
- `POST /register` - Create user account
- `POST /login` - Get JWT token
- `POST /refresh` - Refresh expired token

**Database**: PostgreSQL (sharded by user city)

**Sample Registration**:
```json
POST /register
{
  "email": "user@example.com",
  "password": "secure123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "role": "customer",
  "city": "san-francisco"
}
```

### ✅ Order Service (Port 3002)

**Features**:
- Create, read, update orders
- RabbitMQ event publishing
- Shard-aware storage

**Endpoints**:
- `POST /` - Create order (publishes `order.created` event)
- `GET /:id` - Get order details (requires `?city=...`)
- `GET /` - List customer orders (requires `?customerId=...&city=...`)
- `PATCH /:id/status` - Update order status

**RabbitMQ Events Published**:
```javascript
// order.created event
{
  eventType: 'order.created',
  orderId: 'uuid',
  customerId: 'uuid',
  restaurantId: 'uuid',
  deliveryCity: 'San Francisco',
  totalAmount: 45.99,
  estimatedDeliveryTime: 30,
  timestamp: new Date()
}
```

**Database**: PostgreSQL (sharded by order city)

### ✅ Restaurant Service (Port 3003)

**Features**:
- MongoDB for restaurant metadata
- Mongoose schemas for type safety
- Search and filtering

**Models**:
- `Restaurant`: Stores restaurant info, owner, ratings
- `MenuItem`: Menu items with pricing and categories

**Endpoints**:
- `GET /` - List restaurants (with filtering by city)
- `GET /:id` - Get restaurant details
- `GET /:id/menu` - Get menu items
- `POST /` - Create restaurant

**Database**: MongoDB (non-sharded, centralized)

### ✅ Delivery Service (Port 3004)

**Features**:
- RabbitMQ event consumer for order assignments
- Delivery partner availability management
- Location update handling
- Automatic order assignment

**Event Consumers**:
- `order.created` - Finds available delivery partner and assigns
- `order.assigned` - Ready for pickup

**Endpoints**:
- `GET /assignments` - Get current delivery assignment
- `PATCH /:id/location` - Update rider GPS coordinates
- `POST /:id/accept` - Accept delivery order

**Database**: PostgreSQL (sharded by delivery city)

**Sample Location Update**:
```json
PATCH /delivery/partner123/location
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "city": "San Francisco"
}
```

### ✅ Tracking Service (Port 3005)

**Features**:
- Socket.IO WebSocket server
- Real-time location broadcasting
- Redis-backed location storage
- Efficient pub/sub pattern

**Socket.IO Events**:

*Client → Server*:
- `subscribe-order`: `{ orderId: string }`
- `rider-location-update`: `{ orderId, deliveryPartnerId, latitude, longitude }`
- `get-location`: `(orderId, callback)`
- `unsubscribe-order`: `{ orderId: string }`

*Server → Client*:
- `location-updated`: `{ orderId, deliveryPartnerId, latitude, longitude, timestamp }`
- `error`: `{ message: string }`

**Usage Example**:
```javascript
const socket = io('http://localhost:3005');

// Subscribe to order
socket.emit('subscribe-order', 'order-uuid');

// Listen for updates
socket.on('location-updated', (data) => {
  console.log(`Rider at ${data.latitude}, ${data.longitude}`);
});

// Get current location
socket.emit('get-location', 'order-uuid', (response) => {
  console.log(response.data);
});
```

**Database**: Redis (in-memory, with 1-hour TTL)

### ✅ Frontend (Port 5173)

**Tech Stack**:
- React 18 with TypeScript
- Vite for fast bundling
- Tailwind CSS for styling
- Socket.IO client for real-time updates
- Axios for HTTP requests
- Context API for state management

**Pages**:
- `LoginPage`: Authentication UI
- `HomePage`: Main dashboard (orders & restaurants tabs)
- `TrackingPage`: Real-time order tracking

**Context**:
- `AuthContext`: Manages user state and JWT token

**Utils**:
- `apiClient.ts`: Configured Axios instance with auth interceptor
- `socketClient.ts`: Socket.IO initialization and event handlers

## Event Flow Diagram

```
┌─────────┐         ┌─────┐
│Customer │ Order   │Order│
│App      ├────────►│Svc  │
└─────────┘         └─────┘
                       │
                   Publish
                       │
                   order.created
                       │
                       ▼
                   ┌─────────┐
                   │RabbitMQ │
                   └────┬────┘
                        │
                   Consume
                        │
                        ▼
                   ┌──────────┐
                   │Delivery  │
                   │Svc       │
                   └────┬─────┘
                        │
                   Find available
                   delivery partner
                        │
                        ▼
                  ┌────────────┐
                  │Update DB   │
                  │Assign Order│
                  └────────────┘
                        │
                   Publish order.assigned
                        │
                        ▼
                    ┌─────────┐
                    │Customer │
                    │WebSocket│
                    │Receives │
                    │Update   │
                    └─────────┘
```

## Database Schemas

### PostgreSQL Schemas

#### Shard A, B, C - Users Table
```sql
CREATE TABLE "User" (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(255),
  lastName VARCHAR(255),
  phoneNumber VARCHAR(20),
  role VARCHAR(50),
  city VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Shard A, B, C - Orders Table
```sql
CREATE TABLE "Order" (
  id VARCHAR(36) PRIMARY KEY,
  customerId VARCHAR(36),
  restaurantId VARCHAR(36),
  deliveryPartnerId VARCHAR(36),
  status VARCHAR(50),
  totalAmount DECIMAL(10, 2),
  deliveryAddress TEXT,
  city VARCHAR(100),
  latitude DECIMAL(9, 6),
  longitude DECIMAL(9, 6),
  estimatedDeliveryTime INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Shard A, B, C - DeliveryPartner Table
```sql
CREATE TABLE "DeliveryPartner" (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36),
  city VARCHAR(100),
  latitude DECIMAL(9, 6),
  longitude DECIMAL(9, 6),
  isAvailable BOOLEAN DEFAULT TRUE,
  currentOrderId VARCHAR(36),
  totalDeliveries INT DEFAULT 0,
  rating DECIMAL(3, 2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### MongoDB Collections

#### restaurants
```javascript
{
  _id: ObjectId,
  name: String,
  city: String,
  address: String,
  latitude: Number,
  longitude: Number,
  phoneNumber: String,
  email: String,
  ownerUserId: String,
  rating: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### menuItems
```javascript
{
  _id: ObjectId,
  restaurantId: String,
  name: String,
  description: String,
  price: Number,
  category: String,
  isAvailable: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

### Root .env
```
NODE_ENV=development

# Database URLs
POSTGRES_SHARD_A_URL=postgresql://postgres:postgres@postgres-shard-a:5432/shard_a
POSTGRES_SHARD_B_URL=postgresql://postgres:postgres@postgres-shard-b:5432/shard_b
POSTGRES_SHARD_C_URL=postgresql://postgres:postgres@postgres-shard-c:5432/shard_c
MONGODB_URL=mongodb://root:mongodb@mongodb:27017/restaurants?authSource=admin
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Service Ports
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
ORDER_SERVICE_PORT=3002
RESTAURANT_SERVICE_PORT=3003
DELIVERY_SERVICE_PORT=3004
TRACKING_SERVICE_PORT=3005

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# Shard Configuration
SHARD_A_REGIONS=us-west,ca
SHARD_B_REGIONS=us-east,us-central
SHARD_C_REGIONS=us-south,mx
```

### Frontend .env
```
VITE_API_URL=http://localhost:3000
VITE_TRACKING_URL=http://localhost:3005
```

## Performance Considerations

### Caching Strategy
- Restaurant data: Cache in Redis for 1 hour
- User profiles: Cache in Redis for 30 minutes
- Delivery partner availability: Real-time from DB

### Rate Limiting
- General: 10 req/s per IP
- Auth: 5 req/s per IP
- Orders: 20 req/s per IP

### Database Optimization
- Create indexes on frequently queried columns
- Use connection pooling
- Implement query caching at application level

### WebSocket Optimization
- Connection pooling
- Rooms for order-specific updates
- Message compression

## Security Recommendations

### For Production
1. ✅ Use environment variables for secrets
2. ⏳ Implement CORS properly (not `*`)
3. ⏳ Add request validation middleware
4. ⏳ Implement API key authentication for services
5. ⏳ Use HTTPS for all connections
6. ⏳ Add rate limiting per user/API key
7. ⏳ Implement audit logging
8. ⏳ Add database encryption
9. ⏳ Implement circuit breakers for service calls
10. ⏳ Add monitoring and alerting

## Testing Strategy

### Unit Tests
- Service layer functions
- Utility functions
- Event handlers

### Integration Tests
- Service-to-service communication
- Database operations
- RabbitMQ messaging

### E2E Tests
- Complete order flow
- WebSocket connections
- Authentication flow

## Scaling Considerations

### Horizontal Scaling
- Add more instances of stateless services
- Use load balancer to distribute requests
- Ensure database connection pooling

### Vertical Scaling
- Increase service memory/CPU limits
- Optimize database queries
- Implement caching strategies

### Database Scaling
- Current: 3-way application-level sharding
- Future: Add more shards as regions grow
- Use read replicas for read-heavy workloads

## Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Change `JWT_SECRET` to strong key
- [ ] Enable HTTPS in Nginx config
- [ ] Set up monitoring/logging
- [ ] Configure database backups
- [ ] Set up CI/CD pipeline
- [ ] Load test the system
- [ ] Set up health checks
- [ ] Configure auto-scaling
- [ ] Document API endpoints
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure CDN for static assets

## Future Enhancements

- [ ] Add payment processing (Stripe/PayPal)
- [ ] Implement push notifications
- [ ] Add recommendation engine
- [ ] Implement loyalty program
- [ ] Add multi-language support
- [ ] Implement rating/review system
- [ ] Add chat between customers and support
- [ ] Implement promotions/discounts
- [ ] Add analytics dashboard
- [ ] Implement machine learning for route optimization
