/**
 * TemperatureAdjustService 单元测试（P3 §3.3：唯一 DB 写者）
 */
import { TemperatureAdjustService } from './temperature-adjust.service';
import { TemperatureState } from '../temperature/temperature-state';

describe('TemperatureAdjustService', () => {
  let service: TemperatureAdjustService;
  let prisma: any;
  let state: TemperatureState;

  beforeEach(() => {
    prisma = {
      temperatureAdjustJob: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      fishTank: {
        update: jest.fn(),
      },
    };
    state = new TemperatureState();
    service = new TemperatureAdjustService(prisma, state);
  });

  describe('createJob()', () => {
    it('cancels existing running jobs and creates new', async () => {
      prisma.temperatureAdjustJob.updateMany.mockResolvedValue({ count: 1 });
      prisma.temperatureAdjustJob.create.mockResolvedValue({ id: 'j1' });
      const job = await service.createJob('t1', 20, 25);
      expect(prisma.temperatureAdjustJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tankId: 't1', status: 'running' } }),
      );
      expect(job.id).toBe('j1');
    });
  });

  describe('cancelJobs()', () => {
    it('updates all running jobs to cancelled', async () => {
      prisma.temperatureAdjustJob.updateMany.mockResolvedValue({ count: 2 });
      await service.cancelJobs('t1');
      expect(prisma.temperatureAdjustJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }),
      );
    });
  });

  describe('getRunningJob()', () => {
    it('returns the most recent running job', async () => {
      prisma.temperatureAdjustJob.findFirst.mockResolvedValue({ id: 'j1' });
      const job = await service.getRunningJob('t1');
      expect(job.id).toBe('j1');
    });
  });

  describe('getProgress()', () => {
    it('returns null when no running job', async () => {
      prisma.temperatureAdjustJob.findFirst.mockResolvedValue(null);
      const progress = await service.getProgress('t1');
      expect(progress).toBeNull();
    });

    it('returns progress with live state when job running', async () => {
      prisma.temperatureAdjustJob.findFirst.mockResolvedValue({
        id: 'j1',
        tankId: 't1',
        fromTemp: 20,
        toTemp: 25,
        currentTemp: 22,
        algorithm: 'rate_limited_linear',
        tauMinutes: 20,
        startedAt: new Date(),
        status: 'running',
      });
      state.register('t1', 22.5, 20);
      const progress = await service.getProgress('t1');
      expect(progress?.currentTemp).toBe(22.5);  // 来自 TemperatureState（1Hz 精度）
      expect(progress?.fromTemp).toBe(20);
      expect(progress?.toTemp).toBe(25);
    });
  });
});