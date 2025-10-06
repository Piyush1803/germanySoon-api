import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(compression());
  app.setGlobalPrefix('api');
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  // app.useGlobalPipes(new ValidationPipe());
  const configuredOrigin = (process.env.FRONTEND_URL || '').trim();
  const hasScheme = /^https?:\/\//i.test(configuredOrigin);
  const normalizedOrigin = (hasScheme ? configuredOrigin : `https://${configuredOrigin}`).replace(/\/$/, '');
  app.enableCors({
    origin: normalizedOrigin || undefined,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 App running on port ${process.env.PORT}`);
}
bootstrap();
