/**
 * OrganizationService Unit Tests
 * Tests business logic in isolation with mocked dependencies
 */

const OrganizationService = require('../../services/OrganizationService');

// Mock Logger
jest.mock('../../utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

describe('OrganizationService Unit Tests', () => {
  let organizationService;
  let mockOrganizationRepository;
  let mockUserOrganizationRepository;
  let mockUserRepository;
  let mockProductRepository;
  let mockWarehouseRepository;
  let mockStockMovementRepository;

  beforeEach(() => {
    // Mock all repositories
    mockOrganizationRepository = {
      getAll: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      client: {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn()
          }))
        }))
      }
    };

    mockUserOrganizationRepository = {
      create: jest.fn(),
      getUserOrganizations: jest.fn(),
      getUserRole: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getOrganizationMembers: jest.fn(),
      findAll: jest.fn(),
      deleteByFilter: jest.fn()
    };

    mockUserRepository = {
      getAll: jest.fn(),
      create: jest.fn()
    };

    mockProductRepository = {
      deleteByFilter: jest.fn()
    };

    mockWarehouseRepository = {
      findAll: jest.fn(),
      deleteByFilter: jest.fn()
    };

    mockStockMovementRepository = {
      deleteByFilter: jest.fn()
    };

    // Create service instance with mocks
    organizationService = new OrganizationService(
      mockOrganizationRepository,
      mockUserOrganizationRepository,
      mockUserRepository,
      mockProductRepository,
      mockWarehouseRepository,
      mockStockMovementRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllOrganizations', () => {
    test('should fetch all organizations successfully', async () => {
      const expectedOrganizations = [
        { organization_id: 'org-1', name: 'Organization 1' },
        { organization_id: 'org-2', name: 'Organization 2' }
      ];
      const options = { limit: 10, offset: 0 };
      
      mockOrganizationRepository.getAll.mockResolvedValue(expectedOrganizations);

      const result = await organizationService.getAllOrganizations(options);

      expect(result).toEqual(expectedOrganizations);
      expect(mockOrganizationRepository.getAll).toHaveBeenCalledWith(options);
    });

    test('should handle repository errors', async () => {
      const error = new Error('Database connection failed');
      
      mockOrganizationRepository.getAll.mockRejectedValue(error);

      await expect(organizationService.getAllOrganizations())
        .rejects.toThrow('Database connection failed');
    });

    test('should use empty options by default', async () => {
      mockOrganizationRepository.getAll.mockResolvedValue([]);

      await organizationService.getAllOrganizations();

      expect(mockOrganizationRepository.getAll).toHaveBeenCalledWith({});
    });
  });

  describe('createOrganizationForUser', () => {
    const organizationData = {
      name: 'Test Organization',
      slug: 'test-org'
    };
    const userId = 'user-123';

    test('should create organization and owner relationship successfully', async () => {
      const expectedOrganization = {
        organization_id: 'org-123',
        ...organizationData
      };
      const expectedRelationship = {
        user_organization_id: 'rel-123',
        user_id: userId,
        organization_id: 'org-123',
        role: 'super_admin'
      };

      mockOrganizationRepository.create.mockResolvedValue(expectedOrganization);
      mockUserOrganizationRepository.create.mockResolvedValue(expectedRelationship);

      const result = await organizationService.createOrganizationForUser(organizationData, userId);

      expect(result.organization).toEqual(expectedOrganization);
      expect(result.ownerRelationship).toEqual(expectedRelationship);
      
      expect(mockOrganizationRepository.create).toHaveBeenCalledWith(organizationData);
      expect(mockUserOrganizationRepository.create).toHaveBeenCalledWith({
        user_id: userId,
        organization_id: 'org-123',
        role: 'super_admin',
        permissions: ['*']
      });
    });

    test('should handle organization creation failure', async () => {
      const error = new Error('Organization creation failed');
      
      mockOrganizationRepository.create.mockRejectedValue(error);

      await expect(organizationService.createOrganizationForUser(organizationData, userId))
        .rejects.toThrow('Organization creation failed');
      
      expect(mockUserOrganizationRepository.create).not.toHaveBeenCalled();
    });

    test('should handle relationship creation failure', async () => {
      const expectedOrganization = { organization_id: 'org-123' };
      const error = new Error('Relationship creation failed');
      
      mockOrganizationRepository.create.mockResolvedValue(expectedOrganization);
      mockUserOrganizationRepository.create.mockRejectedValue(error);

      await expect(organizationService.createOrganizationForUser(organizationData, userId))
        .rejects.toThrow('Relationship creation failed');
    });
  });

  describe('addUserToOrganization', () => {
    const userOrgData = {
      user_id: 'user-123',
      organization_id: 'org-123',
      role: 'admin',
      permissions: ['read', 'write']
    };

    test('should add user to organization successfully', async () => {
      const expectedRelationship = {
        user_organization_id: 'rel-123',
        ...userOrgData
      };

      mockUserOrganizationRepository.create.mockResolvedValue(expectedRelationship);

      const result = await organizationService.addUserToOrganization(userOrgData);

      expect(result).toEqual(expectedRelationship);
      expect(mockUserOrganizationRepository.create).toHaveBeenCalledWith(userOrgData);
    });

    test('should handle relationship creation errors', async () => {
      const error = new Error('Relationship already exists');
      
      mockUserOrganizationRepository.create.mockRejectedValue(error);

      await expect(organizationService.addUserToOrganization(userOrgData))
        .rejects.toThrow('Relationship already exists');
    });
  });

  describe('createWithOwner', () => {
    const organizationData = {
      name: 'Test Organization',
      slug: 'test-org'
    };
    const ownerId = 'user-123';

    test('should create organization with owner successfully', async () => {
      const expectedOrganization = {
        organization_id: 'org-123',
        ...organizationData
      };
      const expectedRelationship = {
        user_organization_id: 'rel-123',
        user_id: ownerId,
        organization_id: 'org-123',
        role: 'super_admin'
      };

      mockOrganizationRepository.create.mockResolvedValue(expectedOrganization);
      mockUserOrganizationRepository.create.mockResolvedValue(expectedRelationship);

      const result = await organizationService.createWithOwner(organizationData, ownerId);

      expect(result.organization).toEqual(expectedOrganization);
      expect(result.ownerRelationship).toEqual(expectedRelationship);
      
      expect(mockUserOrganizationRepository.create).toHaveBeenCalledWith({
        user_id: ownerId,
        organization_id: 'org-123',
        role: 'super_admin',
        permissions: ['*']
      });
    });

    test('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      
      mockOrganizationRepository.create.mockRejectedValue(error);

      await expect(organizationService.createWithOwner(organizationData, ownerId))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('getUserOrganizations', () => {
    const userId = 'user-123';

    test('should get user organizations with proper mapping', async () => {
      const mockUserOrgs = [
        {
          user_organization_id: 'rel-123',
          user_id: userId,
          organization_id: 'org-123',
          branch_id: 'branch-123',
          role: 'admin',
          permissions: ['read', 'write'],
          is_active: true,
          joined_at: '2024-01-01T00:00:00Z',
          organization: { name: 'Test Org' },
          branch: { name: 'Test Branch' }
        }
      ];

      mockUserOrganizationRepository.getUserOrganizations.mockResolvedValue(mockUserOrgs);

      const result = await organizationService.getUserOrganizations(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          user_organization_id: 'rel-123',
          user_id: userId,
          organization_id: 'org-123',
          role: 'admin',
          permissions: ['read', 'write'],
          userRole: 'admin',
          userPermissions: ['read', 'write'],
          userOrganizationId: 'rel-123'
        })
      );
    });

    test('should handle empty user organizations', async () => {
      mockUserOrganizationRepository.getUserOrganizations.mockResolvedValue([]);

      const result = await organizationService.getUserOrganizations(userId);

      expect(result).toEqual([]);
    });

    test('should handle repository errors', async () => {
      const error = new Error('Database error');
      
      mockUserOrganizationRepository.getUserOrganizations.mockRejectedValue(error);

      await expect(organizationService.getUserOrganizations(userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('inviteUser', () => {
    const inviteData = {
      email: 'newuser@example.com',
      name: 'New User',
      organization_id: 'org-123',
      branch_id: 'branch-123',
      role: 'employee',
      permissions: ['read']
    };
    const inviterId = 'inviter-123';

    beforeEach(() => {
      // Mock inviter has admin role by default
      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'admin'
      });
    });

    test('should invite existing user successfully', async () => {
      const existingUser = {
        user_id: 'existing-user-123',
        email: inviteData.email,
        name: 'Existing User'
      };
      const expectedRelationship = {
        user_organization_id: 'rel-123',
        user_id: 'existing-user-123',
        organization_id: inviteData.organization_id
      };

      mockUserRepository.getAll.mockResolvedValue([existingUser]);
      mockUserOrganizationRepository.create.mockResolvedValue(expectedRelationship);

      const result = await organizationService.inviteUser(inviteData, inviterId);

      expect(result.user).toEqual(existingUser);
      expect(result.relationship).toEqual(expectedRelationship);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    test('should create and invite new user successfully', async () => {
      const newUser = {
        user_id: 'new-user-123',
        email: inviteData.email,
        name: inviteData.name
      };
      const expectedRelationship = {
        user_organization_id: 'rel-123',
        user_id: 'new-user-123',
        organization_id: inviteData.organization_id
      };

      mockUserRepository.getAll.mockResolvedValue([]);
      mockUserRepository.create.mockResolvedValue(newUser);
      mockUserOrganizationRepository.create.mockResolvedValue(expectedRelationship);

      const result = await organizationService.inviteUser(inviteData, inviterId);

      expect(result.user).toEqual(newUser);
      expect(result.relationship).toEqual(expectedRelationship);
      
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: inviteData.email,
          name: inviteData.name,
          role: 'employee',
          is_active: true
        })
      );
    });

    test('should fail if inviter has insufficient permissions', async () => {
      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'employee' // Insufficient permission
      });

      await expect(organizationService.inviteUser(inviteData, inviterId))
        .rejects.toThrow('Insufficient permissions to invite users');
    });

    test('should fail if inviter has no role', async () => {
      mockUserOrganizationRepository.getUserRole.mockResolvedValue(null);

      await expect(organizationService.inviteUser(inviteData, inviterId))
        .rejects.toThrow('Insufficient permissions to invite users');
    });
  });

  describe('getMembers', () => {
    const organizationId = 'org-123';

    test('should get organization members with proper mapping', async () => {
      const mockMembers = [
        {
          user_organization_id: 'rel-123',
          user_id: 'user-123',
          role: 'admin',
          permissions: ['read', 'write'],
          is_active: true,
          joined_at: '2024-01-01T00:00:00Z',
          user: {
            name: 'John Doe',
            email: 'john@example.com'
          },
          branch: {
            name: 'Main Branch'
          }
        }
      ];

      mockUserOrganizationRepository.getOrganizationMembers.mockResolvedValue(mockMembers);

      const result = await organizationService.getMembers(organizationId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userOrganizationId: 'rel-123',
        userId: 'user-123',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        role: 'admin',
        permissions: ['read', 'write'],
        branch: { name: 'Main Branch' },
        isActive: true,
        joinedAt: '2024-01-01T00:00:00Z'
      });
    });

    test('should pass options to repository', async () => {
      const options = { active_only: true, limit: 10 };
      
      mockUserOrganizationRepository.getOrganizationMembers.mockResolvedValue([]);

      await organizationService.getMembers(organizationId, options);

      expect(mockUserOrganizationRepository.getOrganizationMembers)
        .toHaveBeenCalledWith(organizationId, options);
    });
  });

  describe('updateMemberRole', () => {
    const userOrganizationId = 'rel-123';
    const updateData = { role: 'admin', permissions: ['read', 'write'] };
    const updaterId = 'updater-123';

    beforeEach(() => {
      // Mock relationship exists
      mockUserOrganizationRepository.getById.mockResolvedValue({
        user_organization_id: userOrganizationId,
        organization_id: 'org-123'
      });
      
      // Mock updater has admin role
      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'admin'
      });
    });

    test('should update member role successfully', async () => {
      const updatedRelationship = {
        user_organization_id: userOrganizationId,
        ...updateData
      };

      mockUserOrganizationRepository.update.mockResolvedValue(updatedRelationship);

      const result = await organizationService.updateMemberRole(userOrganizationId, updateData, updaterId);

      expect(result).toEqual(updatedRelationship);
      expect(mockUserOrganizationRepository.update).toHaveBeenCalledWith(userOrganizationId, updateData);
    });

    test('should fail if relationship not found', async () => {
      mockUserOrganizationRepository.getById.mockResolvedValue(null);

      await expect(organizationService.updateMemberRole(userOrganizationId, updateData, updaterId))
        .rejects.toThrow('User organization relationship not found');
    });

    test('should fail if updater has insufficient permissions', async () => {
      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'employee'
      });

      await expect(organizationService.updateMemberRole(userOrganizationId, updateData, updaterId))
        .rejects.toThrow('Insufficient permissions to update member roles');
    });
  });

  describe('removeMember', () => {
    const userOrganizationId = 'rel-123';
    const removerId = 'remover-123';

    beforeEach(() => {
      // Mock relationship exists
      mockUserOrganizationRepository.getById.mockResolvedValue({
        user_organization_id: userOrganizationId,
        organization_id: 'org-123',
        user_id: 'user-123',
        role: 'employee'
      });
      
      // Mock remover has admin role
      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'admin'
      });
    });

    test('should remove member successfully', async () => {
      mockUserOrganizationRepository.remove.mockResolvedValue(true);

      const result = await organizationService.removeMember(userOrganizationId, removerId);

      expect(result).toBe(true);
      expect(mockUserOrganizationRepository.remove).toHaveBeenCalledWith(userOrganizationId);
    });

    test('should fail if relationship not found', async () => {
      mockUserOrganizationRepository.getById.mockResolvedValue(null);

      await expect(organizationService.removeMember(userOrganizationId, removerId))
        .rejects.toThrow('User organization relationship not found');
    });

    test('should prevent removing organization owner', async () => {
      const ownerRelationship = {
        user_organization_id: userOrganizationId,
        organization_id: 'org-123',
        user_id: 'owner-123',
        role: 'super_admin'
      };
      const organization = {
        organization_id: 'org-123',
        owner_user_id: 'owner-123'
      };

      mockUserOrganizationRepository.getById.mockResolvedValue(ownerRelationship);
      mockOrganizationRepository.getById.mockResolvedValue(organization);

      await expect(organizationService.removeMember(userOrganizationId, removerId))
        .rejects.toThrow('Cannot remove organization owner');
    });

    test('should allow removing non-owner super_admin', async () => {
      const adminRelationship = {
        user_organization_id: userOrganizationId,
        organization_id: 'org-123',
        user_id: 'admin-123',
        role: 'super_admin'
      };
      const organization = {
        organization_id: 'org-123',
        owner_user_id: 'owner-456' // Different from admin-123
      };

      mockUserOrganizationRepository.getById.mockResolvedValue(adminRelationship);
      mockOrganizationRepository.getById.mockResolvedValue(organization);
      mockUserOrganizationRepository.remove.mockResolvedValue(true);

      const result = await organizationService.removeMember(userOrganizationId, removerId);

      expect(result).toBe(true);
      expect(mockUserOrganizationRepository.remove).toHaveBeenCalledWith(userOrganizationId);
    });
  });

  describe('getById', () => {
    test('should get organization by ID successfully', async () => {
      const organizationId = 'org-123';
      const expectedOrg = {
        organization_id: organizationId,
        name: 'Test Organization'
      };

      mockOrganizationRepository.getById.mockResolvedValue(expectedOrg);

      const result = await organizationService.getById(organizationId);

      expect(result).toEqual(expectedOrg);
      expect(mockOrganizationRepository.getById).toHaveBeenCalledWith(organizationId);
    });

    test('should handle repository errors', async () => {
      const organizationId = 'org-123';
      const error = new Error('Organization not found');

      mockOrganizationRepository.getById.mockRejectedValue(error);

      await expect(organizationService.getById(organizationId))
        .rejects.toThrow('Organization not found');
    });
  });

  describe('update', () => {
    const organizationId = 'org-123';
    const updateData = { name: 'Updated Organization' };
    const updaterId = 'updater-123';

    test('should update organization successfully', async () => {
      const updatedOrg = {
        organization_id: organizationId,
        ...updateData
      };

      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'super_admin'
      });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      const result = await organizationService.update(organizationId, updateData, updaterId);

      expect(result).toEqual(updatedOrg);
      expect(mockOrganizationRepository.update).toHaveBeenCalledWith(organizationId, updateData);
    });

    test('should fail if updater has insufficient permissions', async () => {
      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'admin' // Only super_admin can update organization
      });

      await expect(organizationService.update(organizationId, updateData, updaterId))
        .rejects.toThrow('Insufficient permissions to update organization');
    });
  });

  describe('deleteOrganization', () => {
    const organizationId = 'org-123';
    const deleterId = 'deleter-123';

    beforeEach(() => {
      // Mock deleter has super_admin role
      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'super_admin'
      });
      
      // Mock organization exists
      mockOrganizationRepository.getById.mockResolvedValue({
        organization_id: organizationId,
        name: 'Test Organization'
      });

      // Mock cascade deletion data
      mockWarehouseRepository.findAll.mockResolvedValue([
        { warehouse_id: 'warehouse-1' },
        { warehouse_id: 'warehouse-2' }
      ]);
      mockUserOrganizationRepository.findAll.mockResolvedValue([
        { user_id: 'user-1' },
        { user_id: 'user-2' }
      ]);

      // Mock deletion methods
      mockStockMovementRepository.deleteByFilter.mockResolvedValue(5);
      mockProductRepository.deleteByFilter.mockResolvedValue(10);
      mockWarehouseRepository.deleteByFilter.mockResolvedValue(2);
      mockUserOrganizationRepository.deleteByFilter.mockResolvedValue(3);
      mockOrganizationRepository.delete.mockResolvedValue(true);

      // Mock supabase chaining on organizationRepository.client
      // The service uses: supabase.from('products').select('product_id').eq(...)
      // and: supabase.from('order_details').delete().in(...)
      // and: supabase.from('branches').delete().eq(...)
      // and: supabase.from('orders').select('order_id').in(...)
      const makeChain = (resolvedValue) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          then: undefined
        };
        // Make the chain thenable so awaiting it returns resolvedValue
        chain.eq = jest.fn().mockImplementation(() => ({ ...chain, then: (res) => res(resolvedValue) }));
        chain.in = jest.fn().mockImplementation(() => ({ ...chain, then: (res) => res(resolvedValue) }));
        chain.select = jest.fn().mockImplementation(() => ({ ...chain, then: (res) => res(resolvedValue) }));
        return chain;
      };

      mockOrganizationRepository.client.from.mockImplementation((table) => {
        if (table === 'products') {
          // select('product_id').eq('organization_id', ...) → return product IDs so deleteByFilter is triggered
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [{ product_id: 'prod-1' }, { product_id: 'prod-2' }], error: null }),
            in: jest.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        if (table === 'orders') {
          // select('order_id').in('warehouse_id', ...) → return empty so no further order_details deletions
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        // delete().eq(...) or delete().in(...) — returns { error: null }
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
            in: jest.fn().mockResolvedValue({ error: null })
          }),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          in: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });
    });

    test('should delete organization with cascade successfully', async () => {
      const result = await organizationService.deleteOrganization(organizationId, deleterId);

      expect(result).toBe(true);

      // Verify cascade deletion order
      expect(mockWarehouseRepository.findAll).toHaveBeenCalledWith({ organization_id: organizationId });
      expect(mockStockMovementRepository.deleteByFilter).toHaveBeenCalledTimes(2); // For each warehouse
      expect(mockProductRepository.deleteByFilter).toHaveBeenCalledTimes(1); // Once for all org products
      expect(mockWarehouseRepository.deleteByFilter).toHaveBeenCalledWith({ organization_id: organizationId });
      expect(mockUserOrganizationRepository.deleteByFilter).toHaveBeenCalledWith({ organization_id: organizationId });
      expect(mockOrganizationRepository.delete).toHaveBeenCalledWith(organizationId, 'organization_id');
    });

    test('should fail if organization not found', async () => {
      mockOrganizationRepository.getById.mockResolvedValue(null);

      await expect(organizationService.deleteOrganization(organizationId, deleterId))
        .rejects.toThrow('Organization not found');
    });

    test('should fail if deleter has insufficient permissions', async () => {
      mockUserOrganizationRepository.getUserRole.mockResolvedValue({
        role: 'admin' // Only super_admin can delete
      });

      await expect(organizationService.deleteOrganization(organizationId, deleterId))
        .rejects.toThrow('Insufficient permissions to delete organization');
    });

    test('should fail if deleter has no role', async () => {
      mockUserOrganizationRepository.getUserRole.mockResolvedValue(null);

      await expect(organizationService.deleteOrganization(organizationId, deleterId))
        .rejects.toThrow('Insufficient permissions to delete organization');
    });

    test('should handle cascade deletion errors gracefully', async () => {
      const error = new Error('Cascade deletion failed');
      mockStockMovementRepository.deleteByFilter.mockRejectedValue(error);

      await expect(organizationService.deleteOrganization(organizationId, deleterId))
        .rejects.toThrow('Cascade deletion failed');
    });

    test('should handle branch deletion errors gracefully', async () => {
      mockOrganizationRepository.client.from.mockImplementation((table) => {
        if (table === 'products' || table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        // For 'branches' (and other delete-only tables): return branch deletion error
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: new Error('Branch deletion failed') }),
            in: jest.fn().mockResolvedValue({ error: null })
          }),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          in: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      // Should still complete successfully despite branch deletion warning
      const result = await organizationService.deleteOrganization(organizationId, deleterId);

      expect(result).toBe(true);
    });
  });
});