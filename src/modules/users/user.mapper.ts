import { Role, User } from '@prisma/client';

/** Representação pública do utilizador: nunca expõe a password. */
export interface UserResponse {
  id: string;
  name: string;
  nif: string;
  email: string;
  role: Role;
  balance: number;
  createdAt: Date;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    nif: user.nif,
    email: user.email,
    role: user.role,
    // Decimal é guardado com precisão na BD; na API devolvemos number.
    balance: user.balance.toNumber(),
    createdAt: user.createdAt,
  };
}
