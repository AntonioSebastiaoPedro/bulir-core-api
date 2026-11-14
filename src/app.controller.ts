import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async healthCheck() {
    let databaseStatus = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unable to connect';
      databaseStatus = `error: ${message}`;
    }

    return {
      status: 'ok',
      service: 'bulir-core-api',
      environment: process.env.NODE_ENV ?? 'development',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
