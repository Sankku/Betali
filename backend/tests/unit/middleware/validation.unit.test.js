/**
 * Validation Middleware Unit Tests
 * Tests validation middleware in isolation with different schemas
 */

const { validateRequest, validateQuery, validateParams } = require('../../../middleware/validation');
const Joi = require('joi');

describe('Validation Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest middleware', () => {
    const schema = Joi.object({
      name: Joi.string().required().min(2).max(50),
      email: Joi.string().email().required(),
      age: Joi.number().integer().min(0).max(150),
      active: Joi.boolean().default(true)
    });

    test('should pass validation with valid data', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        active: true
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        active: true
      });
    });

    test('should apply default values', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
        // active is missing but should default to true
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.active).toBe(true);
    });

    test('should strip unknown fields', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        unknownField: 'should be removed',
        anotherUnknown: 123
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).not.toHaveProperty('unknownField');
      expect(req.body).not.toHaveProperty('anotherUnknown');
    });

    test('should convert types automatically', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: '30', // String should be converted to number
        active: 'true' // String should be converted to boolean
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(typeof req.body.age).toBe('number');
      expect(req.body.age).toBe(30);
      expect(typeof req.body.active).toBe('boolean');
      expect(req.body.active).toBe(true);
    });

    test('should fail validation with missing required fields', () => {
      req.body = {
        age: 30
        // Missing required name and email
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          message: expect.stringContaining('name'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: expect.stringContaining('required')
            })
          ]),
          timestamp: expect.any(String)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with invalid email format', () => {
      req.body = {
        name: 'John Doe',
        email: 'invalid-email-format',
        age: 30
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('valid email')
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with value out of range', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: -5 // Invalid age
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('greater than or equal to 0')
            })
          ])
        })
      );
    });

    test('should fail validation with name too short', () => {
      req.body = {
        name: 'A', // Too short
        email: 'john@example.com',
        age: 30
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: expect.stringContaining('at least 2 characters')
            })
          ])
        })
      );
    });

    test('should show multiple validation errors', () => {
      req.body = {
        name: '', // Too short
        email: 'invalid-email', // Invalid format
        age: 200 // Out of range
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = res.json.mock.calls[0][0];
      expect(response.details).toHaveLength(3);
      expect(response.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'age' })
        ])
      );
    });

    test('should handle middleware errors', () => {
      const invalidSchema = null; // This will cause an error
      req.body = { name: 'Test' };

      const middleware = validateRequest(invalidSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery middleware', () => {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      search: Joi.string().max(100),
      active: Joi.boolean(),
      sortBy: Joi.string().valid('name', 'created_at', 'updated_at').default('created_at'),
      order: Joi.string().valid('asc', 'desc').default('desc')
    });

    test('should pass validation with valid query params', () => {
      req.query = {
        page: '2',
        limit: '20',
        search: 'test query',
        active: 'true',
        sortBy: 'name',
        order: 'asc'
      };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({
        page: 2, // Converted to number
        limit: 20, // Converted to number
        search: 'test query',
        active: true, // Converted to boolean
        sortBy: 'name',
        order: 'asc'
      });
    });

    test('should apply default values for missing query params', () => {
      req.query = {
        search: 'test'
        // Other fields should get defaults
      };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
      expect(req.query.sortBy).toBe('created_at');
      expect(req.query.order).toBe('desc');
    });

    test('should strip unknown query parameters', () => {
      req.query = {
        page: '1',
        limit: '10',
        unknownParam: 'should be removed',
        hacker: 'attempt'
      };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).not.toHaveProperty('unknownParam');
      expect(req.query).not.toHaveProperty('hacker');
    });

    test('should fail validation with invalid sortBy value', () => {
      req.query = {
        sortBy: 'invalid_field'
      };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Query validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'sortBy',
              message: expect.stringContaining('one of')
            })
          ])
        })
      );
    });

    test('should fail validation with page less than 1', () => {
      req.query = {
        page: '0'
      };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'page',
              message: expect.stringContaining('greater than or equal to 1')
            })
          ])
        })
      );
    });

    test('should fail validation with limit exceeding maximum', () => {
      req.query = {
        limit: '200'
      };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'limit',
              message: expect.stringContaining('less than or equal to 100')
            })
          ])
        })
      );
    });

    test('should convert string numbers to actual numbers', () => {
      req.query = {
        page: '5',
        limit: '25'
      };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(typeof req.query.page).toBe('number');
      expect(typeof req.query.limit).toBe('number');
      expect(req.query.page).toBe(5);
      expect(req.query.limit).toBe(25);
    });
  });

  describe('validateParams middleware', () => {
    const schema = Joi.object({
      id: Joi.string().uuid().required(),
      organizationId: Joi.string().uuid(),
      status: Joi.string().valid('active', 'inactive', 'pending')
    });

    test('should pass validation with valid UUID params', () => {
      req.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '550e8400-e29b-41d4-a716-446655440000'
      };

      const middleware = validateParams(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(req.params.organizationId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    test('should fail validation with invalid UUID format', () => {
      req.params = {
        id: 'not-a-uuid'
      };

      const middleware = validateParams(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Parameter validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'id',
              message: expect.stringContaining('valid GUID')
            })
          ])
        })
      );
    });

    test('should fail validation with missing required param', () => {
      req.params = {
        organizationId: '550e8400-e29b-41d4-a716-446655440000'
        // Missing required 'id'
      };

      const middleware = validateParams(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'id',
              message: expect.stringContaining('required')
            })
          ])
        })
      );
    });

    test('should validate enum values correctly', () => {
      req.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'invalid_status'
      };

      const middleware = validateParams(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'status',
              message: expect.stringContaining('one of')
            })
          ])
        })
      );
    });

    test('should strip unknown params', () => {
      req.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        unknownParam: 'should be removed'
      };

      const middleware = validateParams(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params).not.toHaveProperty('unknownParam');
    });

    test('should handle middleware errors', () => {
      const invalidSchema = null;
      req.params = { id: 'test' };

      const middleware = validateParams(invalidSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('error response format', () => {
    test('should include timestamp in error response', () => {
      const schema = Joi.object({
        required_field: Joi.string().required()
      });

      req.body = {};

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    test('should include field path for nested objects', () => {
      const schema = Joi.object({
        user: Joi.object({
          profile: Joi.object({
            name: Joi.string().required()
          }).required()
        }).required()
      });

      req.body = {
        user: {
          profile: {}
        }
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.details[0].field).toBe('user.profile.name');
    });

    test('should include context value in error details', () => {
      const schema = Joi.object({
        age: Joi.number().min(18)
      });

      req.body = {
        age: 15
      };

      const middleware = validateRequest(schema);
      middleware(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.details[0].value).toBe(15);
    });
  });
});