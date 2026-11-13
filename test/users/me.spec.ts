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

describe('GET /users/me', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  const jwt = new JwtService({ secret: TEST_JWT_SECRET });
  const tokenFor = (sub: string, role = 'CLIENT') => jwt.sign({ sub, role });

  beforeAll(async () => {
    prisma = createPrismaMock();
    app = await createTestApp([AuthModule, UsersModule], prisma);
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it('devolve o perfil do utilizador autenticado com o saldo', async () => {
    prisma.user.findUnique.mockResolvedValue(
      buildUser({ balance: new Prisma.Decimal('1500.50') }),
    );

    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .expect(200);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(res.body).toEqual({
      success: true,
      data: expect.objectContaining({
        id: 'user-1',
        email: 'ana@bulir.ao',
        balance: 1500.5,
      }),
    });
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('devolve 401 sem token', async () => {
    const res = await request(app.getHttpServer()).get('/users/me').expect(401);

    expect(res.body.message).toBe('Token de acesso em falta');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('devolve 401 com esquema diferente de Bearer', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Basic ${tokenFor('user-1')}`)
      .expect(401);
  });

  it('devolve 401 com token assinado por outro segredo', async () => {
    const forged = new JwtService({ secret: 'outro-segredo' }).sign({
      sub: 'user-1',
      role: 'CLIENT',
    });

    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);

    expect(res.body.message).toBe('Token inválido ou expirado');
  });

  it('devolve 401 com token expirado', async () => {
    const expired = jwt.sign({ sub: 'user-1', role: 'CLIENT' }, { expiresIn: -10 });

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('devolve 404 se o utilizador do token já não existir', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${tokenFor('apagado')}`)
      .expect(404);
  });
});
