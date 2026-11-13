import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule, ObserveInstrument } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  configureApp(app);

  const port = app.get(ConfigService).get<number>('port') ?? 3000;
  await app.listen(port);
}
await bootstrap();
