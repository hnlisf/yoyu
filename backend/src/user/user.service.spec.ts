/**
 * UserService 单元测试（重点：getFishSummary）
 */
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let preferencesService: any;
  let fishSpeciesService: any;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      fishTank: { findMany: jest.fn() },
      fish: { findMany: jest.fn() },
      fishSpecies: { findMany: jest.fn() },
    };
    preferencesService = {
      getFavorites: jest.fn(),
    };
    fishSpeciesService = {};
    service = new UserService(prisma, preferencesService, fishSpeciesService);
  });

  describe('findAll / findOne / create / update / remove', () => {
    it('findAll returns users with tank count', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', name: 'demo' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('findOne returns single user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'demo' });
      const result = await service.findOne('u1');
      expect(result.id).toBe('u1');
    });
  });

  describe('getFishSummary()', () => {
    it('aggregates tank + fish + favorite data', async () => {
      // mock tanks
      prisma.fishTank.findMany.mockResolvedValue([
        {
          id: 't1',
          fish: [
            { id: 'f1', status: 'healthy', growth: 80, name: '金鱼', speciesId: 's1', createdAt: new Date(), species: { id: 's1', nameI18n: JSON.stringify({ zh: '金鱼' }) } },
            { id: 'f2', status: 'hungry', growth: 50, name: '金鱼2', speciesId: 's1', createdAt: new Date(), species: { id: 's1', nameI18n: JSON.stringify({ zh: '金鱼' }) } },
          ],
        },
      ]);
      preferencesService.getFavorites.mockResolvedValue(['s1']);

      const result = await service.getFishSummary('u1');

      expect(result.userId).toBe('u1');
      expect(result.totalTanks).toBe(1);
      expect(result.totalFish).toBe(2);
      expect(result.byStatus.healthy).toBe(1);
      expect(result.byStatus.hungry).toBe(1);
      expect(result.bySpecies[0].count).toBe(2);
      expect(result.favoriteCount).toBe(1);
    });

    it('handles zero fish gracefully', async () => {
      prisma.fishTank.findMany.mockResolvedValue([]);
      preferencesService.getFavorites.mockResolvedValue([]);

      const result = await service.getFishSummary('u1');
      expect(result.totalFish).toBe(0);
      expect(result.totalTanks).toBe(0);
    });

    it('handles null favorites', async () => {
      prisma.fishTank.findMany.mockResolvedValue([]);
      preferencesService.getFavorites.mockResolvedValue(null);

      const result = await service.getFishSummary('u1');
      expect(result.favoriteCount).toBe(0);
    });
  });
});