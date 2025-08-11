import { httpClient } from "../http/httpClient";
import { 
  Organization, 
  UserOrganizationWithDetails,
  CreateOrganizationData,
  InviteUserData,
  OrganizationMember,
  OrganizationContext 
} from "../../types/organization";

/**
 * Service for managing organizations
 */
export const organizationService = {
  /**
   * Get all organizations (admin only)
   */
  async getAll(): Promise<Organization[]> {
    try {
      const response = await httpClient.get<{ data: Organization[] }>('/api/organizations');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching all organizations:', error);
      throw error;
    }
  },

  /**
   * Create new organization
   */
  async create(organizationData: CreateOrganizationData): Promise<Organization> {
    try {
      const response = await httpClient.post<{ data: Organization }>('/api/organizations', organizationData);
      return response.data;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  },

  /**
   * Update organization
   */
  async update(id: string, updateData: Partial<Organization>): Promise<Organization> {
    try {
      const response = await httpClient.put<{ data: Organization }>(`/api/organizations/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating organization ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete organization
   */
  async delete(id: string): Promise<void> {
    try {
      await httpClient.delete(`/api/organizations/${id}`);
    } catch (error) {
      console.error(`Error deleting organization ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get user's organizations
   */
  async getUserOrganizations(): Promise<UserOrganizationWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: UserOrganizationWithDetails[] }>('/api/organizations/my');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user organizations:', error);
      throw error;
    }
  },


  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string): Promise<OrganizationContext> {
    try {
      const response = await httpClient.get<{ data: OrganizationContext }>(`/api/organizations/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching organization ${organizationId}:`, error);
      throw error;
    }
  },


  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string, options?: {
    branchId?: string;
    role?: string;
  }): Promise<OrganizationMember[]> {
    try {
      const params = new URLSearchParams();
      if (options?.branchId) params.append('branch_id', options.branchId);
      if (options?.role) params.append('role', options.role);

      const url = `/api/organizations/${organizationId}/members${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await httpClient.get<{ data: OrganizationMember[] }>(url);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching organization members for ${organizationId}:`, error);
      throw error;
    }
  },

  /**
   * Invite user to organization
   */
  async inviteUser(organizationId: string, inviteData: Omit<InviteUserData, 'organization_id'>): Promise<{
    user: any;
    relationship: any;
  }> {
    try {
      const response = await httpClient.post<{ data: { user: any; relationship: any } }>(
        `/api/organizations/${organizationId}/invite`,
        inviteData
      );
      return response.data;
    } catch (error) {
      console.error(`Error inviting user to organization ${organizationId}:`, error);
      throw error;
    }
  },

  /**
   * Update member role
   */
  async updateMemberRole(organizationId: string, memberId: string, updateData: {
    role?: string;
    branch_id?: string;
    permissions?: string[];
  }): Promise<any> {
    try {
      const response = await httpClient.put<{ data: any }>(
        `/api/organizations/${organizationId}/members/${memberId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating member role in organization ${organizationId}:`, error);
      throw error;
    }
  },

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, memberId: string): Promise<void> {
    try {
      await httpClient.delete(`/api/organizations/${organizationId}/members/${memberId}`);
    } catch (error) {
      console.error(`Error removing member from organization ${organizationId}:`, error);
      throw error;
    }
  },

  /**
   * Switch organization context
   */
  async switchContext(organizationId: string): Promise<OrganizationContext> {
    try {
      const response = await httpClient.post<{ data: OrganizationContext }>(
        `/api/organizations/${organizationId}/switch`
      );
      return response.data;
    } catch (error) {
      console.error(`Error switching to organization context ${organizationId}:`, error);
      throw error;
    }
  }
};