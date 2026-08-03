import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

// PR 4：健康检查是基础设施级 endpoint —— 必须公开（否则外部监控系统无法验证）
@Public()
@Controller('api/health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
