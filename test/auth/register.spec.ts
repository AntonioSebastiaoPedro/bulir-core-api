import { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import {
  buildUser,
  createPrismaMock,
  createTestApp,
  PrismaMock,
} from '../utils/test-app.js';

describe('POST /auth/register', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  const validPayload = {
    name: 'Ana Silva',
    nif: '004567890LA042',
    email: 'ana@bulir.ao',
    password: 'segura123',
    role: 'CLIENT',
  };

  beforeAll(async () => {
    prisma = createPrismaMock();
    app = await createTestApp([AuthModule], prisma);
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it('regista o utilizador e nunca devolve a password', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve(buildUser({ ...data, id: 'new-id' })),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: 'new-id',
      name: 'Ana Silva',
      email: 'ana@bulir.ao',
      role: 'CLIENT',
      balance: 0,
    });
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('guarda a password como hash bcrypt', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve(buildUser(data)),
    );

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validPayload)
      .expect(201);

    const saved = prisma.user.create.mock.calls[0][0].data;
    expect(saved.password).not.toBe(validPayload.password);
    expect(await bcrypt.compare(validPayload.password, saved.password)).toBe(true);
  });

  it('normaliza e-mail (minúsculas) e NIF (maiúsculas)', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve(buildUser(data)),
    );

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validPayload, email: '  ANA@Bulir.AO ', nif: '004567890la042' })
      .expect(201);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ email: 'ana@bulir.ao' }, { nif: '004567890LA042' }] },
    });
  });

  it('devolve 409 quando o e-mail já existe', async () => {
    prisma.user.findFirst.mockResolvedValue(buildUser({ nif: 'OUTRONIF123' }));

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validPayload)
      .expect(409);

    expect(res.body).toMatchObject({
      success: false,
      message: 'E-mail já registado',
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('devolve 409 quando o NIF já existe', async () => {
    prisma.user.findFirst.mockResolvedValue(
      buildUser({ email: 'outro@bulir.ao' }),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validPayload)
      .expect(409);

    expect(res.body.message).toBe('NIF já registado');
  });

  it('devolve 400 para payload inválido', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: '', nif: '12', email: 'x', password: '123', role: 'ADMIN' })
      .expect(400);

    expect(res.body.errors.length).toBeGreaterThanOrEqual(5);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
