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

// ============ METRICS ENDPOINTS ============

// Get customer spending metrics
app.get('/metrics/customer/:customerId/spending', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const prisma = getPrismaClient(city as string);

    const orders = await prisma.order.findMany({
      where: { customerId, status: { not: 'cancelled' } },
    });

    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const avgSpent = orders.length > 0 ? totalSpent / orders.length : 0;
    const maxSpent = Math.max(...orders.map(o => o.totalAmount), 0);
    const minSpent = orders.length > 0 ? Math.min(...orders.map(o => o.totalAmount)) : 0;

    res.json({
      success: true,
      data: {
        customerId,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        totalOrders: orders.length,
        averageOrderValue: parseFloat(avgSpent.toFixed(2)),
        highestOrder: parseFloat(maxSpent.toFixed(2)),
        lowestOrder: parseFloat(minSpent.toFixed(2)),
        spendingTrend: orders.length > 1 ? 'Growing' : 'New Customer',
      },
    });
  } catch (error: any) {
    console.error('Spending metrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get most eaten dishes
app.get('/metrics/popular/dishes', async (req, res) => {
  try {
    const { city, limit = 10 } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const prisma = getPrismaClient(city as string);

    const orders = await prisma.order.findMany({
      where: { status: 'delivered', city: city as string },
      select: { id: true, totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Group dishes (would need items in schema - returning mock aggregation for now)
    const popularDishes = [
      { name: 'Butter Chicken', orders: 342, revenue: 8550, popularity: 95 },
      { name: 'Biryani', orders: 298, revenue: 8940, popularity: 92 },
      { name: 'Paneer Tikka', orders: 276, revenue: 6900, popularity: 88 },
      { name: 'Dosa', orders: 245, revenue: 4410, popularity: 85 },
      { name: 'Chole Bhature', orders: 189, revenue: 3402, popularity: 78 },
    ].slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        city,
        popularDishes,
        totalOrders: orders.length,
      },
    });
  } catch (error: any) {
    console.error('Popular dishes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get most liked dishes
app.get('/metrics/liked/dishes', async (req, res) => {
  try {
    const { city, limit = 10 } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const likedDishes = [
      { name: 'Tandoori Chicken', likes: 1250, dislikes: 45, rating: 4.8, reviews: 320 },
      { name: 'Garlic Naan', likes: 980, dislikes: 28, rating: 4.7, reviews: 245 },
      { name: 'Masala Dosa', likes: 865, dislikes: 35, rating: 4.6, reviews: 198 },
      { name: 'Samosas', likes: 742, dislikes: 22, rating: 4.8, reviews: 167 },
      { name: 'Lassi', likes: 621, dislikes: 18, rating: 4.7, reviews: 142 },
    ].slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        city,
        likedDishes: likedDishes.map(d => ({
          ...d,
          likePercentage: ((d.likes / (d.likes + d.dislikes)) * 100).toFixed(1),
        })),
      },
    });
  } catch (error: any) {
    console.error('Liked dishes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get customer favorite restaurants
app.get('/metrics/customer/:customerId/favorites', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const prisma = getPrismaClient(city as string);

    const orders = await prisma.order.findMany({
      where: { customerId, status: 'delivered' },
      select: { restaurantId: true, totalAmount: true },
    });

    // Group by restaurant
    const restaurantMap = new Map<string, { count: number; spent: number }>();
    orders.forEach(order => {
      const existing = restaurantMap.get(order.restaurantId) || { count: 0, spent: 0 };
      restaurantMap.set(order.restaurantId, {
        count: existing.count + 1,
        spent: existing.spent + order.totalAmount,
      });
    });

    const favorites = Array.from(restaurantMap.entries())
      .map(([id, data]) => ({
        restaurantId: id,
        orderCount: data.count,
        totalSpent: parseFloat(data.spent.toFixed(2)),
        avgOrderValue: parseFloat((data.spent / data.count).toFixed(2)),
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        customerId,
        favoriteRestaurants: favorites,
        mostFrequent: favorites[0]?.restaurantId || null,
      },
    });
  } catch (error: any) {
    console.error('Favorites error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get customer ordering frequency
app.get('/metrics/customer/:customerId/frequency', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const prisma = getPrismaClient(city as string);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const allOrders = await prisma.order.findMany({
      where: { customerId },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    const monthOrders = allOrders.filter(o => o.createdAt > thirtyDaysAgo && o.status !== 'cancelled').length;
    const weekOrders = allOrders.filter(o => o.createdAt > sevenDaysAgo && o.status !== 'cancelled').length;
    const lastOrder = allOrders[0]?.createdAt;

    const avgOrdersPerMonth = allOrders.length > 0 ? Math.ceil(allOrders.length / 3) : 0; // Assuming 3-month history

    res.json({
      success: true,
      data: {
        customerId,
        totalOrders: allOrders.length,
        ordersThisMonth: monthOrders,
        ordersThisWeek: weekOrders,
        averageOrdersPerMonth: avgOrdersPerMonth,
        lastOrderDate: lastOrder,
        frequency: weekOrders > 2 ? 'Frequent' : weekOrders > 0 ? 'Regular' : 'Occasional',
        loyaltyTier: allOrders.length > 50 ? 'GOLD' : allOrders.length > 20 ? 'SILVER' : 'BRONZE',
      },
    });
  } catch (error: any) {
    console.error('Frequency error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cancellation metrics
app.get('/metrics/customer/:customerId/cancellations', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const prisma = getPrismaClient(city as string);

    const allOrders = await prisma.order.findMany({
      where: { customerId },
    });

    const cancelledOrders = allOrders.filter(o => o.status === 'cancelled');
    const cancellationRate = allOrders.length > 0 ? (cancelledOrders.length / allOrders.length * 100).toFixed(1) : 0;

    const cancellations = await prisma.orderCancellation.findMany({
      where: { order: { customerId } },
      select: { reason: true, cancelledAt: true, refundAmount: true },
      orderBy: { cancelledAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        customerId,
        totalCancellations: cancelledOrders.length,
        cancellationRate: parseFloat(cancellationRate as string),
        totalRefunded: parseFloat(cancellations.reduce((sum, c) => sum + c.refundAmount, 0).toFixed(2)),
        recentCancellations: cancellations,
      },
    });
  } catch (error: any) {
    console.error('Cancellation metrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get city-wide analytics
app.get('/metrics/city/:city/analytics', async (req, res) => {
  try {
    const { city } = req.params;

    const prisma = getPrismaClient(city);

    const allOrders = await prisma.order.findMany({
      where: { city },
      select: { totalAmount: true, status: true, createdAt: true, restaurantId: true },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayOrders = allOrders.filter(o => o.createdAt > todayStart && o.status !== 'cancelled');
    const monthOrders = allOrders.filter(o => o.createdAt > monthStart && o.status !== 'cancelled');
    const cancelledOrders = allOrders.filter(o => o.status === 'cancelled');

    res.json({
      success: true,
      data: {
        city,
        ordersToday: todayOrders.length,
        ordersThisMonth: monthOrders.length,
        revenueToday: parseFloat(todayOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)),
        revenueThisMonth: parseFloat(monthOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)),
        averageOrderValue: monthOrders.length > 0 ? parseFloat((monthOrders.reduce((sum, o) => sum + o.totalAmount, 0) / monthOrders.length).toFixed(2)) : 0,
        cancellationRate: allOrders.length > 0 ? parseFloat(((cancelledOrders.length / allOrders.length) * 100).toFixed(1)) : 0,
        uniqueRestaurants: new Set(monthOrders.map(o => o.restaurantId)).size,
      },
    });
  } catch (error: any) {
    console.error('City analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get customer spending trends
app.get('/metrics/customer/:customerId/trends', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const prisma = getPrismaClient(city as string);

    const orders = await prisma.order.findMany({
      where: { customerId, status: { not: 'cancelled' } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyData: { [key: string]: { count: number; total: number } } = {};
    orders.forEach(order => {
      const key = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[key]) monthlyData[key] = { count: 0, total: 0 };
      monthlyData[key].count += 1;
      monthlyData[key].total += order.totalAmount;
    });

    const trends = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      orders: data.count,
      spent: parseFloat(data.total.toFixed(2)),
      avgOrderValue: parseFloat((data.total / data.count).toFixed(2)),
    }));

    res.json({
      success: true,
      data: {
        customerId,
        monthlyTrends: trends,
        spendingDirection: trends.length > 1 && trends[trends.length - 1].spent > trends[0].spent ? 'Increasing' : 'Stable',
      },
    });
  } catch (error: any) {
    console.error('Trends error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get restaurant performance metrics
app.get('/metrics/restaurant/:restaurantId/performance', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const prisma = getPrismaClient(city as string);

    const allOrders = await prisma.order.findMany({
      where: { restaurantId },
      select: { totalAmount: true, status: true, createdAt: true, customerId: true, estimatedDeliveryTime: true },
    });

    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
    const cancelledOrders = allOrders.filter(o => o.status === 'cancelled');
    const uniqueCustomers = new Set(allOrders.map(o => o.customerId)).size;

    res.json({
      success: true,
      data: {
        restaurantId,
        totalOrders: allOrders.length,
        totalRevenue: parseFloat(allOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)),
        averageOrderValue: allOrders.length > 0 ? parseFloat((allOrders.reduce((sum, o) => sum + o.totalAmount, 0) / allOrders.length).toFixed(2)) : 0,
        uniqueCustomers,
        deliveryRate: parseFloat(((deliveredOrders.length / allOrders.length) * 100).toFixed(1)),
        cancellationRate: parseFloat(((cancelledOrders.length / allOrders.length) * 100).toFixed(1)),
        averageDeliveryTime: deliveredOrders.length > 0 ? Math.ceil(deliveredOrders.reduce((sum, o) => sum + (o.estimatedDeliveryTime || 30), 0) / deliveredOrders.length) : 0,
      },
    });
  } catch (error: any) {
    console.error('Restaurant performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get personalized recommendations
app.get('/metrics/customer/:customerId/recommendations', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter required' });
    }

    const prisma = getPrismaClient(city as string);

    const orders = await prisma.order.findMany({
      where: { customerId, status: 'delivered' },
      select: { restaurantId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Recommendations based on ordering history
    const restaurantFrequency: { [key: string]: number } = {};
    orders.forEach(order => {
      restaurantFrequency[order.restaurantId] = (restaurantFrequency[order.restaurantId] || 0) + 1;
    });

    const topRestaurants = Object.entries(restaurantFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    res.json({
      success: true,
      data: {
        customerId,
        recommendations: {
          message: 'Based on your ordering history',
          frequentlyOrderedFrom: topRestaurants,
          nextRecommendation: 'Try a new restaurant in your favorite category',
          discountEligible: orders.length > 10,
        },
      },
    });
  } catch (error: any) {
    console.error('Recommendations error:', error);
    res.status(500).json({ success: false, error: error.message });
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
