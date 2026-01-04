import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure logging based on environment
const logConfig =
  process.env.NODE_ENV === 'production'
    ? ['error', 'warn'] // Minimal logging in production
    : ['query', 'error', 'warn']; // Verbose in development

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig as any,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
