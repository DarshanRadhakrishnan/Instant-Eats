import { PrismaClient } from '@prisma/client';
import { getShardByRegion } from '../../../shared/sharding/getShard';

const prismaClients: Record<string, PrismaClient> = {};

export function getPrismaClient(city: string): PrismaClient {
  const shard = getShardByRegion(city);
  const shardId = shard.shardId;

  if (!prismaClients[shardId]) {
    const databaseUrl = process.env[`DATABASE_URL_${shardId}`] || shard.url;
    prismaClients[shardId] = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  return prismaClients[shardId];
}

export async function disconnectAll() {
  for (const client of Object.values(prismaClients)) {
    await client.$disconnect();
  }
}
