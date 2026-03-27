const { ProductTypeService } = require('../../../services/ProductTypeService');

describe('ProductTypeService', () => {
  let service;
  let mockRepo;
  let mockLogger;

  beforeEach(() => {
    mockRepo = {
      findByOrg: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    service = new ProductTypeService(mockRepo, mockLogger);
  });

  describe('createType', () => {
    test('creates type when SKU is unique', async () => {
      mockRepo.findBySku.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ product_type_id: 'pt-1', sku: 'HARINA-001' });
      const result = await service.createType({ sku: 'HARINA-001', name: 'Harina', product_type: 'raw_material', unit: 'kg' }, 'org-1');
      expect(result.product_type_id).toBe('pt-1');
    });

    test('throws 409 when SKU already exists', async () => {
      mockRepo.findBySku.mockResolvedValue({ product_type_id: 'existing' });
      await expect(service.createType({ sku: 'HARINA-001', name: 'Harina', product_type: 'raw_material', unit: 'kg' }, 'org-1'))
        .rejects.toMatchObject({ status: 409 });
    });

    test('throws when required fields missing', async () => {
      await expect(service.createType({ name: 'Harina' }, 'org-1'))
        .rejects.toThrow();
    });
  });

  describe('deleteType', () => {
    test('throws 404 when type not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.deleteType('pt-missing', 'org-1'))
        .rejects.toMatchObject({ status: 404 });
    });

    test('throws 409 with lot_count when lots still exist', async () => {
      mockRepo.findById.mockResolvedValue({ product_type_id: 'pt-1' });
      mockRepo.client = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockRepo.client.eq.mockResolvedValue({ data: [{ lot_id: 'l1' }, { lot_id: 'l2' }], error: null });
      await expect(service.deleteType('pt-1', 'org-1'))
        .rejects.toMatchObject({ status: 409, lot_count: 2 });
    });
  });
});
