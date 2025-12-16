import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { connectRabbitMQ, publishEvent } from './services/rabbitmqService';
import { getPrismaClient } from './services/prismaService';
import { OrderEvents } from '../../../shared/events/types';

const app = express();
app.use(express.json());

let rabbitmqConnected = false;

// Helper: Calculate cancellation eligibility and refund
const calculateCancellationInfo = async (order: any, prisma: any) => {
  const createdAt = new Date(order.createdAt);
  const now = new Date();
  const minutesElapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

  // Get cancellation policy for current status
  const policy = await prisma.cancellationPolicy.findUnique({
    where: { status: order.status },
  });

  if (!policy) {
    return {
      canCancel: false,
      reason: `No cancellation policy found for status: ${order.status}`,
      refundAmount: 0,
      refundPercentage: 0,
      cancellationFee: 0,
    };
  }

  const canCancel = minutesElapsed <= policy.maxCancellationTime;

  if (!canCancel) {
    return {
      canCancel: false,
      reason: `Cancellation window closed. Max allowed: ${policy.maxCancellationTime}min, elapsed: ${minutesElapsed}min`,
      refundAmount: 0,
      refundPercentage: 0,
      cancellationFee: 0,
    };
  }

  // Calculate refund
  const baseRefund = order.totalAmount * (policy.refundPercentage / 100);
  const refundAmount = Math.max(0, baseRefund - policy.cancellationFee);

  return {
    canCancel: true,
    reason: `Order can be cancelled. ${policy.description}`,
    refundAmount,
    refundPercentage: policy.refundPercentage,
    cancellationFee: policy.cancellationFee,
    minutesElapsed,
    maxAllowedMinutes: policy.maxCancellationTime,
  };
};

// Helper: Process refund with Payment Service
const processRefund = async (
  orderId: string,
  customerId: string,
  refundAmount: number,
  reason: string
): Promise<string | null> => {
  try {
    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';
    const response = await axios.post(`${paymentServiceUrl}/refunds`, {
      orderId,
      customerId,
      refundAmount,
      reason,
      timestamp: new Date().toISOString(),
    });

    return response.data.data?.refundId || null;
  } catch (error) {
    console.error('Failed to process refund with Payment Service:', error);
    return null;
  }
};

// Helper: Send notification
const sendNotification = async (
  customerId: string,
  orderId: string,
  message: string,
  refundAmount: number
): Promise<void> => {
  try {
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
    await axios.post(`${notificationServiceUrl}/send`, {
      customerId,
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message,
      data: {
        orderId,
        refundAmount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

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

// Get cancellation info for an order
app.get('/:id/cancellation-info', async (req, res) => {
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

    // Fetch order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check if already cancelled
    const existingCancellation = await prisma.orderCancellation.findUnique({
      where: { orderId: id },
    });

    if (existingCancellation) {
      return res.status(400).json({
        success: false,
        error: 'Order is already cancelled',
        data: existingCancellation,
      });
    }

    // Calculate cancellation info
    const cancellationInfo = await calculateCancellationInfo(order, prisma);

    res.json({
      success: true,
      data: {
        orderId: id,
        orderStatus: order.status,
        orderTotal: order.totalAmount,
        createdAt: order.createdAt,
        ...cancellationInfo,
      },
    });
  } catch (error: any) {
    console.error('Get cancellation info error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get cancellation info',
    });
  }
});

// Cancel order with smart refund calculation
app.delete('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { city, cancelledBy, reason } = req.body;

    if (!city || !cancelledBy) {
      return res.status(400).json({
        success: false,
        error: 'City and cancelledBy are required',
      });
    }

    const prisma = getPrismaClient(city);

    // Fetch order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check if already cancelled
    const existingCancellation = await prisma.orderCancellation.findUnique({
      where: { orderId: id },
    });

    if (existingCancellation) {
      return res.status(400).json({
        success: false,
        error: 'Order is already cancelled',
      });
    }

    // Calculate cancellation info
    const cancellationInfo = await calculateCancellationInfo(order, prisma);

    if (!cancellationInfo.canCancel) {
      return res.status(400).json({
        success: false,
        error: cancellationInfo.reason,
        data: cancellationInfo,
      });
    }

    // Process refund with Payment Service
    const paymentRefundId = await processRefund(
      id,
      order.customerId,
      cancellationInfo.refundAmount,
      reason || 'Order cancelled by customer'
    );

    // Create cancellation record
    const cancellation = await prisma.orderCancellation.create({
      data: {
        orderId: id,
        cancelledBy,
        reason: reason || 'No reason provided',
        refundAmount: cancellationInfo.refundAmount,
        refundPercentage: cancellationInfo.refundPercentage,
        cancellationFee: cancellationInfo.cancellationFee,
        paymentRefundId: paymentRefundId || undefined,
        cancelledAt: new Date(),
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id },
      data: { status: 'cancelled', updatedAt: new Date() },
    });

    // Send notification
    await sendNotification(
      order.customerId,
      id,
      `Your order has been cancelled. Refund of ₹${cancellationInfo.refundAmount.toFixed(2)} will be processed.`,
      cancellationInfo.refundAmount
    );

    // Publish cancellation event to RabbitMQ
    if (rabbitmqConnected) {
      const event: OrderEvents.OrderCancelledEvent = {
        eventType: 'order.cancelled',
        orderId: id,
        customerId: order.customerId,
        restaurantId: order.restaurantId,
        refundAmount: cancellationInfo.refundAmount,
        cancelledBy,
        reason: reason || 'No reason provided',
        timestamp: new Date(),
      };

      await publishEvent('order.events', event);
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        cancellation,
        refundInfo: {
          refundAmount: cancellationInfo.refundAmount,
          refundPercentage: cancellationInfo.refundPercentage,
          cancellationFee: cancellationInfo.cancellationFee,
          paymentRefundId,
        },
      },
    });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel order',
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
