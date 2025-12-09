const { Logger } = require('../utils/Logger');

/**
 * Product controller handling HTTP requests
 * Follows the separation of concerns principle
 */
class ProductController {
  constructor(productService) {
    this.productService = productService;
    this.logger = new Logger('ProductController');
  }

  /**
   * Get all products for authenticated user's organization
   * GET /api/products
   */
  async getProducts(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const options = this.buildQueryOptions(req.query);
      
      const products = await this.productService.getOrganizationProducts(organizationId, options);
      
      res.json({
        data: products,
        meta: {
          total: products.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single product by ID
   * GET /api/products/:id
   */
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const product = await this.productService.getProductById(id, organizationId);
      
      res.json({ data: product });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new product
   * POST /api/products
   */
  async createProduct(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      const productData = req.body;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const createdProduct = await this.productService.createProduct(productData, userId, organizationId);
      
      res.status(201).json({
        data: createdProduct,
        message: 'Product created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update existing product
   * PUT /api/products/:id
   */
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const updateData = req.body;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const updatedProduct = await this.productService.updateProduct(id, updateData, organizationId);
      
      res.json({
        data: updatedProduct,
        message: 'Product updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product
   * DELETE /api/products/:id
   */
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      await this.productService.deleteProduct(id, organizationId);
      
      res.json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search products
   * GET /api/products/search
   */
  async searchProducts(req, res, next) {
    try {
      const { q: searchTerm } = req.query;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      if (!searchTerm) {
        return res.status(400).json({
          error: 'Search term is required'
        });
      }
      
      const products = await this.productService.searchProducts(searchTerm, organizationId);
      
      res.json({
        data: products,
        meta: {
          searchTerm,
          organizationId,
          total: products.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get products expiring soon
   * GET /api/products/expiring
   */
  async getExpiringProducts(req, res, next) {
    try {
      const { days = 30 } = req.query;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const products = await this.productService.getExpiringSoonProducts(organizationId, parseInt(days));
      
      res.json({
        data: products,
        meta: {
          days: parseInt(days),
          organizationId,
          total: products.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available stock for a product
   * GET /api/products/:id/available-stock?warehouse_id=xxx
   */
  async getAvailableStock(req, res, next) {
    try {
      const { id } = req.params;
      const { warehouse_id } = req.query;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      if (!warehouse_id) {
        return res.status(400).json({
          error: 'warehouse_id query parameter is required'
        });
      }

      this.logger.info(`Getting available stock for product ${id} in warehouse ${warehouse_id}`);

      // Get available stock using StockReservationRepository
      // This will be injected via ProductService
      const availableStock = await this.productService.getAvailableStock(
        id,
        warehouse_id,
        organizationId
      );

      res.json({
        product_id: id,
        warehouse_id,
        organization_id: organizationId,
        available_stock: availableStock,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`Error getting available stock: ${error.message}`);
      next(error);
    }
  }

  /**
   * Build query options from request query parameters
   * @param {Object} query - Request query parameters
   * @returns {Object} Query options
   */
  buildQueryOptions(query) {
    const options = {};

    if (query.limit) {
      options.limit = Math.min(parseInt(query.limit), 100); // Max 100 items
    }
    if (query.offset) {
      options.offset = parseInt(query.offset);
    }

    if (query.sortBy) {
      options.orderBy = {
        column: query.sortBy,
        ascending: query.sortOrder !== 'desc'
      };
    }

    return options;
  }
}

module.exports = { ProductController };