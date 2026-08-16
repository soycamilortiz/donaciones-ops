import { ConfigService } from '@nestjs/config';
import { OpenFoodFactsService } from './open-food-facts.service';

describe('OpenFoodFactsService', () => {
  const config = {
    get: jest.fn((key: string) => {
      const map: Record<string, unknown> = {
        OPEN_FOOD_FACTS_ENABLED: true,
        OPEN_FOOD_FACTS_BASE_URL: 'https://world.openfoodfacts.org',
        OPEN_FOOD_FACTS_USER_AGENT: 'SOSChoco/1.0 (test@local)',
        OPEN_FOOD_FACTS_TIMEOUT_MS: 8000,
      };
      return map[key];
    }),
  };

  const service = new OpenFoodFactsService(config as unknown as ConfigService);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mapea un producto encontrado', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          code: '3017620422003',
          product_name_es: 'Nutella',
          brands: 'Ferrero',
          image_url: 'https://images.openfoodfacts.org/n.jpg',
        },
      }),
    } as Response);

    const r = await service.buscarPorEan('3017620422003');
    expect(r?.nombre).toBe('Nutella');
    expect(r?.marca).toBe('Ferrero');
  });

  it('devuelve null si el producto no existe', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 0 }),
    } as Response);

    await expect(service.buscarPorEan('0000000000000')).resolves.toBeNull();
  });
});
