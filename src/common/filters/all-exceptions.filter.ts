import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface.js';

interface NormalizedError {
  statusCode: number;
  message: string;
  errors?: string[];
}

/**
 * Captura qualquer exceção e responde sempre no formato padrão de erro.
 * - HttpException (incluindo erros do ValidationPipe)
 * - Erros conhecidos do Prisma (ex.: violação de unique -> 409)
 * - Qualquer outro erro -> 500 (detalhes só no log, nunca para o cliente)
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, errors } = this.normalize(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      ...(errors && { errors }),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
    };
  }

  private fromHttpException(exception: HttpException): NormalizedError {
    const statusCode = exception.getStatus();
    const res = exception.getResponse();

    if (typeof res === 'string') {
      return { statusCode, message: res };
    }

    const { message } = res as { message?: string | string[] };

    // O ValidationPipe devolve uma lista de mensagens.
    if (Array.isArray(message)) {
      return { statusCode, message: 'Dados inválidos', errors: message };
    }

    return { statusCode, message: message ?? exception.message };
  }

  private fromPrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): NormalizedError {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined) ?? [];
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `Já existe um registo com este(s) campo(s): ${target.join(', ')}`,
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Registo não encontrado',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro interno do servidor',
        };
    }
  }
}
