import express, { Express } from 'express';
import cors from 'cors';
import { connectRedis, closeRedis } from './redis';
import { dashboardRoutes } from './routes';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📊 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'admin-dashboard', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

const PORT = process.env.PORT || 3006;

async function startServer() {
  try {
    // Initialize Redis
    await connectRedis();
    console.log('🚀 Admin Dashboard initializing...');

    app.listen(PORT, () => {
      console.log(`✅ Admin Dashboard running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   📊 Dashboard URL: http://localhost:${PORT}/admin`);
      console.log(`   📡 API Base: http://localhost:${PORT}/api/dashboard`);
    });
  } catch (error) {
    console.error('❌ Failed to start Admin Dashboard:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Admin Dashboard...');
  await closeRedis();
  process.exit(0);
});

startServer();
