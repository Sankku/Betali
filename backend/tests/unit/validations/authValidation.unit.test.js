/**
 * Authentication Validation Schema Unit Tests
 * Tests Joi validation schemas in isolation
 */

const { 
  completeSignupSchema, 
  loginSchema, 
  resetPasswordSchema 
} = require('../../../validations/authValidation');

describe('Authentication Validation Schemas Unit Tests', () => {
  describe('completeSignupSchema', () => {
    const validData = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      name: 'Test User',
      organization_name: 'Test Organization'
    };

    test('should pass validation with valid complete data', () => {
      const { error, value } = completeSignupSchema.validate(validData);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    test('should pass validation without optional organization_name', () => {
      const dataWithoutOrg = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User'
      };

      const { error, value } = completeSignupSchema.validate(dataWithoutOrg);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(dataWithoutOrg);
    });

    test('should allow .test domain emails', () => {
      const testData = {
        ...validData,
        email: 'test@example.test'
      };

      const { error } = completeSignupSchema.validate(testData);
      
      expect(error).toBeUndefined();
    });

    test('should allow various email formats', () => {
      const emailFormats = [
        'user@domain.com',
        'user.name@domain.co.uk',
        'user+tag@domain.org',
        'user123@123domain.com',
        'test@localhost.test',
        'user@domain-with-dash.com'
      ];

      emailFormats.forEach(email => {
        const testData = { ...validData, email };
        const { error } = completeSignupSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });
    });

    describe('user_id field validation', () => {
      test('should fail with missing user_id', () => {
        const invalidData = { ...validData };
        delete invalidData.user_id;

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('User ID is required');
        expect(error.details[0].path).toEqual(['user_id']);
      });

      test('should fail with invalid UUID format', () => {
        const invalidData = { ...validData, user_id: 'not-a-uuid' };

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('User ID must be a valid UUID');
      });

      test('should fail with empty user_id', () => {
        const invalidData = { ...validData, user_id: '' };

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('User ID must be a valid UUID');
      });
    });

    describe('email field validation', () => {
      test('should fail with missing email', () => {
        const invalidData = { ...validData };
        delete invalidData.email;

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Email is required');
      });

      test('should fail with invalid email format', () => {
        const invalidEmails = [
          'not-an-email',
          '@domain.com',
          'user@',
          'user..name@domain.com',
          'user name@domain.com',
          'user@domain..com'
        ];

        invalidEmails.forEach(email => {
          const invalidData = { ...validData, email };
          const { error } = completeSignupSchema.validate(invalidData);
          
          expect(error).toBeDefined();
          expect(error.details[0].message).toBe('Please provide a valid email address');
        });
      });

      test('should fail with empty email', () => {
        const invalidData = { ...validData, email: '' };

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Please provide a valid email address');
      });
    });

    describe('name field validation', () => {
      test('should fail with missing name', () => {
        const invalidData = { ...validData };
        delete invalidData.name;

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Name is required');
      });

      test('should fail with empty name', () => {
        const invalidData = { ...validData, name: '' };

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Name must be at least 1 character long');
      });

      test('should fail with name exceeding 255 characters', () => {
        const longName = 'a'.repeat(256);
        const invalidData = { ...validData, name: longName };

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Name cannot exceed 255 characters');
      });

      test('should pass with name at maximum length', () => {
        const maxName = 'a'.repeat(255);
        const testData = { ...validData, name: maxName };

        const { error } = completeSignupSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });
    });

    describe('organization_name field validation', () => {
      test('should pass with valid organization name', () => {
        const testData = { ...validData, organization_name: 'My Company Inc.' };

        const { error } = completeSignupSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });

      test('should fail with empty organization name', () => {
        const invalidData = { ...validData, organization_name: '' };

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Organization name must be at least 1 character long');
      });

      test('should fail with organization name exceeding 255 characters', () => {
        const longOrgName = 'a'.repeat(256);
        const invalidData = { ...validData, organization_name: longOrgName };

        const { error } = completeSignupSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Organization name cannot exceed 255 characters');
      });

      test('should pass with organization name at maximum length', () => {
        const maxOrgName = 'a'.repeat(255);
        const testData = { ...validData, organization_name: maxOrgName };

        const { error } = completeSignupSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });
    });

    test('should report multiple validation errors', () => {
      const invalidData = {
        user_id: 'invalid-uuid',
        email: 'invalid-email',
        name: '',
        organization_name: 'a'.repeat(256)
      };

      const { error } = completeSignupSchema.validate(invalidData, { abortEarly: false });
      
      expect(error).toBeDefined();
      expect(error.details).toHaveLength(4);
      expect(error.details.map(d => d.path[0])).toEqual(['user_id', 'email', 'name', 'organization_name']);
    });
  });

  describe('loginSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123'
    };

    test('should pass validation with valid data', () => {
      const { error, value } = loginSchema.validate(validData);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    test('should allow .test domain emails', () => {
      const testData = {
        ...validData,
        email: 'test@example.test'
      };

      const { error } = loginSchema.validate(testData);
      
      expect(error).toBeUndefined();
    });

    describe('email field validation', () => {
      test('should fail with missing email', () => {
        const invalidData = { password: 'password123' };

        const { error } = loginSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Email is required');
      });

      test('should fail with invalid email format', () => {
        const invalidData = { ...validData, email: 'invalid-email' };

        const { error } = loginSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Please provide a valid email address');
      });
    });

    describe('password field validation', () => {
      test('should fail with missing password', () => {
        const invalidData = { email: 'test@example.com' };

        const { error } = loginSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Password is required');
      });

      test('should fail with password shorter than 6 characters', () => {
        const invalidData = { ...validData, password: '12345' };

        const { error } = loginSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Password must be at least 6 characters long');
      });

      test('should pass with password exactly 6 characters', () => {
        const testData = { ...validData, password: '123456' };

        const { error } = loginSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });

      test('should pass with long password', () => {
        const testData = { ...validData, password: 'very-long-password-with-special-chars!@#$%' };

        const { error } = loginSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });
    });

    test('should report multiple validation errors', () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123'
      };

      const { error } = loginSchema.validate(invalidData, { abortEarly: false });
      
      expect(error).toBeDefined();
      expect(error.details).toHaveLength(2);
    });
  });

  describe('resetPasswordSchema', () => {
    const validData = {
      email: 'test@example.com'
    };

    test('should pass validation with valid email', () => {
      const { error, value } = resetPasswordSchema.validate(validData);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    test('should fail with missing email', () => {
      const invalidData = {};

      const { error } = resetPasswordSchema.validate(invalidData);
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Email is required');
    });

    test('should fail with invalid email format', () => {
      const invalidData = { email: 'not-an-email' };

      const { error } = resetPasswordSchema.validate(invalidData);
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Please provide a valid email address');
    });

    test('should pass with various valid email formats', () => {
      const validEmails = [
        'user@domain.com',
        'user.name@domain.co.uk',
        'user+tag@domain.org',
        'user123@123domain.com'
      ];

      validEmails.forEach(email => {
        const testData = { email };
        const { error } = resetPasswordSchema.validate(testData);
        
        expect(error).toBeUndefined();
      });
    });

    test('should strip unknown fields', () => {
      const dataWithExtra = {
        email: 'test@example.com',
        unknownField: 'should be removed',
        password: 'should not be here'
      };

      const { error, value } = resetPasswordSchema.validate(dataWithExtra, { stripUnknown: true });
      
      expect(error).toBeUndefined();
      expect(value).toEqual({ email: 'test@example.com' });
      expect(value).not.toHaveProperty('unknownField');
      expect(value).not.toHaveProperty('password');
    });
  });

  describe('schema integration', () => {
    test('should handle empty objects', () => {
      const schemas = [completeSignupSchema, loginSchema, resetPasswordSchema];
      
      schemas.forEach(schema => {
        const { error } = schema.validate({});
        expect(error).toBeDefined();
        expect(error.details.length).toBeGreaterThan(0);
      });
    });

    test('should handle null values', () => {
      const schemas = [completeSignupSchema, loginSchema, resetPasswordSchema];
      
      schemas.forEach(schema => {
        const { error } = schema.validate(null);
        expect(error).toBeDefined();
      });
    });

    test('should handle undefined values', () => {
      const schemas = [completeSignupSchema, loginSchema, resetPasswordSchema];
      
      schemas.forEach(schema => {
        const { error } = schema.validate(undefined);
        expect(error).toBeDefined();
      });
    });
  });
});