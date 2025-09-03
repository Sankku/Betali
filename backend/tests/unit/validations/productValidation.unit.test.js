/**
 * Product Validation Schema Unit Tests
 * Tests Joi validation schemas for product operations
 */

const { 
  createProductSchema, 
  updateProductSchema, 
  queryParamsSchema 
} = require('../../../validations/productValidation');

describe('Product Validation Schemas Unit Tests', () => {
  describe('createProductSchema', () => {
    const validData = {
      name: 'Test Product',
      batch_number: 'BATCH-001',
      origin_country: 'Argentina',
      expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      description: 'Test product description',
      external_product_id: 'EXT-123',
      price: 99.99
    };

    test('should pass validation with valid complete data', () => {
      const { error, value } = createProductSchema.validate(validData);
      
      expect(error).toBeUndefined();
      expect(value.name).toBe('Test Product');
      expect(value.price).toBe(99.99);
    });

    test('should pass validation with minimal required data', () => {
      const minimalData = {
        name: 'Test Product',
        batch_number: 'BATCH-001',
        origin_country: 'Argentina',
        expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        price: 99.99
      };

      const { error } = createProductSchema.validate(minimalData);
      
      expect(error).toBeUndefined();
    });

    test('should trim whitespace from string fields', () => {
      const dataWithWhitespace = {
        ...validData,
        name: '  Test Product  ',
        batch_number: '  BATCH-001  ',
        origin_country: '  Argentina  ',
        description: '  Test description  '
      };

      const { error, value } = createProductSchema.validate(dataWithWhitespace);
      
      expect(error).toBeUndefined();
      expect(value.name).toBe('Test Product');
      expect(value.batch_number).toBe('BATCH-001');
      expect(value.origin_country).toBe('Argentina');
      expect(value.description).toBe('Test description');
    });

    describe('name field validation', () => {
      test('should fail with missing name', () => {
        const invalidData = { ...validData };
        delete invalidData.name;

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Product name is required');
      });

      test('should fail with empty name', () => {
        const invalidData = { ...validData, name: '' };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Product name cannot be empty');
      });

      test('should fail with name exceeding 255 characters', () => {
        const longName = 'a'.repeat(256);
        const invalidData = { ...validData, name: longName };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Product name must be less than 255 characters');
      });

      test('should pass with name at maximum length', () => {
        const maxName = 'a'.repeat(255);
        const testData = { ...validData, name: maxName };

        const { error } = createProductSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });
    });

    describe('batch_number field validation', () => {
      test('should fail with missing batch_number', () => {
        const invalidData = { ...validData };
        delete invalidData.batch_number;

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('SKU/Batch number is required');
      });

      test('should fail with empty batch_number', () => {
        const invalidData = { ...validData, batch_number: '' };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('SKU/Batch number cannot be empty');
      });

      test('should fail with batch_number exceeding 100 characters', () => {
        const longBatch = 'a'.repeat(101);
        const invalidData = { ...validData, batch_number: longBatch };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('SKU/Batch number must be less than 100 characters');
      });
    });

    describe('origin_country field validation', () => {
      test('should fail with missing origin_country', () => {
        const invalidData = { ...validData };
        delete invalidData.origin_country;

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Origin/Source is required');
      });

      test('should fail with empty origin_country', () => {
        const invalidData = { ...validData, origin_country: '' };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Origin/Source cannot be empty');
      });

      test('should fail with origin_country exceeding 100 characters', () => {
        const longOrigin = 'a'.repeat(101);
        const invalidData = { ...validData, origin_country: longOrigin };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Origin/Source must be less than 100 characters');
      });
    });

    describe('expiration_date field validation', () => {
      test('should fail with missing expiration_date', () => {
        const invalidData = { ...validData };
        delete invalidData.expiration_date;

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Expiry/Best before date is required');
      });

      test('should fail with past expiration_date', () => {
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
        const invalidData = { ...validData, expiration_date: pastDate };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Expiry/Best before date cannot be in the past');
      });

      test('should fail with invalid date format', () => {
        const invalidData = { ...validData, expiration_date: 'not-a-date' };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Expiry/Best before date must be a valid date');
      });

      test('should pass with future date', () => {
        const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year from now
        const testData = { ...validData, expiration_date: futureDate };

        const { error } = createProductSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });
    });

    describe('price field validation', () => {
      test('should fail with missing price', () => {
        const invalidData = { ...validData };
        delete invalidData.price;

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Price is required');
      });

      test('should fail with negative price', () => {
        const invalidData = { ...validData, price: -10.50 };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Price must be greater than 0');
      });

      test('should fail with zero price', () => {
        const invalidData = { ...validData, price: 0 };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Price must be greater than 0');
      });

      test('should fail with price exceeding maximum', () => {
        const invalidData = { ...validData, price: 1000000 };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Price cannot exceed $999,999.99');
      });

      test('should pass with maximum allowed price', () => {
        const testData = { ...validData, price: 999999.99 };

        const { error } = createProductSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });

      test('should fail with invalid price format', () => {
        const invalidData = { ...validData, price: 'not-a-number' };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Price must be a valid number');
      });

      test('should handle price with more than 2 decimal places', () => {
        const testData = { ...validData, price: 99.999 };

        const { error, value } = createProductSchema.validate(testData);
        
        expect(error).toBeUndefined();
        expect(value.price).toBe(99.999); // Joi should preserve precision
      });
    });

    describe('optional fields', () => {
      test('should allow empty description', () => {
        const testData = { ...validData, description: '' };

        const { error } = createProductSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });

      test('should allow missing description', () => {
        const testData = { ...validData };
        delete testData.description;

        const { error } = createProductSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });

      test('should fail with description exceeding 1000 characters', () => {
        const longDescription = 'a'.repeat(1001);
        const invalidData = { ...validData, description: longDescription };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Description must be less than 1000 characters');
      });

      test('should allow empty external_product_id', () => {
        const testData = { ...validData, external_product_id: '' };

        const { error } = createProductSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });

      test('should fail with external_product_id exceeding 100 characters', () => {
        const longId = 'a'.repeat(101);
        const invalidData = { ...validData, external_product_id: longId };

        const { error } = createProductSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('External product ID must be less than 100 characters');
      });
    });
  });

  describe('updateProductSchema', () => {
    test('should pass validation with partial data', () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 149.99
      };

      const { error } = updateProductSchema.validate(updateData);
      
      expect(error).toBeUndefined();
    });

    test('should pass validation with single field', () => {
      const updateData = { name: 'New Name' };

      const { error } = updateProductSchema.validate(updateData);
      
      expect(error).toBeUndefined();
    });

    test('should pass validation with empty object', () => {
      const { error } = updateProductSchema.validate({});
      
      expect(error).toBeUndefined();
    });

    test('should apply same validation rules as create schema', () => {
      const invalidUpdateData = {
        name: '', // Empty name should fail
        price: -10 // Negative price should fail
      };

      const { error } = updateProductSchema.validate(invalidUpdateData, { abortEarly: false });
      
      expect(error).toBeDefined();
      expect(error.details.length).toBeGreaterThan(0);
    });

    test('should not require any fields', () => {
      const emptyUpdate = {};

      const { error } = updateProductSchema.validate(emptyUpdate);
      
      expect(error).toBeUndefined();
    });
  });

  describe('queryParamsSchema', () => {
    test('should pass validation with valid query params', () => {
      const validQuery = {
        limit: 50,
        offset: 10,
        sortBy: 'name',
        sortOrder: 'asc',
        days: 30,
        q: 'search term'
      };

      const { error } = queryParamsSchema.validate(validQuery);
      
      expect(error).toBeUndefined();
    });

    test('should pass validation with string numbers', () => {
      const queryWithStrings = {
        limit: '50',
        offset: '10',
        days: '30'
      };

      const { error, value } = queryParamsSchema.validate(queryWithStrings);
      
      expect(error).toBeUndefined();
      expect(typeof value.limit).toBe('number');
      expect(typeof value.offset).toBe('number');
      expect(typeof value.days).toBe('number');
    });

    test('should pass validation with empty object', () => {
      const { error } = queryParamsSchema.validate({});
      
      expect(error).toBeUndefined();
    });

    describe('limit field validation', () => {
      test('should fail with limit less than 1', () => {
        const invalidQuery = { limit: 0 };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Limit must be at least 1');
      });

      test('should fail with limit exceeding 100', () => {
        const invalidQuery = { limit: 101 };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Limit cannot exceed 100');
      });

      test('should fail with non-integer limit', () => {
        const invalidQuery = { limit: 10.5 };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Limit must be an integer');
      });
    });

    describe('offset field validation', () => {
      test('should fail with negative offset', () => {
        const invalidQuery = { offset: -1 };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Offset cannot be negative');
      });

      test('should pass with zero offset', () => {
        const validQuery = { offset: 0 };

        const { error } = queryParamsSchema.validate(validQuery);
        
        expect(error).toBeUndefined();
      });
    });

    describe('sortBy field validation', () => {
      test('should pass with valid sort fields', () => {
        const validSortFields = ['name', 'batch_number', 'origin_country', 'expiration_date', 'created_at', 'updated_at'];

        validSortFields.forEach(sortBy => {
          const query = { sortBy };
          const { error } = queryParamsSchema.validate(query);
          
          expect(error).toBeUndefined();
        });
      });

      test('should fail with invalid sort field', () => {
        const invalidQuery = { sortBy: 'invalid_field' };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Invalid sort field');
      });
    });

    describe('sortOrder field validation', () => {
      test('should pass with valid sort orders', () => {
        const validOrders = ['asc', 'desc'];

        validOrders.forEach(sortOrder => {
          const query = { sortOrder };
          const { error } = queryParamsSchema.validate(query);
          
          expect(error).toBeUndefined();
        });
      });

      test('should fail with invalid sort order', () => {
        const invalidQuery = { sortOrder: 'ascending' };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Sort order must be "asc" or "desc"');
      });
    });

    describe('days field validation', () => {
      test('should fail with days less than 1', () => {
        const invalidQuery = { days: 0 };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Days must be at least 1');
      });

      test('should fail with days exceeding 365', () => {
        const invalidQuery = { days: 366 };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Days cannot exceed 365');
      });

      test('should pass with valid days range', () => {
        const validDays = [1, 30, 365];

        validDays.forEach(days => {
          const query = { days };
          const { error } = queryParamsSchema.validate(query);
          
          expect(error).toBeUndefined();
        });
      });
    });

    describe('search query (q) field validation', () => {
      test('should fail with empty search query', () => {
        const invalidQuery = { q: '' };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Search query cannot be empty');
      });

      test('should fail with search query exceeding 255 characters', () => {
        const longQuery = 'a'.repeat(256);
        const invalidQuery = { q: longQuery };

        const { error } = queryParamsSchema.validate(invalidQuery);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Search query must be less than 255 characters');
      });

      test('should trim search query', () => {
        const queryWithWhitespace = { q: '  search term  ' };

        const { error, value } = queryParamsSchema.validate(queryWithWhitespace);
        
        expect(error).toBeUndefined();
        expect(value.q).toBe('search term');
      });

      test('should pass with valid search query', () => {
        const validQuery = { q: 'product search' };

        const { error } = queryParamsSchema.validate(validQuery);
        
        expect(error).toBeUndefined();
      });
    });
  });

  describe('schema integration and edge cases', () => {
    test('should handle all schemas with null input', () => {
      const schemas = [createProductSchema, updateProductSchema, queryParamsSchema];
      
      schemas.forEach(schema => {
        const { error } = schema.validate(null);
        expect(error).toBeDefined();
      });
    });

    test('should handle all schemas with undefined input', () => {
      const schemas = [createProductSchema, updateProductSchema, queryParamsSchema];
      
      schemas.forEach(schema => {
        const { error } = schema.validate(undefined);
        expect(error).toBeDefined();
      });
    });

    test('should strip unknown fields when configured', () => {
      const dataWithExtra = {
        name: 'Test Product',
        batch_number: 'BATCH-001',
        origin_country: 'Argentina',
        expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        price: 99.99,
        unknownField: 'should be removed',
        hackAttempt: '<script>alert("xss")</script>'
      };

      const { error, value } = createProductSchema.validate(dataWithExtra, { stripUnknown: true });
      
      expect(error).toBeUndefined();
      expect(value).not.toHaveProperty('unknownField');
      expect(value).not.toHaveProperty('hackAttempt');
    });
  });
});