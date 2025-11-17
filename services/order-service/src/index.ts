import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { connectRabbitMQ, publishEvent } from './services/rabbitmqService';
import { getPrismaClient } from './services/prismaService';
import { OrderEvents } from '../../../shared/events/types';

const app = express();
app.use(express.json());

let rabbitmqConnected = false;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service', timestamp: new Date().toISOString() });
});

// Create order
app.post('/', async (req, res) => {
  try {
    const { customerId, restaurantId, items, deliveryAddress, city, latitude, longitude, totalAmount } = req.body;

    if (!customerId || !restaurantId || !city) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const prisma = getPrismaClient(city);
    const orderId = uuidv4();

    // Create order in appropriate shard
    const order = await prisma.order.create({
      data: {
        id: orderId,
        customerId,
        restaurantId,
        status: 'pending',
        deliveryAddress,
        city,
        latitude,
        longitude,
        totalAmount,
        estimatedDeliveryTime: 30,
      },
    });

    // Publish event to RabbitMQ
    if (rabbitmqConnected) {
      const event: OrderEvents.OrderCreatedEvent = {
        eventType: 'order.created',
        orderId,
        customerId,
        restaurantId,
        deliveryCity: city,
        totalAmount,
        estimatedDeliveryTime: 30,
        timestamp: new Date(),
      };

      await publishEvent('order.events', event);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order',
    });
  }
});

// Get order by ID
app.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'City parameter is required',
      });
    }

    const prisma = getPrismaClient(city as string);
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order',
    });
  }
});

// Get customer orders
app.get('/', async (req, res) => {
  try {
    const { customerId, city } = req.query;

    if (!customerId || !city) {
      return res.status(400).json({
        success: false,
        error: 'customerId and city parameters are required',
      });
    }

    const prisma = getPrismaClient(city as string);
    const orders = await prisma.order.findMany({
      where: { customerId: customerId as string },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders',
    });
  }
});

// Update order status
app.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, city } = req.body;

    if (!status || !city) {
      return res.status(400).json({
        success: false,
        error: 'Status and city are required',
      });
    }

    const prisma = getPrismaClient(city);
    const order = await prisma.order.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Order status updated',
      data: order,
    });
  } catch (error: any) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order',
    });
  }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, async () => {
  console.log(`✅ Order Service is running on port ${PORT}`);

  // Connect to RabbitMQ
  try {
    await connectRabbitMQ();
    rabbitmqConnected = true;
    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
  }
});
