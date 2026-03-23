/**
 * ProductService Unit Tests
 * Tests business logic in isolation with mocked dependencies
 */

const { ProductService } = require('../../services/ProductService');

describe('ProductService Unit Tests', () => {
  let productService;
  let mockProductRepository;
  let mockStockMovementRepository;
  let mockStockReservationRepository;
  let mockLogger;

  beforeEach(() => {
    // Mock repository with all required methods
    mockProductRepository = {
      findByOrganizationId: jest.fn(),
      findById: jest.fn(),
      findByBatchNumber: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findExpiringSoon: jest.fn(),
      search: jest.fn()
    };

    // Mock stock movement repository
    mockStockMovementRepository = {
      getCurrentStockBulk: jest.fn(),
      getCurrentStock: jest.fn()
    };

    // Mock stock reservation repository
    mockStockReservationRepository = {
      getAvailableStock: jest.fn()
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance with mocks
    productService = new ProductService(
      mockProductRepository,
      mockStockMovementRepository,
      mockStockReservationRepository,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationProducts', () => {
    test('should fetch products for organization successfully', async () => {
      const orgId = 'org-123';
      const expectedProducts = [
        { product_id: 'prod-1', name: 'Product 1', organization_id: orgId },
        { product_id: 'prod-2', name: 'Product 2', organization_id: orgId }
      ];
      
      mockProductRepository.findByOrganizationId.mockResolvedValue(expectedProducts);
      mockStockMovementRepository.getCurrentStockBulk.mockResolvedValue({});

      const result = await productService.getOrganizationProducts(orgId);

      expect(result).toEqual(expectedProducts.map(p => ({ ...p, current_stock: 0 })));
      expect(mockProductRepository.findByOrganizationId).toHaveBeenCalledWith(orgId, {});
      expect(mockLogger.info).toHaveBeenCalledWith(`Fetching products for organization: ${orgId}`);
    });

    test('should pass options to repository', async () => {
      const orgId = 'org-123';
      const options = { limit: 10, offset: 0 };
      
      mockProductRepository.findByOrganizationId.mockResolvedValue([]);

      await productService.getOrganizationProducts(orgId, options);

      expect(mockProductRepository.findByOrganizationId).toHaveBeenCalledWith(orgId, options);
    });

    test('should handle repository errors', async () => {
      const orgId = 'org-123';
      const error = new Error('Database connection failed');
      
      mockProductRepository.findByOrganizationId.mockRejectedValue(error);

      await expect(productService.getOrganizationProducts(orgId))
        .rejects.toThrow('Database connection failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching organization products: ${error.message}`);
    });
  });

  describe('getProductById', () => {
    test('should fetch product with organization validation', async () => {
      const productId = 'prod-123';
      const orgId = 'org-123';
      const mockProduct = {
        product_id: productId,
        name: 'Test Product',
        organization_id: orgId
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const result = await productService.getProductById(productId, orgId);

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId, orgId);
    });

    test('should throw error when product not found', async () => {
      const productId = 'nonexistent-prod';
      const orgId = 'org-123';

      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.getProductById(productId, orgId))
        .rejects.toThrow('Product not found');
    });

    test('should throw error when product belongs to different organization', async () => {
      const productId = 'prod-123';
      const orgId = 'org-123';

      // Repository enforces org isolation — returns null when product not in org
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.getProductById(productId, orgId))
        .rejects.toThrow('Product not found');
    });

    test('should log errors', async () => {
      const productId = 'prod-123';
      const orgId = 'org-123';
      const error = new Error('Database error');

      mockProductRepository.findById.mockRejectedValue(error);

      await expect(productService.getProductById(productId, orgId))
        .rejects.toThrow('Database error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching product by ID: ${error.message}`);
    });
  });

  describe('createProduct', () => {
    const validProductData = {
      name: 'Test Product',
      batch_number: 'BATCH-001',
      expiration_date: '2027-12-31',
      origin_country: 'Argentina',
      price: 99.99,
      description: 'Test description'
    };
    
    const userId = 'user-123';
    const orgId = 'org-123';

    test('should create product successfully', async () => {
      const expectedProduct = {
        product_id: 'prod-123',
        ...validProductData,
        owner_id: userId,
        organization_id: orgId
      };

      mockProductRepository.findByBatchNumber.mockResolvedValue([]);
      mockProductRepository.create.mockResolvedValue(expectedProduct);

      const result = await productService.createProduct(validProductData, userId, orgId);

      expect(result).toEqual(expectedProduct);
      expect(mockProductRepository.findByBatchNumber).toHaveBeenCalledWith('BATCH-001', orgId);
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validProductData,
          owner_id: userId,
          organization_id: orgId
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(`Product created successfully: ${expectedProduct.product_id}`);
    });

    test('should throw error for duplicate batch number', async () => {
      const existingProduct = { product_id: 'existing-123', batch_number: 'BATCH-001' };
      
      mockProductRepository.findByBatchNumber.mockResolvedValue([existingProduct]);

      await expect(productService.createProduct(validProductData, userId, orgId))
        .rejects.toThrow('Product with this batch number already exists in your organization');
      
      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      const invalidData = { name: 'Test Product' }; // Missing required fields

      await expect(productService.createProduct(invalidData, userId, orgId))
        .rejects.toThrow('batch_number is required');
    });

    test('should validate expiration date is not in past', async () => {
      const pastDateData = {
        ...validProductData,
        expiration_date: '2020-01-01'
      };

      await expect(productService.createProduct(pastDateData, userId, orgId))
        .rejects.toThrow('Expiration date cannot be in the past');
    });

    test('should validate price is positive', async () => {
      const invalidPriceData = {
        ...validProductData,
        price: -10
      };

      await expect(productService.createProduct(invalidPriceData, userId, orgId))
        .rejects.toThrow('Price must be a positive number');
    });

    test('should validate price maximum limit', async () => {
      const expensiveData = {
        ...validProductData,
        price: 1000000
      };

      await expect(productService.createProduct(expensiveData, userId, orgId))
        .rejects.toThrow('Price cannot exceed $999,999.99');
    });
  });

  describe('updateProduct', () => {
    const productId = 'prod-123';
    const orgId = 'org-123';
    const mockProduct = {
      product_id: productId,
      name: 'Existing Product',
      organization_id: orgId
    };

    beforeEach(() => {
      // Mock getProductById to return valid product
      mockProductRepository.findById.mockResolvedValue(mockProduct);
    });

    test('should update product successfully', async () => {
      const updateData = { name: 'Updated Product Name' };
      const updatedProduct = { ...mockProduct, ...updateData };

      mockProductRepository.update.mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct(productId, updateData, orgId);

      expect(result).toEqual(updatedProduct);
      expect(mockProductRepository.update).toHaveBeenCalledWith(productId, updateData, 'product_id');
      expect(mockLogger.info).toHaveBeenCalledWith(`Product updated successfully: ${productId}`);
    });

    test('should validate batch number uniqueness on update', async () => {
      const updateData = { batch_number: 'NEW-BATCH-001' };
      const existingProduct = { 
        product_id: 'other-prod-456', 
        batch_number: 'NEW-BATCH-001' 
      };

      mockProductRepository.findByBatchNumber.mockResolvedValue([existingProduct]);

      await expect(productService.updateProduct(productId, updateData, orgId))
        .rejects.toThrow('Another product with this batch number already exists in your organization');
    });

    test('should allow updating same product with same batch number', async () => {
      const updateData = { batch_number: 'EXISTING-BATCH' };
      const sameProduct = { 
        product_id: productId, 
        batch_number: 'EXISTING-BATCH' 
      };

      mockProductRepository.findByBatchNumber.mockResolvedValue([sameProduct]);
      mockProductRepository.update.mockResolvedValue({ ...mockProduct, ...updateData });

      const result = await productService.updateProduct(productId, updateData, orgId);

      expect(result).toEqual({ ...mockProduct, ...updateData });
      expect(mockProductRepository.update).toHaveBeenCalled();
    });

    test('should throw error if product not found or access denied', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.updateProduct(productId, {}, orgId))
        .rejects.toThrow('Product not found');
    });
  });

  describe('deleteProduct', () => {
    const productId = 'prod-123';
    const orgId = 'org-123';
    const mockProduct = {
      product_id: productId,
      organization_id: orgId
    };

    test('should delete product successfully', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.delete.mockResolvedValue(true);

      const result = await productService.deleteProduct(productId, orgId);

      expect(result).toBe(true);
      expect(mockProductRepository.delete).toHaveBeenCalledWith(productId, 'product_id');
      expect(mockLogger.info).toHaveBeenCalledWith(`Product deleted successfully: ${productId}`);
    });

    test('should throw error if product not found or access denied', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.deleteProduct(productId, orgId))
        .rejects.toThrow('Product not found');
      
      expect(mockProductRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getExpiringSoonProducts', () => {
    test('should fetch expiring products with default days', async () => {
      const orgId = 'org-123';
      const expiringProducts = [
        { product_id: 'prod-1', expiration_date: '2025-02-01' }
      ];

      mockProductRepository.findExpiringSoon.mockResolvedValue(expiringProducts);

      const result = await productService.getExpiringSoonProducts(orgId);

      expect(result).toEqual(expiringProducts);
      expect(mockProductRepository.findExpiringSoon).toHaveBeenCalledWith(30, orgId);
    });

    test('should fetch expiring products with custom days', async () => {
      const orgId = 'org-123';
      const customDays = 7;

      mockProductRepository.findExpiringSoon.mockResolvedValue([]);

      await productService.getExpiringSoonProducts(orgId, customDays);

      expect(mockProductRepository.findExpiringSoon).toHaveBeenCalledWith(customDays, orgId);
    });
  });

  describe('searchProducts', () => {
    const orgId = 'org-123';

    test('should search products successfully', async () => {
      const searchTerm = 'test product';
      const searchResults = [
        { product_id: 'prod-1', name: 'Test Product 1' }
      ];

      mockProductRepository.search.mockResolvedValue(searchResults);

      const result = await productService.searchProducts(searchTerm, orgId);

      expect(result).toEqual(searchResults);
      expect(mockProductRepository.search).toHaveBeenCalledWith('test product', orgId);
    });

    test('should return empty array for empty search term', async () => {
      const result = await productService.searchProducts('', orgId);

      expect(result).toEqual([]);
      expect(mockProductRepository.search).not.toHaveBeenCalled();
    });

    test('should return empty array for whitespace search term', async () => {
      const result = await productService.searchProducts('   ', orgId);

      expect(result).toEqual([]);
      expect(mockProductRepository.search).not.toHaveBeenCalled();
    });

    test('should trim search term', async () => {
      const searchTerm = '  test product  ';
      mockProductRepository.search.mockResolvedValue([]);

      await productService.searchProducts(searchTerm, orgId);

      expect(mockProductRepository.search).toHaveBeenCalledWith('test product', orgId);
    });
  });

  describe('validateProductData', () => {
    const validData = {
      name: 'Test Product',
      batch_number: 'BATCH-001',
      origin_country: 'Argentina',
      expiration_date: '2027-12-31',
      price: 99.99
    };

    test('should pass validation for valid data', () => {
      expect(() => {
        productService.validateProductData(validData);
      }).not.toThrow();
    });

    test('should throw error for missing required fields', () => {
      const requiredFields = ['name', 'batch_number', 'origin_country', 'expiration_date', 'price'];
      
      requiredFields.forEach(field => {
        const invalidData = { ...validData };
        delete invalidData[field];
        
        expect(() => {
          productService.validateProductData(invalidData);
        }).toThrow(`${field} is required`);
      });
    });

    test('should throw error for empty string fields', () => {
      const invalidData = { ...validData, name: '' };
      
      expect(() => {
        productService.validateProductData(invalidData);
      }).toThrow('name is required');
    });

    test('should throw error for whitespace-only fields', () => {
      const invalidData = { ...validData, name: '   ' };
      
      expect(() => {
        productService.validateProductData(invalidData);
      }).toThrow('name is required');
    });

    test('should throw error for invalid expiration date format', () => {
      const invalidData = { ...validData, expiration_date: 'invalid-date' };
      
      expect(() => {
        productService.validateProductData(invalidData);
      }).toThrow('Invalid expiration date format');
    });

    test('should throw error for past expiration date', () => {
      const invalidData = { ...validData, expiration_date: '2020-01-01' };
      
      expect(() => {
        productService.validateProductData(invalidData);
      }).toThrow('Expiration date cannot be in the past');
    });

    test('should throw error for zero or negative price', () => {
      const invalidPrices = [0, -1, -99.99];
      
      invalidPrices.forEach(price => {
        const invalidData = { ...validData, price };
        
        expect(() => {
          productService.validateProductData(invalidData);
        }).toThrow('Price must be a positive number');
      });
    });

    test('should throw error for non-numeric price', () => {
      const invalidData = { ...validData, price: 'not-a-number' };
      
      expect(() => {
        productService.validateProductData(invalidData);
      }).toThrow('Price must be a positive number');
    });

    test('should throw error for price exceeding maximum', () => {
      const invalidData = { ...validData, price: 1000000 };
      
      expect(() => {
        productService.validateProductData(invalidData);
      }).toThrow('Price cannot exceed $999,999.99');
    });
  });
});