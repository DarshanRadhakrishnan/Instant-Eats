# Real-Time Food Delivery Tracking System (Instant Eats)

A complete microservices-based food delivery platform with real-time tracking, order management, and delivery coordination.

## Architecture Overview

### Microservices
- **API Gateway**: Request routing, rate limiting, and shard-aware request forwarding
- **Auth Service**: User, restaurant, and delivery partner authentication with JWT
- **Order Service**: Order creation and lifecycle management with event publishing
- **Restaurant Service**: Restaurant metadata and menu management
- **Delivery Service**: Delivery partner assignment and order fulfillment
- **Tracking Service**: Real-time location tracking via WebSockets

### Data Layer
- **PostgreSQL (3 Shards)**: Application-level sharding by region/city
  - Shard A: US-West, Canada
  - Shard B: US-East, US-Central
  - Shard C: US-South, Mexico
- **MongoDB**: Restaurant metadata, menus, and catalogs
- **Redis**: Rider location caching and pub/sub messaging
- **RabbitMQ**: Asynchronous event streaming between services

### Infrastructure
- **Docker**: Containerized deployment for all services
- **Nginx**: Load balancing and reverse proxy
- **Socket.IO**: Real-time WebSocket communication
- **Prisma ORM**: Database abstraction with multiple shard configurations

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **APIs**: Express.js / Fastify
- **WebSockets**: Socket.IO
- **Databases**: PostgreSQL (sharded), MongoDB
- **Cache/Pub-Sub**: Redis
- **Message Queue**: RabbitMQ
- **ORM**: Prisma
- **Frontend**: React 18, Vite, Tailwind CSS
- **Containerization**: Docker, Docker Compose

## Project Structure

```
instant-eats/
├── services/
│   ├── api-gateway/          # Request routing & sharding awareness
│   ├── auth-service/         # Authentication & authorization
│   ├── order-service/        # Order management & RabbitMQ publishing
│   ├── restaurant-service/   # Restaurant metadata & MongoDB
│   ├── delivery-service/     # Delivery management & RabbitMQ consuming
│   └── tracking-service/     # Real-time tracking with Socket.IO
├── shared/                   # Shared types, interfaces, utilities
│   └── sharding/            # Sharding configuration & routing logic
├── frontend/                # React + Vite + Tailwind scaffold
├── docker-compose.yml       # Multi-container orchestration
├── nginx.conf              # Load balancer configuration
├── tsconfig.base.json      # Base TypeScript configuration
├── .env.example            # Environment variables template
└── README.md               # This file

```

## Sharding Strategy

The system implements **application-level sharding** with three PostgreSQL instances:

### Shard Configuration (`shared/sharding/shardConfig.ts`)
Defines shard endpoints and their associated regions:
- **Shard A**: US-West, Canada
- **Shard B**: US-East, US-Central
- **Shard C**: US-South, Mexico

### Shard Routing (`shared/sharding/getShard.ts`)
Routes requests to appropriate shard based on:
- User's city or region
- Order location
- Delivery region

Each service using PostgreSQL imports the shard routing logic and maintains separate Prisma configurations for each shard.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd instant-eats
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up -d
```

Services will be available at:
- API Gateway: `http://localhost:3000`
- Nginx Load Balancer: `http://localhost:80`
- RabbitMQ Management: `http://localhost:15672` (guest:guest)

### Development

For local development without Docker:

```bash
# Install dependencies for each service
cd services/api-gateway && npm install
cd ../auth-service && npm install
# ... repeat for other services

# Run each service in separate terminal
npm run dev
```

## Database Setup

### Prisma Migrations

Run migrations for each shard:
```bash
# Shard A
cd services/auth-service
DATABASE_URL=$POSTGRES_SHARD_A_URL npx prisma migrate dev --schema=prisma/shardA/schema.prisma

# Shard B
DATABASE_URL=$POSTGRES_SHARD_B_URL npx prisma migrate dev --schema=prisma/shardB/schema.prisma

# Shard C
DATABASE_URL=$POSTGRES_SHARD_C_URL npx prisma migrate dev --schema=prisma/shardC/schema.prisma
```

## Event Flow

### Order Creation Flow
1. Customer creates order via API Gateway
2. Order Service writes to appropriate shard based on city
3. Order Service publishes `order.created` to RabbitMQ
4. Delivery Service consumes event and assigns delivery partner
5. Delivery Service publishes `order.assigned` to RabbitMQ
6. Tracking Service updates customer websocket with delivery info

## API Endpoints

### Auth Service
- `POST /auth/register` - Register user/restaurant/delivery partner
- `POST /auth/login` - Login and get JWT
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Logout

### Order Service
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order details
- `GET /orders` - List user's orders
- `PATCH /orders/:id/status` - Update order status

### Restaurant Service
- `GET /restaurants` - List restaurants
- `GET /restaurants/:id` - Get restaurant details
- `GET /restaurants/:id/menu` - Get restaurant menu
- `POST /restaurants` - Create new restaurant

### Delivery Service
- `GET /delivery/assignments` - Get delivery assignments
- `PATCH /delivery/:id/location` - Update rider location
- `POST /delivery/:id/accept` - Accept delivery

### Tracking Service
- WebSocket: `/tracking?orderId=<id>` - Subscribe to order tracking updates

## Monitoring & Debugging

### Check Service Health
```bash
curl http://localhost/health
```

### View Logs
```bash
docker-compose logs -f <service-name>
```

### Access RabbitMQ Dashboard
Navigate to `http://localhost:15672` with credentials `guest:guest`

## Configuration

All services read from `.env` file. Key configurations:

- `NODE_ENV`: development | production
- Shard URLs: Postgres connection strings for each shard
- `JWT_SECRET`: Secret key for JWT signing
- `REDIS_URL`: Redis connection string
- `RABBITMQ_URL`: RabbitMQ connection string

## Production Considerations

- [ ] Use strong JWT secret
- [ ] Enable HTTPS (update nginx.conf)
- [ ] Configure proper CORS policies
- [ ] Set up database backups for all shards
- [ ] Implement comprehensive logging and monitoring
- [ ] Configure auto-scaling policies
- [ ] Set up CI/CD pipeline
- [ ] Implement API request authentication at gateway
- [ ] Add comprehensive error handling

## Major Updates
User requests cancellation
    ↓
GET /orders/:id/cancellation-info (check eligibility)
    ↓
DELETE /orders/:id/cancel (process cancellation)
    ↓
Calculate refund based on time elapsed + status
    ↓
Call Payment Service → Process refund
    ↓
Update order status to CANCELLED
    ↓
Call Notification Service → Notify all parties
    ↓
Log cancellation in OrderCancellation table
    ↓
Return refund confirmation to customer

## License

MIT
