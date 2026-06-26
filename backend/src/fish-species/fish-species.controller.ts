import { Controller, Delete, Get, Post, Body, Param, Query, HttpCode } from '@nestjs/common';
import { FishSpeciesService } from './fish-species.service';

@Controller('api/fish-species')
export class FishSpeciesController {
  constructor(private readonly service: FishSpeciesService) {}

  @Get()
  async findAll(@Query('lang') lang = 'zh') {
    return this.service.findAll(lang);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('lang') lang = 'zh') {
    return this.service.findOne(id, lang);
  }

  @Post('custom')
  async createCustom(@Body() body: any) {
    return this.service.createCustom(body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.service.delete(id);
  }
}
