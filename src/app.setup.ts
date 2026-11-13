import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

/**
 * Configuração global partilhada entre o bootstrap (main.ts) e os testes,
 * garantindo que os testes correm com o mesmo comportamento da produção.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos não declarados no DTO
      forbidNonWhitelisted: true, // e rejeita o pedido se vierem campos extra
      transform: true, // converte o payload para a instância do DTO
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  return app;
}
