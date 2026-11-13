import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import {
  buildUser,
  createPrismaMock,
  createTestApp,
  PrismaMock,
  TEST_JWT_SECRET,
} from '../utils/test-app.js';

describe('POST /auth/login', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let passwordHash: string;

  beforeAll(async () => {
    prisma = createPrismaMock();
    app = await createTestApp([AuthModule], prisma);
    passwordHash = await bcrypt.hash('segura123', 4);
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it('devolve 200 com accessToken e dados do utilizador', async () => {
    prisma.user.findUnique.mockResolvedValue(buildUser({ password: passwordHash }));

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@bulir.ao', password: 'segura123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ id: 'user-1', role: 'CLIENT' });
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('o token contém o id (sub) e o role do utilizador', async () => {
    prisma.user.findUnique.mockResolvedValue(
      buildUser({ id: 'prov-1', role: 'PROVIDER', password: passwordHash }),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@bulir.ao', password: 'segura123' })
      .expect(200);

    const payload = new JwtService({ secret: TEST_JWT_SECRET }).verify(
      res.body.data.accessToken,
    );
    expect(payload).toMatchObject({ sub: 'prov-1', role: 'PROVIDER' });
  });

  it('devolve 401 com password errada', async () => {
    prisma.user.findUnique.mockResolvedValue(buildUser({ password: passwordHash }));

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@bulir.ao', password: 'errada123' })
      .expect(401);

    expect(res.body).toMatchObject({
      success: false,
      message: 'Credenciais inválidas',
    });
  });

  it('devolve 401 com a mesma mensagem para e-mail inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'naoexiste@bulir.ao', password: 'segura123' })
      .expect(401);

    expect(res.body.message).toBe('Credenciais inválidas');
  });

  it('procura o e-mail normalizado em minúsculas', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ANA@Bulir.ao', password: 'segura123' })
      .expect(401);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'ana@bulir.ao' },
    });
  });

  it('devolve 400 para payload inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'invalido' })
      .expect(400);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
