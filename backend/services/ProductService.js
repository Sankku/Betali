/**
 * Product business logic service
 * Handles business rules and validation
 */
class ProductService {
    constructor(productRepository, logger) {
      this.repository = productRepository;
      this.logger = logger;
    }
  
    /**
     * Get all products for an organization
     * @param {string} organizationId - Organization ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async getOrganizationProducts(organizationId, options = {}) {
      try {
        this.logger.info(`Fetching products for organization: ${organizationId}`);
        return await this.repository.findByOrganizationId(organizationId, options);
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
        const product = await this.repository.findById(productId, 'product_id');
        
        if (!product) {
          throw new Error('Product not found');
        }
  
        // Validate organization access
        if (product.organization_id !== organizationId) {
          throw new Error('Access denied: Product does not belong to your organization');
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
     * Validate product data
     * @param {Object} productData - Product data to validate
     * @throws {Error} If validation fails
     */
    validateProductData(productData) {
      const requiredFields = ['name', 'batch_number', 'origin_country', 'expiration_date', 'price'];
      
      for (const field of requiredFields) {
        if (!productData[field] || productData[field].toString().trim() === '') {
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
  }
  
  module.exports = { ProductService };