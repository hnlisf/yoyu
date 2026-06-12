import { Controller, Get, Headers, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationService } from './location.service';

@ApiTags('location')
@Controller('api/location')
export class LocationController {
  constructor(private readonly service: LocationService) {}

  @Get()
  @ApiOperation({ summary: 'Locate user by IP (proxies ipapi.co, with Beijing fallback)' })
  async locate(@Ip() ip: string, @Headers('x-forwarded-for') xff: string) {
    const realIp = xff ? xff.split(',')[0].trim() : ip;
    return this.service.locate(realIp);
  }
}
