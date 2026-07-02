import { TemperatureAdjustService } from './temperature-adjust.service';

/**
 * Unit tests for TemperatureAdjustService — v9.1.1 Item 7 τ auto-extension.
 * Tests computeAutoTau (via any cast) and createJob auto-extend behavior.
 */
describe('TemperatureAdjustService', () => {
  let svc: TemperatureAdjustService;
  let prisma: any;

  beforeEach(() => {
    // Suppress logger noise during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});

    prisma = {
      temperatureAdjustJob: {
        updateMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({
          id: 'job-1',
          tankId: 'tank-1',
          fromTemp: 20,
          toTemp: 35,
          currentTemp: 20,
          tauMinutes: 180,
          algorithm: 'exponential_decay',
          status: 'running',
          startedAt: new Date(),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      fishTank: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    svc = new TemperatureAdjustService(prisma);
  });

  describe('computeAutoTau', () => {
    it('ΔT=15°C → τ=180min (15h convergence / 5 = 3h = 180min)', () => {
      const tau = (svc as any).computeAutoTau(20, 35); // from=20, to=35, ΔT=15
      expect(tau).toBe(180);
    });

    it('ΔT=15°C reversed → τ=180min (35→20)', () => {
      const tau = (svc as any).computeAutoTau(35, 20); // from=35, to=20, ΔT=15
      expect(tau).toBe(180);
    });

    it('ΔT=2°C → τ=24min (2h convergence / 5 = 0.4h = 24min)', () => {
      const tau = (svc as any).computeAutoTau(25, 27); // from=25, to=27, ΔT=2
      expect(tau).toBe(24);
    });

    it('ΔT=0.5°C → τ=20min (keeps default, 0.5h/5=0.1h=6min < 20min floor)', () => {
      const tau = (svc as any).computeAutoTau(25, 25.5); // ΔT=0.5
      expect(tau).toBe(20);
    });

    it('ΔT=0°C (no change) → τ=20min (floor)', () => {
      const tau = (svc as any).computeAutoTau(25, 25);
      expect(tau).toBe(20);
    });
  });

  describe('createJob auto-τ extension', () => {
    it('large ΔT (15°C) triggers auto-τ extension to 180min', async () => {
      const job = await svc.createJob('tank-1', 20, 35);
      expect(prisma.temperatureAdjustJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tauMinutes: 180 }),
        }),
      );
      expect(job.tauMinutes).toBe(180);
    });

    it('moderate ΔT (2°C) auto-extends to 24min', async () => {
      prisma.temperatureAdjustJob.create.mockResolvedValueOnce({
        id: 'job-1b',
        tankId: 'tank-1',
        fromTemp: 25,
        toTemp: 27,
        currentTemp: 25,
        tauMinutes: 24,
        algorithm: 'exponential_decay',
        status: 'running',
        startedAt: new Date(),
      });
      const job = await svc.createJob('tank-1', 25, 27);
      expect(prisma.temperatureAdjustJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tauMinutes: 24 }),
        }),
      );
      expect(job.tauMinutes).toBe(24);
    });

    it('small ΔT (0.3°C) keeps default τ=20', async () => {
      // ΔT=0.3 > 0.1 threshold but τ would be ceil(12*0.3)=ceil(3.6)=4 < 20 → floor to 20
      prisma.temperatureAdjustJob.create.mockResolvedValueOnce({
        id: 'job-2',
        tankId: 'tank-1',
        fromTemp: 25,
        toTemp: 25.3,
        currentTemp: 25,
        tauMinutes: 20,
        algorithm: 'exponential_decay',
        status: 'running',
        startedAt: new Date(),
      });
      const job = await svc.createJob('tank-1', 25, 25.3);
      expect(prisma.temperatureAdjustJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tauMinutes: 20 }),
        }),
      );
      expect(job.tauMinutes).toBe(20);
    });

    it('explicit tauMinutes is respected (not auto-extended)', async () => {
      prisma.temperatureAdjustJob.create.mockResolvedValueOnce({
        id: 'job-3',
        tankId: 'tank-1',
        fromTemp: 20,
        toTemp: 35,
        currentTemp: 20,
        tauMinutes: 60,
        algorithm: 'exponential_decay',
        status: 'running',
        startedAt: new Date(),
      });
      const job = await svc.createJob('tank-1', 20, 35, 60);
      expect(prisma.temperatureAdjustJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tauMinutes: 60 }),
        }),
      );
      expect(job.tauMinutes).toBe(60);
    });

    it('cancels existing running job for the same tank before creating new one', async () => {
      await svc.createJob('tank-1', 20, 35);
      expect(prisma.temperatureAdjustJob.updateMany).toHaveBeenCalledWith({
        where: { tankId: 'tank-1', status: 'running' },
        data: { status: 'cancelled', completedAt: expect.any(Date) },
      });
    });
  });
});
