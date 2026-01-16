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

  // Helper function to normalize origin URLs
  const normalizeOrigin = (origin: string): string | null => {
    if (!origin) return null;
    let normalized = origin.trim();
    if (/^\/\//.test(normalized)) normalized = `https:${normalized}`;
    if (/^https?:[^/]/i.test(normalized)) normalized = normalized.replace(/^https?:/i, 'https://');
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    normalized = normalized.replace(/^(https?:\/\/)(https?:\/\/)+/i, '$1').replace(/\/$/, '');
    return normalized || null;
  };

  // Get and normalize both frontend URLs
  const allowedOrigins: (string | null)[] = [
    normalizeOrigin(process.env.FRONTEND_URL || ''),
    normalizeOrigin(process.env.BIGGSPOON_FRONTEND_URL || ''),
  ].filter((origin): origin is string => origin !== null);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : undefined,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 App running on port ${process.env.PORT}`);
}
bootstrap();
