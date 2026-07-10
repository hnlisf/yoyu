import { FishTanksService } from './fish-tanks.service';

/**
 * Unit tests for FishTanksService.
 *
 * We mock all dependencies so we can exercise the business logic
 * (create/update/tick/changeWater) without a real database.
 */
describe('FishTanksService', () => {
  let svc: FishTanksService;
  let prisma: any;
  let speciesService: any;
  let fishService: any;
  let waterTemp: any;
  let weatherService: any;
  let temperatureAdjustService: any;
  let userService: any;

  beforeEach(() => {
    // Build a mock prisma that supports $transaction (pass-through)
    prisma = {
      fishTank: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      fishSpecies: {
        findFirst: jest.fn().mockResolvedValue({ id: 's-goldfish' }),
      },
      fish: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      waterChangeLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      // $transaction calls the callback with the same prisma mock
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    speciesService = { toI18n: jest.fn((s: any, lang: string) => ({ ...s, lang })) };
    fishService = { create: jest.fn(), renameFish: jest.fn() };
    waterTemp = {
      getCurrentTemp: jest.fn().mockReturnValue(null),
      register: jest.fn(),
      reset: jest.fn(),
      setHeaterOn: jest.fn(),
      updateOutdoorTemp: jest.fn(),
      onFlush: jest.fn(),
    };
    weatherService = {
      geocodeCity: jest.fn().mockResolvedValue({ lat: 39.9, lon: 116.4 }),
      getWeatherByCity: jest.fn().mockResolvedValue({ temp: 25 }),
    };
    temperatureAdjustService = {
      createJob: jest.fn(),
      cancelJobs: jest.fn(),
      getProgress: jest.fn().mockResolvedValue(null),
    };
    userService = {
      ensureUser: jest.fn().mockImplementation(async (id: string) => id),
      createDemoUser: jest.fn().mockResolvedValue('u-demo'),
    };

    svc = new FishTanksService(
      prisma,
      speciesService,
      fishService,
      waterTemp,
      weatherService,
      temperatureAdjustService,
      userService,
    );
  });

  describe('findAllByUser', () => {
    it('returns tanks with i18n applied to nested fish species', async () => {
      const tank = { id: 't1', fish: [{ species: { name: 'goldfish' } }] };
      prisma.fishTank.findMany.mockResolvedValue([tank]);
      const result = await svc.findAllByUser('u1', 'en');
      expect(prisma.fishTank.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: { fish: { include: { species: true } } },
        orderBy: { createdAt: 'asc' },
      });
      expect(speciesService.toI18n).toHaveBeenCalledWith({ name: 'goldfish' }, 'en');
      expect(result[0].fish[0].species).toEqual({ name: 'goldfish', lang: 'en' });
    });

    it('handles tanks with no fish without crashing', async () => {
      prisma.fishTank.findMany.mockResolvedValue([{ id: 't1' }]);
      const result = await svc.findAllByUser('u1');
      expect(result[0]).toEqual({ id: 't1' });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when tank does not exist', async () => {
      prisma.fishTank.findUnique.mockResolvedValue(null);
      await expect(svc.findOne('missing')).rejects.toThrow('Fish tank missing not found');
    });

    it('returns the tank with i18n applied', async () => {
      const tank = { id: 't1', fish: [{ species: { name: 'koi' } }], cityTemp: 20, heaterOn: false };
      prisma.fishTank.findUnique.mockResolvedValue(tank);
      const result = await svc.findOne('t1', 'ja');
      expect(result.fish[0].species.lang).toBe('ja');
    });
  });

  describe('create', () => {
    it('uses provided userId via userService.ensureUser', async () => {
      prisma.fishTank.create.mockResolvedValue({ id: 't1', userId: 'u1' });
      await svc.create({ userId: 'u1', name: 'My tank' });
      expect(userService.ensureUser).toHaveBeenCalledWith('u1');
      expect(prisma.fishTank.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u1', name: 'My tank' }),
      });
    });

    it('uses createDemoUser when no userId provided', async () => {
      prisma.fishTank.create.mockResolvedValue({ id: 't1', userId: 'u-demo' });
      await svc.create({});
      expect(userService.createDemoUser).toHaveBeenCalled();
      expect(prisma.fishTank.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u-demo' }),
      });
    });

    it('applies defaults for missing fields', async () => {
      prisma.fishTank.create.mockResolvedValue({ id: 't1' });
      await svc.create({});
      const args = prisma.fishTank.create.mock.calls[0][0];
      expect(args.data).toMatchObject({
        name: '我的鱼缸',
        size: 'medium',
        ph: 7.0,
      });
    });

    it('creates a fish alongside the tank', async () => {
      prisma.fishTank.create.mockResolvedValue({ id: 't1', userId: 'u-demo' });
      await svc.create({});
      // fish should be created with the new tank id
      expect(prisma.fish.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tankId: 't1',
          speciesId: 's-goldfish',
          stage: 'fry',
          growth: 0,
          health: 100,
          nutrition: 100,
        }),
      });
    });
  });

  describe('update / remove', () => {
    it('update throws NotFound when tank does not exist', async () => {
      prisma.fishTank.findUnique.mockResolvedValue(null);
      await expect(svc.update('missing', { name: 'x' })).rejects.toThrow();
    });

    it('update succeeds when tank exists', async () => {
      prisma.fishTank.findUnique.mockResolvedValue({ id: 't1' });
      prisma.fishTank.update.mockResolvedValue({ id: 't1', name: 'new' });
      await svc.update('t1', { name: 'new' });
      expect(prisma.fishTank.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { name: 'new' },
      });
    });

    it('remove throws NotFound when tank does not exist', async () => {
      prisma.fishTank.findUnique.mockResolvedValue(null);
      await expect(svc.remove('missing')).rejects.toThrow();
    });
  });

  describe('tick', () => {
    it('decays cleanliness and oxygen over time', async () => {
      prisma.fishTank.findUnique.mockResolvedValue({
        id: 't1', cleanliness: 100, oxygen: 100, ph: 7.0,
        fish: [],
      });
      prisma.fishTank.update.mockImplementation(({ data }: any) => ({ id: 't1', ...data }));

      const result = await svc.tick('t1', 24); // 1 day
      // 5% cleanliness decay, 4% oxygen decay
      expect(result.cleanliness).toBeCloseTo(95, 1);
      expect(result.oxygen).toBeCloseTo(96, 1);
    });

    it('clamps cleanliness/oxygen to 0 (no negatives)', async () => {
      prisma.fishTank.findUnique.mockResolvedValue({
        id: 't1', cleanliness: 2, oxygen: 2, ph: 7.0,
        fish: [],
      });
      prisma.fishTank.update.mockImplementation(({ data }: any) => ({ id: 't1', ...data }));
      const result = await svc.tick('t1', 24 * 30); // 30 days
      expect(result.cleanliness).toBe(0);
      expect(result.oxygen).toBe(0);
    });

    it('throws NotFound when ticking a missing tank', async () => {
      prisma.fishTank.findUnique.mockResolvedValue(null);
      await expect(svc.tick('missing')).rejects.toThrow();
    });
  });

  describe('renameFish', () => {
    it('renames a fish successfully', async () => {
      const fish = { id: 'f1', tankId: 't1', name: 'old', tank: { userId: 'u1' } };
      prisma.fish.findUnique.mockResolvedValue(fish);
      prisma.fishTank.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' });
      prisma.fish.update.mockResolvedValue({ ...fish, name: '小黄' });

      const result = await svc.renameFish('t1', 'f1', '小黄', 'u1');
      expect(result.name).toBe('小黄');
      expect(prisma.fish.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { name: '小黄' },
      });
    });

    it('trims whitespace from nickname', async () => {
      const fish = { id: 'f1', tankId: 't1', name: 'old', tank: { userId: 'u1' } };
      prisma.fish.findUnique.mockResolvedValue(fish);
      prisma.fishTank.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' });
      prisma.fish.update.mockResolvedValue({ ...fish, name: '小黄' });

      await svc.renameFish('t1', 'f1', '  小黄  ', 'u1');
      expect(prisma.fish.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { name: '小黄' },
      });
    });

    it('throws BadRequest when nickname is empty', async () => {
      await expect(svc.renameFish('t1', 'f1', '', 'u1')).rejects.toThrow();
    });

    it('throws BadRequest when nickname exceeds 20 chars', async () => {
      await expect(svc.renameFish('t1', 'f1', 'a'.repeat(21), 'u1')).rejects.toThrow();
    });

    it('throws BadRequest when nickname contains HTML', async () => {
      await expect(svc.renameFish('t1', 'f1', '<b>fish</b>', 'u1')).rejects.toThrow();
    });

    it('throws NotFound when fish does not exist', async () => {
      prisma.fish.findUnique.mockResolvedValue(null);
      await expect(svc.renameFish('t1', 'f1', '小黄', 'u1')).rejects.toThrow();
    });

    it('throws NotFound when fish belongs to a different tank', async () => {
      prisma.fish.findUnique.mockResolvedValue({ id: 'f1', tankId: 't2', tank: { userId: 'u1' } });
      await expect(svc.renameFish('t1', 'f1', '小黄', 'u1')).rejects.toThrow();
    });

    it('throws Forbidden when user is not the tank owner', async () => {
      prisma.fish.findUnique.mockResolvedValue({ id: 'f1', tankId: 't1', tank: { userId: 'u1' } });
      prisma.fishTank.findUnique.mockResolvedValue({ id: 't1', userId: 'u2' });
      await expect(svc.renameFish('t1', 'f1', '小黄', 'u1')).rejects.toThrow();
    });
  });

  describe('changeWater (v10.1.2)', () => {
    const tankId = 't1';
    const userId = 'u1';
    const otherUserId = 'u-other';

    it('throws ForbiddenException when userId does not match tank owner', async () => {
      prisma.fishTank.findUnique.mockResolvedValue({ id: tankId, userId: otherUserId });
      await expect(svc.changeWater(tankId, userId)).rejects.toThrow('You are not the owner');
    });

    it('throws BadRequestException when last water change was within 24h', async () => {
      prisma.fishTank.findUnique.mockResolvedValue({ id: tankId, userId });
      prisma.waterChangeLog.findFirst.mockResolvedValue({
        tankId,
        changedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      });
      await expect(svc.changeWater(tankId, userId)).rejects.toThrow('tank_already_fresh');
    });

    it('succeeds when no prior water change exists', async () => {
      prisma.fishTank.findUnique.mockResolvedValue({ id: tankId, userId, cityTemp: 22 });
      prisma.waterChangeLog.findFirst.mockResolvedValue(null);

      const result = await svc.changeWater(tankId, userId);

      expect(result.temperature).toBe(24.0);
      expect(result.heaterOn).toBe(false);
      expect(waterTemp.reset).toHaveBeenCalledWith(tankId, 24.0);
    });

    it('succeeds when last water change was over 24h ago', async () => {
      prisma.fishTank.findUnique.mockResolvedValue({ id: tankId, userId, cityTemp: 22 });
      prisma.waterChangeLog.findFirst.mockResolvedValue({
        tankId,
        changedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      });

      const result = await svc.changeWater(tankId, userId);
      expect(result.temperature).toBe(24.0);
    });

    it('throws NotFoundException when tank does not exist', async () => {
      prisma.fishTank.findUnique.mockResolvedValue(null);
      await expect(svc.changeWater('missing', userId)).rejects.toThrow('Fish tank not found');
    });
  });

  describe('getWaterChangeLogs', () => {
    it('returns water change logs ordered by most recent', async () => {
      prisma.fishTank.findUnique.mockResolvedValue({ id: 't1' });
      prisma.waterChangeLog.findMany.mockResolvedValue([
        { id: 'w1', tankId: 't1', changedAt: new Date() },
      ]);
      const logs = await svc.getWaterChangeLogs('t1');
      expect(logs).toHaveLength(1);
    });

    it('throws NotFound when tank does not exist', async () => {
      prisma.fishTank.findUnique.mockResolvedValue(null);
      await expect(svc.getWaterChangeLogs('missing')).rejects.toThrow();
    });
  });
});
