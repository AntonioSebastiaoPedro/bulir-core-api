import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma, Role, User } from '@prisma/client';
import type { Mock } from 'vitest';
import { configureApp } from '../../src/app.setup.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export const TEST_JWT_SECRET = 'test-secret';

export interface PrismaMock {
  user: {
    findUnique: Mock;
    findFirst: Mock;
    create: Mock;
    update: Mock;
  };
}

export function createPrismaMock(): PrismaMock {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

/**
 * Sobe a aplicação Nest real (controllers, services, guards, pipes, filtros)
 * substituindo apenas o acesso à base de dados por um mock.
 */
export async function createTestApp(
  imports: ModuleMetadata['imports'],
  prisma: PrismaMock,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ jwt: { secret: TEST_JWT_SECRET, expiresIn: '1h' } })],
      }),
      PrismaModule,
      ...(imports ?? []),
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.init();
  return app;
}

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Ana Silva',
    nif: '004567890LA042',
    email: 'ana@bulir.ao',
    password: 'hashed-password',
    role: Role.CLIENT,
    balance: new Prisma.Decimal(0),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
