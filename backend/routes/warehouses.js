const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const { db } = require('../config/supabase');

const router = express.Router();

router.use(authenticateUser);

/**
 * GET /api/warehouses
 * Get all warehouses for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    console.log(`Fetching warehouses for user: ${req.user.id}`);
    
    const warehouses = await db.getAll('warehouse', 'user_id', req.user.id);
    
    const warehousesWithStats = await Promise.all(
      warehouses.map(async (warehouse) => {
        try {
          const stats = await db.getWarehouseStats(warehouse.warehouse_id);
          return {
            ...warehouse,
            stats
          };
        } catch (error) {
          console.error(`Error fetching stats for warehouse ${warehouse.warehouse_id}:`, error.message);
          return {
            ...warehouse,
            stats: { totalMovements: 0, recentMovements: [] }
          };
        }
      })
    );
    
    res.json(warehousesWithStats);
  } catch (error) {
    console.error('Error fetching warehouses:', error.message);
    res.status(500).json({ 
      error: 'Error fetching warehouses',
      message: error.message 
    });
  }
});

/**
 * GET /api/warehouses/:id
 * Get a specific warehouse by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching warehouse ${id} for user: ${req.user.id}`);
    
    const warehouse = await db.getById('warehouse', 'warehouse_id', id);
    
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    if (warehouse.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to access this warehouse' });
    }
    
    const stats = await db.getWarehouseStats(warehouse.warehouse_id);
    
    res.json({
      ...warehouse,
      stats
    });
  } catch (error) {
    console.error('Error fetching warehouse:', error.message);
    res.status(500).json({ 
      error: 'Error fetching warehouse',
      message: error.message 
    });
  }
});

/**
 * POST /api/warehouses
 * Create a new warehouse
 */
router.post('/', async (req, res) => {
  try {
    const { name, location } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Warehouse name is required' });
    }
    
    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'Warehouse location is required' });
    }
    
    const existingWarehouses = await db.getAll('warehouse', 'user_id', req.user.id);
    const nameExists = existingWarehouses.some(
      w => w.name.toLowerCase().trim() === name.toLowerCase().trim() && w.is_active
    );
    
    if (nameExists) {
      return res.status(400).json({ 
        error: 'An active warehouse with that name already exists' 
      });
    }
    
    const warehouseData = {
      name: name.trim(),
      location: location.trim(),
      user_id: req.user.id,
      owner_id: req.user.id, 
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log(`Creating warehouse for user ${req.user.id}:`, warehouseData);
    
    const newWarehouse = await db.create('warehouse', warehouseData);
    
    res.status(201).json({
      message: 'Warehouse successfully created',
      warehouse: newWarehouse
    });
  } catch (error) {
    console.error('Error creating warehouse:', error.message);
    res.status(500).json({ 
      error: 'Error creating warehouse',
      message: error.message 
    });
  }
});

/**
 * PUT /api/warehouses/:id
 * Update an existing warehouse
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, is_active } = req.body;
    
    // Basic validations
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Warehouse name is required' });
    }
    
    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'Warehouse location is required' });
    }
    
    // Check that warehouse exists and belongs to the user
    const existingWarehouse = await db.getById('warehouse', 'warehouse_id', id);
    
    if (!existingWarehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    if (existingWarehouse.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to update this warehouse' });
    }
    
    // Ensure unique name (excluding current warehouse)
    const existingWarehouses = await db.getAll('warehouse', 'user_id', req.user.id);
    const nameExists = existingWarehouses.some(
      w => w.warehouse_id !== id && 
           w.name.toLowerCase().trim() === name.toLowerCase().trim() && 
           w.is_active
    );
    
    if (nameExists) {
      return res.status(400).json({ 
        error: 'Another active warehouse with that name already exists' 
      });
    }
    
    // If deactivating, ensure no stock movements
    if (is_active === false && existingWarehouse.is_active === true) {
      const hasMovements = await db.hasStockMovements(id);
      if (hasMovements) {
        return res.status(400).json({ 
          error: 'Cannot deactivate a warehouse with associated stock movements' 
        });
      }
    }
    
    // Prepare update data
    const updateData = {
      name: name.trim(),
      location: location.trim()
    };
    
    // Only update is_active if provided
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active;
    }
    
    console.log(`Updating warehouse ${id}:`, updateData);
    
    const updatedWarehouse = await db.update('warehouse', 'warehouse_id', id, updateData);
    
    res.json({
      message: 'Warehouse successfully updated',
      warehouse: updatedWarehouse
    });
  } catch (error) {
    console.error('Error updating warehouse:', error.message);
    res.status(500).json({ 
      error: 'Error updating warehouse',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/warehouses/:id
 * Deactivate (soft delete) a warehouse
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingWarehouse = await db.getById('warehouse', 'warehouse_id', id);
    
    if (!existingWarehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    if (existingWarehouse.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this warehouse' });
    }
    
    const hasMovements = await db.hasStockMovements(id);
    if (hasMovements) {
      return res.status(400).json({ 
        error: 'Cannot delete a warehouse with stock movements. Consider deactivating instead.' 
      });
    }
    
    console.log(`Deactivating warehouse ${id} for user ${req.user.id}`);
    
    const deactivatedWarehouse = await db.softDelete('warehouse', 'warehouse_id', id);
    
    res.json({
      message: 'Warehouse successfully deactivated',
      warehouse: deactivatedWarehouse
    });
  } catch (error) {
    console.error('Error deactivating warehouse:', error.message);
    res.status(500).json({ 
      error: 'Error deactivating warehouse',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/warehouses/:id/permanent
 * Permanently delete a warehouse (use with caution)
 */
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingWarehouse = await db.getById('warehouse', 'warehouse_id', id);
    
    if (!existingWarehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    if (existingWarehouse.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You dont have permission to delete this warehouse' });
    }
    
    const hasMovements = await db.hasStockMovements(id);
    if (hasMovements) {
      return res.status(400).json({ 
        error: 'You cant delete a warehouse that have movements associated' 
      });
    }
    
    const deletedWarehouse = await db.hardDelete('warehouse', 'warehouse_id', id);
    
    res.json({
      message: 'Warehouse deleted permanently',
      warehouse: deletedWarehouse
    });
  } catch (error) {
    console.error('Error while deleting a warehouse:', error.message);
    res.status(500).json({ 
      error: 'Error deleting a warehouse',
      message: error.message 
    });
  }
});

/**
 * GET /api/warehouses/:id/movements
 * get stock movements for an specific warehouse
 */
router.get('/:id/movements', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const warehouse = await db.getById('warehouse', 'warehouse_id', id);
    
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    if (warehouse.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You dont have permission to do this' });
    }
    
    const { data: movements, error } = await db.supabase
      .from('stock_movements')
      .select(`
        movement_id,
        movement_date,
        movement_type,
        quantity,
        reference,
        created_at,
        products(
          product_id,
          name,
          batch_number
        )
      `)
      .eq('warehouse_id', id)
      .order('movement_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Error to get movements: ${error.message}`);
    }
    
    res.json({
      movements: movements || [],
      warehouse_id: id,
      warehouse_name: warehouse.name
    });
  } catch (error) {
    console.error('Error while getting movements of a warehouse:', error.message);
    res.status(500).json({ 
      error: 'Error getting movements',
      message: error.message 
    });
  }
});

module.exports = router;