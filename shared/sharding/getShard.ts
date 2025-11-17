/**
 * Shard Routing Logic
 * Routes requests to appropriate shard based on city or region
 */

import { shardConfigs, ShardConfig } from './shardConfig';

/**
 * Get shard configuration based on city or region
 * @param cityOrRegion - City or region name (case-insensitive)
 * @returns ShardConfig for the appropriate shard
 */
export function getShardByRegion(cityOrRegion: string): ShardConfig {
  const normalizedRegion = cityOrRegion.toLowerCase().trim();

  for (const shard of Object.values(shardConfigs)) {
    const isMatch = shard.regions.some(
      region => region.toLowerCase() === normalizedRegion || normalizedRegion.includes(region.toLowerCase())
    );
    if (isMatch) {
      return shard;
    }
  }

  // Default to shard A if no match found
  console.warn(`No shard found for region: ${cityOrRegion}, defaulting to SHARD_A`);
  return shardConfigs.SHARD_A;
}

/**
 * Get shard configuration by ID
 * @param shardId - Shard ID (SHARD_A, SHARD_B, SHARD_C)
 * @returns ShardConfig for the specified shard
 */
export function getShardById(shardId: string): ShardConfig | null {
  return shardConfigs[shardId] || null;
}

/**
 * Get all shard configurations
 * @returns Array of all ShardConfig objects
 */
export function getAllShards(): ShardConfig[] {
  return Object.values(shardConfigs);
}

/**
 * Determine shard for user based on location
 * @param userId - User ID
 * @param userCity - User's city
 * @returns Shard ID and configuration
 */
export function determineUserShard(userId: string, userCity: string): ShardConfig {
  return getShardByRegion(userCity);
}

/**
 * Determine shard for order based on delivery location
 * @param orderId - Order ID
 * @param deliveryCity - Delivery city
 * @returns Shard ID and configuration
 */
export function determineOrderShard(orderId: string, deliveryCity: string): ShardConfig {
  return getShardByRegion(deliveryCity);
}

/**
 * Hash-based shard assignment (alternative approach for consistent distribution)
 * @param key - Unique identifier (userId, orderId, etc.)
 * @returns ShardConfig
 */
export function getShardByHash(key: string): ShardConfig {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const shardArray = Object.values(shardConfigs);
  const index = Math.abs(hash) % shardArray.length;
  return shardArray[index];
}
