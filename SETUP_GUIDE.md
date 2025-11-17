# Project Structure & Setup Guide

## Complete Folder Structure Created

```
instant-eats/
├── services/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── index.ts                 # Express app with routes
│   │   │   ├── middleware/
│   │   │   │   ├── requestLogger.ts
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── rateLimit.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── orders.ts
│   │   │   │   ├── restaurants.ts
│   │   │   │   └── delivery.ts
│   │   │   └── utils/
│   │   │       └── forwardRequest.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── register.ts         # User registration
│   │   │   │   ├── login.ts            # JWT login
│   │   │   │   └── refresh.ts          # Token refresh
│   │   │   └── services/
│   │   │       └── prismaService.ts    # Shard-aware Prisma client
│   │   ├── prisma/
│   │   │   └── schema.prisma           # User schema
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── order-service/
│   │   ├── src/
│   │   │   ├── index.ts                # Order CRUD & RabbitMQ publisher
│   │   │   └── services/
│   │   │       ├── rabbitmqService.ts  # Event publishing
│   │   │       └── prismaService.ts    # Shard-aware client
│   │   ├── prisma/
│   │   │   └── schema.prisma           # Order schema
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── restaurant-service/
│   │   ├── src/
│   │   │   ├── index.ts                # MongoDB connection & routes
│   │   │   └── models/
│   │   │       ├── Restaurant.ts       # Mongoose schema
│   │   │       └── MenuItem.ts         # Menu items schema
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── delivery-service/
│   │   ├── src/
│   │   │   ├── index.ts                # Delivery routes
│   │   │   └── services/
│   │   │       ├── rabbitmqService.ts  # RabbitMQ consumer
│   │   │       └── prismaService.ts    # Shard-aware client
│   │   ├── prisma/
│   │   │   └── schema.prisma           # Delivery partner & order schemas
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── tracking-service/
│       ├── src/
│       │   ├── index.ts                # Socket.IO server
│       │   └── services/
│       │       └── redisService.ts     # Redis operations
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── shared/
│   ├── sharding/
│   │   ├── shardConfig.ts              # Shard definitions (A, B, C)
│   │   └── getShard.ts                 # Routing logic by city/region
│   ├── events/
│   │   └── types.ts                    # Event type definitions
│   └── types/
│       └── index.ts                    # Common interfaces
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                    # React entry point
│   │   ├── App.tsx                     # Root component
│   │   ├── index.css                   # Tailwind imports
│   │   ├── components/                 # Reusable components
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   └── TrackingPage.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx         # Auth state management
│   │   └── utils/
│   │       ├── apiClient.ts            # Axios instance
│   │       └── socketClient.ts         # Socket.IO client
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml                  # Multi-container orchestration
├── nginx.conf                          # Load balancer config
├── tsconfig.base.json                  # Base TS config
├── .env.example                        # Environment template
└── README.md                           # Project documentation
```

## Key Features Implemented

### 1. Application-Level Sharding
- **Location**: `shared/sharding/`
- **Files**:
  - `shardConfig.ts`: Defines three PostgreSQL shards with regions
  - `getShard.ts`: Routes requests by city/region or hash
- **Usage**: All services import `getPrismaClient(city)` to get shard-specific client

### 2. API Gateway
- Routes all requests through single entry point
- Shard-aware forwarding to microservices
- Rate limiting middleware
- Request logging
- Error handling

### 3. Authentication Service
- JWT token generation with expiry
- Bcrypt password hashing
- Shard-aware user storage
- Token refresh endpoint
- Role-based user types (customer, restaurant, delivery_partner)

### 4. Order Service
- Order CRUD operations
- RabbitMQ event publishing (`order.created`)
- Writes to appropriate PostgreSQL shard based on delivery city
- Handles order status updates

### 5. Restaurant Service
- MongoDB for restaurant metadata
- Mongoose schemas for restaurants and menu items
- Search by city and filters

### 6. Delivery Service
- RabbitMQ event consumer
- Listens for `order.created` and `order.assigned` events
- Automatic delivery partner assignment
- Shard-aware updates
- Location update endpoints

### 7. Tracking Service
- Socket.IO WebSocket server on port 3005
- Redis-backed location storage
- Real-time location broadcasting to customers
- Pub/sub pattern for location updates

### 8. Frontend
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS styling
- Auth context for state management
- Socket.IO integration for real-time tracking
- Axios HTTP client with token interceptor

## Running the System

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services will be available at:
- API Gateway: `http://localhost:3000`
- Auth Service: `http://localhost:3001`
- Order Service: `http://localhost:3002`
- Restaurant Service: `http://localhost:3003`
- Delivery Service: `http://localhost:3004`
- Tracking Service: `http://localhost:3005`
- Nginx: `http://localhost`
- RabbitMQ Management: `http://localhost:15672`

### Option 2: Local Development

```bash
# Terminal 1: Auth Service
cd services/auth-service
npm install
npm run dev

# Terminal 2: Order Service
cd services/order-service
npm install
npm run dev

# Terminal 3: Restaurant Service
cd services/restaurant-service
npm install
npm run dev

# Terminal 4: Delivery Service
cd services/delivery-service
npm install
npm run dev

# Terminal 5: Tracking Service
cd services/tracking-service
npm install
npm run dev

# Terminal 6: API Gateway
cd services/api-gateway
npm install
npm run dev

# Terminal 7: Frontend
cd frontend
npm install
npm run dev
```

## Database Setup

### PostgreSQL Shards

Each shard needs initial schema setup:

```bash
# Docker
docker exec postgres-shard-a psql -U postgres -d shard_a -f /schema.sql

# Or local Prisma migrations
cd services/auth-service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shard_a npx prisma migrate dev
```

### MongoDB

Collections are auto-created by Mongoose on first write.

## Event Flow Example

1. **Customer places order** → API Gateway → Order Service
2. **Order Service** creates order in PostgreSQL shard → publishes `order.created` event
3. **Delivery Service** consumes event → finds available delivery partner → publishes `order.assigned`
4. **Customer** subscribes to order via WebSocket
5. **Delivery Partner** updates location via HTTP endpoint
6. **Tracking Service** stores location in Redis → broadcasts to subscribed customers via WebSocket

## Sharding Configuration

### Region Mapping

| Shard | Regions |
|-------|---------|
| A | us-west, ca, california, washington, oregon, nevada, arizona, utah, colorado |
| B | us-east, us-central, ny, texas, florida, illinois, ohio, pennsylvania, michigan |
| C | us-south, mx, georgia, north-carolina, south-carolina, louisiana, mexico, caribbean |

### Adding New Shards

1. Add PostgreSQL container to `docker-compose.yml`
2. Add shard config to `shared/sharding/shardConfig.ts`
3. Create Prisma schema files
4. Update `.env.example` with new shard URL

## Next Steps for Development

- [ ] Implement actual business logic in controllers/services
- [ ] Add comprehensive error handling and validation
- [ ] Implement JWT verification middleware across services
- [ ] Add database migrations for each service
- [ ] Implement comprehensive logging
- [ ] Add integration tests
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment variables
- [ ] Implement caching strategies
- [ ] Add monitoring and alerting
- [ ] Implement graceful shutdown handlers
- [ ] Add request/response schemas validation

## Notes

- This is a **boilerplate** - implement specific business logic as needed
- TypeScript strict mode is enabled for type safety
- All services are containerized and use environment variables
- Database connections use Prisma for type-safe queries
- WebSockets use Socket.IO for real-time communication
- Redis is used for caching and pub/sub
- RabbitMQ handles async event streaming
- Nginx provides load balancing and reverse proxy

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│            Frontend (React + Vite)           │
│         Tailwind CSS, Socket.IO Client       │
└────────────────┬────────────────────────────┘
                 │
┌─────────────────┴────────────────────────────┐
│              Nginx Load Balancer             │
│     (Port 80, reverse proxy to services)     │
└─────────────────┬────────────────────────────┘
                 │
        ┌────────┼────────┬──────────┐
        │        │        │          │
    ┌───▼──┐ ┌──▼──┐ ┌───▼───┐ ┌───▼────┐
    │ API  │ │Auth │ │Order  │ │Tracking│
    │Gate  │ │Svc  │ │Svc    │ │Svc     │
    │:3000 │ │:3001│ │:3002  │ │:3005   │
    └──┬───┘ └──┬──┘ └───┬───┘ └───┬────┘
       │        │        │         │
   ┌───┴────────┴─┬──────┼─────────┘
   │              │      │
┌──▼──────────┐ ┌─▼────┐ │
│  RabbitMQ   │ │Redis │ │
│  (Events)   │ │:6379 │ │
└─────────────┘ └──────┘ │
                         │
            ┌────────────┴──────────┐
            │                       │
    ┌───────▼──────┐    ┌──────────▼────────┐
    │ PostgreSQL   │    │     MongoDB        │
    │ 3 Shards     │    │   (Restaurants)    │
    │ :5432-:5434  │    │    :27017          │
    └──────────────┘    └────────────────────┘
```

## Support

For more information, refer to:
- README.md - Project overview
- Individual service READMEs
- docker-compose.yml - Service configuration
- .env.example - Environment variables
