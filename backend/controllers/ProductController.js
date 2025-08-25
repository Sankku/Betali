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