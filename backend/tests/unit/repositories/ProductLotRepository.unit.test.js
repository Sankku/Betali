// backend/tests/unit/repositories/ProductLotRepository.unit.test.js
const { ProductLotRepository } = require('../../../repositories/ProductLotRepository');

describe('ProductLotRepository', () => {
  let repo;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    repo = new ProductLotRepository(mockClient);
  });

  test('constructor sets table to product_lots', () => {
    expect(repo.table).toBe('product_lots');
  });

  test('findByLotNumber returns lot when found', async () => {
    mockClient.single.mockResolvedValue({ data: { lot_id: 'lot-1', lot_number: 'LOT-001' }, error: null });
    const result = await repo.findByLotNumber('LOT-001', 'org-1');
    expect(result).toEqual({ lot_id: 'lot-1', lot_number: 'LOT-001' });
  });

  test('findByLotNumber returns null when not found (PGRST116)', async () => {
    mockClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } });
    const result = await repo.findByLotNumber('MISSING', 'org-1');
    expect(result).toBeNull();
  });

  test('findByOrg throws when organizationId is missing', async () => {
    await expect(repo.findByOrg(undefined)).rejects.toThrow('organizationId is required');
  });

  test('findForFefo returns empty array when no lots found', async () => {
    mockClient.order.mockResolvedValue({ data: [], error: null });
    const result = await repo.findForFefo('pt-1', 'org-1');
    expect(result).toEqual([]);
  });

  test('findForFefo returns lots ordered by expiration_date', async () => {
    const lots = [
      { lot_id: 'lot-1', expiration_date: '2026-06-01' },
      { lot_id: 'lot-2', expiration_date: '2026-12-01' },
    ];
    mockClient.order.mockResolvedValue({ data: lots, error: null });
    const result = await repo.findForFefo('pt-1', 'org-1');
    expect(result).toHaveLength(2);
    expect(result[0].lot_id).toBe('lot-1');
  });
});
