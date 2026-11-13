import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { toUserResponse, UserResponse } from '../users/user.mapper.js';
import { RegisterDto } from './dto/register.dto.js';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: RegisterDto): Promise<UserResponse> {
    const existing = await this.usersService.findByEmailOrNif(dto.email, dto.nif);

    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'E-mail já registado' : 'NIF já registado',
      );
    }

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({ ...dto, password });

    return toUserResponse(user);
  }
}
