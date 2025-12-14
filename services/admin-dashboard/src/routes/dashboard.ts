import { Request, Response } from 'express';
import { SHARDS, SERVICES, checkServiceHealth, getCircuitBreakerStats } from '../config';
import { getCacheStats } from '../redis';

/**
 * GET /api/dashboard/overview
 * Return complete dashboard overview
 */
export async function getDashboardOverview(req: Request, res: Response) {
  try {
    const [servicesHealth, circuitBreakerStats, cacheStats] = await Promise.all([
      Promise.all(SERVICES.map(checkServiceHealth)),
      getCircuitBreakerStats(),
      getCacheStats(),
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      shards: SHARDS,
      services: servicesHealth,
      circuitBreakers: circuitBreakerStats,
      cache: cacheStats,
      summary: {
        totalShards: SHARDS.length,
        healthyServices: servicesHealth.filter((s) => s.status === 'up').length,
        totalServices: SERVICES.length,
        openCircuitBreakers: circuitBreakerStats.filter((cb) => cb.state === 'OPEN').length,
        cacheHitRate: cacheStats?.hitRate || 0,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard overview',
    });
  }
}

/**
 * GET /api/dashboard/services
 * Get all services health
 */
export async function getServicesHealth(req: Request, res: Response) {
  try {
    const servicesHealth = await Promise.all(SERVICES.map(checkServiceHealth));

    res.json({
      success: true,
      services: servicesHealth,
      summary: {
        total: servicesHealth.length,
        up: servicesHealth.filter((s) => s.status === 'up').length,
        down: servicesHealth.filter((s) => s.status === 'down').length,
        degraded: servicesHealth.filter((s) => s.status === 'degraded').length,
      },
    });
  } catch (error) {
    console.error('Error getting services health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get services health',
    });
  }
}

/**
 * GET /api/dashboard/shards
 * Get all shards overview
 */
export async function getShardsOverview(req: Request, res: Response) {
  try {
    // In production, check actual DB connections for each shard
    const shardsInfo = SHARDS.map((shard) => ({
      ...shard,
      status: 'healthy', // TODO: Check actual DB health
    }));

    res.json({
      success: true,
      shards: shardsInfo,
      summary: {
        total: shardsInfo.length,
        healthy: shardsInfo.filter((s) => s.status === 'healthy').length,
        degraded: shardsInfo.filter((s) => s.status === 'degraded').length,
        offline: shardsInfo.filter((s) => s.status === 'offline').length,
      },
    });
  } catch (error) {
    console.error('Error getting shards overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shards overview',
    });
  }
}

/**
 * GET /api/dashboard/circuit-breakers
 * Get circuit breaker status
 */
export async function getCircuitBreakers(req: Request, res: Response) {
  try {
    const stats = await getCircuitBreakerStats();

    res.json({
      success: true,
      circuitBreakers: stats,
      summary: {
        total: stats.length,
        closed: stats.filter((cb) => cb.state === 'CLOSED').length,
        open: stats.filter((cb) => cb.state === 'OPEN').length,
        halfOpen: stats.filter((cb) => cb.state === 'HALF_OPEN').length,
      },
    });
  } catch (error) {
    console.error('Error getting circuit breakers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker status',
    });
  }
}

/**
 * GET /api/dashboard/cache
 * Get cache analytics
 */
export async function getCacheAnalytics(req: Request, res: Response) {
  try {
    const cacheStats = await getCacheStats();

    if (!cacheStats) {
      return res.status(503).json({
        success: false,
        error: 'Cache service unavailable',
      });
    }

    res.json({
      success: true,
      cache: cacheStats,
      summary: {
        totalCacheEntries: cacheStats.totalKeys,
        memoryUsed: cacheStats.memoryUsed,
      },
    });
  } catch (error) {
    console.error('Error getting cache analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache analytics',
    });
  }
}

/**
 * POST /api/dashboard/circuit-breaker/reset
 * Reset circuit breaker for a service
 */
export async function resetCircuitBreaker(req: Request, res: Response) {
  try {
    const { serviceName } = req.body;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'serviceName is required',
      });
    }

    // TODO: Call API Gateway to reset circuit breaker
    // For now, just return success

    res.json({
      success: true,
      message: `Circuit breaker reset requested for ${serviceName}`,
    });
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker',
    });
  }
}

/**
 * GET /api/dashboard/health
 * Admin service health check
 */
export async function getAdminHealth(req: Request, res: Response) {
  res.json({
    status: 'healthy',
    service: 'admin-dashboard',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
