/**
 * HealthController 单元测试
 */
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('returns ok status', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
  });

  it('returns a timestamp', () => {
    const result = controller.health();
    expect(result.timestamp).toBeDefined();
    // 验证是 ISO string
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});