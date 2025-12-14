import CircuitBreaker from 'opossum';
import axios from 'axios';

interface CircuitBreakerConfig {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  name?: string;
}

// Map to store circuit breakers for each service
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

/**
 * Create or get a circuit breaker for a specific service
 */
export function getCircuitBreaker(serviceName: string, config: CircuitBreakerConfig = {}): CircuitBreaker {
  if (circuitBreakers.has(serviceName)) {
    return circuitBreakers.get(serviceName)!;
  }

  const breaker = new CircuitBreaker(
    async (method: string, url: string, data?: any) => {
      const axiosConfig: any = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      };

      if (data) {
        axiosConfig.data = data;
      }

      try {
        const response = await axios(axiosConfig);
        return response;
      } catch (error: any) {
        // Re-throw to be handled by circuit breaker
        throw error;
      }
    },
    {
      timeout: config.timeout || 10000, // 10 seconds
      errorThresholdPercentage: config.errorThresholdPercentage || 50, // Open circuit at 50% error rate
      resetTimeout: config.resetTimeout || 30000, // Try to recover after 30 seconds
      rollingCountTimeout: config.rollingCountTimeout || 10000, // 10-second rolling window
      name: config.name || serviceName,
    }
  );

  // Log circuit breaker state changes
  breaker.on('open', () => {
    console.warn(`⚠️  Circuit breaker OPEN for ${serviceName}: Too many failures detected`);
  });

  breaker.on('halfOpen', () => {
    console.log(`🔄 Circuit breaker HALF-OPEN for ${serviceName}: Attempting recovery...`);
  });

  breaker.on('close', () => {
    console.log(`✅ Circuit breaker CLOSED for ${serviceName}: Service recovered`);
  });

  circuitBreakers.set(serviceName, breaker);
  return breaker;
}

/**
 * Execute a request through the circuit breaker
 */
export async function executeWithCircuitBreaker(
  serviceName: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  data?: any
) {
  const breaker = getCircuitBreaker(serviceName);

  try {
    const response = await breaker.fire(method, url, data);
    return {
      status: response.status,
      data: response.data,
    };
  } catch (error: any) {
    // If circuit is open, return service unavailable
    if (error.message === 'Circuit breaker is OPEN') {
      return {
        status: 503,
        data: {
          success: false,
          error: `Service '${serviceName}' is temporarily unavailable (circuit breaker open)`,
        },
      };
    }

    // Handle other errors
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
      };
    }

    throw error;
  }
}

/**
 * Get circuit breaker stats for monitoring
 */
export function getCircuitBreakerStats(serviceName: string) {
  const breaker = circuitBreakers.get(serviceName);
  if (!breaker) {
    return null;
  }

  return {
    serviceName,
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    stats: {
      fires: breaker.stats.fires,
      failures: breaker.stats.failures,
      fallbacks: breaker.stats.fallbacks,
      successes: breaker.stats.successes,
      timeouts: breaker.stats.timeouts,
    },
  };
}

/**
 * Get stats for all circuit breakers
 */
export function getAllCircuitBreakerStats() {
  const stats: any[] = [];
  for (const [serviceName] of circuitBreakers) {
    const stat = getCircuitBreakerStats(serviceName);
    if (stat) {
      stats.push(stat);
    }
  }
  return stats;
}

/**
 * Reset a specific circuit breaker
 */
export function resetCircuitBreaker(serviceName: string) {
  const breaker = circuitBreakers.get(serviceName);
  if (breaker) {
    breaker.close();
    console.log(`🔄 Circuit breaker manually reset for ${serviceName}`);
  }
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers() {
  for (const breaker of circuitBreakers.values()) {
    breaker.close();
  }
  console.log('🔄 All circuit breakers manually reset');
}
