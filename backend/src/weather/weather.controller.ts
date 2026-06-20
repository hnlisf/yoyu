import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@Controller('api/weather')
export class WeatherController {
  constructor(private readonly service: WeatherService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current weather for lat/lon or city (Open-Meteo, cached 30 min)',
  })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lon', required: false, type: Number })
  @ApiQuery({ name: 'city', required: false, type: String })
  async get(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('city') city?: string,
  ) {
    // City-based query
    if (city) {
      const data = await this.service.getWeatherByCity(city.trim());
      if (!data) {
        throw new NotFoundException(`无法找到城市 "${city}" 的天气数据`);
      }
      return data;
    }

    // Lat/lon query
    const latN = parseFloat(lat ?? '');
    const lonN = parseFloat(lon ?? '');
    if (isNaN(latN) || isNaN(lonN)) {
      throw new BadRequestException(
        'lat/lon must be numbers, or provide city parameter',
      );
    }
    return this.service.getWeather(latN, lonN);
  }
}
