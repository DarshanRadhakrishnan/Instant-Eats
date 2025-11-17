/**
 * Shard Configuration
 * Defines shard endpoints and their associated regions
 */

export interface ShardConfig {
  shardId: string;
  url: string;
  regions: string[];
  name: string;
}

export const shardConfigs: Record<string, ShardConfig> = {
  SHARD_A: {
    shardId: 'SHARD_A',
    url: process.env.POSTGRES_SHARD_A_URL || 'postgresql://postgres:postgres@localhost:5432/shard_a',
    regions: ['us-west', 'ca', 'california', 'washington', 'oregon', 'nevada', 'arizona', 'utah', 'colorado'],
    name: 'US-West & Canada',
  },
  SHARD_B: {
    shardId: 'SHARD_B',
    url: process.env.POSTGRES_SHARD_B_URL || 'postgresql://postgres:postgres@localhost:5433/shard_b',
    regions: ['us-east', 'us-central', 'ny', 'texas', 'florida', 'illinois', 'ohio', 'pennsylvania', 'michigan'],
    name: 'US-East & Central',
  },
  SHARD_C: {
    shardId: 'SHARD_C',
    url: process.env.POSTGRES_SHARD_C_URL || 'postgresql://postgres:postgres@localhost:5434/shard_c',
    regions: ['us-south', 'mx', 'georgia', 'north-carolina', 'south-carolina', 'louisiana', 'mexico', 'caribbean'],
    name: 'US-South & Mexico',
  },
};

export const allShards = Object.values(shardConfigs);
