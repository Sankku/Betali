const { ProductLotService } = require('../../../services/ProductLotService');

describe('ProductLotService', () => {
  let service;
  let mockLotRepo;
  let mockTypeRepo;
  let mockStockMovementRepo;
  let mockWarehouseRepo;
  let mockLogger;

  beforeEach(() => {
    mockLotRepo = {
      findByType: jest.fn(),
      findById: jest.fn(),
      findByLotNumber: jest.fn(),
      findForFefo: jest.fn(),
      findExpiringByOrg: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockTypeRepo = { findById: jest.fn() };
    mockStockMovementRepo = { getCurrentStock: jest.fn() };
    mockWarehouseRepo = { findByOrganizationId: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    service = new ProductLotService(mockLotRepo, mockTypeRepo, mockStockMovementRepo, mockWarehouseRepo, mockLogger);
  });

  describe('fefoAssignLot', () => {
    test('returns earliest non-expired lot with sufficient stock', async () => {
      mockLotRepo.findForFefo.mockResolvedValue([
        { lot_id: 'lot-1', expiration_date: '2026-06-01' },
        { lot_id: 'lot-2', expiration_date: '2026-12-01' },
      ]);
      mockStockMovementRepo.getCurrentStock
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20);
      const result = await service.fefoAssignLot('pt-1', 'wh-1', 5, 'org-1');
      expect(result.lot_id).toBe('lot-1');
      expect(result.partial).toBe(false);
    });

    test('skips lots with insufficient stock and picks next', async () => {
      mockLotRepo.findForFefo.mockResolvedValue([
        { lot_id: 'lot-1', expiration_date: '2026-06-01' },
        { lot_id: 'lot-2', expiration_date: '2026-12-01' },
      ]);
      mockStockMovementRepo.getCurrentStock
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(20);
      const result = await service.fefoAssignLot('pt-1', 'wh-1', 5, 'org-1');
      expect(result.lot_id).toBe('lot-2');
    });

    test('returns partial flag when no lot has enough', async () => {
      mockLotRepo.findForFefo.mockResolvedValue([
        { lot_id: 'lot-1', expiration_date: '2026-06-01' },
      ]);
      mockStockMovementRepo.getCurrentStock.mockResolvedValue(2);
      const result = await service.fefoAssignLot('pt-1', 'wh-1', 10, 'org-1');
      expect(result.partial).toBe(true);
      expect(result.lot_id).toBe('lot-1');
    });

    test('throws 422 when no lots available at all', async () => {
      mockLotRepo.findForFefo.mockResolvedValue([]);
      await expect(service.fefoAssignLot('pt-1', 'wh-1', 5, 'org-1'))
        .rejects.toMatchObject({ status: 422, code: 'no_lot_available' });
    });
  });

  describe('createLot', () => {
    test('throws when lot_number already exists in org', async () => {
      mockTypeRepo.findById.mockResolvedValue({ product_type_id: 'pt-1' });
      mockLotRepo.findByLotNumber.mockResolvedValue({ lot_id: 'existing' });
      await expect(service.createLot({ lot_number: 'LOT-001', expiration_date: '2027-01-01', price: 100 }, 'pt-1', 'org-1'))
        .rejects.toMatchObject({ status: 409 });
    });
  });
});
