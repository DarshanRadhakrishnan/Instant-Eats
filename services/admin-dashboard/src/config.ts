import axios from 'axios';

export interface ShardConfig {
  id: string;
  region: string;
  host: string;
  port: number;
  database: string;
  status: 'healthy' | 'degraded' | 'offline';
}

export interface ServiceHealth {
  name: string;
  port: number;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastChecked: Date;
}

export interface CircuitBreakerStats {
  serviceName: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  stats: {
    fires: number;
    failures: number;
    successes: number;
    timeouts: number;
    fallbacks: number;
  };
}

export interface CacheStats {
  totalKeys: number;
  memoryUsed: string;
  hits: number;
  misses: number;
  hitRate: number;
  topKeys: Array<{ key: string; size: number; ttl: number }>;
}

// Shard configurations
export const SHARDS: ShardConfig[] = [
  {
    id: 'shard-a',
    region: 'US-East',
    host: 'postgres-shard-a',
    port: 5432,
    database: 'shard_a',
    status: 'healthy',
  },
  {
    id: 'shard-b',
    region: 'US-West',
    host: 'postgres-shard-b',
    port: 5433,
    database: 'shard_b',
    status: 'healthy',
  },
  {
    id: 'shard-c',
    region: 'EU-Central',
    host: 'postgres-shard-c',
    port: 5434,
    database: 'shard_c',
    status: 'healthy',
  },
];

// Service configurations
export const SERVICES = [
  { name: 'auth-service', port: 3001, url: 'http://auth-service:3001' },
  { name: 'order-service', port: 3002, url: 'http://order-service:3002' },
  { name: 'restaurant-service', port: 3003, url: 'http://restaurant-service:3003' },
  { name: 'delivery-service', port: 3004, url: 'http://delivery-service:3004' },
  { name: 'tracking-service', port: 3005, url: 'http://tracking-service:3005' },
  { name: 'api-gateway', port: 3000, url: 'http://api-gateway:3000' },
];

// Fetch service health
export async function checkServiceHealth(service: typeof SERVICES[0]): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${service.url}/health`, { timeout: 5000 });
    const responseTime = Date.now() - startTime;

    return {
      name: service.name,
      port: service.port,
      status: response.status === 200 ? 'up' : 'degraded',
      responseTime,
      lastChecked: new Date(),
    };
  } catch (error: any) {
    return {
      name: service.name,
      port: service.port,
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
    };
  }
}

// Fetch circuit breaker stats from API Gateway
export async function getCircuitBreakerStats(): Promise<CircuitBreakerStats[]> {
  try {
    const response = await axios.get('http://api-gateway:3000/stats/circuit-breakers', {
      timeout: 5000,
    });
    return response.data.circuitBreakers || [];
  } catch (error) {
    console.error('Failed to fetch circuit breaker stats:', error);
    return [];
  }
}
