const { Logger } = require('../utils/Logger');

class ProductLotService {
  constructor(productLotRepository, productTypeRepository, stockMovementRepository, warehouseRepository, logger) {
    this.lotRepo = productLotRepository;
    this.typeRepo = productTypeRepository;
    this.stockRepo = stockMovementRepository;
    this.warehouseRepo = warehouseRepository;
    this.logger = logger || new Logger('ProductLotService');
  }

  async getLotsByType(productTypeId, organizationId, options = {}) {
    const lots = await this.lotRepo.findByType(productTypeId, organizationId, options);
    if (!lots.length) return lots;

    const lotIds = lots.map(l => l.lot_id);
    const stockByLot = await this.stockRepo.getCurrentStockBulk(lotIds, null, organizationId);

    // Resolve warehouse names for lots that have a warehouse_id
    const warehouseIds = [...new Set(lots.map(l => l.warehouse_id).filter(Boolean))];
    let warehouseMap = {};
    if (warehouseIds.length > 0) {
      const { data: warehouses } = await this.lotRepo.client
        .from('warehouse')
        .select('warehouse_id, name')
        .in('warehouse_id', warehouseIds)
        .eq('organization_id', organizationId);
      if (warehouses) {
        warehouseMap = Object.fromEntries(warehouses.map(w => [w.warehouse_id, w.name]));
      }
    }

    return lots.map(lot => ({
      ...lot,
      current_stock: stockByLot[lot.lot_id] ?? 0,
      warehouse_name: lot.warehouse_id ? (warehouseMap[lot.warehouse_id] ?? null) : null,
    }));
  }

  /**
   * Returns non-expired lots for a product type with their stock in the given warehouse.
   * Used by the order form to allow manual lot selection.
   */
  async getAvailableLots(productTypeId, warehouseId, organizationId) {
    const now = new Date().toISOString();
    const { data: lots, error } = await this.lotRepo.client
      .from('product_lots')
      .select('lot_id, lot_number, expiration_date, sale_price')
      .eq('product_type_id', productTypeId)
      .eq('organization_id', organizationId)
      .or(`expiration_date.is.null,expiration_date.gt.${now}`)
      .order('expiration_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(`Error fetching lots: ${error.message}`);
    if (!lots || !lots.length) return [];

    const lotIds = lots.map(l => l.lot_id);
    const stockByLot = await this.stockRepo.getCurrentStockBulk(lotIds, warehouseId, organizationId);

    return lots
      .map(lot => ({ ...lot, available_stock: stockByLot[lot.lot_id] ?? 0 }))
      .filter(lot => lot.available_stock > 0);
  }

  async getLotById(id, organizationId) {
    const lot = await this.lotRepo.findById(id, organizationId);
    if (!lot) {
      const err = new Error('Product lot not found');
      err.status = 404;
      throw err;
    }
    return lot;
  }

  async createLot(data, productTypeId, organizationId) {
    const { lot_number, expiration_date, price, warehouse_id, initial_quantity } = data;
    if (!lot_number || !expiration_date || price == null) {
      const err = new Error('lot_number, expiration_date, and price are required');
      err.status = 400;
      throw err;
    }

    const type = await this.typeRepo.findById(productTypeId, organizationId);
    if (!type) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }

    const existing = await this.lotRepo.findByLotNumber(lot_number, organizationId);
    if (existing) {
      const err = new Error('A lot with this lot number already exists in your organization');
      err.status = 409;
      throw err;
    }

    const { initial_quantity: _iq, ...lotData } = data;
    const lot = await this.lotRepo.create({ ...lotData, product_type_id: productTypeId, organization_id: organizationId });

    // Create initial entry movement if quantity is provided
    if (warehouse_id && initial_quantity && initial_quantity > 0) {
      await this.stockRepo.create({
        organization_id: organizationId,
        lot_id: lot.lot_id,
        warehouse_id,
        movement_type: 'entry',
        quantity: initial_quantity,
        movement_date: new Date().toISOString(),
        reference: `Entrada inicial lote ${lot_number}`,
      });
    }

    return lot;
  }

  async updateLot(id, data, organizationId) {
    const existing = await this.lotRepo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product lot not found');
      err.status = 404;
      throw err;
    }
    return this.lotRepo.update(id, data, 'lot_id');
  }

  async deleteLot(id, organizationId) {
    const existing = await this.lotRepo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product lot not found');
      err.status = 404;
      throw err;
    }
    await this.lotRepo.delete(id, 'lot_id');
    return true;
  }

  /**
   * FEFO: Find the best lot for a given product type and quantity needed in a specific warehouse.
   * Only considers non-expired lots (filtered by ProductLotRepository.findForFefo).
   * Per-warehouse stock is checked via stockMovementRepository.getCurrentStock.
   * @returns {{ lot_id, available_stock, quantity_needed, partial }}
   */
  async fefoAssignLot(productTypeId, warehouseId, quantityNeeded, organizationId) {
    // findForFefo returns non-expired lots ordered by expiration_date ASC
    const lots = await this.lotRepo.findForFefo(productTypeId, organizationId);

    if (lots.length === 0) {
      const err = new Error('No available lots for this product type');
      err.status = 422;
      err.code = 'no_lot_available';
      throw err;
    }

    for (const lot of lots) {
      const stock = await this.stockRepo.getCurrentStock(lot.lot_id, warehouseId, organizationId);
      if (stock > 0 && stock >= quantityNeeded) {
        return { lot_id: lot.lot_id, available_stock: stock, quantity_needed: quantityNeeded, partial: false };
      }
    }

    // No single lot has enough — return earliest available with partial flag
    const firstLot = lots[0];
    const stock = await this.stockRepo.getCurrentStock(firstLot.lot_id, warehouseId, organizationId);
    return { lot_id: firstLot.lot_id, available_stock: stock, quantity_needed: quantityNeeded, partial: true };
  }

  /**
   * FEFO multi-lot assignment: distribute a quantity across multiple lots in FEFO order.
   * Returns an array of { lot_id, quantity } assignments summing to quantityNeeded.
   * Throws if there isn't enough total stock across all lots.
   * @returns {{ assignments: Array<{lot_id, quantity}>, total_available: number }}
   */
  async fefoAssignMultiLot(productTypeId, warehouseId, quantityNeeded, organizationId) {
    const lots = await this.lotRepo.findForFefo(productTypeId, organizationId);

    if (lots.length === 0) {
      const err = new Error('No hay lotes disponibles para este tipo de producto');
      err.status = 422;
      err.code = 'no_lot_available';
      throw err;
    }

    const assignments = [];
    let remaining = quantityNeeded;
    let totalAvailable = 0;

    for (const lot of lots) {
      if (remaining <= 0) break;
      const stock = await this.stockRepo.getCurrentStock(lot.lot_id, warehouseId, organizationId);
      totalAvailable += stock;
      if (stock <= 0) continue;

      const take = Math.min(stock, remaining);
      assignments.push({ lot_id: lot.lot_id, quantity: take });
      remaining -= take;
    }

    if (remaining > 0) {
      const err = new Error(
        `Stock insuficiente para completar el pedido. Disponible: ${totalAvailable}, Solicitado: ${quantityNeeded}`
      );
      err.status = 422;
      err.code = 'insufficient_stock';
      throw err;
    }

    return { assignments, total_available: totalAvailable };
  }

  async bulkImport(rows, userId, organizationId) {
    const warehouses = await this.warehouseRepo.findByOrganizationId(organizationId);
    const warehouseMap = new Map(warehouses.map(w => [w.name.toLowerCase().trim(), w.warehouse_id]));

    let created = 0, updated = 0;
    const failed = [], stock_skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        // Upsert product type by SKU
        let type = await this.typeRepo.findBySku(row.sku, organizationId);
        if (!type) {
          type = await this.typeRepo.create({
            sku: row.sku,
            name: row.name,
            product_type: row.product_type,
            unit: row.unit,
            description: row.description || null,
            organization_id: organizationId,
          });
        }

        // Upsert product lot by lot_number
        const existingLot = await this.lotRepo.findByLotNumber(row.lot_number, organizationId);
        let lot;
        if (existingLot) {
          lot = await this.lotRepo.update(existingLot.lot_id, {
            expiration_date: row.expiration_date,
            price: parseFloat(row.price),
            origin_country: row.origin_country,
          }, 'lot_id');
          updated++;
        } else {
          lot = await this.lotRepo.create({
            lot_number: row.lot_number,
            product_type_id: type.product_type_id,
            expiration_date: row.expiration_date,
            price: parseFloat(row.price),
            origin_country: row.origin_country,
            organization_id: organizationId,
          });
          created++;
        }

        // Resolve warehouse_id and persist it on the lot record
        const warehouseId = row.warehouse_name
          ? warehouseMap.get(row.warehouse_name.toLowerCase().trim())
          : undefined;
        if (warehouseId && !existingLot) {
          await this.lotRepo.update(lot.lot_id, { warehouse_id: warehouseId }, 'lot_id');
        }

        // Initial stock movement
        if (row.initial_stock && parseInt(row.initial_stock) > 0 && row.warehouse_name) {
          if (!warehouseId) {
            stock_skipped.push({ row: rowNum, lot_number: row.lot_number, reason: `Warehouse '${row.warehouse_name}' not found` });
          } else {
            await this.stockRepo.create({
              lot_id: lot.lot_id,
              warehouse_id: warehouseId,
              organization_id: organizationId,
              movement_type: 'entry',
              quantity: parseInt(row.initial_stock),
              reference: `IMPORT-${new Date().toISOString().split('T')[0]}`,
              created_by: userId,
            });
          }
        }
      } catch (err) {
        failed.push({ row: rowNum, lot_number: row.lot_number || null, errors: [err.message] });
      }
    }

    return { created, updated, failed, stock_skipped };
  }
}

module.exports = { ProductLotService };
