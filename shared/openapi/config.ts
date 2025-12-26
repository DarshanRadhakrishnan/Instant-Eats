/**
 * Shared OpenAPI/Swagger Configuration
 * Provides consistent setup across all microservices
 */

export interface SwaggerOptions {
  title: string;
  description: string;
  version: string;
  serviceName: string;
  port: number;
  basePath?: string;
}

export const createOpenAPIConfig = (options: SwaggerOptions) => {
  return {
    definition: {
      openapi: '3.0.0',
      info: {
        title: options.title,
        description: options.description,
        version: options.version,
        contact: {
          name: 'Instant Eats Team',
          email: 'dev@instanteats.com',
        },
      },
      servers: [
        {
          url: `http://localhost:${options.port}`,
          description: 'Development Server',
        },
        {
          url: `http://${options.serviceName}:${options.port}`,
          description: 'Service to Service Communication',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API Key for service-to-service communication',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: [`${__dirname}/../../services/**/*.ts`, `${__dirname}/../../services/**/*.js`],
  };
};

export const commonSchemas = {
  Error: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      error: { type: 'string' },
      message: { type: 'string' },
      code: { type: 'string' },
    },
  },
  ValidationError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Validation Error' },
      validationErrors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  NotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Resource not found' },
      statusCode: { type: 'number', example: 404 },
    },
  },
  Unauthorized: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Unauthorized' },
      statusCode: { type: 'number', example: 401 },
    },
  },
  Success: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'object' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },
};

export const commonResponses = {
  BadRequest: {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: commonSchemas.ValidationError,
      },
    },
  },
  Unauthorized: {
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: commonSchemas.Unauthorized,
      },
    },
  },
  Forbidden: {
    description: 'Forbidden',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  },
  NotFound: {
    description: 'Not Found',
    content: {
      'application/json': {
        schema: commonSchemas.NotFound,
      },
    },
  },
  InternalError: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: commonSchemas.Error,
      },
    },
  },
};
