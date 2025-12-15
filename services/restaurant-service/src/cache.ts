import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

export const initializeRedis = async (): Promise<RedisClientType> => {
  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 0,
    }) as RedisClientType;

    redisClient.on('error', (err) => console.error('🔴 Redis error:', err));
    redisClient.on('connect', () => console.log('🟢 Redis connected'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

export const cacheData = async (
  key: string,
  data: any,
  ttl: number = 3600 // 1 hour default
): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error(`⚠️ Failed to cache data for key ${key}:`, error);
    // Don't throw - caching is non-critical
  }
};

export const getCachedData = async (key: string): Promise<any | null> => {
  try {
    const client = getRedisClient();
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`⚠️ Failed to get cached data for key ${key}:`, error);
    // Don't throw - cache miss is acceptable
    return null;
  }
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`✅ Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error(`⚠️ Failed to invalidate cache pattern ${pattern}:`, error);
    // Don't throw - cache invalidation failure is non-critical
  }
};

export const closeRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.disconnect();
      console.log('✅ Redis disconnected');
    }
  } catch (error) {
    console.error('⚠️ Error closing Redis connection:', error);
  }
};
