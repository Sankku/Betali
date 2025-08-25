import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Info, Shield, Lock } from 'lucide-react';
import {
  UserRole as UserRoleType,
  getAssignableRoles,
  isProtectedRole,
  getRoleDisplayName,
  getRoleRestrictions
} from '@/utils/roleUtils';

export interface UserRole {
  value: string;
  label: string;
  description: string;
  permissions: string[];
  color: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const USER_ROLES: UserRole[] = [
  {
    value: 'super_admin',
    label: 'Super Administrator',
    description: 'Full system access across all organizations',
    permissions: ['All permissions'],
    color: 'destructive',
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Full organization access including user management',
    permissions: [
      'products:*',
      'warehouses:*',
      'stock_movements:*',
      'users:*',
      'dashboard:*',
      'admin:users',
      'admin:system',
    ],
    color: 'destructive',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Manage operations and view users',
    permissions: [
      'products:read/create/update',
      'warehouses:read/create/update',
      'stock_movements:read/create/update',
      'users:read',
      'dashboard:*',
    ],
    color: 'default',
  },
  {
    value: 'employee',
    label: 'Employee',
    description: 'Standard operational access',
    permissions: [
      'products:read/create/update',
      'warehouses:read',
      'stock_movements:read/create',
      'dashboard:read',
    ],
    color: 'secondary',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to data',
    permissions: ['products:read', 'warehouses:read', 'stock_movements:read', 'dashboard:read'],
    color: 'outline',
  },
];

interface RoleSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  showDescription?: boolean;
  excludeRoles?: string[];
  placeholder?: string;
  currentUserRole?: UserRoleType; // Current user's role to determine what they can assign
  showRestrictions?: boolean; // Show why certain roles are not available
}

export function RoleSelector({
  value,
  onValueChange,
  disabled = false,
  showDescription = true,
  excludeRoles = [],
  placeholder = 'Select a role...',
  currentUserRole,
  showRestrictions = true,
}: RoleSelectorProps) {
  // Filter roles based on current user's permissions
  const assignableRoles = currentUserRole ? getAssignableRoles(currentUserRole) : [];

  const availableRoles = USER_ROLES.filter(role => {
    // Exclude explicitly excluded roles
    if (excludeRoles.includes(role.value)) return false;

    // If currentUserRole is provided, check if they can assign this role
    if (currentUserRole) {
      return assignableRoles.includes(role.value as UserRoleType);
    }

    // If no currentUserRole provided, show all non-excluded roles (backwards compatibility)
    return true;
  });

  const selectedRole = USER_ROLES.find(role => role.value === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedRole && (
              <div className="flex items-center gap-2">
                <Badge variant={selectedRole.color} className="text-xs">
                  {selectedRole.label}
                </Badge>
                <span className="text-sm text-muted-foreground">{selectedRole.description}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map(role => (
            <SelectItem key={role.value} value={role.value}>
              <div className="flex flex-col gap-1 py-1">
                <div className="flex items-center gap-2">
                  <Badge variant={role.color} className="text-xs">
                    {role.label}
                  </Badge>
                </div>
                {showDescription && (
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedRole && showDescription && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedRole.label} Permissions
              </p>
              <div className="text-xs text-blue-700 dark:text-blue-200">
                <ul className="space-y-0.5">
                  {selectedRole.permissions.map((permission, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="text-green-600 dark:text-green-400">•</span>
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show available roles info */}
      {currentUserRole && showRestrictions && availableRoles.length > 0 && (
        <div className="rounded-md border border-sky-200 bg-slate-50 p-3">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-sky-700">Available Roles</p>
              <p className="text-xs text-sky-600">
                As a {getRoleDisplayName(currentUserRole)}, you can assign these roles:
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {availableRoles.map(role => (
                  <Badge
                    key={role.value}
                    variant="outline"
                    className="text-xs border-sky-200 text-sky-600 bg-white"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {role.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface RoleBadgeProps {
  role: string;
  showDescription?: boolean;
}

export function RoleBadge({ role, showDescription = false }: RoleBadgeProps) {
  const roleConfig = USER_ROLES.find(r => r.value === role);

  if (!roleConfig) {
    return (
      <Badge variant="outline" className="text-xs">
        {role}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={roleConfig.color} className="text-xs">
        {roleConfig.label}
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{roleConfig.description}</span>
      )}
    </div>
  );
}
