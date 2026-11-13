import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../modules/auth/guards/jwt-auth.guard.js';

/** Injeta o utilizador autenticado (definido pelo JwtAuthGuard) no handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
