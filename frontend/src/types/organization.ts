import { Database } from './database';

export type Organization = Database['public']['Tables']['organizations']['Row'];
export type Branch = Database['public']['Tables']['branches']['Row'];
export type UserOrganization = Database['public']['Tables']['user_organizations']['Row'];

export type UserRole = 'owner' | 'super_admin' | 'admin' | 'manager' | 'employee' | 'viewer';

export interface UserWithOrganizations {
  user_id: string;
  email: string;
  name: string;
  is_active: boolean;
  organizations: UserOrganizationWithDetails[];
}

export interface UserOrganizationWithDetails extends UserOrganization {
  organization: Organization;
  branch?: Branch;
}

export interface OrganizationContext {
  organization: Organization;
  branch?: Branch;
  userRole: UserRole;
  permissions: string[];
}

export interface CreateOrganizationData {
  name: string;
  description?: string;
}

export interface CreateBranchData {
  name: string;
  location?: string;
  organization_id: string;
}

export interface InviteUserData {
  email: string;
  name: string;
  organization_id: string;
  branch_id?: string;
  role: UserRole;
  permissions?: string[];
}

export interface OrganizationMember {
  user_organization_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: UserRole;
  permissions: string[];
  branch?: Branch;
  is_active: boolean;
  joined_at: string;
}