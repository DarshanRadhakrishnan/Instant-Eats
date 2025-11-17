import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

export async function connectRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    client = createClient({ url: redisUrl });

    await client.connect();
    console.log('✅ Connected to Redis');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}

export function getRedisClient() {
  if (!client) {
    throw new Error('Redis client not initialized');
  }
  return client;
}

export async function setLocation(
  orderId: string,
  deliveryPartnerId: string,
  latitude: number,
  longitude: number,
  ttl: number = 3600
): Promise<void> {
  if (!client) throw new Error('Redis client not initialized');

  const key = `order:${orderId}:location`;
  const value = JSON.stringify({ deliveryPartnerId, latitude, longitude, timestamp: Date.now() });

  await client.setEx(key, ttl, value);
}

export async function getLocation(orderId: string): Promise<any> {
  if (!client) throw new Error('Redis client not initialized');

  const key = `order:${orderId}:location`;
  const data = await client.get(key);

  return data ? JSON.parse(data) : null;
}

export async function publishLocationUpdate(orderId: string, location: any): Promise<void> {
  if (!client) throw new Error('Redis client not initialized');

  const channel = `order:${orderId}:tracking`;
  await client.publish(channel, JSON.stringify(location));
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.disconnect();
    console.log('✅ Redis connection closed');
  }
}
