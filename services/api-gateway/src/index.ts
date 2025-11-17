import express from 'express';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { orderRoutes } from './routes/orders';
import { restaurantRoutes } from './routes/restaurants';
import { deliveryRoutes } from './routes/delivery';

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
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

app.listen(PORT, () => {
  console.log(`✅ API Gateway is running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
