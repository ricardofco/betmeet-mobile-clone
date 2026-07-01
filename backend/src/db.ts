import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { env } from './env';

// Singleton (same reasoning as betmeet-clone's src/lib/prisma.ts): reused across
// requests in a long-running process, one pooled `pg` connection set via the
// Prisma 7 driver-adapter pattern (no bundled query engine binary).
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = new PrismaClient({ adapter });
