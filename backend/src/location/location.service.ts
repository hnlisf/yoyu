import { Injectable, Logger } from '@nestjs/common';

export interface LocationInfo {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
  source: 'ipapi' | 'fallback';
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  async locate(ip: string): Promise<LocationInfo> {
    // Skip for local/private IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return this.fallback(ip || '127.0.0.1');
    }

    try {
      const resp = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { 'User-Agent': 'YoYu-MVP/1.0' },
      });
      if (!resp.ok) {
        this.logger.warn(`ipapi.co returned ${resp.status} for ${ip}`);
        return this.fallback(ip);
      }
      const j: any = await resp.json();
      if (j.error) {
        return this.fallback(ip);
      }
      return {
        ip,
        country: j.country_name ?? '',
        countryCode: j.country_code ?? '',
        region: j.region ?? '',
        city: j.city ?? '',
        lat: j.latitude ?? 0,
        lon: j.longitude ?? 0,
        timezone: j.timezone ?? 'UTC',
        source: 'ipapi',
      };
    } catch (e: any) {
      this.logger.warn(`ipapi.co error: ${e.message}`);
      return this.fallback(ip);
    }
  }

  private fallback(ip: string): LocationInfo {
    return {
      ip,
      country: '中国',
      countryCode: 'CN',
      region: '北京市',
      city: '北京',
      lat: 39.9042,
      lon: 116.4074,
      timezone: 'Asia/Shanghai',
      source: 'fallback',
    };
  }
}
