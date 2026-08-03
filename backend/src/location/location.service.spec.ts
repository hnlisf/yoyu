/**
 * LocationService 单元测试
 */
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    service = new LocationService();
  });

  describe('locate()', () => {
    it('returns fallback for localhost IP', async () => {
      const result = await service.locate('127.0.0.1');
      expect(result.source).toBe('fallback');
      expect(result.ip).toBe('127.0.0.1');
      expect(result.city).toBe('北京');
    });

    it('returns fallback for IPv6 loopback', async () => {
      const result = await service.locate('::1');
      expect(result.source).toBe('fallback');
    });

    it('returns fallback for 192.168.x.x (private)', async () => {
      const result = await service.locate('192.168.1.1');
      expect(result.source).toBe('fallback');
    });

    it('returns fallback for 10.x.x.x (private)', async () => {
      const result = await service.locate('10.0.0.1');
      expect(result.source).toBe('fallback');
    });

    it('handles empty IP', async () => {
      const result = await service.locate('');
      expect(result.source).toBe('fallback');
    });

    it('attempts ipapi for public IP and falls back on error', async () => {
      // 真实 ipapi 调用可能失败 —— 期待 fallback
      const result = await service.locate('8.8.8.8');
      // 不论成功失败都返回 LocationInfo
      expect(result).toHaveProperty('ip');
      expect(result.source === 'ipapi' || result.source === 'fallback').toBe(true);
    });
  });
});