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
    const lot = await this.lotRepo.create({
      origin_country: '',
      ...lotData,
      product_type_id: productTypeId,
      organization_id: organizationId,
    });

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

  async _runInChunks(ids, chunkSize, action) {
    const results = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      results.push(await action(chunk));
    }
    return results.flat();
  }

  async bulkDeleteLots(ids, organizationId) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids array is required and must not be empty');
      err.status = 400;
      throw err;
    }

    try {
      this.logger.info(`Bulk deleting ${ids.length} product lots in chunks`);

      // 1. Get lots to verify organization in chunks
      const existingData = await this._runInChunks(ids, 100, async (chunk) => {
        const { data, error } = await this.lotRepo.client
          .from(this.lotRepo.table)
          .select('lot_id, lot_number')
          .in('lot_id', chunk)
          .eq('organization_id', organizationId);
        if (error) throw error;
        return data || [];
      });

      const foundIds = existingData.map(l => l.lot_id);

      // 2. Check which lots have stock movements in chunks
      const movementsData = await this._runInChunks(foundIds, 100, async (chunk) => {
        const { data, error } = await this.stockRepo.client
          .from('stock_movements')
          .select('lot_id')
          .in('lot_id', chunk);
        if (error) throw error;
        return data || [];
      });

      const blockedIds = [...new Set(movementsData.map(m => m.lot_id))];
      const processableIds = foundIds.filter(id => !blockedIds.includes(id));

      if (processableIds.length > 0) {
        await this._runInChunks(processableIds, 100, async (chunk) => {
          const { error } = await this.lotRepo.client
            .from(this.lotRepo.table)
            .delete()
            .in('lot_id', chunk)
            .eq('organization_id', organizationId);
          if (error) throw error;
        });
      }

      return {
        deleted: processableIds.length,
        blocked: blockedIds.length,
        not_found: ids.length - foundIds.length,
        blocked_ids: blockedIds
      };
    } catch (error) {
      this.logger.error(`Error bulk deleting lots: ${error.message}`);
      throw error;
    }
  }

  async deleteLot(id, organizationId) {
    const existing = await this.lotRepo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product lot not found');
      err.status = 404;
      throw err;
    }

    const { count, error } = await this.stockRepo.client
      .from('stock_movements')
      .select('movement_id', { count: 'exact', head: true })
      .eq('lot_id', id);

    if (error) throw error;

    if (count > 0) {
      const err = new Error(`Cannot delete lot ${existing.lot_number} because it has associated stock movements`);
      err.status = 409;
      err.key = 'errors.product_lots.delete_blocked_by_movements';
      err.params = { lot_number: existing.lot_number };
      throw err;
    }

    await this.lotRepo.delete(id, 'lot_id');
    return true;
  }

  async fefoAssignLot(productTypeId, warehouseId, quantityNeeded, organizationId) {
    const lots = await this.lotRepo.findForFefo(productTypeId, organizationId);
    if (lots.length === 0) {
      const err = new Error('No available lots for this product type');
      err.status = 422;
      err.code = 'no_lot_available';
      throw err;
    }
    const lotIds = lots.map(l => l.lot_id);
    const stockMap = await this.stockRepo.getCurrentStockBulk(lotIds, warehouseId, organizationId);
    for (const lot of lots) {
      const stock = stockMap[lot.lot_id] ?? 0;
      if (stock > 0 && stock >= quantityNeeded) {
        return { lot_id: lot.lot_id, available_stock: stock, quantity_needed: quantityNeeded, partial: false };
      }
    }
    const firstLot = lots[0];
    const stock = stockMap[firstLot.lot_id] ?? 0;
    return { lot_id: firstLot.lot_id, available_stock: stock, quantity_needed: quantityNeeded, partial: true };
  }

  async fefoAssignMultiLot(productTypeId, warehouseId, quantityNeeded, organizationId) {
    const lots = await this.lotRepo.findForFefo(productTypeId, organizationId);
    if (lots.length === 0) {
      const err = new Error('No hay lotes disponibles para este tipo de producto');
      err.status = 422;
      err.code = 'no_lot_available';
      throw err;
    }
    const lotIds = lots.map(l => l.lot_id);
    const stockMap = await this.stockRepo.getCurrentStockBulk(lotIds, warehouseId, organizationId);
    const assignments = [];
    let remaining = quantityNeeded;
    let totalAvailable = 0;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const stock = stockMap[lot.lot_id] ?? 0;
      totalAvailable += stock;
      if (stock <= 0) continue;
      const take = Math.min(stock, remaining);
      assignments.push({ lot_id: lot.lot_id, quantity: take });
      remaining -= take;
    }
    if (remaining > 0) {
      const err = new Error(`Stock insuficiente para completar el pedido. Disponible: ${totalAvailable}, Solicitado: ${quantityNeeded}`);
      err.status = 422;
      err.code = 'insufficient_stock';
      throw err;
    }
    return { assignments, total_available: totalAvailable };
  }

  async bulkImport(rows, userId, organizationId) {
    const today = new Date().toISOString().split('T')[0];
    const supabase = this.lotRepo.client;

    // Pre-load warehouses, existing product types, and existing lots into memory
    const warehouses = await this.warehouseRepo.findByOrganizationId(organizationId);
    const warehouseMap = new Map(warehouses.map(w => [w.name.toLowerCase().trim(), w.warehouse_id]));

    const { data: existingTypes, error: typesError } = await supabase
      .from('product_types').select('product_type_id, sku').eq('organization_id', organizationId);
    if (typesError) throw typesError;
    const typeCache = new Map((existingTypes || []).map(t => [t.sku, t]));

    const { data: existingLots, error: lotsError } = await supabase
      .from('product_lots').select('lot_id, lot_number').eq('organization_id', organizationId);
    if (lotsError) throw lotsError;
    const lotCache = new Map((existingLots || []).map(l => [l.lot_number, l]));

    // Auto-generate lot_number when missing (initial load from systems without lot tracking)
    const normalizedRows = rows.map((row, i) => ({
      ...row,
      lot_number: row.lot_number?.trim() || `IMPORT-${(row.sku || '').toUpperCase()}-${today}-${i + 1}`,
    }));

    // Bulk create missing product types (one INSERT, deduplicated by SKU)
    const newSkuRows = [...new Map(
      normalizedRows.filter(r => r.sku && !typeCache.has(r.sku)).map(r => [r.sku, r])
    ).values()];

    if (newSkuRows.length > 0) {
      const { data: newTypes, error } = await supabase
        .from('product_types')
        .insert(newSkuRows.map(r => ({
          sku: r.sku, name: r.name, product_type: r.product_type,
          unit: r.unit, description: r.description || null, organization_id: organizationId,
        })))
        .select('product_type_id, sku');
      if (error) throw error;
      (newTypes || []).forEach(t => typeCache.set(t.sku, t));
    }

    // Classify rows into creates vs updates using the in-memory caches
    const toCreate = [], toUpdate = [], failed = [], stock_skipped = [];

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const type = typeCache.get(row.sku);
      if (!type) {
        failed.push({ row: i + 1, lot_number: row.lot_number, errors: [`SKU '${row.sku}' not found`] });
        continue;
      }
      const warehouseId = row.warehouse_name
        ? warehouseMap.get(row.warehouse_name.toLowerCase().trim()) : undefined;
      const existingLot = lotCache.get(row.lot_number);

      if (existingLot) {
        toUpdate.push({ ...row, lot_id: existingLot.lot_id, warehouseId });
      } else {
        toCreate.push({ ...row, product_type_id: type.product_type_id, warehouseId, rowNum: i + 1 });
      }
    }

    // Bulk insert new lots (one INSERT for all)
    const newLotByLotNumber = new Map();
    if (toCreate.length > 0) {
      const { data: newLots, error } = await supabase
        .from('product_lots')
        .insert(toCreate.map(r => ({
          lot_number: r.lot_number,
          product_type_id: r.product_type_id,
          expiration_date: r.expiration_date || null,
          price: parseFloat(r.price),
          origin_country: r.origin_country || null,
          organization_id: organizationId,
          warehouse_id: r.warehouseId || null,
        })))
        .select('lot_id, lot_number');
      if (error) throw error;
      (newLots || []).forEach(l => newLotByLotNumber.set(l.lot_number, l.lot_id));
    }

    // Update existing lots in parallel (no bulk update in Supabase)
    if (toUpdate.length > 0) {
      await Promise.all(toUpdate.map(r =>
        supabase.from('product_lots')
          .update({ expiration_date: r.expiration_date || null, price: parseFloat(r.price), origin_country: r.origin_country || null })
          .eq('lot_id', r.lot_id).eq('organization_id', organizationId)
      ));
    }

    // Bulk insert stock movements for new lots (one INSERT)
    const movements = [];
    for (const r of toCreate) {
      if (!r.initial_stock || parseInt(r.initial_stock) <= 0 || !r.warehouse_name) continue;
      const lot_id = newLotByLotNumber.get(r.lot_number);
      if (!r.warehouseId) {
        stock_skipped.push({ row: r.rowNum, lot_number: r.lot_number, reason: `Warehouse '${r.warehouse_name}' not found` });
        continue;
      }
      if (lot_id) {
        movements.push({
          lot_id, warehouse_id: r.warehouseId, organization_id: organizationId,
          movement_type: 'entry', quantity: parseInt(r.initial_stock),
          reference: `IMPORT-${today}`, created_by: userId,
        });
      }
    }

    if (movements.length > 0) {
      const { error } = await supabase.from('stock_movements').insert(movements);
      if (error) throw error;
    }

    this.logger.info(`Bulk import complete: ${toCreate.length} created, ${toUpdate.length} updated, ${failed.length} failed`);
    return { created: toCreate.length, updated: toUpdate.length, failed, stock_skipped };
  }
}

module.exports = { ProductLotService };
