/**
 * Product business logic service
 * Handles business rules and validation
 */
class ProductService {
    constructor(productRepository, stockMovementRepository, stockReservationRepository, warehouseRepository, logger) {
      this.repository = productRepository;
      this.stockMovementRepository = stockMovementRepository;
      this.stockReservationRepository = stockReservationRepository;
      this.warehouseRepository = warehouseRepository;
      this.logger = logger;
    }

    /**
     * Get all products for an organization with current stock
     * @param {string} organizationId - Organization ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async getOrganizationProducts(organizationId, options = {}) {
      try {
        this.logger.info(`Fetching products for organization: ${organizationId}`);
        const products = await this.repository.findByOrganizationId(organizationId, options);

        // Get stock for all products
        if (products && products.length > 0) {
          const productIds = products.map(p => p.product_id);
          const stockByProduct = await this.stockMovementRepository.getCurrentStockBulk(
            productIds,
            null, // null = all warehouses
            organizationId
          );

          // Add stock to each product
          return products.map(product => ({
            ...product,
            current_stock: stockByProduct[product.product_id] || 0
          }));
        }

        return products;
      } catch (error) {
        this.logger.error(`Error fetching organization products: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Get product by ID with organization validation
     * @param {string} productId - Product ID
     * @param {string} organizationId - Organization ID
     * @returns {Promise<Object>}
     */
    async getProductById(productId, organizationId) {
      try {
        // findById now enforces organization isolation at the repository level
        const product = await this.repository.findById(productId, organizationId);

        if (!product) {
          throw new Error('Product not found');
        }

        return product;
      } catch (error) {
        this.logger.error(`Error fetching product by ID: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Create new product with validation
     * @param {Object} productData - Product data
     * @param {string} userId - User ID
     * @param {string} organizationId - Organization ID
     * @returns {Promise<Object>}
     */
    async createProduct(productData, userId, organizationId) {
      try {
        // Validate required fields
        this.validateProductData(productData);
  
        // Check for duplicate batch number within organization
        const existingProduct = await this.repository.findByBatchNumber(productData.batch_number, organizationId);
        if (existingProduct.length > 0) {
          throw new Error('Product with this batch number already exists in your organization');
        }
  
        // Prepare product data
        const newProduct = {
          ...productData,
          owner_id: userId,
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
  
        const createdProduct = await this.repository.create(newProduct);
        
        this.logger.info(`Product created successfully: ${createdProduct.product_id}`);
        return createdProduct;
      } catch (error) {
        this.logger.error(`Error creating product: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Update product with validation
     * @param {string} productId - Product ID
     * @param {Object} updateData - Update data
     * @param {string} organizationId - Organization ID
     * @returns {Promise<Object>}
     */
    async updateProduct(productId, updateData, organizationId) {
      try {
        // Verify organization access
        await this.getProductById(productId, organizationId);
  
        // Validate update data
        if (updateData.batch_number) {
          const existingProduct = await this.repository.findByBatchNumber(updateData.batch_number, organizationId);
          const duplicateProduct = existingProduct.find(p => p.product_id !== productId);
          if (duplicateProduct) {
            throw new Error('Another product with this batch number already exists in your organization');
          }
        }
  
        const updatedProduct = await this.repository.update(productId, updateData, 'product_id');
        
        this.logger.info(`Product updated successfully: ${productId}`);
        return updatedProduct;
      } catch (error) {
        this.logger.error(`Error updating product: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Delete product with validation
     * @param {string} productId - Product ID
     * @param {string} organizationId - Organization ID
     * @returns {Promise<boolean>}
     */
    async deleteProduct(productId, organizationId) {
      try {
        // Verify organization access
        await this.getProductById(productId, organizationId);
  
        await this.repository.delete(productId, 'product_id');
        
        this.logger.info(`Product deleted successfully: ${productId}`);
        return true;
      } catch (error) {
        this.logger.error(`Error deleting product: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Get products expiring soon for an organization
     * @param {string} organizationId - Organization ID
     * @param {number} days - Days ahead to check
     * @returns {Promise<Array>}
     */
    async getExpiringSoonProducts(organizationId, days = 30) {
      try {
        return await this.repository.findExpiringSoon(days, organizationId);
      } catch (error) {
        this.logger.error(`Error fetching expiring products: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Search products for an organization
     * @param {string} searchTerm - Search term
     * @param {string} organizationId - Organization ID
     * @returns {Promise<Array>}
     */
    async searchProducts(searchTerm, organizationId) {
      try {
        if (!searchTerm || searchTerm.trim().length === 0) {
          return [];
        }
  
        return await this.repository.search(searchTerm.trim(), organizationId);
      } catch (error) {
        this.logger.error(`Error searching products: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Validate a single row for bulk import.
     * Unlike validateProductData(), past expiration dates are a warning not an error.
     * @param {Object} row - Row data from CSV
     * @returns {{ errors: string[], warnings: string[] }}
     */
    _validateRowForBulk(row) {
      const errors = [];
      const warnings = [];

      const VALID_UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'unidad', 'docena'];
      const VALID_PRODUCT_TYPES = ['standard', 'raw_material', 'finished_good'];

      for (const field of ['name', 'batch_number', 'origin_country', 'expiration_date', 'price']) {
        if (row[field] == null || String(row[field]).trim() === '') {
          errors.push(`${field} is required`);
        }
      }

      if (row.expiration_date) {
        const d = new Date(row.expiration_date);
        if (isNaN(d.getTime())) {
          errors.push('expiration_date must be a valid date (YYYY-MM-DD)');
        } else if (d < new Date()) {
          warnings.push('expiration_date is in the past');
        }
      }

      if (row.price != null && String(row.price).trim() !== '') {
        const price = parseFloat(row.price);
        if (isNaN(price) || price <= 0) {
          errors.push('price must be a positive number');
        } else if (price > 999999.99) {
          errors.push('price cannot exceed 999999.99');
        }
      }

      if (row.initial_stock != null && String(row.initial_stock).trim() !== '') {
        const stock = parseInt(row.initial_stock, 10);
        if (isNaN(stock) || stock < 0 || !Number.isInteger(Number(row.initial_stock))) {
          errors.push('initial_stock must be a non-negative integer');
        }
      }

      if (row.unit && !VALID_UNITS.includes(row.unit)) {
        errors.push(`unit must be one of: ${VALID_UNITS.join(', ')}`);
      }

      if (row.product_type && !VALID_PRODUCT_TYPES.includes(row.product_type)) {
        errors.push(`product_type must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`);
      }

      return { errors, warnings };
    }

    /**
     * Bulk import products from CSV rows (upsert by batch_number).
     * Processes each row independently (per-row commit, not all-or-nothing).
     * @param {Array} rows - Array of parsed CSV row objects
     * @param {string} userId - User performing the import
     * @param {string} organizationId - Organization scope
     * @returns {Promise<{ created: number, updated: number, failed: Array, stock_skipped: Array }>}
     */
    async bulkImport(rows, userId, organizationId) {
      this.logger.info(`Starting bulk import of ${rows.length} rows for org: ${organizationId}`);

      let orgWarehouses = [];
      try {
        orgWarehouses = await this.warehouseRepository.findByOrganizationId(organizationId);
      } catch (err) {
        this.logger.warn(`Could not fetch warehouses for bulk import: ${err.message}`);
      }

      const defaultWarehouse = orgWarehouses.find(w => w.is_active !== false) || orgWarehouses[0] || null;
      const result = { created: 0, updated: 0, failed: [], stock_skipped: [] };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        const { errors, warnings } = this._validateRowForBulk(row);
        if (errors.length > 0) {
          result.failed.push({ row: rowNum, batch_number: row.batch_number || null, errors });
          continue;
        }

        const productData = {
          name: String(row.name).trim(),
          batch_number: String(row.batch_number).trim(),
          origin_country: String(row.origin_country).trim(),
          expiration_date: row.expiration_date,
          price: parseFloat(row.price),
          description: row.description ? String(row.description).trim() : '',
          unit: row.unit || 'unidad',
          product_type: row.product_type || 'standard',
        };

        const initialStock = row.initial_stock ? parseInt(row.initial_stock, 10) : 0;
        const warehouseName = row.warehouse_name ? String(row.warehouse_name).trim().toLowerCase() : null;

        let resolvedWarehouse = null;
        if (initialStock > 0) {
          if (warehouseName) {
            resolvedWarehouse = orgWarehouses.find(
              w => w.name.toLowerCase().trim() === warehouseName
            ) || null;
          } else {
            resolvedWarehouse = defaultWarehouse;
          }
        }

        try {
          const existing = await this.repository.findByBatchNumber(productData.batch_number, organizationId);
          let savedProduct;

          if (existing.length > 0) {
            savedProduct = await this.repository.update(existing[0].product_id, {
              ...productData,
              updated_at: new Date().toISOString()
            }, 'product_id');
            result.updated++;
          } else {
            savedProduct = await this.repository.create({
              ...productData,
              owner_id: userId,
              organization_id: organizationId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            result.created++;
          }

          if (initialStock > 0) {
            if (!resolvedWarehouse) {
              const reason = warehouseName
                ? `warehouse '${row.warehouse_name}' not found`
                : 'no default warehouse available';
              result.stock_skipped.push({ row: rowNum, batch_number: productData.batch_number, reason });
            } else {
              try {
                await this.stockMovementRepository.create({
                  product_id: savedProduct.product_id,
                  warehouse_id: resolvedWarehouse.warehouse_id,
                  organization_id: organizationId,
                  movement_type: 'receive',
                  quantity: initialStock,
                  reference: 'CSV Import',
                  movement_date: new Date().toISOString()
                });
              } catch (stockErr) {
                if (existing.length === 0) {
                  try {
                    await this.repository.delete(savedProduct.product_id, 'product_id');
                    result.created--;
                  } catch (deleteErr) {
                    this.logger.error(`Failed to rollback product ${savedProduct.product_id}: ${deleteErr.message}`);
                  }
                } else {
                  result.updated--;
                }
                result.failed.push({
                  row: rowNum,
                  batch_number: productData.batch_number,
                  errors: [`Stock movement failed: ${stockErr.message}`]
                });
              }
            }
          }

          if (warnings.length > 0) {
            this.logger.warn(`Row ${rowNum} (${productData.batch_number}) warnings: ${warnings.join(', ')}`);
          }

        } catch (err) {
          this.logger.error(`Row ${rowNum} failed: ${err.message}`);
          result.failed.push({
            row: rowNum,
            batch_number: row.batch_number || null,
            errors: [err.message]
          });
        }
      }

      this.logger.info(`Bulk import complete: created=${result.created}, updated=${result.updated}, failed=${result.failed.length}`);
      return result;
    }

    /**
     * Validate product data
     * @param {Object} productData - Product data to validate
     * @throws {Error} If validation fails
     */
    validateProductData(productData) {
      const requiredFields = ['name', 'batch_number', 'origin_country', 'expiration_date', 'price'];

      for (const field of requiredFields) {
        if (productData[field] == null || productData[field].toString().trim() === '') {
          throw new Error(`${field} is required`);
        }
      }

      // Validate expiration date
      const expirationDate = new Date(productData.expiration_date);
      if (isNaN(expirationDate.getTime())) {
        throw new Error('Invalid expiration date format');
      }

      if (expirationDate < new Date()) {
        throw new Error('Expiration date cannot be in the past');
      }

      // Validate price
      const price = parseFloat(productData.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Price must be a positive number');
      }

      if (price > 999999.99) {
        throw new Error('Price cannot exceed $999,999.99');
      }
    }

    /**
     * Get available stock for a product (physical stock - reserved stock)
     * @param {string} productId - Product ID
     * @param {string} warehouseId - Warehouse ID
     * @param {string} organizationId - Organization ID
     * @returns {Promise<number>} Available stock quantity
     */
    async getAvailableStock(productId, warehouseId, organizationId) {
      try {
        this.logger.info(`Getting available stock for product ${productId} in warehouse ${warehouseId}`);

        // Check if stockReservationRepository is available
        if (!this.stockReservationRepository) {
          this.logger.warn('stockReservationRepository not injected, falling back to physical stock only');

          // Fallback: return physical stock only (without reservations)
          const physicalStock = await this.stockMovementRepository.getCurrentStock(
            productId,
            warehouseId,
            organizationId
          );

          return physicalStock || 0;
        }

        // Use the stock reservation repository to get available stock
        // This calls the database function get_available_stock() which calculates:
        // available_stock = physical_stock - reserved_stock
        const availableStock = await this.stockReservationRepository.getAvailableStock(
          productId,
          warehouseId,
          organizationId
        );

        this.logger.info(`Available stock for product ${productId}: ${availableStock}`);
        return availableStock;
      } catch (error) {
        this.logger.error(`Error getting available stock: ${error.message}`);
        throw new Error(`Failed to get available stock: ${error.message}`);
      }
    }
  }

  module.exports = { ProductService };