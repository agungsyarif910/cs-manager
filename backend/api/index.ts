import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let app: any;

async function bootstrap() {
  if (!app) {
    const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(server));
    nestApp.enableCors({
      origin: true,
      credentials: true,
    });
    nestApp.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    nestApp.setGlobalPrefix('api');
    await nestApp.init();
    app = nestApp;
  }
  return server;
}

export default async (req: any, res: any) => {
  const serverInstance = await bootstrap();
  serverInstance(req, res);
};
