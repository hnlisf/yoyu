/**
 * CitiesController 单元测试
 *
 * cities 模块无 service（数据是静态 CITIES 数组）
 * 这里只测 controller
 */
import { CitiesController } from './cities.controller';

describe('CitiesController', () => {
  let controller: CitiesController;

  beforeEach(() => {
    controller = new CitiesController();
  });

  it('returns list of cities', () => {
    const cities = controller.list();
    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
  });

  it('each city has required fields', () => {
    const cities = controller.list();
    for (const c of cities) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('nameZh');
      expect(c).toHaveProperty('nameEn');
      expect(c).toHaveProperty('lat');
      expect(c).toHaveProperty('lon');
    }
  });

  it('includes Beijing and Shanghai', () => {
    const cities = controller.list();
    const ids = cities.map((c) => c.id);
    expect(ids).toContain('beijing');
    expect(ids).toContain('shanghai');
  });

  it('coordinates are in valid range', () => {
    const cities = controller.list();
    for (const c of cities) {
      expect(c.lat).toBeGreaterThanOrEqual(-90);
      expect(c.lat).toBeLessThanOrEqual(90);
      expect(c.lon).toBeGreaterThanOrEqual(-180);
      expect(c.lon).toBeLessThanOrEqual(180);
    }
  });
});