import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conectado com sucesso ao banco PostgreSQL (Neon)!');
    } catch (error) {
      this.logger.warn(
        'Aviso: Conexão inicial com PostgreSQL adiada (o Prisma tentará na primeira requisição):',
        error,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Conexão com PostgreSQL encerrada.');
    } catch (error) {
      this.logger.warn('Erro ao desconectar do PostgreSQL:', error);
    }
  }
}
