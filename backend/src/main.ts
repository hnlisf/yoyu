import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('FishGrow API')
    .setDescription('Virtual fish pet game - MVP backend')
    .setVersion('1.0.0')
    .addTag('fish-species', 'Fish species library + custom species')
    .addTag('fish-tanks', 'User fish tanks and environment status')
    .addTag('fish', 'Individual fish in tanks: feed, grow, evolve')
    .addTag('weather', 'Open-Meteo weather cache (30 min TTL)')
    .addTag('location', 'IP-based geolocation via ipapi.co')
    .addTag('feeding-advice', 'Per-species feeding recommendations based on weather')
    .addTag('reminders', 'Feed / water change / clean reminders')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`FishGrow backend running on http://0.0.0.0:${port}`);
  console.log(`Swagger docs:  http://0.0.0.0:${port}/api/docs`);
}
bootstrap();