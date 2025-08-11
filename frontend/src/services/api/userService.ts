import { httpClient } from "../http/httpClient";
import { Database } from "../../types/database";

type User = Database["public"]["Tables"]["users"]["Row"] & {
  organization_id?: string | null;
  branch_id?: string | null;
  permissions?: string[];
};

type CreateUserData = {
  name: string;
  email: string;
  password: string;
  role: string;
  organization_id?: string | null;
  branch_id?: string | null;
  permissions?: string[];
  is_active?: boolean;
};

type UpdateUserData = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  organization_id?: string | null;
  branch_id?: string | null;
  permissions?: string[];
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

  async delete(id: string): Promise<void> {
    try {
      await httpClient.delete(`/api/users/${id}`);
    } catch (error) {
      console.error(`Error deactivating user ${id}:`, error);
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