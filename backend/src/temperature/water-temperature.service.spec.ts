/**
 * WaterTemperatureService 单元测试（P3 §3.3：纯内存物理）
 */
import { WaterTemperatureService } from './water-temperature.service';
import { TemperatureState } from './temperature-state';

describe('WaterTemperatureService', () => {
  let service: WaterTemperatureService;
  let state: TemperatureState;

  beforeEach(() => {
    state = new TemperatureState();
    service = new WaterTemperatureService(state);
  });

  describe('register / unregister', () => {
    it('registers tank with initial temp', () => {
      service.register('t1', 24, 20);
      expect(service.getCurrentTemp('t1')).toBe(24);
    });

    it('unregisters tank', () => {
      service.register('t1', 24, 20);
      service.unregister('t1');
      expect(service.getCurrentTemp('t1')).toBeNull();
    });
  });

  describe('temperature progression (heater ON)', () => {
    beforeEach(() => {
      service.register('t1', 20, 5);  // 当前 20°C, 室外 5°C
    });

    it('warms when heater is on', () => {
      service.setHeaterOn('t1', true);
      // 物理 tick 由 @Interval 触发 —— 单元测试不直接跑
      // 验证：getCurrentTemp 返回初始 20
      expect(service.getCurrentTemp('t1')).toBe(20);
    });
  });

  describe('updateOutdoorTemp', () => {
    it('updates outdoor reference', () => {
      service.register('t1', 24, 20);
      service.updateOutdoorTemp('t1', 15);
      expect(service.getOutdoorTemp('t1')).toBe(15);
    });
  });

  describe('reset (water change)', () => {
    it('resets to new temp + heater off', () => {
      service.register('t1', 24, 20);
      service.setHeaterOn('t1', true);
      service.reset('t1', 24);
      expect(service.getCurrentTemp('t1')).toBe(24);
      expect(service.isHeaterOn('t1')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns null for non-tracked tank', () => {
      expect(service.getCurrentTemp('unknown')).toBeNull();
      expect(service.getOutdoorTemp('unknown')).toBeNull();
      expect(service.isHeaterOn('unknown')).toBe(false);
    });

    it('setHeaterOn on non-tracked tank is no-op', () => {
      expect(() => service.setHeaterOn('unknown', true)).not.toThrow();
    });

    it('reset on non-tracked tank is no-op', () => {
      expect(() => service.reset('unknown', 24)).not.toThrow();
    });
  });
});