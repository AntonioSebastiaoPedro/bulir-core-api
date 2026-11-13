import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsEmail, IsString } from 'class-validator';
import request from 'supertest';
import { configureApp } from './app.setup.js';

class EchoDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() dto: EchoDto) {
    return dto;
  }

  @Get('boom')
  boom() {
    throw new Error('unexpected');
  }
}

describe('configureApp (integração)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EchoController],
    }).compile();

    app = configureApp(moduleRef.createNestApplication({ logger: false }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('respostas de sucesso seguem o formato padrão', async () => {
    const res = await request(app.getHttpServer())
      .post('/echo')
      .send({ name: 'Ana', email: 'ana@bulir.ao' })
      .expect(201);

    expect(res.body).toEqual({
      success: true,
      data: { name: 'Ana', email: 'ana@bulir.ao' },
    });
  });

  it('payload inválido devolve 400 com a lista de erros', async () => {
    const res = await request(app.getHttpServer())
      .post('/echo')
      .send({ name: 'Ana', email: 'invalido' })
      .expect(400);

    expect(res.body).toMatchObject({
      success: false,
      statusCode: 400,
      message: 'Dados inválidos',
      path: '/echo',
    });
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('email')]),
    );
  });

  it('campos não declarados no DTO são rejeitados', async () => {
    const res = await request(app.getHttpServer())
      .post('/echo')
      .send({ name: 'Ana', email: 'ana@bulir.ao', role: 'ADMIN' })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('role')]),
    );
  });

  it('erros inesperados devolvem 500 sem expor detalhes', async () => {
    const res = await request(app.getHttpServer()).get('/echo/boom').expect(500);

    expect(res.body).toMatchObject({
      success: false,
      statusCode: 500,
      message: 'Erro interno do servidor',
    });
  });
});
