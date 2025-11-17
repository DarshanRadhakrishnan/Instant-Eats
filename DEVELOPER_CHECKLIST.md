# Developer Checklist & Quick Reference

## 🚀 Getting Started

### Initial Setup
- [ ] Clone the repository
- [ ] Copy `.env.example` to `.env`
- [ ] Copy `frontend/.env.example` to `frontend/.env`
- [ ] Install Docker and Docker Compose
- [ ] Run `docker-compose up -d` to start services
- [ ] Verify all services are running: `docker-compose ps`

### Verify Services
```bash
# Check all services are healthy
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Order Service
curl http://localhost:3003/health  # Restaurant Service
curl http://localhost:3004/health  # Delivery Service
curl http://localhost:3005/health  # Tracking Service
```

## 📁 File Structure Reference

### Adding a New Endpoint

**Example: Add new order endpoint**

1. **Create controller** in `services/order-service/src/index.ts`
```typescript
app.get('/by-restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { city } = req.query;
    
    const prisma = getPrismaClient(city as string);
    const orders = await prisma.order.findMany({
      where: { restaurantId }
    });
    
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

2. **Add route** in API Gateway `services/api-gateway/src/routes/orders.ts`
```typescript
router.get('/by-restaurant/:restaurantId', async (req: Request, res: Response) => {
  try {
    const response = await forwardRequest(
      'order-service', 
      3002, 
      'GET', 
      `/by-restaurant/${req.params.restaurantId}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});
```

### Adding a New Service

1. Create service folder: `services/new-service/`
2. Copy `package.json`, `tsconfig.json`, `Dockerfile` from existing service
3. Create `src/index.ts` with Express app
4. Add service to `docker-compose.yml`
5. Add routes to API Gateway

## 🗄️ Database Operations

### Prisma Migrations

```bash
# Generate migration after schema change
cd services/order-service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shard_a \
  npx prisma migrate dev --name "add_order_column"

# Apply migration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shard_a \
  npx prisma migrate deploy
```

### Query Examples

```typescript
import { getPrismaClient } from './services/prismaService';

// Create
const prisma = getPrismaClient('san-francisco');
await prisma.order.create({
  data: {
    id: uuidv4(),
    customerId: 'customer-123',
    restaurantId: 'restaurant-456',
    status: 'pending',
    deliveryAddress: '123 Main St',
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    totalAmount: 45.99,
    estimatedDeliveryTime: 30,
  }
});

// Read
await prisma.order.findUnique({
  where: { id: 'order-uuid' }
});

// Update
await prisma.order.update({
  where: { id: 'order-uuid' },
  data: { status: 'in_transit' }
});

// Delete
await prisma.order.delete({
  where: { id: 'order-uuid' }
});
```

### MongoDB Operations

```typescript
import { Restaurant, MenuItem } from './models';

// Create
const restaurant = new Restaurant({
  _id: uuidv4(),
  name: 'Pizza Place',
  city: 'San Francisco',
  // ... other fields
});
await restaurant.save();

// Find
const restaurants = await Restaurant.find({ city: 'San Francisco' });
const one = await Restaurant.findById(id);

// Update
await Restaurant.findByIdAndUpdate(id, { rating: 4.5 });

// Delete
await Restaurant.findByIdAndDelete(id);
```

## 📡 Event Publishing & Consuming

### Publishing Events (RabbitMQ)

```typescript
import { publishEvent } from './services/rabbitmqService';

// In order-service
const event: OrderEvents.OrderCreatedEvent = {
  eventType: 'order.created',
  orderId: order.id,
  customerId: order.customerId,
  restaurantId: order.restaurantId,
  deliveryCity: city,
  totalAmount: order.totalAmount,
  estimatedDeliveryTime: 30,
  timestamp: new Date(),
};

await publishEvent('order.events', event);
```

### Consuming Events

Already implemented in `services/delivery-service/src/services/rabbitmqService.ts`

To add new consumer:
```typescript
await channel.bindQueue(queue.queue, 'order.events', 'order.status.updated');

channel.consume(queue.queue, async (msg) => {
  if (msg) {
    const event = JSON.parse(msg.content.toString());
    await handleOrderStatusUpdated(event);
    channel.ack(msg);
  }
});
```

## 🔴 Real-Time Features (Socket.IO)

### Frontend Usage

```typescript
import { subscribeToOrder, onLocationUpdated } from '../utils/socketClient';

// Subscribe to order
subscribeToOrder('order-uuid');

// Listen for updates
onLocationUpdated((data) => {
  console.log('New location:', data);
});
```

### Backend Usage (Tracking Service)

Already implemented - locations automatically broadcast to subscribed clients

## 🔐 Authentication

### Getting JWT Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "city": "san-francisco"
  }'
```

### Using Token in Requests

```bash
curl http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Frontend automatically adds token via Axios interceptor.

## 🐛 Debugging

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f order-service

# Last 100 lines
docker-compose logs -f --tail=100 order-service
```

### Database Connection Issues

```bash
# Test PostgreSQL shard A
psql postgresql://postgres:postgres@localhost:5432/shard_a

# Test MongoDB
mongo "mongodb://root:mongodb@localhost:27017/restaurants?authSource=admin"

# Test Redis
redis-cli -h localhost -p 6379

# Test RabbitMQ
curl http://localhost:15672  # Management UI
```

### Check Running Containers

```bash
docker-compose ps
docker logs <container-id>
docker exec -it <container-id> /bin/bash
```

## 📊 Testing Workflows

### Create Order Flow

```bash
# 1. Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "pass123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "role": "customer",
    "city": "san-francisco"
  }'

# 2. Get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "pass123",
    "city": "san-francisco"
  }'
# Copy token from response

# 3. Create order
TOKEN="your-jwt-token"
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-uuid",
    "restaurantId": "restaurant-uuid",
    "deliveryAddress": "123 Main St, SF",
    "city": "san-francisco",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "totalAmount": 45.99
  }'

# 4. Get order
ORDER_ID="order-uuid-from-response"
curl "http://localhost:3000/orders/$ORDER_ID?city=san-francisco" \
  -H "Authorization: Bearer $TOKEN"
```

### Track Order (WebSocket)

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3005');

socket.on('connect', () => {
  console.log('Connected');
  
  // Subscribe to order
  socket.emit('subscribe-order', 'order-uuid');
  
  // Listen for location updates
  socket.on('location-updated', (data) => {
    console.log('Rider location:', data);
  });
});
```

## ♻️ Redis Operations

### Check Redis Data

```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# Get all keys
KEYS *

# Get specific key
GET order:order-uuid:location

# Check TTL
TTL order:order-uuid:location

# Clear all
FLUSHALL
```

## 🔄 Common Tasks

### Clear Docker Volumes & Start Fresh

```bash
docker-compose down -v
docker-compose up -d
```

### Rebuild Services

```bash
docker-compose build --no-cache
docker-compose up -d
```

### View Service Resource Usage

```bash
docker stats
```

### Debug Service Inside Container

```bash
docker exec -it order-service sh
npm run dev  # Run in watch mode inside container
```

## 📝 Code Style

### TypeScript Strict Mode
- Ensure `strict: true` in `tsconfig.base.json`
- Use explicit types for function parameters
- Avoid `any` type

### Error Handling
```typescript
try {
  // operation
} catch (error: any) {
  console.error('Operation failed:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Operation failed'
  });
}
```

### Environment Variables
```typescript
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
```

## 🚢 Deployment

### Build Production Images

```bash
docker-compose build --no-cache
```

### Update .env for Production

```bash
cp .env.example .env.production
# Edit .env.production with production values
docker-compose -f docker-compose.yml --env-file .env.production up -d
```

## 📚 Documentation Files

- **README.md** - Project overview and setup
- **SETUP_GUIDE.md** - Detailed setup instructions
- **IMPLEMENTATION_NOTES.md** - Architecture and design decisions
- **This file** - Developer reference

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| `Port already in use` | Change port in docker-compose.yml |
| `Database connection failed` | Wait 30s for DB to initialize, check docker logs |
| `WebSocket connection failed` | Ensure tracking-service is running, check CORS |
| `RabbitMQ connection failed` | Wait for rabbitmq container, check credentials |
| `MongoDB auth failed` | Verify connection string in .env matches docker-compose |
| `Prisma client mismatch` | Run `npm install @prisma/client` in service |

## 📞 Support

- Check logs first: `docker-compose logs -f <service>`
- Review IMPLEMENTATION_NOTES.md for architecture details
- Check individual service Dockerfiles for base images
- Review event types in `shared/events/types.ts`
- Verify database schemas in each service's `prisma/schema.prisma`

---

**Last Updated**: 2025-11-15
**Project**: Instant Eats - Real-Time Food Delivery Platform
