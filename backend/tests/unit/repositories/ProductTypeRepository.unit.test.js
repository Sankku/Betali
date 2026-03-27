const { ProductTypeRepository } = require('../../../repositories/ProductTypeRepository');

describe('ProductTypeRepository', () => {
  let repo;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn(),
      ilike: jest.fn().mockReturnThis(),
    };
    repo = new ProductTypeRepository(mockClient);
  });

  test('constructor sets table to product_types', () => {
    expect(repo.table).toBe('product_types');
  });

  test('findBySku returns type when found', async () => {
    mockClient.single.mockResolvedValue({ data: { product_type_id: 'pt-1', sku: 'HARINA-001' }, error: null });
    const result = await repo.findBySku('HARINA-001', 'org-1');
    expect(result).toEqual({ product_type_id: 'pt-1', sku: 'HARINA-001' });
  });

  test('findByOrg returns array', async () => {
    repo.findAll = jest.fn().mockResolvedValue([{ product_type_id: 'pt-1' }]);
    const result = await repo.findByOrg('org-1');
    expect(repo.findAll).toHaveBeenCalledWith({ organization_id: 'org-1' }, {});
    expect(result).toHaveLength(1);
  });

  test('findByOrg throws when organizationId is missing', async () => {
    await expect(repo.findByOrg(undefined)).rejects.toThrow('organizationId is required');
  });

  test('findById returns type when found', async () => {
    mockClient.single.mockResolvedValue({ data: { product_type_id: 'pt-1', name: 'Harina' }, error: null });
    const result = await repo.findById('pt-1', 'org-1');
    expect(result).toEqual({ product_type_id: 'pt-1', name: 'Harina' });
  });

  test('findById returns null when not found (PGRST116)', async () => {
    mockClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } });
    const result = await repo.findById('missing', 'org-1');
    expect(result).toBeNull();
  });

  test('findById throws when organizationId is missing', async () => {
    await expect(repo.findById('pt-1', undefined)).rejects.toThrow('organizationId is required');
  });

  test('search returns matching types', async () => {
    mockClient.or.mockResolvedValue({ data: [{ product_type_id: 'pt-1', name: 'Harina' }], error: null });
    const result = await repo.search('harina', 'org-1');
    expect(result).toHaveLength(1);
  });
});
