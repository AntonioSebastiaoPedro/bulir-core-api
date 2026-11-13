import { Role } from '@prisma/client';

/** Conteúdo assinado dentro do access token. */
export interface JwtPayload {
  sub: string;
  role: Role;
}

/** Utilizador autenticado disponível em request.user. */
export interface AuthUser {
  id: string;
  role: Role;
}
