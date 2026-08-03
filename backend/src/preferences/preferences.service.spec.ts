/**
 * PreferencesService 单元测试
 */
import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      userPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    service = new PreferencesService(prisma);
  });

  describe('get()', () => {
    it('returns default when no prefs row', async () => {
      prisma.userPreference.findUnique.mockResolvedValue(null);
      const result = await service.get('demo-user');
      expect(result.userId).toBe('demo-user');
      expect(result.city).toBe('changsha');
    });

    it('returns existing prefs when found', async () => {
      prisma.userPreference.findUnique.mockResolvedValue({
        userId: 'demo-user',
        city: 'beijing',
        lat: 39.9,
        lng: 116.4,
        favorites: '["a","b"]',
      });
      const result = await service.get('demo-user');
      expect(result.city).toBe('beijing');
    });
  });

  describe('upsert()', () => {
    it('calls prisma.upsert with correct data', async () => {
      prisma.userPreference.upsert.mockResolvedValue({ userId: 'u1', city: 'shanghai' });
      await service.upsert({ userId: 'u1', city: 'shanghai' });
      expect(prisma.userPreference.upsert).toHaveBeenCalled();
    });

    it('serializes favorites array to JSON', async () => {
      prisma.userPreference.upsert.mockResolvedValue({});
      await service.upsert({ userId: 'u1', favorites: ['a', 'b'] });
      const call = prisma.userPreference.upsert.mock.calls[0][0];
      expect(call.update.favorites).toBe('["a","b"]');
    });
  });

  describe('getFavorites()', () => {
    it('returns parsed array', () => {
      const favs = service.getFavorites('u1');
      // getFavorites is async via prisma but uses a cached get() here
      // mock needs both methods
      prisma.userPreference.findUnique.mockResolvedValue({ favorites: '["a","b"]' });
      return expect(favs).resolves.toEqual(['a', 'b']);
    });

    it('returns [] when no prefs', async () => {
      prisma.userPreference.findUnique.mockResolvedValue(null);
      const favs = await service.getFavorites('u1');
      expect(favs).toEqual([]);
    });
  });

  describe('addFavorite()', () => {
    it('adds new species to favorites', async () => {
      prisma.userPreference.findUnique.mockResolvedValue({ favorites: '["a"]' });
      prisma.userPreference.upsert.mockResolvedValue({});
      const result = await service.addFavorite('u1', 'b');
      expect(result).toEqual(['a', 'b']);
    });

    it('no-op if already in favorites', async () => {
      prisma.userPreference.findUnique.mockResolvedValue({ favorites: '["a","b"]' });
      const result = await service.addFavorite('u1', 'a');
      expect(result).toEqual(['a', 'b']);
      // 不应调用 upsert
      expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
    });
  });

  describe('removeFavorite()', () => {
    it('removes species from favorites', async () => {
      prisma.userPreference.findUnique.mockResolvedValue({ favorites: '["a","b","c"]' });
      prisma.userPreference.upsert.mockResolvedValue({});
      const result = await service.removeFavorite('u1', 'b');
      expect(result).toEqual(['a', 'c']);
    });
  });
});