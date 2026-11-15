import { Prisma, Service, User } from '@prisma/client';

export type ServiceWithProvider = Service & {
  provider: Pick<User, 'id' | 'name' | 'email' | 'nif'>;
};

export interface ServiceResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  providerId: string;
  provider: { id: string; name: string; email: string; nif: string };
  createdAt: Date;
  updatedAt: Date;
}

/** Seleção mínima do prestador: nunca expõe password nem saldo. */
export const providerSelect = {
  id: true,
  name: true,
  email: true,
  nif: true,
} satisfies Prisma.UserSelect;

export function toServiceResponse(service: ServiceWithProvider): ServiceResponse {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price.toNumber(),
    providerId: service.providerId,
    provider: {
      id: service.provider.id,
      name: service.provider.name,
      email: service.provider.email,
      nif: service.provider.nif,
    },
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}
