/**
 * Authentication Middleware Unit Tests
 * Tests auth middleware in isolation with mocked dependencies
 */

// Mock Logger (hoisted — must come before require)
jest.mock('../../../utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Mock the supabase client import (factory must be self-contained — no outer const refs)
jest.mock('../../../lib/supabaseClient', () => ({
  auth: { getUser: jest.fn() },
  from: jest.fn()
}));

const { authenticateUser, optionalAuth } = require('../../../middleware/auth');

// Get reference to the mocked module for controlling in tests
const mockSupabase = require('../../../lib/supabaseClient');

describe('Authentication Middleware Unit Tests', () => {
  let req, res, next;
  let mockFrom, mockSelect, mockEq, mockSingle;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock request object
    req = {
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock next function
    next = jest.fn();

    // Mock Supabase query chain
    mockSingle = jest.fn();
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
    mockSupabase.from = mockFrom;
  });

  describe('authenticateUser middleware', () => {
    test('should reject request without authorization header', async () => {
      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized. Bearer token required.',
        code: 'MISSING_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request with invalid authorization header format', async () => {
      req.headers.authorization = 'Invalid token format';

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized. Bearer token required.',
        code: 'MISSING_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid token', async () => {
      req.headers.authorization = 'Bearer invalid_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token')
      });

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token.',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle expired token specifically', async () => {
      req.headers.authorization = 'Bearer expired_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Token has expired')
      });

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token has expired.',
        code: 'TOKEN_EXPIRED'
      });
    });

    test('should reject inactive user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      req.headers.authorization = 'Bearer valid_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock user profile query for inactive user
      mockSingle.mockResolvedValue({
        data: {
          user_id: 'user-123',
          email: 'test@example.com',
          is_active: false
        },
        error: null
      });

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account is inactive',
        message: 'Your account has been deactivated. Please contact an administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should authenticate user successfully with organizations', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      req.headers.authorization = 'Bearer valid_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock user profile query
      mockSingle.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          email: 'test@example.com',
          is_active: true
        },
        error: null
      });

      // Mock user organizations query
      const mockUserOrgs = [
        {
          organization_id: 'org-123',
          role: 'admin',
          permissions: ['read', 'write'],
          organization: { name: 'Test Org', slug: 'test-org' }
        },
        {
          organization_id: 'org-456', 
          role: 'viewer',
          permissions: ['read'],
          organization: { name: 'Other Org', slug: 'other-org' }
        }
      ];

      // Create separate mock for organizations query
      const mockOrgQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockUserOrgs,
              error: null
            })
          })
        })
      };

      // Override mockFrom to return different results based on table
      mockSupabase.from = jest.fn((table) => {
        if (table === 'users') {
          return { select: mockSelect };
        } else if (table === 'user_organizations') {
          return mockOrgQuery;
        }
      });

      await authenticateUser(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-123');
      expect(req.user.role).toBe('ADMIN'); // Highest role
      expect(req.user.currentOrganizationId).toBe('org-123'); // First org
      expect(req.user.organizationRoles).toEqual(mockUserOrgs);
      expect(next).toHaveBeenCalled();
    });

    test('should use x-organization-id header for organization context', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      req.headers.authorization = 'Bearer valid_token';
      req.headers['x-organization-id'] = 'org-456';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123', is_active: true },
        error: null
      });

      const mockUserOrgs = [
        {
          organization_id: 'org-123',
          role: 'admin',
          organization: { name: 'Test Org' }
        },
        {
          organization_id: 'org-456',
          role: 'viewer',
          organization: { name: 'Other Org' }
        }
      ];

      const mockOrgQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockUserOrgs,
              error: null
            })
          })
        })
      };

      mockSupabase.from = jest.fn((table) => {
        if (table === 'users') {
          return { select: mockSelect };
        } else if (table === 'user_organizations') {
          return mockOrgQuery;
        }
      });

      await authenticateUser(req, res, next);

      expect(req.user.currentOrganizationId).toBe('org-456'); // Requested org
      expect(req.user.currentOrganizationRole).toBe('VIEWER');
    });

    test('should handle user without organizations', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      req.headers.authorization = 'Bearer valid_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123', is_active: true },
        error: null
      });

      // Mock empty organizations
      const mockOrgQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      };

      mockSupabase.from = jest.fn((table) => {
        if (table === 'users') {
          return { select: mockSelect };
        } else if (table === 'user_organizations') {
          return mockOrgQuery;
        }
      });

      await authenticateUser(req, res, next);

      expect(req.user.role).toBe('VIEWER');
      expect(req.user.organizationRoles).toEqual([]);
      expect(req.user.currentOrganizationId).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      req.headers.authorization = 'Bearer valid_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock database error
      mockSingle.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      await authenticateUser(req, res, next);

      expect(req.user.role).toBe('VIEWER'); // Default fallback
      expect(req.user.isActive).toBe(true); // Default fallback
      expect(next).toHaveBeenCalled();
    });

    test('should handle auth service errors with 401 status', async () => {
      req.headers.authorization = 'Bearer valid_token';

      // When getUser rejects, the middleware catches it internally and returns 401
      // (not 500 — the inner try-catch handles it as an auth failure, not an unhandled error)
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'));

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should validate role hierarchy correctly', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      req.headers.authorization = 'Bearer valid_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123', is_active: true },
        error: null
      });

      // Test role hierarchy: should pick highest role
      const mockUserOrgs = [
        { organization_id: 'org-1', role: 'viewer', organization: {} },
        { organization_id: 'org-2', role: 'super_admin', organization: {} },
        { organization_id: 'org-3', role: 'admin', organization: {} }
      ];

      const mockOrgQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockUserOrgs,
              error: null
            })
          })
        })
      };

      mockSupabase.from = jest.fn((table) => {
        if (table === 'users') {
          return { select: mockSelect };
        } else if (table === 'user_organizations') {
          return mockOrgQuery;
        }
      });

      await authenticateUser(req, res, next);

      expect(req.user.role).toBe('SUPER_ADMIN'); // Highest role selected
    });
  });

  describe('optionalAuth middleware', () => {
    test('should proceed without token', async () => {
      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should proceed without Bearer prefix', async () => {
      req.headers.authorization = 'Basic invalid';

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test('should set user if valid token provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      req.headers.authorization = 'Bearer valid_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      await optionalAuth(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    test('should proceed gracefully if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid_token';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token')
      });

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test('should handle unexpected errors gracefully', async () => {
      req.headers.authorization = 'Bearer valid_token';
      
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'));

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});