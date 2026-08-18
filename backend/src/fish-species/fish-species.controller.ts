import { Controller, Delete, Get, Post, Body, Param, Query, HttpCode } from '@nestjs/common';
import { FishSpeciesService } from './fish-species.service';
import { Public } from '../auth/public.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// CurrentUser imported but not yet used in this controller
// import { CurrentUser } from '../auth/current-user.decorator';

// PR 4：默认全局鉴权
//   鱼种列表（GET）是公开的 — 任何人能查
//   自定义鱼种（POST /custom, DELETE）需要 auth — 用户私有创作
//   这里**不**用 @Public() 标在类上，而是标在公开的 GET 方法上
@Controller('api/fish-species')
export class FishSpeciesController {
  constructor(private readonly service: FishSpeciesService) {}

  // ── 公开读 ──
// eslint-disable-next-line @typescript-eslint/require-await
  @Public()
  @Get()
// eslint-disable-next-line @typescript-eslint/require-await
  async findAll(@Query('lang') lang = 'zh') {
    return this.service.findAll(lang) as unknown;
  }

// eslint-disable-next-line @typescript-eslint/require-await
  @Public()
  @Get(':id')
// eslint-disable-next-line @typescript-eslint/require-await
  async findOne(@Param('id') id: string, @Query('lang') lang = 'zh') {
    return this.service.findOne(id, lang) as unknown;
  }

  // ── 需要鉴权的写 ──
  @UseGuards(JwtAuthGuard)
  @Post('custom')
// eslint-disable-next-line @typescript-eslint/require-await
// eslint-disable-next-line @typescript-eslint/require-await
  async createCustom(@Body() body: any) {
    return this.service.createCustom(body) as unknown;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.service.delete(id);
  }
}
