// backend/tests/unit/services/PurchaseOrderService.unit.test.js
const PurchaseOrderService = require('../../../services/PurchaseOrderService');

describe('PurchaseOrderService.receivePurchaseOrder', () => {
  let service;
  let mockPoRepo, mockDetailRepo, mockSupplierRepo, mockTypeRepo,
      mockWarehouseRepo, mockStockRepo, mockLotRepo, mockLogger;

  const ORG = 'org-1';
  const PO_ID = 'po-1';
  const WAREHOUSE_ID = 'wh-1';

  beforeEach(() => {
    mockPoRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockDetailRepo = {
      findByPurchaseOrderId: jest.fn(),
      updateReceivedQuantityAndLot: jest.fn(),
    };
    mockSupplierRepo = { findById: jest.fn() };
    mockTypeRepo = { findById: jest.fn() };
    mockWarehouseRepo = { findById: jest.fn() };
    mockStockRepo = {
      create: jest.fn(),
      delete: jest.fn(),
    };
    mockLotRepo = {
      findById: jest.fn(),
      findByLotNumber: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

    service = new PurchaseOrderService(
      mockPoRepo, mockDetailRepo, mockSupplierRepo, mockTypeRepo,
      mockWarehouseRepo, mockStockRepo, mockLogger, mockLotRepo
    );
  });

  const makePo = (status = 'approved') => ({
    purchase_order_id: PO_ID,
    warehouse_id: WAREHOUSE_ID,
    status,
    purchase_order_number: 'OC-0001',
    organization_id: ORG,
  });

  const makeDetail = (overrides = {}) => ({
    detail_id: 'det-1',
    purchase_order_id: PO_ID,
    product_type_id: 'pt-1',
    quantity: 10,
    received_quantity: 0,
    unit_price: 100,
    lot_id: null,
    organization_id: ORG,
    ...overrides,
  });

  describe('validations', () => {
    test('throws 404 when PO not found', async () => {
      mockPoRepo.findById.mockResolvedValue(null);
      await expect(service.receivePurchaseOrder(PO_ID, [], ORG))
        .rejects.toMatchObject({ status: 404 });
    });

    test('throws 409 when PO is not approved or partially_received', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo('draft'));
      await expect(service.receivePurchaseOrder(PO_ID, [], ORG))
        .rejects.toMatchObject({ status: 409 });
    });

    test('throws 400 on duplicate detail_id in payload', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      const lines = [
        { detail_id: 'det-1', received_quantity: 5, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } },
        { detail_id: 'det-1', received_quantity: 3, lot: { mode: 'new', lot_number: 'L2', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } },
      ];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 400 });
    });

    test('throws 400 when detail_id does not belong to PO', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      const lines = [{ detail_id: 'unknown-det', received_quantity: 5, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 400 });
    });

    test('throws 400 when received_quantity is zero', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      const lines = [{ detail_id: 'det-1', received_quantity: 0, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 400 });
    });

    test('throws 400 when received_quantity exceeds remaining', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail({ received_quantity: 8 })]);
      const lines = [{ detail_id: 'det-1', received_quantity: 5, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 400 });
    });

    test('throws 409 when new lot_number already exists in org', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      mockLotRepo.findByLotNumber.mockResolvedValue({ lot_id: 'existing-lot' });
      const lines = [{ detail_id: 'det-1', received_quantity: 5, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 409 });
    });

    test('throws 404 when existing lot not found or wrong product_type_id', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      mockLotRepo.findById.mockResolvedValue({ lot_id: 'lot-1', product_type_id: 'WRONG-TYPE' });
      const lines = [{ detail_id: 'det-1', received_quantity: 5, lot: { mode: 'existing', lot_id: 'lot-1' } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  describe('happy path', () => {
    test('creates new lot, stock movement, updates detail, sets status=received when all complete', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId
        .mockResolvedValueOnce([makeDetail()])
        .mockResolvedValueOnce([makeDetail({ received_quantity: 10 })]);
      mockLotRepo.findByLotNumber.mockResolvedValue(null);
      mockLotRepo.create.mockResolvedValue({ lot_id: 'new-lot-1' });
      mockStockRepo.create.mockResolvedValue({ movement_id: 'mov-1' });
      mockDetailRepo.updateReceivedQuantityAndLot.mockResolvedValue({});
      mockPoRepo.updateStatus.mockResolvedValue({});
      mockPoRepo.findById.mockResolvedValueOnce(makePo('received'));

      const lines = [{
        detail_id: 'det-1',
        received_quantity: 10,
        lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 },
      }];

      await service.receivePurchaseOrder(PO_ID, lines, ORG);

      expect(mockLotRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lot_number: 'L1', product_type_id: 'pt-1' }),
        ORG
      );
      expect(mockStockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lot_id: 'new-lot-1', warehouse_id: WAREHOUSE_ID, movement_type: 'entry', quantity: 10 })
      );
      expect(mockDetailRepo.updateReceivedQuantityAndLot).toHaveBeenCalledWith('det-1', 10, 'new-lot-1', ORG);
      expect(mockPoRepo.updateStatus).toHaveBeenCalledWith(PO_ID, 'received', ORG, expect.any(String));
    });

    test('sets status=partially_received when not all lines complete', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      const details = [makeDetail(), makeDetail({ detail_id: 'det-2', received_quantity: 0 })];
      mockDetailRepo.findByPurchaseOrderId
        .mockResolvedValueOnce(details)
        .mockResolvedValueOnce([makeDetail({ received_quantity: 5 }), makeDetail({ detail_id: 'det-2', received_quantity: 0 })]);
      mockLotRepo.findByLotNumber.mockResolvedValue(null);
      mockLotRepo.create.mockResolvedValue({ lot_id: 'new-lot-1' });
      mockStockRepo.create.mockResolvedValue({ movement_id: 'mov-1' });
      mockDetailRepo.updateReceivedQuantityAndLot.mockResolvedValue({});
      mockPoRepo.updateStatus.mockResolvedValue({});
      mockPoRepo.findById.mockResolvedValueOnce(makePo('partially_received'));

      const lines = [{
        detail_id: 'det-1',
        received_quantity: 5,
        lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 },
      }];

      await service.receivePurchaseOrder(PO_ID, lines, ORG);
      expect(mockPoRepo.updateStatus).toHaveBeenCalledWith(PO_ID, 'partially_received', ORG, null);
    });

    test('skips lot creation when detail already has lot_id', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo('partially_received'));
      mockDetailRepo.findByPurchaseOrderId
        .mockResolvedValueOnce([makeDetail({ received_quantity: 5, lot_id: 'existing-lot-1' })])
        .mockResolvedValueOnce([makeDetail({ received_quantity: 10, lot_id: 'existing-lot-1' })]);
      mockStockRepo.create.mockResolvedValue({ movement_id: 'mov-1' });
      mockDetailRepo.updateReceivedQuantityAndLot.mockResolvedValue({});
      mockPoRepo.updateStatus.mockResolvedValue({});
      mockPoRepo.findById.mockResolvedValueOnce(makePo('received'));

      const lines = [{ detail_id: 'det-1', received_quantity: 5 }];

      await service.receivePurchaseOrder(PO_ID, lines, ORG);
      expect(mockLotRepo.create).not.toHaveBeenCalled();
      expect(mockStockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lot_id: 'existing-lot-1' })
      );
    });

    test('compensating rollback deletes inserted lot and movement on error', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      mockLotRepo.findByLotNumber.mockResolvedValue(null);
      mockLotRepo.create.mockResolvedValue({ lot_id: 'new-lot-1' });
      mockStockRepo.create.mockRejectedValue(new Error('DB error'));
      mockLotRepo.delete.mockResolvedValue({});

      const lines = [{
        detail_id: 'det-1',
        received_quantity: 5,
        lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 },
      }];

      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG)).rejects.toThrow('DB error');
      expect(mockLotRepo.delete).toHaveBeenCalledWith('new-lot-1', ORG);
    });
  });
});
