import * as amqp from 'amqplib';

let connection: amqp.Connection;
let channel: amqp.Channel;

export async function connectRabbitMQ(): Promise<void> {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Declare exchange
    await channel.assertExchange('order.events', 'topic', { durable: true });

    console.log('✅ RabbitMQ connection established');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function publishEvent(exchange: string, event: any): Promise<void> {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const routingKey = event.eventType || 'event.unknown';
    const message = Buffer.from(JSON.stringify(event));

    channel.publish(exchange, routingKey, message, { persistent: true });
    console.log(`📤 Event published: ${routingKey}`);
  } catch (error) {
    console.error('Failed to publish event:', error);
    throw error;
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
