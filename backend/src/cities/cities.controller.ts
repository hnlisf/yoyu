import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

export interface CityItem {
  id: string;
  nameZh: string;
  nameEn: string;
  lat: number;
  lon: number;
}

const CITIES: CityItem[] = [
  { id: 'changsha', nameZh: '长沙', nameEn: 'Changsha', lat: 28.2282, lon: 112.9388 },
  { id: 'beijing', nameZh: '北京', nameEn: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { id: 'shanghai', nameZh: '上海', nameEn: 'Shanghai', lat: 31.2304, lon: 121.4737 },
  { id: 'guangzhou', nameZh: '广州', nameEn: 'Guangzhou', lat: 23.1291, lon: 113.2644 },
  { id: 'shenzhen', nameZh: '深圳', nameEn: 'Shenzhen', lat: 22.5431, lon: 114.0579 },
  { id: 'hangzhou', nameZh: '杭州', nameEn: 'Hangzhou', lat: 30.2741, lon: 120.1551 },
  { id: 'chengdu', nameZh: '成都', nameEn: 'Chengdu', lat: 30.5728, lon: 104.0668 },
  { id: 'tokyo', nameZh: '东京', nameEn: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { id: 'newyork', nameZh: '纽约', nameEn: 'New York', lat: 40.7128, lon: -74.006 },
];

@ApiTags('cities')
@Controller('api/cities')
export class CitiesController {
  @Get()
  @ApiOperation({ summary: 'List supported cities for weather' })
  list(): CityItem[] {
    return CITIES;
  }
}
