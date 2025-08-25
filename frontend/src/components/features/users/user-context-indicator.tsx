import React, { useState } from 'react';
import { User, Shield, ChevronDown, Eye, AlertCircle, Building2, LogOut, Settings, RefreshCw } from 'lucide-react';
import { useUserContext } from '@/hooks/useUsers';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { useGlobalSync } from '@/context/GlobalSyncContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRoleDisplayName } from '@/utils/roleUtils';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Component to show current user context with role, permissions, and organization
 * Now includes organization selector and logout functionality
 */
export function UserContextIndicator() {
  const { data: userContext, isLoading, error } = useUserContext();
  const { triggerFullSync } = useGlobalSync();
  const { 
    currentOrganization, 
    userOrganizations, 
    switchOrganization, 
    switching 
  } = useOrganization();
  const { signOut } = useAuth();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isOrgSwitching, setIsOrgSwitching] = useState(false);

  const handleRefreshContext = async () => {
    try {
      await triggerFullSync('Manual refresh from user context indicator');
    } catch (error) {
      console.error('Error refreshing context:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md text-sm">
        <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (error || !userContext) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-md text-sm">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-red-600">Error loading context</span>
      </div>
    );
  }

  const { user, permissions, hasOrganizationContext } = userContext;
  const userContextOrg = userContext.currentOrganization;
  
  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.organization_id) return;
    
    setIsOrgSwitching(true);
    try {
      await switchOrganization(orgId);
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setIsOrgSwitching(false);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'employee':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPermissionCategories = (permissionsList: string[]) => {
    const categories = new Set<string>();
    permissionsList.forEach(permission => {
      const category = permission.split(':')[0];
      categories.add(category);
    });
    return Array.from(categories);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-3 py-1.5 h-auto hover:bg-gray-50 border border-gray-200 rounded-md"
            disabled={switching || isOrgSwitching}
          >
        {/* User Avatar */}
        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name} 
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <User className="w-3 h-3 text-blue-600" />
          )}
        </div>

        {/* User Info */}
        <div className="flex flex-col items-start min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {user.name}
            </span>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getRoleBadgeColor(permissions.role)} border`}
            >
              <Shield className="w-3 h-3 mr-1" />
              {getRoleDisplayName(permissions.role)}
            </Badge>
          </div>
          
          {hasOrganizationContext && currentOrganization ? (
            <div className="text-xs text-gray-500 truncate">
              {currentOrganization.name}
            </div>
          ) : (
            <div className="text-xs text-orange-600">
              No organization selected
            </div>
          )}
        </div>

            <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80" align="end">
          {/* User Info Header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div>
                <div className="font-medium text-sm">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </div>
          </div>
          
          {/* Organization Selector */}
          <div className="py-1">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase bg-gray-50">
              Organizations
            </div>
            
            {userOrganizations.length > 0 ? (
              userOrganizations.map((userOrg) => {
                const isSelected = userOrg.organization?.organization_id === currentOrganization?.organization_id;
                return (
                  <DropdownMenuItem
                    key={userOrg.organization?.organization_id}
                    onClick={() => handleSwitchOrganization(userOrg.organization?.organization_id || '')}
                    className={`cursor-pointer min-h-[3rem] ${
                      isSelected ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                    disabled={isOrgSwitching}
                  >
                    <Building2 className={`w-4 h-4 mr-2 flex-shrink-0 ${
                      isSelected ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium flex items-center">
                        {userOrg.organization?.name}
                        {isSelected && (
                          <span className="ml-2 text-xs text-blue-600">• Current</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {userOrg.userRole} access
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-sm">No organizations available</span>
              </DropdownMenuItem>
            )}
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Actions */}
          <div className="py-1">
            <DropdownMenuItem 
              onClick={handleRefreshContext}
              className="cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="text-sm">Sync Data</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => setIsDetailsOpen(true)}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              <span className="text-sm">View Permissions</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="text-sm">Sign Out</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Details Modal */}
      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Context Details
            </ModalTitle>
            <ModalDescription>
              Your current permissions and organization context
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-6 p-6">
            {/* User Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">User Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  <span className="text-sm text-gray-900">{user.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <span className="text-sm text-gray-900">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Role:</span>
                  <Badge className={getRoleBadgeColor(permissions.role)}>
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleDisplayName(permissions.role)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <Badge variant={user.is_active ? "default" : "destructive"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Current Organization */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Current Organization</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {hasOrganizationContext && currentOrganization ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Organization:</span>
                      <span className="text-sm text-gray-900">{currentOrganization.name}</span>
                    </div>
                    {currentOrganization.description && (
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-gray-600">Description:</span>
                        <span className="text-sm text-gray-900 text-right max-w-xs">
                          {currentOrganization.description}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Available Organizations:</span>
                      <span className="text-sm text-gray-900">{userOrganizations.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">No organization context selected</span>
                    {userOrganizations.length > 0 && (
                      <span className="text-xs text-gray-500">({userOrganizations.length} available)</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Permissions Overview</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Permissions:</span>
                  <Badge variant="outline">
                    {permissions.permissions.length}
                  </Badge>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-600 block mb-2">Categories:</span>
                  <div className="flex flex-wrap gap-1">
                    {getPermissionCategories(permissions.permissions).map((category) => (
                      <Badge 
                        key={category} 
                        variant="outline" 
                        className="text-xs"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800">
                    View all permissions ({permissions.permissions.length})
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                      {permissions.permissions.map((permission) => (
                        <code 
                          key={permission} 
                          className="block bg-white px-2 py-1 rounded border text-gray-700"
                        >
                          {permission}
                        </code>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}