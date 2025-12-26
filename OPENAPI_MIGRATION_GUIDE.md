# OpenAPI/Swagger Migration Guide

## Overview

This guide explains the migration from HTTP/message queue communications to OpenAPI (Swagger) specifications for more effective service-to-service communication in the Instant Eats platform.

## What Changed

### Before: Direct HTTP/Message Queue
```typescript
// Old approach - direct axios calls scattered across code
const response = await axios.post('http://localhost:3002/orders', orderData);
```

### After: OpenAPI with Type-Safe Clients
```typescript
// New approach - centralized, type-safe service clients
import { orderServiceApi } from '../shared/serviceClients';
const result = await orderServiceApi.createOrder(orderData);
```

## Architecture

### Key Components

1. **Shared OpenAPI Module** (`shared/openapi/`)
   - `config.ts` - OpenAPI configuration and common schemas
   - `setup.ts` - Swagger UI integration for each service
   - `client.ts` - Service-to-service client implementation
   - `services.ts` - Service URLs and definitions

2. **Service Documentation**
   - Each service includes `openapi.ts` with JSDoc Swagger annotations
   - Swagger UI available at `/api-docs` for each service
   - OpenAPI spec available as JSON at `/api-docs.json`

3. **Service Clients** (`services/shared/serviceClients.ts`)
   - Centralized API methods for each service
   - Built-in retry logic with exponential backoff
   - Automatic error handling

## Usage Examples

### 1. Initialize Service Clients (in service main file)

```typescript
import { initializeServiceClients } from '../../../services/shared/serviceClients';

// Call during startup
initializeServiceClients();
```

### 2. Using Order Service from Other Services

```typescript
import { orderServiceApi } from '../../../services/shared/serviceClients';

// Create order
const order = await orderServiceApi.createOrder({
  customerId: 'cust123',
  restaurantId: 'rest123',
  items: [...],
  totalAmount: 500
});

// Get order
const orderDetails = await orderServiceApi.getOrder('order123');

// Cancel order
await orderServiceApi.cancelOrder('order123', 'Customer requested');
```

### 3. Using Restaurant Service

```typescript
import { restaurantServiceApi } from '../../../services/shared/serviceClients';

// Search restaurants
const restaurants = await restaurantServiceApi.searchRestaurants({
  city: 'New York',
  cuisine: 'Italian'
});

// Get restaurant details
const restaurant = await restaurantServiceApi.getRestaurant('rest123');

// Get menu
const menu = await restaurantServiceApi.getMenu('rest123');
```

### 4. Using Delivery Service

```typescript\nimport { deliveryServiceApi } from '../../../services/shared/serviceClients';\n\n// Get available partners\nconst partners = await deliveryServiceApi.getAvailablePartners({\n  city: 'New York',\n  vehicleType: 'bike'\n});\n\n// Assign delivery\nconst assignment = await deliveryServiceApi.assignDelivery({\n  orderId: 'order123',\n  restaurantLocation: { latitude: 40.7128, longitude: -74.0060 },\n  deliveryLocation: { latitude: 40.7580, longitude: -73.9855 }\n});\n\n// Update delivery status\nawait deliveryServiceApi.updateAssignmentStatus(\n  'assignment123',\n  'in_transit',\n  { latitude: 40.7200, longitude: -73.9900 }\n);\n```\n\n### 5. Using Tracking Service\n\n```typescript\nimport { trackingServiceApi } from '../../../services/shared/serviceClients';\n\n// Get tracking info\nconst tracking = await trackingServiceApi.getTracking('order123');\n\n// Update tracking\nawait trackingServiceApi.updateTracking('order123', {\n  status: 'in_transit',\n  location: { latitude: 40.7200, longitude: -73.9900 }\n});\n```\n\n## Service URLs and Environment Variables\n\nConfigure service URLs via environment variables:\n\n```bash\n# .env file\nAUTH_SERVICE_URL=http://auth-service:3001\nORDER_SERVICE_URL=http://order-service:3002\nRESTAURANT_SERVICE_URL=http://restaurant-service:3003\nDELIVERY_SERVICE_URL=http://delivery-service:3004\nTRACKING_SERVICE_URL=http://tracking-service:3005\n```\n\nDefault URLs (if env variables not set):\n- Auth Service: `http://localhost:3001`\n- Order Service: `http://localhost:3002`\n- Restaurant Service: `http://localhost:3003`\n- Delivery Service: `http://localhost:3004`\n- Tracking Service: `http://localhost:3005`\n- API Gateway: `http://localhost:3000`\n\n## API Documentation Access\n\nSwagger UI is available at each service's `/api-docs` endpoint:\n\n- **Auth Service**: http://localhost:3001/api-docs\n- **Order Service**: http://localhost:3002/api-docs\n- **Restaurant Service**: http://localhost:3003/api-docs\n- **Delivery Service**: http://localhost:3004/api-docs\n- **Tracking Service**: http://localhost:3005/api-docs\n- **API Gateway**: http://localhost:3000/api-docs\n\nOpenAPI JSON specs available at:\n- http://localhost:3001/api-docs.json\n- http://localhost:3002/api-docs.json\n- etc.\n\n## Benefits\n\n1. **Type Safety**: Centralized API definitions prevent mismatches\n2. **Self-Documenting**: Swagger UI provides interactive documentation\n3. **Automatic Retry**: Built-in retry logic with exponential backoff\n4. **Service Discovery**: Easy to find and understand all service APIs\n5. **Contract Testing**: OpenAPI specs can be used for contract testing\n6. **Client Generation**: Can generate SDK clients from OpenAPI specs\n7. **Monitoring**: Centralized logging and error tracking\n\n## Migration Checklist\n\n- [x] Add swagger-ui-express and swagger-jsdoc to all services\n- [x] Create OpenAPI specs for all services\n- [x] Setup Swagger documentation middleware\n- [x] Create shared OpenAPI configuration\n- [x] Create service-to-service client utilities\n- [ ] Update all service-to-service calls to use new clients\n- [ ] Remove direct axios calls from services\n- [ ] Update tests to use new clients\n- [ ] Document API breaking changes\n- [ ] Deploy and test in staging\n\n## Replacing Old Message Queue Logic\n\nFor services currently using message queues (RabbitMQ), the transition approach:\n\n### Old Pattern (Message Queue)\n```typescript\nawait publishEvent('order.created', { orderId, data });\n```\n\n### New Pattern (REST API with Webhook)\nThe service can still publish events via the event bus, but inter-service calls should use REST:\n\n```typescript\n// REST call for synchronous operations\nawait orderServiceApi.createOrder(data);\n\n// Event for async notifications (if still using queue)\nawait publishEvent('order.created', { orderId, data });\n```\n\nThis hybrid approach:\n- Uses REST for request-response operations\n- Keeps async event publishing for notifications\n- Reduces coupling between services\n- Makes APIs discoverable via OpenAPI\n\n## Error Handling\n\nThe service client includes automatic retry logic:\n\n```typescript\ntry {\n  const result = await orderServiceApi.createOrder(data);\n  // Handle success\n} catch (error) {\n  if (error.response?.status === 400) {\n    // Validation error\n  } else if (error.response?.status === 401) {\n    // Authentication error\n  } else if (!error.response) {\n    // Network error (already retried)\n  }\n}\n```\n\n## Adding New Service Endpoints\n\n1. Add JSDoc Swagger annotations to the route handler\n2. Update the service's `openapi.ts` file\n3. Add API method to `services/shared/serviceClients.ts`\n4. The Swagger UI and JSON spec will auto-update\n\n## Testing\n\nUsing the new service clients in tests:\n\n```typescript\nimport { orderServiceApi } from '../shared/serviceClients';\n\ntest('should create order', async () => {\n  const order = await orderServiceApi.createOrder({\n    customerId: 'test123',\n    restaurantId: 'rest123',\n    items: [...],\n    totalAmount: 100\n  });\n  expect(order.id).toBeDefined();\n});\n```\n\n## Next Steps\n\n1. **Install Dependencies**: Run `npm install` in each service directory\n2. **Start Services**: Each service now provides Swagger UI at `/api-docs`\n3. **Test APIs**: Use Swagger UI to test endpoints\n4. **Replace Old Calls**: Update all axios/message queue calls to use new clients\n5. **Monitor**: Use logs and Swagger UI to validate communication\n