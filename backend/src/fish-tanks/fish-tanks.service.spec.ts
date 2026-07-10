import { FishTanksService } from './fish-tanks.service';

/**
 * Unit tests for FishTanksService.
 *
 * We mock the PrismaService, FishSpeciesService, and FishService so we can
 * exercise the business logic (create/update/tick) without a real database.
 */
describe('FishTanksService', () => {
  let svc: FishTanksService;
  let prisma: any;
  let speciesService: any;
  let fishService: any;

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
      },
      fishSpecies: {
        findFirst: jest.fn().mockResolvedValue({ id: 's-goldfish' }),
      },
      fish: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      // $transaction calls the callback with the same prisma mock
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    speciesService = { toI18n: jest.fn((s: any, lang: string) => ({ ...s, lang })) };
    fishService = { create: jest.fn() };
    const waterTemp = { onFlush: jest.fn(), getCurrentTemp: jest.fn().mockReturnValue(null), register: jest.fn(), setHeaterOn: jest.fn(), updateOutdoorTemp: jest.fn(), reset: jest.fn() };
    const weatherService = {};
    const temperatureAdjustService = {};
    svc = new FishTanksService(prisma, speciesService, fishService, waterTemp as any, weatherService as any, temperatureAdjustService as any);
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
    it('returns null when tank does not exist', async () => {
      prisma.fishTank.findUnique.mockResolvedValue(null);
      expect(await svc.findOne('missing')).toBeNull();
    });

    it('returns the tank with i18n applied', async () => {
      const tank = { id: 't1', fish: [{ species: { name: 'koi' } }] };
      prisma.fishTank.findUnique.mockResolvedValue(tank);
      const result = await svc.findOne('t1', 'ja');
      expect(result.fish[0].species.lang).toBe('ja');
    });
  });

  describe('create', () => {
    it('uses provided userId when it already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.fishTank.create.mockResolvedValue({ id: 't1', userId: 'u1' });
      const result = await svc.create({ userId: 'u1', name: 'My tank' });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.fishTank.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u1', name: 'My tank' }),
      });
      expect(result.id).toBe('t1');
    });

    it('creates a new user when provided userId does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u-new' });
      prisma.fishTank.create.mockResolvedValue({ id: 't1', userId: 'u-new' });
      await svc.create({ userId: 'u-missing' });
      expect(prisma.user.create).toHaveBeenCalledWith({ data: { id: 'u-missing' } });
    });

    it('reuses latest user when no userId provided (single-user mode)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u-latest' });
      prisma.fishTank.create.mockResolvedValue({ id: 't1', userId: 'u-latest' });
      await svc.create({});
      expect(prisma.fishTank.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u-latest' }),
      });
    });

    it('creates a fresh user when no users exist yet', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u-fresh' });
      prisma.fishTank.create.mockResolvedValue({ id: 't1', userId: 'u-fresh' });
      await svc.create({});
      expect(prisma.user.create).toHaveBeenCalledWith({ data: {} });
    });

    it('applies defaults for missing fields', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.fishTank.create.mockResolvedValue({ id: 't1' });
      await svc.create({});
      const args = prisma.fishTank.create.mock.calls[0][0];
      expect(args.data).toMatchObject({
        name: '我的鱼缸',
        size: 'medium',
        temp: 24.0,
        ph: 7.0,
      });
    });

    it('creates a fish alongside the tank', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.fishTank.create.mockResolvedValue({ id: 't1', userId: 'u1' });
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
});
