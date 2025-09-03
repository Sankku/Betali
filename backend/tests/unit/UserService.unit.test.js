/**
 * UserService Unit Tests
 * Tests business logic in isolation with mocked dependencies
 */

const UserService = require('../../services/UserService');

describe('UserService Unit Tests', () => {
  let userService;
  let mockUserRepository;
  let mockLogger;

  beforeEach(() => {
    // Mock repository with all required methods
    mockUserRepository = {
      findByOrganization: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createFromAuth: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      findByRole: jest.fn()
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance with mocks
    userService = new UserService(mockUserRepository, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationUsers', () => {
    test('should fetch organization users successfully', async () => {
      const orgId = 'org-123';
      const expectedUsers = [
        { user_id: 'user-1', name: 'User 1', organization_id: orgId },
        { user_id: 'user-2', name: 'User 2', organization_id: orgId }
      ];
      
      mockUserRepository.findByOrganization.mockResolvedValue(expectedUsers);

      const result = await userService.getOrganizationUsers(orgId);

      expect(result).toEqual(expectedUsers);
      expect(mockUserRepository.findByOrganization).toHaveBeenCalledWith(orgId, {});
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching organization users', { organizationId: orgId, options: {} });
    });

    test('should pass options to repository', async () => {
      const orgId = 'org-123';
      const options = { limit: 10, offset: 0, role: 'admin' };
      
      mockUserRepository.findByOrganization.mockResolvedValue([]);

      await userService.getOrganizationUsers(orgId, options);

      expect(mockUserRepository.findByOrganization).toHaveBeenCalledWith(orgId, options);
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching organization users', { organizationId: orgId, options });
    });

    test('should handle repository errors', async () => {
      const orgId = 'org-123';
      const error = new Error('Database connection failed');
      
      mockUserRepository.findByOrganization.mockRejectedValue(error);

      await expect(userService.getOrganizationUsers(orgId))
        .rejects.toThrow('Database connection failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching organization users: ${error.message}`);
    });
  });

  describe('getUserById', () => {
    test('should fetch user successfully', async () => {
      const userId = 'user-123';
      const mockUser = {
        user_id: userId,
        name: 'Test User',
        email: 'test@example.com'
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockLogger.info).toHaveBeenCalledWith(`Fetching user: ${userId}`);
    });

    test('should throw 404 error when user not found', async () => {
      const userId = 'nonexistent-user';

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(userId))
        .rejects.toMatchObject({
          message: 'User not found',
          status: 404
        });
    });

    test('should handle repository errors and log them', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');

      mockUserRepository.findById.mockRejectedValue(error);

      await expect(userService.getUserById(userId))
        .rejects.toThrow('Database error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching user ${userId}: ${error.message}`);
    });
  });

  describe('getUserByEmail', () => {
    test('should fetch user by email successfully', async () => {
      const email = 'test@example.com';
      const mockUser = {
        user_id: 'user-123',
        email: email,
        name: 'Test User'
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockLogger.info).toHaveBeenCalledWith(`Fetching user by email: ${email}`);
    });

    test('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';

      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.getUserByEmail(email);

      expect(result).toBeNull();
    });

    test('should handle repository errors', async () => {
      const email = 'test@example.com';
      const error = new Error('Database error');

      mockUserRepository.findByEmail.mockRejectedValue(error);

      await expect(userService.getUserByEmail(email))
        .rejects.toThrow('Database error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching user by email ${email}: ${error.message}`);
    });
  });

  describe('createUserFromAuth', () => {
    const authData = {
      user_id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    test('should create user from auth successfully', async () => {
      const expectedUser = {
        user_id: authData.user_id,
        email: authData.email,
        name: authData.name,
        is_active: true,
        password_hash: 'SUPABASE_AUTH'
      };

      mockUserRepository.createFromAuth.mockResolvedValue(expectedUser);

      const result = await userService.createUserFromAuth(authData);

      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.createFromAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: authData.user_id,
          email: authData.email,
          name: authData.name,
          is_active: true,
          password_hash: 'SUPABASE_AUTH'
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Creating user from authentication', { 
        user_id: authData.user_id,
        email: authData.email 
      });
      expect(mockLogger.info).toHaveBeenCalledWith('User created from auth successfully', { 
        userId: expectedUser.user_id,
        email: expectedUser.email 
      });
    });

    test('should handle repository errors', async () => {
      const error = new Error('Duplicate user');
      
      mockUserRepository.createFromAuth.mockRejectedValue(error);

      await expect(userService.createUserFromAuth(authData))
        .rejects.toThrow('Duplicate user');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error creating user from auth: ${error.message}`);
    });

    test('should set proper timestamps', async () => {
      const expectedUser = { user_id: authData.user_id };
      
      mockUserRepository.createFromAuth.mockResolvedValue(expectedUser);

      await userService.createUserFromAuth(authData);

      expect(mockUserRepository.createFromAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        })
      );
    });
  });

  describe('createUser', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'admin',
      organization_id: 'org-123'
    };

    test('should create user successfully', async () => {
      const expectedUser = {
        user_id: 'user-123',
        ...validUserData
      };

      // Mock validation passing (no existing user)
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(expectedUser);

      const result = await userService.createUser(validUserData);

      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith(validUserData);
      expect(mockLogger.info).toHaveBeenCalledWith('Creating new user', { 
        email: validUserData.email, 
        role: validUserData.role 
      });
      expect(mockLogger.info).toHaveBeenCalledWith('User created successfully', { 
        userId: expectedUser.user_id,
        email: expectedUser.email 
      });
    });

    test('should fail validation if email already exists', async () => {
      const existingUser = { user_id: 'existing-123', email: validUserData.email };
      
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.createUser(validUserData))
        .rejects.toMatchObject({
          message: 'A user with this email already exists',
          status: 409
        });
      
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    test('should validate super_admin role rules', async () => {
      const superAdminData = {
        ...validUserData,
        role: 'super_admin',
        organization_id: 'org-123' // Should not have organization_id
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.createUser(superAdminData))
        .rejects.toMatchObject({
          message: 'Super admin users cannot belong to an organization',
          status: 400
        });
    });

    test('should validate non-super_admin users have organization', async () => {
      const adminData = {
        ...validUserData,
        role: 'admin',
        organization_id: null // Should have organization_id
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.createUser(adminData))
        .rejects.toMatchObject({
          message: 'Non-super admin users must belong to an organization',
          status: 400
        });
    });

    test('should validate required fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing name and password_hash
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.createUser(invalidData))
        .rejects.toMatchObject({
          status: 400
        });
      
      // Should fail because name and password_hash are missing
      try {
        await userService.createUser(invalidData);
      } catch (error) {
        expect(error.message).toContain('required');
        expect(error.status).toBe(400);
      }
    });
  });

  describe('updateUser', () => {
    const userId = 'user-123';
    const existingUser = {
      user_id: userId,
      name: 'Existing User',
      email: 'existing@example.com',
      role: 'admin',
      organization_id: 'org-123'
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(existingUser);
    });

    test('should update user successfully', async () => {
      const updateData = { name: 'Updated User Name' };
      const updatedUser = { ...existingUser, ...updateData };

      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(mockLogger.info).toHaveBeenCalledWith(`Updating user: ${userId}`, { 
        fieldsToUpdate: Object.keys(updateData) 
      });
      expect(mockLogger.info).toHaveBeenCalledWith('User updated successfully', { userId });
    });

    test('should fail if user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser(userId, {}))
        .rejects.toMatchObject({
          message: 'User not found',
          status: 404
        });
    });

    test('should validate email uniqueness on update', async () => {
      const updateData = { email: 'other@example.com' };
      const userWithEmail = { user_id: 'other-user', email: 'other@example.com' };

      mockUserRepository.findByEmail.mockResolvedValue(userWithEmail);

      await expect(userService.updateUser(userId, updateData))
        .rejects.toMatchObject({
          message: 'A user with this email already exists',
          status: 409
        });
    });

    test('should allow same user to keep same email', async () => {
      const updateData = { email: existingUser.email }; // Same email
      const updatedUser = { ...existingUser, ...updateData };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    test('should validate role change from non-super_admin to super_admin', async () => {
      const updateData = { role: 'super_admin' };

      await expect(userService.updateUser(userId, updateData))
        .rejects.toMatchObject({
          message: 'Super admin users cannot belong to an organization',
          status: 400
        });
    });

    test('should validate role change from super_admin to non-super_admin', async () => {
      const superAdminUser = {
        ...existingUser,
        role: 'super_admin',
        organization_id: null
      };
      const updateData = { role: 'admin' }; // Without organization_id

      mockUserRepository.findById.mockResolvedValue(superAdminUser);

      await expect(userService.updateUser(userId, updateData))
        .rejects.toMatchObject({
          message: 'Non-super admin users must belong to an organization',
          status: 400
        });
    });
  });

  describe('deleteUser', () => {
    const userId = 'user-123';
    const existingUser = {
      user_id: userId,
      name: 'User to Delete',
      is_active: true
    };

    test('should soft delete user successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({ ...existingUser, is_active: false });

      await userService.deleteUser(userId);

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        is_active: false,
        updated_at: expect.any(String)
      });
      expect(mockLogger.info).toHaveBeenCalledWith(`Deactivating user: ${userId}`);
      expect(mockLogger.info).toHaveBeenCalledWith('User deactivated successfully', { userId });
    });

    test('should fail if user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser(userId))
        .rejects.toMatchObject({
          message: 'User not found',
          status: 404
        });

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('searchUsers', () => {
    test('should search users successfully', async () => {
      const query = 'test user';
      const options = { limit: 10 };
      const expectedResults = [
        { user_id: 'user-1', name: 'Test User 1' }
      ];

      mockUserRepository.search.mockResolvedValue(expectedResults);

      const result = await userService.searchUsers(query, options);

      expect(result).toEqual(expectedResults);
      expect(mockUserRepository.search).toHaveBeenCalledWith(query, options);
      expect(mockLogger.info).toHaveBeenCalledWith(`Searching users with query: ${query}`);
    });

    test('should handle search errors', async () => {
      const query = 'test';
      const error = new Error('Search failed');

      mockUserRepository.search.mockRejectedValue(error);

      await expect(userService.searchUsers(query))
        .rejects.toThrow('Search failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error searching users: ${error.message}`);
    });
  });

  describe('getUsersByRole', () => {
    test('should fetch users by role successfully', async () => {
      const role = 'admin';
      const options = { limit: 10 };
      const expectedUsers = [
        { user_id: 'user-1', role: 'admin' }
      ];

      mockUserRepository.findByRole.mockResolvedValue(expectedUsers);

      const result = await userService.getUsersByRole(role, options);

      expect(result).toEqual(expectedUsers);
      expect(mockUserRepository.findByRole).toHaveBeenCalledWith(role, options);
      expect(mockLogger.info).toHaveBeenCalledWith(`Fetching users with role: ${role}`);
    });

    test('should handle errors', async () => {
      const role = 'admin';
      const error = new Error('Role fetch failed');

      mockUserRepository.findByRole.mockRejectedValue(error);

      await expect(userService.getUsersByRole(role))
        .rejects.toThrow('Role fetch failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching users by role ${role}: ${error.message}`);
    });
  });

  describe('getUsersByOrganization', () => {
    test('should fetch users by organization successfully', async () => {
      const orgId = 'org-123';
      const options = { active_only: true };
      const expectedUsers = [
        { user_id: 'user-1', organization_id: orgId }
      ];

      mockUserRepository.findByOrganization.mockResolvedValue(expectedUsers);

      const result = await userService.getUsersByOrganization(orgId, options);

      expect(result).toEqual(expectedUsers);
      expect(mockUserRepository.findByOrganization).toHaveBeenCalledWith(orgId, options);
      expect(mockLogger.info).toHaveBeenCalledWith(`Fetching users for organization: ${orgId}`);
    });

    test('should handle errors', async () => {
      const orgId = 'org-123';
      const error = new Error('Organization fetch failed');

      mockUserRepository.findByOrganization.mockRejectedValue(error);

      await expect(userService.getUsersByOrganization(orgId))
        .rejects.toThrow('Organization fetch failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching users by organization ${orgId}: ${error.message}`);
    });
  });

  describe('validateUserCreation', () => {
    test('should pass validation for valid super_admin', async () => {
      const validSuperAdmin = {
        name: 'Super Admin',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        role: 'super_admin',
        organization_id: null
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.validateUserCreation(validSuperAdmin))
        .resolves.toBeUndefined();
    });

    test('should pass validation for valid organization user', async () => {
      const validOrgUser = {
        name: 'Org User',
        email: 'user@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
        organization_id: 'org-123'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.validateUserCreation(validOrgUser))
        .resolves.toBeUndefined();
    });

    test('should validate all business rules in isolation', async () => {
      // This test ensures we can call the private validation method for testing
      const validData = {
        name: 'Test User',
        email: 'new@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
        organization_id: 'org-123'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Access the private method for testing
      await expect(userService.validateUserCreation(validData))
        .resolves.toBeUndefined();

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validData.email);
    });
  });

  describe('validateUserUpdate', () => {
    const existingUser = {
      user_id: 'user-123',
      name: 'Existing User',
      email: 'existing@example.com',
      role: 'admin',
      organization_id: 'org-123'
    };

    test('should pass validation for simple name update', async () => {
      const updateData = { name: 'Updated Name' };

      await expect(userService.validateUserUpdate(existingUser, updateData))
        .resolves.toBeUndefined();
    });

    test('should validate email change conflicts', async () => {
      const updateData = { email: 'other@example.com' };
      const conflictingUser = { user_id: 'other-user', email: 'other@example.com' };

      mockUserRepository.findByEmail.mockResolvedValue(conflictingUser);

      await expect(userService.validateUserUpdate(existingUser, updateData))
        .rejects.toMatchObject({
          message: 'A user with this email already exists',
          status: 409
        });
    });

    test('should allow same user to keep same email', async () => {
      const updateData = { email: existingUser.email };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.validateUserUpdate(existingUser, updateData))
        .resolves.toBeUndefined();
    });
  });
});