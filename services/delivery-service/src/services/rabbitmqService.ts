import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from './services/prismaService';
import { OrderEvents } from '../../../shared/events/types';

let connection: amqp.Connection;
let channel: amqp.Channel;

export async function connectRabbitMQ(): Promise<void> {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Declare exchange
    await channel.assertExchange('order.events', 'topic', { durable: true });

    // Create queue for delivery service
    const queue = await channel.assertQueue('delivery-service-queue', { durable: true });

    // Bind queue to exchange
    await channel.bindQueue(queue.queue, 'order.events', 'order.created');
    await channel.bindQueue(queue.queue, 'order.events', 'order.assigned');

    // Start consuming messages
    channel.consume(queue.queue, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString()) as OrderEvents.OrderCreatedEvent;
          await handleOrderCreatedEvent(event);
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          channel.nack(msg, false, true);
        }
      }
    });

    console.log('✅ RabbitMQ connection established - consuming order events');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

async function handleOrderCreatedEvent(event: OrderEvents.OrderCreatedEvent): Promise<void> {
  try {
    console.log(`📦 Processing order created event: ${event.orderId}`);

    const prisma = getPrismaClient(event.deliveryCity);

    // Find available delivery partner (simple implementation)
    const deliveryPartner = await prisma.deliveryPartner.findFirst({
      where: {
        city: event.deliveryCity,
        isAvailable: true,
      },
    });

    if (deliveryPartner) {
      // Assign delivery partner to order
      await prisma.order.update({
        where: { id: event.orderId },
        data: { deliveryPartnerId: deliveryPartner.id, status: 'confirmed' },
      });

      // Update delivery partner availability
      await prisma.deliveryPartner.update({
        where: { id: deliveryPartner.id },
        data: { isAvailable: false, currentOrderId: event.orderId },
      });

      console.log(`✅ Order assigned to delivery partner: ${deliveryPartner.id}`);

      // Publish order.assigned event
      if (channel) {
        const assignedEvent: OrderEvents.OrderAssignedEvent = {
          eventType: 'order.assigned',
          orderId: event.orderId,
          deliveryPartnerId: deliveryPartner.id,
          estimatedPickupTime: 10,
          timestamp: new Date(),
        };

        const message = Buffer.from(JSON.stringify(assignedEvent));
        channel.publish('order.events', 'order.assigned', message, { persistent: true });
      }
    } else {
      console.warn(`⚠️ No available delivery partners for order: ${event.orderId}`);
    }
  } catch (error) {
    console.error('Error handling order created event:', error);
  }
}

export async function disconnect(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('✅ RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}
