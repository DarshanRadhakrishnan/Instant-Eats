/**
 * Service Definitions
 * Centralized OpenAPI service definitions for all microservices
 */

export const serviceDefinitions = {
  auth: {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    port: 3001,
    title: 'Authentication Service',
    description: 'Handles user authentication and authorization',
    version: '1.0.0',
  },
  order: {
    name: 'order-service',
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
    port: 3002,
    title: 'Order Service',
    description: 'Manages order creation, updates, and cancellations',
    version: '1.0.0',
  },
  restaurant: {
    name: 'restaurant-service',
    url: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003',
    port: 3003,
    title: 'Restaurant Service',
    description: 'Manages restaurant information and menus',
    version: '1.0.0',
  },
  delivery: {
    name: 'delivery-service',
    url: process.env.DELIVERY_SERVICE_URL || 'http://localhost:3004',
    port: 3004,
    title: 'Delivery Service',
    description: 'Manages delivery partners and assignments',
    version: '1.0.0',
  },
  tracking: {
    name: 'tracking-service',
    url: process.env.TRACKING_SERVICE_URL || 'http://localhost:3005',
    port: 3005,
    title: 'Tracking Service',
    description: 'Real-time delivery tracking via WebSocket',
    version: '1.0.0',
  },
  apiGateway: {
    name: 'api-gateway',
    url: process.env.API_GATEWAY_URL || 'http://localhost:3000',
    port: 3000,
    title: 'API Gateway',
    description: 'Central API gateway with circuit breakers and caching',
    version: '1.0.0',
  },
};

export type ServiceName = keyof typeof serviceDefinitions;

/**
 * Get service URL by name
 */
export const getServiceUrl = (serviceName: ServiceName): string => {
  return serviceDefinitions[serviceName].url;
};

/**
 * Get service port by name
 */
export const getServicePort = (serviceName: ServiceName): number => {
  return serviceDefinitions[serviceName].port;
};

/**
 * Get all service URLs
 */
export const getAllServiceUrls = (): Record<string, string> => {
  const urls: Record<string, string> = {};
  Object.entries(serviceDefinitions).forEach(([key, def]) => {
    urls[def.name] = def.url;
  });
  return urls;
};
