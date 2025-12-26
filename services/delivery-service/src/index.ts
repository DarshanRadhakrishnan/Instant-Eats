import express from 'express';
import { connectRabbitMQ } from './services/rabbitmqService';
import { getPrismaClient } from './services/prismaService';
import { setupSwagger } from '../../../shared/openapi/setup';
import './openapi';

const app = express();
app.use(express.json());

// Setup Swagger/OpenAPI documentation
setupSwagger({
  app,
  title: 'Delivery Service',
  description: 'Manages delivery partner assignments, real-time location tracking, and delivery status updates via OpenAPI',
  version: '1.0.0',
  serviceName: 'delivery-service',
  port: 3004,
  docsPath: '/api-docs',
});

let rabbitmqConnected = false;

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'delivery-service', timestamp: new Date().toISOString() });
});

// Get delivery assignments for partner
app.get('/assignments', async (req, res) => {
  try {
    const { deliveryPartnerId, city } = req.query;

    if (!deliveryPartnerId || !city) {
      return res.status(400).json({
        success: false,
        error: 'deliveryPartnerId and city are required',
      });
    }

    const prisma = getPrismaClient(city as string);
    const assignment = await prisma.order.findFirst({
      where: {
        deliveryPartnerId: deliveryPartnerId as string,
        status: { in: ['ready', 'picked_up', 'in_transit'] },
      },
    });

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error: any) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch assignments',
    });
  }
});

// Update delivery partner location
app.patch('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, city } = req.body;

    if (!latitude || !longitude || !city) {
      return res.status(400).json({
        success: false,
        error: 'latitude, longitude, and city are required',
      });
    }

    const prisma = getPrismaClient(city);
    const deliveryPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: { latitude, longitude, updatedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: deliveryPartner,
    });
  } catch (error: any) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update location',
    });
  }
});

// Accept delivery order
app.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId, city } = req.body;

    if (!orderId || !city) {
      return res.status(400).json({
        success: false,
        error: 'orderId and city are required',
      });
    }

    const prisma = getPrismaClient(city);

    // Update delivery partner availability
    await prisma.deliveryPartner.update({
      where: { id },
      data: { isAvailable: false, currentOrderId: orderId },
    });

    // Update order status
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'in_transit' },
    });

    res.json({
      success: true,
      message: 'Delivery accepted successfully',
      data: order,
    });
  } catch (error: any) {
    console.error('Accept delivery error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept delivery',
    });
  }
});

const PORT = process.env.PORT || 3004;

app.listen(PORT, async () => {
  console.log(`✅ Delivery Service is running on port ${PORT}`);

  try {
    await connectRabbitMQ();
    rabbitmqConnected = true;
    console.log('✅ RabbitMQ consumer started');
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
  }
});
