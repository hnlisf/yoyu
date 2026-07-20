import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

export interface CityItem {
  id: string;
  nameZh: string;
  nameEn: string;
  nameJa: string;
  lat: number;
  lon: number;
  country: string;
  continent: string;
}

const CITIES: CityItem[] = [
  // 中国 30+
  { id: 'beijing', nameZh: '北京', nameEn: 'Beijing', nameJa: '北京', lat: 39.9042, lon: 116.4074, country: 'CN', continent: 'Asia' },
  { id: 'shanghai', nameZh: '上海', nameEn: 'Shanghai', nameJa: '上海', lat: 31.2304, lon: 121.4737, country: 'CN', continent: 'Asia' },
  { id: 'guangzhou', nameZh: '广州', nameEn: 'Guangzhou', nameJa: '広州', lat: 23.1291, lon: 113.2644, country: 'CN', continent: 'Asia' },
  { id: 'shenzhen', nameZh: '深圳', nameEn: 'Shenzhen', nameJa: '深セン', lat: 22.5431, lon: 114.0579, country: 'CN', continent: 'Asia' },
  { id: 'chengdu', nameZh: '成都', nameEn: 'Chengdu', nameJa: '成都', lat: 30.5728, lon: 104.0668, country: 'CN', continent: 'Asia' },
  { id: 'hangzhou', nameZh: '杭州', nameEn: 'Hangzhou', nameJa: '杭州', lat: 30.2741, lon: 120.1551, country: 'CN', continent: 'Asia' },
  { id: 'changsha', nameZh: '长沙', nameEn: 'Changsha', nameJa: '長沙', lat: 28.2282, lon: 112.9388, country: 'CN', continent: 'Asia' },
  { id: 'wuhan', nameZh: '武汉', nameEn: 'Wuhan', nameJa: '武漢', lat: 30.5928, lon: 114.3055, country: 'CN', continent: 'Asia' },
  { id: 'xian', nameZh: '西安', nameEn: "Xi'an", nameJa: '西安', lat: 34.3416, lon: 108.9398, country: 'CN', continent: 'Asia' },
  { id: 'nanjing', nameZh: '南京', nameEn: 'Nanjing', nameJa: '南京', lat: 32.0603, lon: 118.7969, country: 'CN', continent: 'Asia' },
  { id: 'tianjin', nameZh: '天津', nameEn: 'Tianjin', nameJa: '天津', lat: 39.3434, lon: 117.3616, country: 'CN', continent: 'Asia' },
  { id: 'chongqing', nameZh: '重庆', nameEn: 'Chongqing', nameJa: '重慶', lat: 29.4316, lon: 106.9123, country: 'CN', continent: 'Asia' },
  { id: 'suzhou', nameZh: '苏州', nameEn: 'Suzhou', nameJa: '蘇州', lat: 31.2989, lon: 120.5853, country: 'CN', continent: 'Asia' },
  { id: 'dalian', nameZh: '大连', nameEn: 'Dalian', nameJa: '大連', lat: 38.9140, lon: 121.6147, country: 'CN', continent: 'Asia' },
  { id: 'qingdao', nameZh: '青岛', nameEn: 'Qingdao', nameJa: '青島', lat: 36.0671, lon: 120.3826, country: 'CN', continent: 'Asia' },
  { id: 'shenyang', nameZh: '沈阳', nameEn: 'Shenyang', nameJa: '瀋陽', lat: 41.8057, lon: 123.4328, country: 'CN', continent: 'Asia' },
  { id: 'xiamen', nameZh: '厦门', nameEn: 'Xiamen', nameJa: '廈門', lat: 24.4798, lon: 118.0894, country: 'CN', continent: 'Asia' },
  { id: 'zhengzhou', nameZh: '郑州', nameEn: 'Zhengzhou', nameJa: '鄭州', lat: 34.7466, lon: 113.6253, country: 'CN', continent: 'Asia' },
  { id: 'jinan', nameZh: '济南', nameEn: 'Jinan', nameJa: '濟南', lat: 36.6512, lon: 116.6853, country: 'CN', continent: 'Asia' },
  { id: 'kunming', nameZh: '昆明', nameEn: 'Kunming', nameJa: '昆明', lat: 25.0406, lon: 102.7123, country: 'CN', continent: 'Asia' },
  { id: 'harbin', nameZh: '哈尔滨', nameEn: 'Harbin', nameJa: 'ハルビン', lat: 45.8038, lon: 126.5340, country: 'CN', continent: 'Asia' },
  { id: 'fuzhou', nameZh: '福州', nameEn: 'Fuzhou', nameJa: '福州', lat: 26.0753, lon: 119.2965, country: 'CN', continent: 'Asia' },
  { id: 'nanchang', nameZh: '南昌', nameEn: 'Nanchang', nameJa: '南昌', lat: 28.6829, lon: 115.8579, country: 'CN', continent: 'Asia' },
  { id: 'nanning', nameZh: '南宁', nameEn: 'Nanning', nameJa: '南寧', lat: 22.8170, lon: 108.3665, country: 'CN', continent: 'Asia' },
  { id: 'guiyang', nameZh: '贵阳', nameEn: 'Guiyang', nameJa: '貴陽', lat: 26.6470, lon: 106.6302, country: 'CN', continent: 'Asia' },
  { id: 'taiyuan', nameZh: '太原', nameEn: 'Taiyuan', nameJa: '太原', lat: 37.8706, lon: 112.5489, country: 'CN', continent: 'Asia' },
  { id: 'hefei', nameZh: '合肥', nameEn: 'Hefei', nameJa: '合肥', lat: 31.8206, lon: 117.2272, country: 'CN', continent: 'Asia' },
  { id: 'shijiazhuang', nameZh: '石家庄', nameEn: 'Shijiazhuang', nameJa: '石家荘', lat: 38.0428, lon: 114.5149, country: 'CN', continent: 'Asia' },
  { id: 'changchun', nameZh: '长春', nameEn: 'Changchun', nameJa: '長春', lat: 43.8171, lon: 125.3235, country: 'CN', continent: 'Asia' },
  { id: 'lanzhou', nameZh: '兰州', nameEn: 'Lanzhou', nameJa: '蘭州', lat: 36.0611, lon: 103.8343, country: 'CN', continent: 'Asia' },
  // 日本 5+
  { id: 'tokyo', nameZh: '东京', nameEn: 'Tokyo', nameJa: '東京', lat: 35.6762, lon: 139.6503, country: 'JP', continent: 'Asia' },
  { id: 'osaka', nameZh: '大阪', nameEn: 'Osaka', nameJa: '大阪', lat: 34.6937, lon: 135.5023, country: 'JP', continent: 'Asia' },
  { id: 'kyoto', nameZh: '京都', nameEn: 'Kyoto', nameJa: '京都', lat: 35.0116, lon: 135.7681, country: 'JP', continent: 'Asia' },
  { id: 'yokohama', nameZh: '横滨', nameEn: 'Yokohama', nameJa: '横浜', lat: 35.4437, lon: 139.6380, country: 'JP', continent: 'Asia' },
  { id: 'sapporo', nameZh: '札幌', nameEn: 'Sapporo', nameJa: '札幌', lat: 43.0618, lon: 141.3545, country: 'JP', continent: 'Asia' },
  { id: 'nagoya', nameZh: '名古屋', nameEn: 'Nagoya', nameJa: '名古屋', lat: 35.1815, lon: 136.9066, country: 'JP', continent: 'Asia' },
  // 美国 5+
  { id: 'newyork', nameZh: '纽约', nameEn: 'New York', nameJa: 'ニューヨーク', lat: 40.7128, lon: -74.0060, country: 'US', continent: 'North America' },
  { id: 'losangeles', nameZh: '洛杉矶', nameEn: 'Los Angeles', nameJa: 'ロサンゼルス', lat: 34.0522, lon: -118.2437, country: 'US', continent: 'North America' },
  { id: 'chicago', nameZh: '芝加哥', nameEn: 'Chicago', nameJa: 'シカゴ', lat: 41.8781, lon: -87.6298, country: 'US', continent: 'North America' },
  { id: 'sanfrancisco', nameZh: '旧金山', nameEn: 'San Francisco', nameJa: 'サンフランシスコ', lat: 37.7749, lon: -122.4194, country: 'US', continent: 'North America' },
  { id: 'seattle', nameZh: '西雅图', nameEn: 'Seattle', nameJa: 'シアトル', lat: 47.6062, lon: -122.3321, country: 'US', continent: 'North America' },
  // 欧洲 5+
  { id: 'london', nameZh: '伦敦', nameEn: 'London', nameJa: 'ロンドン', lat: 51.5074, lon: -0.1278, country: 'UK', continent: 'Europe' },
  { id: 'paris', nameZh: '巴黎', nameEn: 'Paris', nameJa: 'パリ', lat: 48.8566, lon: 2.3522, country: 'FR', continent: 'Europe' },
  { id: 'berlin', nameZh: '柏林', nameEn: 'Berlin', nameJa: 'ベルリン', lat: 52.5200, lon: 13.4050, country: 'DE', continent: 'Europe' },
  { id: 'madrid', nameZh: '马德里', nameEn: 'Madrid', nameJa: 'マドリード', lat: 40.4168, lon: -3.7038, country: 'ES', continent: 'Europe' },
  { id: 'rome', nameZh: '罗马', nameEn: 'Rome', nameJa: 'ローマ', lat: 41.9028, lon: 12.4964, country: 'IT', continent: 'Europe' },
  // 其他 5+
  { id: 'sydney', nameZh: '悉尼', nameEn: 'Sydney', nameJa: 'シドニー', lat: -33.8688, lon: 151.2093, country: 'AU', continent: 'Oceania' },
  { id: 'singapore', nameZh: '新加坡', nameEn: 'Singapore', nameJa: 'シンガポール', lat: 1.3521, lon: 103.8198, country: 'SG', continent: 'Asia' },
  { id: 'bangkok', nameZh: '曼谷', nameEn: 'Bangkok', nameJa: 'バンコク', lat: 13.7563, lon: 100.5018, country: 'TH', continent: 'Asia' },
  { id: 'seoul', nameZh: '首尔', nameEn: 'Seoul', nameJa: 'ソウル', lat: 37.5665, lon: 126.9780, country: 'KR', continent: 'Asia' },
  { id: 'dubai', nameZh: '迪拜', nameEn: 'Dubai', nameJa: 'ドバイ', lat: 25.2048, lon: 55.2708, country: 'AE', continent: 'Asia' },
  { id: 'moscow', nameZh: '莫斯科', nameEn: 'Moscow', nameJa: 'モスクワ', lat: 55.7558, lon: 37.6173, country: 'RU', continent: 'Europe' },
];

@ApiTags('cities')
@Controller('api/cities')
export class CitiesController {
  @Get()
  @ApiOperation({ summary: 'List supported cities for weather — v10.1.4: expanded to 50+ cities' })
  list(): CityItem[] {
    return CITIES;
  }
}
