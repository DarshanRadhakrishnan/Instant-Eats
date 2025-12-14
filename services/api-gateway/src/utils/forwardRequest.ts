import axios from 'axios';
import { executeWithCircuitBreaker } from './circuitBreaker';
import { getCacheValue, setCacheValue, generateCacheKey } from './cache';

export async function forwardRequest(
  serviceName: string,
  port: number,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data: any = null,
  queryString: string = ''
) {
  const url = `http://${serviceName}:${port}${path}`;

  // Try to get from cache for GET requests
  if (method === 'GET') {
    const cacheKey = generateCacheKey(serviceName, path, queryString);
    const cachedValue = await getCacheValue(cacheKey);

    if (cachedValue) {
      try {
        return {
          status: 200,
          data: JSON.parse(cachedValue),
          fromCache: true,
        };
      } catch (error) {
        console.error(`Failed to parse cached value for ${cacheKey}:`, error);
      }
    }
  }

  // Execute request through circuit breaker
  try {
    const response = await executeWithCircuitBreaker(serviceName, method, url, data);

    // Cache successful GET responses
    if (method === 'GET' && response.status === 200) {
      const cacheKey = generateCacheKey(serviceName, path, queryString);
      const cacheTTL = parseInt(process.env.CACHE_TTL || '300'); // Default 5 minutes
      await setCacheValue(cacheKey, JSON.stringify(response.data), cacheTTL);
    }

    return response;
  } catch (error: any) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
      };
    }

    throw error;
  }
}
