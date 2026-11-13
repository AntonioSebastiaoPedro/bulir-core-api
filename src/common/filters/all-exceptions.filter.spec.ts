import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let status: ReturnType<typeof vi.fn>;
  let json: ReturnType<typeof vi.fn>;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    json = vi.fn();
    status = vi.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/test' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  const body = () => json.mock.calls[0][0];

  it('formata HttpException com a mensagem original', () => {
    filter.catch(new ConflictException('E-mail já registado'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(body()).toMatchObject({
      success: false,
      statusCode: 409,
      message: 'E-mail já registado',
      path: '/test',
    });
    expect(body().timestamp).toEqual(expect.any(String));
  });

  it('expõe a lista de erros de validação em "errors"', () => {
    filter.catch(
      new BadRequestException(['email must be an email', 'nif should not be empty']),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      message: 'Dados inválidos',
      errors: ['email must be an email', 'nif should not be empty'],
    });
  });

  it('mapeia violação de unique do Prisma (P2002) para 409', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['email'] },
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(body().message).toContain('email');
  });

  it('mapeia registo inexistente do Prisma (P2025) para 404', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('esconde detalhes de erros desconhecidos e responde 500', () => {
    filter.catch(new Error('falha na base de dados: senha=123'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(body().message).toBe('Erro interno do servidor');
    expect(JSON.stringify(body())).not.toContain('senha');
  });
});
