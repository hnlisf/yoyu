import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  // ── PR 6 修复：cors: true → 基于 ALLOWED_ORIGINS 的白名单 ──
  //
  // 安全考虑：
  //   - 之前 cors: true 意味着 Access-Control-Allow-Origin: *
  //   - 任何网站都能调 API（恶意第三方能窃取用户数据）
  //   - 现在 ALLOWED_ORIGINS 是显式白名单（comma-separated）
  //   - 默认开发值是 localhost:3001（前端 dev 端口）
  //
  // 部署注意：
  //   - 生产环境必须把 ALLOWED_ORIGINS 改成实际前端域名
  //   - 若需 Vercel preview、staging 等多环境，用逗号分隔
  //   - 设置 ALLOWED_ORIGINS=https://yoyu.example.com,https://staging.yoyu.example.com
  //
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('YoYu API')
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
  console.log(`YoYu backend running on http://0.0.0.0:${port}`);
  console.log(`Swagger docs:  http://0.0.0.0:${port}/api/docs`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();