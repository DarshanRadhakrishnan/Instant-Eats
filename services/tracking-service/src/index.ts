import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { connectRedis, setLocation, publishLocationUpdate, getRedisClient } from './services/redisService';

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'tracking-service', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket: Socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // Subscribe to order tracking
  socket.on('subscribe-order', async (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`📍 Client subscribed to order: ${orderId}`);
  });

  // Receive rider location update
  socket.on('rider-location-update', async (data: any) => {
    try {
      const { orderId, deliveryPartnerId, latitude, longitude } = data;

      if (!orderId || !latitude || !longitude) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Store in Redis
      await setLocation(orderId, deliveryPartnerId, latitude, longitude);

      // Broadcast to all clients subscribed to this order
      io.to(`order:${orderId}`).emit('location-updated', {
        orderId,
        deliveryPartnerId,
        latitude,
        longitude,
        timestamp: Date.now(),
      });

      console.log(`📍 Location updated for order: ${orderId}`);
    } catch (error) {
      console.error('Error updating location:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  // Get current location
  socket.on('get-location', async (orderId: string, callback: any) => {
    try {
      const redisClient = getRedisClient();
      const key = `order:${orderId}:location`;
      const data = await redisClient.get(key);

      if (data) {
        callback({ success: true, data: JSON.parse(data) });
      } else {
        callback({ success: false, message: 'Location not found' });
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      callback({ success: false, error: 'Failed to fetch location' });
    }
  });

  // Unsubscribe from order
  socket.on('unsubscribe-order', (orderId: string) => {
    socket.leave(`order:${orderId}`);
    console.log(`📍 Client unsubscribed from order: ${orderId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });

  // Error handling
  socket.on('error', (error: any) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

const PORT = process.env.PORT || 3005;

httpServer.listen(PORT, async () => {
  console.log(`✅ Tracking Service is running on port ${PORT}`);

  try {
    await connectRedis();
    console.log('✅ Redis connected');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    process.exit(1);
  }
});
