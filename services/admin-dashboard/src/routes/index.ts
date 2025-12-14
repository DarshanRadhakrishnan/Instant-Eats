import express from 'express';
import { Router } from 'express';
import {
  getDashboardOverview,
  getServicesHealth,
  getShardsOverview,
  getCircuitBreakers,
  getCacheAnalytics,
  resetCircuitBreaker,
  getAdminHealth,
} from './dashboard';

const router = Router();

// Health check
router.get('/health', getAdminHealth);

// Dashboard endpoints
router.get('/overview', getDashboardOverview);
router.get('/services', getServicesHealth);
router.get('/shards', getShardsOverview);
router.get('/circuit-breakers', getCircuitBreakers);
router.get('/cache', getCacheAnalytics);

// Control endpoints
router.post('/circuit-breaker/reset', resetCircuitBreaker);

export { router as dashboardRoutes };
