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
     * Get all products for a user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async getUserProducts(userId, options = {}) {
      try {
        this.logger.info(`Fetching products for user: ${userId}`);
        return await this.repository.findByUserId(userId, options);
      } catch (error) {
        this.logger.error(`Error fetching user products: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Get product by ID with ownership validation
     * @param {string} productId - Product ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>}
     */
    async getProductById(productId, userId) {
      try {
        const product = await this.repository.findById(productId, 'product_id');
        
        if (!product) {
          throw new Error('Product not found');
        }
  
        // Validate ownership
        if (product.owner_id !== userId) {
          throw new Error('Access denied: Product does not belong to user');
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
     * @returns {Promise<Object>}
     */
    async createProduct(productData, userId) {
      try {
        // Validate required fields
        this.validateProductData(productData);
  
        // Check for duplicate batch number
        const existingProduct = await this.repository.findByBatchNumber(productData.batch_number);
        if (existingProduct.length > 0) {
          throw new Error('Product with this batch number already exists');
        }
  
        // Prepare product data
        const newProduct = {
          ...productData,
          owner_id: userId,
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
     * @param {string} userId - User ID
     * @returns {Promise<Object>}
     */
    async updateProduct(productId, updateData, userId) {
      try {
        // Verify ownership
        await this.getProductById(productId, userId);
  
        // Validate update data
        if (updateData.batch_number) {
          const existingProduct = await this.repository.findByBatchNumber(updateData.batch_number);
          const duplicateProduct = existingProduct.find(p => p.product_id !== productId);
          if (duplicateProduct) {
            throw new Error('Another product with this batch number already exists');
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
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async deleteProduct(productId, userId) {
      try {
        // Verify ownership
        await this.getProductById(productId, userId);
  
        await this.repository.delete(productId, 'product_id');
        
        this.logger.info(`Product deleted successfully: ${productId}`);
        return true;
      } catch (error) {
        this.logger.error(`Error deleting product: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Get products expiring soon for a user
     * @param {string} userId - User ID
     * @param {number} days - Days ahead to check
     * @returns {Promise<Array>}
     */
    async getExpiringSoonProducts(userId, days = 30) {
      try {
        return await this.repository.findExpiringSoon(days, userId);
      } catch (error) {
        this.logger.error(`Error fetching expiring products: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Search products for a user
     * @param {string} searchTerm - Search term
     * @param {string} userId - User ID
     * @returns {Promise<Array>}
     */
    async searchProducts(searchTerm, userId) {
      try {
        if (!searchTerm || searchTerm.trim().length === 0) {
          return [];
        }
  
        return await this.repository.search(searchTerm.trim(), userId);
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
      const requiredFields = ['name', 'batch_number', 'origin_country', 'expiration_date'];
      
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
    }
  }
  
  module.exports = { ProductService };