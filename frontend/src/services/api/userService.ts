import { httpClient } from "../http/httpClient";
import { Database } from "../../types/database";

export type User = Database["public"]["Tables"]["users"]["Row"];

export type CreateUserData = {
  name: string;
  email: string;
  password: string;
  is_active?: boolean;
  organization_id?: string;
};

export type UpdateUserData = {
  name?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
};

/**
 * Service for managing users
 */
export const userService = {
  async getAll(): Promise<User[]> {
    try {
      const response = await httpClient.get<{ data: User[] }>('/api/users');
      return response.data || response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<User> {
    try {
      const response = await httpClient.get<{ data: User }>(`/api/users/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  },

  async getCurrentProfile(): Promise<User> {
    try {
      const response = await httpClient.get<{ data: User }>('/api/users/profile');
      return response.data || response;
    } catch (error) {
      console.error('Error fetching current user profile:', error);
      throw error;
    }
  },

  async create(userData: CreateUserData): Promise<User> {
    try {
      const response = await httpClient.post<{ data: User }>('/api/users', userData);
      return response.data || response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async update(id: string, userData: UpdateUserData): Promise<User> {
    try {
      const response = await httpClient.put<{ data: User }>(`/api/users/${id}`, userData);
      return response.data || response;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  },

  async updateCurrentProfile(userData: UpdateUserData): Promise<User> {
    try {
      const response = await httpClient.put<{ data: User }>('/api/users/profile/update', userData);
      return response.data || response;
    } catch (error) {
      console.error('Error updating current user profile:', error);
      throw error;
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await httpClient.put('/api/users/profile/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  /**
   * Get current user context (permissions, role, organization)
   */
  async getUserContext(): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar_url?: string;
      is_active: boolean;
      created_at: string;
    };
    permissions: {
      role: string;
      roleName: string;
      permissions: string[];
    };
    currentOrganization?: any;
    hasOrganizationContext: boolean;
  }> {
    try {
      const response = await httpClient.get('/api/users/me/context');
      return response.data;
    } catch (error) {
      console.error('Error fetching user context:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await httpClient.delete(`/api/users/${id}/hard-delete`);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  },

  async toggleStatus(id: string, is_active: boolean): Promise<User> {
    try {
      const response = await httpClient.put<{ data: User }>(`/api/users/${id}`, { is_active });
      return response.data || response;
    } catch (error) {
      console.error(`Error toggling user status ${id}:`, error);
      throw error;
    }
  },

  async search(query: string): Promise<User[]> {
    try {
      const response = await httpClient.get<{ data: User[] }>(`/api/users?search=${encodeURIComponent(query)}`);
      return response.data || response;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  },

  // Alias for compatibility
  async getUsers(): Promise<{ data: User[] }> {
    try {
      const users = await this.getAll();
      return { data: users };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
};