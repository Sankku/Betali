const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validation');

// TODO: Validation schemas (using a simple validation approach for now)
const createProductSchema = {
  validate: (data) => {
    const errors = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push({ message: 'Name is required and must be a string' });
    }
    
    if (!data.batch_number || typeof data.batch_number !== 'string' || data.batch_number.trim() === '') {
      errors.push({ message: 'Batch number is required and must be a string' });
    }
    
    if (!data.origin_country || typeof data.origin_country !== 'string' || data.origin_country.trim() === '') {
      errors.push({ message: 'Origin country is required and must be a string' });
    }
    
    if (!data.expiration_date) {
      errors.push({ message: 'Expiration date is required' });
    } else {
      const date = new Date(data.expiration_date);
      if (isNaN(date.getTime())) {
        errors.push({ message: 'Expiration date must be a valid date' });
      }
    }
    
    return {
      error: errors.length > 0 ? { details: errors } : null,
      value: data
    };
  }
};

const updateProductSchema = {
  validate: (data) => {
    const errors = [];
    
    if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
      errors.push({ message: 'Name must be a non-empty string' });
    }
    
    if (data.batch_number !== undefined && (typeof data.batch_number !== 'string' || data.batch_number.trim() === '')) {
      errors.push({ message: 'Batch number must be a non-empty string' });
    }
    
    if (data.origin_country !== undefined && (typeof data.origin_country !== 'string' || data.origin_country.trim() === '')) {
      errors.push({ message: 'Origin country must be a non-empty string' });
    }
    
    if (data.expiration_date !== undefined) {
      const date = new Date(data.expiration_date);
      if (isNaN(date.getTime())) {
        errors.push({ message: 'Expiration date must be a valid date' });
      }
    }
    
    return {
      error: errors.length > 0 ? { details: errors } : null,
      value: data
    };
  }
};

const queryParamsSchema = {
  validate: (query) => ({
    error: null,
    value: {
      limit: query.limit ? Math.min(parseInt(query.limit), 100) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
      sortBy: query.sortBy || undefined,
      sortOrder: query.sortOrder || undefined,
      days: query.days ? parseInt(query.days) : undefined,
      q: query.q || undefined
    }
  })
};

const router = express.Router();

const productController = ServiceFactory.createProductController();

router.use(authenticateUser);

router.get(
  '/',
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await productController.getProducts(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/search',
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await productController.searchProducts(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/expiring',
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await productController.getExpiringProducts(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  async (req, res, next) => {
    try {
      await productController.getProductById(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  validateRequest(createProductSchema),
  async (req, res, next) => {
    try {
      await productController.createProduct(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  validateRequest(updateProductSchema),
  async (req, res, next) => {
    try {
      await productController.updateProduct(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  async (req, res, next) => {
    try {
      await productController.deleteProduct(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;