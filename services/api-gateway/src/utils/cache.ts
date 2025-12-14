import { createClient, RedisClient, RedisError } from 'redis';

let redisClient: RedisClient | null = null;

/**
 * Initialize Redis client
 */
export async function initializeRedis(): Promise<void> {
  if (redisClient) {
    return;
  }

  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    redisClient.on('error', (err: RedisError) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Client Connected');
    });

    await redisClient.connect();
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Get a value from Redis cache
 */
export async function getCacheValue(key: string): Promise<string | null> {
  if (!redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      console.log(`✅ Cache HIT for key: ${key}`);
    }
    return value;
  } catch (error) {
    console.error(`❌ Cache GET error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in Redis cache with TTL
 */
export async function setCacheValue(key: string, value: string, ttlSeconds: number = 300): Promise<boolean> {
  if (!redisClient) {
    return false;
  }

  try {
    await redisClient.setEx(key, ttlSeconds, value);
    console.log(`✅ Cache SET for key: ${key} (TTL: ${ttlSeconds}s)`);
    return true;
  } catch (error) {
    console.error(`❌ Cache SET error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete a value from Redis cache
 */
export async function deleteCacheValue(key: string): Promise<boolean> {
  if (!redisClient) {
    return false;
  }

  try {
    const deleted = await redisClient.del(key);
    if (deleted > 0) {
      console.log(`✅ Cache DELETE for key: ${key}`);
    }
    return deleted > 0;
  } catch (error) {
    console.error(`❌ Cache DELETE error for key ${key}:`, error);
    return false;
  }
}

/**
 * Clear all cache values (use with caution)
 */
export async function clearAllCache(): Promise<boolean> {
  if (!redisClient) {
    return false;
  }

  try {
    await redisClient.flushDb();
    console.log('✅ All cache cleared');
    return true;
  } catch (error) {
    console.error('❌ Clear cache error:', error);
    return false;
  }
}

/**
 * Generate cache key from service request details
 */
export function generateCacheKey(serviceName: string, path: string, query: string = ''): string {
  const queryPart = query ? `?${query}` : '';
  return `cache:${serviceName}:${path}${queryPart}`;
}

/**
 * Get Redis client (for advanced operations)
 */
export function getRedisClient(): RedisClient | null {
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis connection closed');
  }
}

/**
 * Get Redis connection info
 */
export async function getRedisInfo(): Promise<string | null> {
  if (!redisClient) {
    return null;
  }

  try {
    return await redisClient.info();
  } catch (error) {
    console.error('❌ Failed to get Redis info:', error);
    return null;
  }
}
