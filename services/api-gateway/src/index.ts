import express from 'express';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { cacheHeadersMiddleware } from './middleware/caching';
import { authRoutes } from './routes/auth';
import { orderRoutes } from './routes/orders';
import { restaurantRoutes } from './routes/restaurants';
import { deliveryRoutes } from './routes/delivery';
import { initializeRedis } from './utils/cache';
import { getAllCircuitBreakerStats } from './utils/circuitBreaker';

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);
app.use(cacheHeadersMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// Circuit breaker stats endpoint
app.get('/stats/circuit-breakers', (req, res) => {
  res.json({ circuitBreakers: getAllCircuitBreakerStats() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/orders', orderRoutes);
app.use('/restaurants', restaurantRoutes);
app.use('/delivery', deliveryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Initialize Redis and start server
async function startServer() {
  try {
    // Initialize Redis cache
    await initializeRedis();
    console.log('🚀 Redis cache initialized');
  } catch (error) {
    console.warn('⚠️  Redis initialization failed, continuing without cache:', error);
  }

  app.listen(PORT, () => {
    console.log(`✅ API Gateway is running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Features: Circuit Breakers (Opossum) + Redis Caching`);
  });
}

startServer();
