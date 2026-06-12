import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@Controller('api/weather')
export class WeatherController {
  constructor(private readonly service: WeatherService) {}

  @Get()
  @ApiOperation({ summary: 'Get current weather for lat/lon (Open-Meteo, cached 30 min)' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lon', required: true, type: Number })
  async get(@Query('lat') lat: string, @Query('lon') lon: string) {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      throw new BadRequestException('lat/lon must be numbers');
    }
    return this.service.getWeather(latN, lonN);
  }
}
