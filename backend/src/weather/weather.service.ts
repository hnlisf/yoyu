import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WeatherData {
  lat: number;
  lon: number;
  temp: number;
  feelsLike: number;
  humidity: number;
  weatherCode: number;
  description: string;
  windSpeed: number;
  cachedAt: string;
  source: 'cache' | 'live';
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

// w4+§1: static city coordinate whitelist (Open-Meteo geocoding unreliable for Chinese names)
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  changsha: { lat: 28.2282, lon: 112.9388 },
  beijing: { lat: 39.9042, lon: 116.4074 },
  shanghai: { lat: 31.2304, lon: 121.4737 },
  guangzhou: { lat: 23.1291, lon: 113.2644 },
  shenzhen: { lat: 22.5431, lon: 114.0579 },
  hangzhou: { lat: 30.2741, lon: 120.1551 },
  chengdu: { lat: 30.5728, lon: 104.0668 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
  'new york': { lat: 40.7128, lon: -74.006 },
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private prisma: PrismaService) {}

  /** Look up a city's coordinates — static whitelist first, then Open-Meteo geocoding */
  async geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
    const key = city.toLowerCase().trim();
    const staticCoord = CITY_COORDS[key];
    if (staticCoord) return staticCoord;

    // Fallback: Open-Meteo geocoding
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const json: any = await resp.json();
      const result = json.results?.[0];
      if (!result) return null;
      return { lat: result.latitude, lon: result.longitude };
    } catch {
      this.logger.warn(`Geocoding failed for city: ${city}`);
      return null;
    }
  }

  async getWeather(lat: number, lon: number): Promise<WeatherData> {
    // Round coords to 2 decimals (~1.1km) to increase cache hits
    const rlat = Math.round(lat * 100) / 100;
    const rlon = Math.round(lon * 100) / 100;

    const cached = await this.prisma.weatherCache.findFirst({
      where: { lat: rlat, lon: rlon, cachedAt: { gte: new Date(Date.now() - CACHE_TTL_MS) } },
      orderBy: { cachedAt: 'desc' },
    });

    if (cached) {
      try {
        const data = JSON.parse(cached.data) as WeatherData;
        return { ...data, source: 'cache' };
      } catch {
        // fall through to live fetch
      }
    }

    const live = await this.fetchLive(rlat, rlon);

    await this.prisma.weatherCache.create({
      data: { lat: rlat, lon: rlon, data: JSON.stringify(live) },
    });

    return { ...live, source: 'live' };
  }

  /**
   * Get weather by city name (geocoding → weather).
   */
  async getWeatherByCity(city: string): Promise<WeatherData | null> {
    const coords = await this.geocodeCity(city);
    if (!coords) return null;
    return this.getWeather(coords.lat, coords.lon);
  }

  private async fetchLive(lat: number, lon: number): Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m`;
    const resp = await fetch(url);
    if (!resp.ok) {
      this.logger.warn(`Open-Meteo returned ${resp.status} for ${lat},${lon}`);
      return this.fallback(lat, lon);
    }
    const json: any = await resp.json();
    const c = json.current ?? {};
    return {
      lat,
      lon,
      temp: c.temperature_2m ?? 20,
      feelsLike: c.apparent_temperature ?? c.temperature_2m ?? 20,
      humidity: c.relative_humidity_2m ?? 50,
      weatherCode: c.weather_code ?? 0,
      description: this.describeCode(c.weather_code ?? 0),
      windSpeed: c.wind_speed_10m ?? 0,
      cachedAt: new Date().toISOString(),
      source: 'live',
    };
  }

  private fallback(lat: number, lon: number): WeatherData {
    return {
      lat, lon,
      temp: 20, feelsLike: 20, humidity: 60,
      weatherCode: 0, description: '晴朗', windSpeed: 2,
      cachedAt: new Date().toISOString(),
      source: 'live',
    };
  }

  describeCode(code: number): string {
    if (code === 0) return '晴朗';
    if (code <= 3) return '多云';
    if (code <= 48) return '雾';
    if (code <= 67) return '雨';
    if (code <= 77) return '雪';
    if (code <= 99) return '雷暴';
    return '未知';
  }
}
