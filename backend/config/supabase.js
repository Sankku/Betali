const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Se requieren las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Utility db functions
 */
const db = {

  async getAll(table, filterField = null, filterValue = null) {
    let query = supabase.from(table).select('*');
    
    if (filterField && filterValue !== null && filterValue !== undefined) {
      query = query.eq(filterField, filterValue);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error al obtener registros de ${table}:`, error);
      throw error;
    }
    
    return data || [];
  },
  
  /**
   * Get register by id
   */
  async getById(table, idField, id) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(idField, id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 this is when no register was found
      console.error(`Error al obtener registro de ${table} con ${idField}=${id}:`, error);
      throw error;
    }
    
    return data;
  },
  
  async create(table, data) {
    const { data: newRecord, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) {
      console.error(`Error al crear registro en ${table}:`, error);
      throw error;
    }
    
    return newRecord;
  },

  async update(table, idField, id, data) {
    const { data: updatedRecord, error } = await supabase
      .from(table)
      .update(data)
      .eq(idField, id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error al actualizar registro en ${table} con ${idField}=${id}:`, error);
      throw error;
    }
    
    return updatedRecord;
  },
  
  async delete(table, idField, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idField, id);
    
    if (error) {
      console.error(`Error al eliminar registro de ${table} con ${idField}=${id}:`, error);
      throw error;
    }
    
    return { success: true };
  }
};

module.exports = { supabase, db };