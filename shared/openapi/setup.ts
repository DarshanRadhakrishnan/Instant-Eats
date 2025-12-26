/**
 * OpenAPI Setup Utility
 * Simplifies Swagger integration in Express services
 */

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createOpenAPIConfig, SwaggerOptions } from './config';

export interface SwaggerSetupOptions extends SwaggerOptions {
  app: express.Application;
  docsPath?: string;
}

/**
 * Setup Swagger documentation for a service
 * @param options Configuration options for Swagger
 * @example
 * setupSwagger({
 *   app,
 *   title: 'Auth Service',
 *   description: 'Authentication and authorization service',
 *   version: '1.0.0',
 *   serviceName: 'auth-service',
 *   port: 3001,
 * });
 */
export const setupSwagger = (options: SwaggerSetupOptions) => {
  const { app, docsPath = '/api-docs', ...config } = options;

  const specs = swaggerJsdoc(createOpenAPIConfig(config));

  // Serve Swagger UI
  app.use(docsPath, swaggerUi.serve, swaggerUi.setup(specs, { swaggerOptions: { defaultModelsExpandDepth: 1 } }));

  // Serve raw OpenAPI spec as JSON
  app.get(`${docsPath}.json`, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log(`📚 Swagger docs available at http://localhost:${config.port}${docsPath}`);
  console.log(`📄 OpenAPI spec available at http://localhost:${config.port}${docsPath}.json`);

  return specs;
};

/**
 * Get raw OpenAPI specification for programmatic access
 * Useful for documentation generation and client SDK generation
 */
export const getOpenAPISpec = (options: SwaggerOptions) => {
  return swaggerJsdoc(createOpenAPIConfig(options));
};
