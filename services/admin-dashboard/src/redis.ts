import { createClient, RedisClient } from 'redis';

let redisClient: RedisClient | null = null;

export async function connectRedis(): Promise<RedisClient> {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    redisClient.on('error', (err) => {
      console.error('Redis Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected for Admin Dashboard');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedisClient(): RedisClient | null {
  return redisClient;
}

export async function getCacheStats() {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const info = await client.info();
    const keys = await client.keys('cache:*');

    let memoryUsed = '0B';
    const memoryMatch = info.match(/used_memory_human:(.*?)\r/);
    if (memoryMatch) {
      memoryUsed = memoryMatch[1];
    }

    // Get top 10 cache keys
    const topKeys = [];
    for (const key of keys.slice(0, 10)) {
      const size = await client.memoryUsage(key);
      const ttl = await client.ttl(key);
      topKeys.push({ key, size: size || 0, ttl: ttl || -1 });
    }

    return {
      totalKeys: keys.length,
      memoryUsed,
      topKeys: topKeys.sort((a, b) => b.size - a.size),
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
