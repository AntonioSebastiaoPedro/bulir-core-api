import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface.js';
import { toUserResponse, UserResponse } from './user.mapper.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    return toUserResponse(user);
  }

  /**
   * Carrega saldo na conta do cliente (facilitador para testar reservas).
   * O increment é feito pela própria BD (UPDATE ... SET balance = balance + x),
   * por isso é atómico mesmo com pedidos concorrentes.
   */
  async deposit(user: AuthUser, amount: number): Promise<UserResponse> {
    if (user.role !== Role.CLIENT) {
      throw new ForbiddenException('Apenas clientes podem carregar saldo');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: amount } },
    });

    return toUserResponse(updated);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByEmailOrNif(email: string, nif: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { OR: [{ email }, { nif }] },
    });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
