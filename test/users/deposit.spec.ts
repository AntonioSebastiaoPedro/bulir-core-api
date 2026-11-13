import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { UsersModule } from '../../src/modules/users/users.module.js';
import {
  buildUser,
  createPrismaMock,
  createTestApp,
  PrismaMock,
  TEST_JWT_SECRET,
} from '../utils/test-app.js';

describe('POST /users/deposit', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  const jwt = new JwtService({ secret: TEST_JWT_SECRET });
  const clientToken = jwt.sign({ sub: 'user-1', role: 'CLIENT' });
  const providerToken = jwt.sign({ sub: 'prov-1', role: 'PROVIDER' });

  beforeAll(async () => {
    prisma = createPrismaMock();
    app = await createTestApp([AuthModule, UsersModule], prisma);
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it('incrementa o saldo do cliente de forma atómica na BD', async () => {
    prisma.user.update.mockResolvedValue(
      buildUser({ balance: new Prisma.Decimal('2500.75') }),
    );

    const res = await request(app.getHttpServer())
      .post('/users/deposit')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ amount: 2500.75 })
      .expect(200);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { balance: { increment: 2500.75 } },
    });
    expect(res.body.data.balance).toBe(2500.75);
  });

  it('devolve 403 para prestadores', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/deposit')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ amount: 100 })
      .expect(403);

    expect(res.body.message).toBe('Apenas clientes podem carregar saldo');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('devolve 401 sem token', async () => {
    await request(app.getHttpServer())
      .post('/users/deposit')
      .send({ amount: 100 })
      .expect(401);
  });

  it.each([
    ['negativo', -50],
    ['zero', 0],
    ['mais de 2 casas decimais', 10.123],
    ['acima do limite', 1_000_001],
    ['string', '100'],
  ])('devolve 400 para valor %s', async (_label, amount) => {
    await request(app.getHttpServer())
      .post('/users/deposit')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ amount })
      .expect(400);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('devolve 404 se o utilizador do token já não existir (P2025)', async () => {
    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await request(app.getHttpServer())
      .post('/users/deposit')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ amount: 100 })
      .expect(404);
  });
});
