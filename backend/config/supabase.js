const { Logger } = require('../utils/Logger');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Need to define SUPABASE_URL & SUPABASE_SERVICE_KEY this variables are required.');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Class to manage requests to bbdd
 */
class DatabaseManager {
  constructor() {
    this.supabase = supabase;
  }

  /**
   * Get all the records from a table 
   * @param {string} table - The name of the table
   * @param {string} userField - Field to filter by user (optional)
   * @param {string} userId - Identificator of the user (optional)
   * @returns {Promise<Array>}
   */
  async getAll(table, userField = null, userId = null) {
    try {
      let query = this.supabase.from(table).select('*');
      
      if (userField && userId) {
        query = query.eq(userField, userId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        Logger(`Error to get data of ${table}:`, error.message);
        throw new Error(`Error while getting data: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      Logger(`Error in getAll to ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Get a record by ID
   * @param {string} table - The name of the table 
   * @param {string} idField - Field ID
   * @param {string} id - Value ID
   * @returns {Promise<Object|null>}
   */
  async getById(table, idField, id) {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .eq(idField, id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        Logger(`Error to get ${table} by ID:`, error.message);
        throw new Error(`Error while getting a record: ${error.message}`);
      }
      
      return data || null;
    } catch (error) {
      Logger(`Error in getById ptoara ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new record 
   * @param {string} table - The table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>}
   */
  async create(table, data) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert([data])
        .select()
        .single();
      
      if (error) {
        Logger(`Error while create a record in ${table}:`, error.message);
        throw new Error(`Error creating a record: ${error.message}`);
      }
      
      return result;
    } catch (error) {
      Logger(`Error in create ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Update a record
   * @param {string} table - The table name
   * @param {string} idField - Field ID
   * @param {string} id - Value  ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>}
   */
  async update(table, idField, id, data) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq(idField, id)
        .select()
        .single();
      
      if (error) {
        Logger(`Error to update ${table}:`, error.message);
        throw new Error(`Error updating a record: ${error.message}`);
      }
      
      return result;
    } catch (error) {
      Logger(`Error in update to ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a record (soft delete setting as inactive)
   * @param {string} table - The name of the table
   * @param {string} idField - Field ID
   * @param {string} id - Value ID
   * @returns {Promise<Object>}
   */
  async softDelete(table, idField, id) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq(idField, id)
        .select()
        .single();
      
      if (error) {
        Logger(`Error while unactivate ${table}:`, error.message);
        throw new Error(`Error to unactivate a record: ${error.message}`);
      }
      
      return result;
    } catch (error) {
      Logger(`Error in softDelete to ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Hard delete a record
   * @param {string} table - The name of the table
   * @param {string} idField - Field ID
   * @param {string} id - Value ID
   * @returns {Promise<Object>}
   */
  async hardDelete(table, idField, id) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .delete()
        .eq(idField, id)
        .select()
        .single();
      
      if (error) {
        Logger(`Error while deleting ${table}:`, error.message);
        throw new Error(`Error to delete a record: ${error.message}`);
      }
      
      return result;
    } catch (error) {
      Logger(`Error in hardDelete to ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if exist associatted movements to a warehouse
   * @param {string} warehouseId - ID of the warehouse
   * @returns {Promise<boolean>}
   */
  async hasStockMovements(warehouseId) {
    try {
      const { count, error } = await this.supabase
        .from('stock_movements')
        .select('movement_id', { count: 'exact', head: true })
        .eq('warehouse_id', warehouseId);
      
      if (error) {
        Logger('Error to check stock movements:', error.message);
        throw new Error(`Error to check movements: ${error.message}`);
      }
      
      return (count || 0) > 0;
    } catch (error) {
      Logger('Error in hasStockMovements:', error.message);
      throw error;
    }
  }

  /**
   * Get statistics of a warehouse
   * @param {string} warehouseId - ID of the Warehouse
   * @returns {Promise<Object>}
   */
  async getWarehouseStats(warehouseId) {
    try {
      const { count: movementsCount, error: movError } = await this.supabase
        .from('stock_movements')
        .select('movement_id', { count: 'exact', head: true })
        .eq('warehouse_id', warehouseId);

      if (movError) {
        Logger('Error counting movements:', movError.message);
      }

      const { data: recentMovements, error: recentError } = await this.supabase
        .from('stock_movements')
        .select(`
          movement_id,
          movement_date,
          movement_type,
          quantity,
          products(name)
        `)
        .eq('warehouse_id', warehouseId)
        .order('movement_date', { ascending: false })
        .limit(5);

      if (recentError) {
        Logger('Error to get recent movements', recentError.message);
      }

      return {
        totalMovements: movementsCount || 0,
        recentMovements: recentMovements || []
      };
    } catch (error) {
      Logger('Error in getWarehouseStats:', error.message);
      throw error;
    }
  }
}

const db = new DatabaseManager();

module.exports = { 
  supabase, 
  db 
};