import React, { useState } from 'react';
import { User, Shield, ChevronDown, Eye, AlertCircle, Building2, LogOut, Settings, RefreshCw, Plus } from 'lucide-react';
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
import { CreateOrganizationForm } from '../organizations/create-organization-form';
import { DateFormatSelector } from '../settings/date-format-selector';
import { TimezoneSelector } from '../settings/timezone-selector';
import { userService } from '@/services/api/userService';
import { Input } from '@/components/ui/input';
import { Check, X as XIcon } from 'lucide-react';
import { toast } from '@/lib/toast';

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
  // const { toast } = useToast(); // Replaced by imported toast singleton
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isOrgSwitching, setIsOrgSwitching] = useState(false);
  const [showCreateOrganizationModal, setShowCreateOrganizationModal] = useState(false);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Initialize profile name when user data loads or modal opens
  React.useEffect(() => {
    if (userContext?.user?.name) {
      setProfileName(userContext.user.name);
    }
  }, [userContext, isDetailsOpen]);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
    if (!profileName.trim()) {
      toast.error("Name is required");
      return;
    }
    }

    setIsSavingProfile(true);
    try {
      await userService.updateCurrentProfile({ name: profileName });
      await triggerFullSync('Profile updated');
      setIsEditingProfile(false);
      setIsEditingProfile(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

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

  const handleCreateOrganizationSuccess = () => {
    setShowCreateOrganizationModal(false);
    // Trigger a context refresh to load the new organization
    handleRefreshContext();
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
            className="flex items-center gap-3 pl-2 pr-2 py-1 h-auto hover:bg-gray-50 rounded-full transition-all duration-200 group border border-transparent hover:border-gray-200"
            disabled={switching || isOrgSwitching}
          >
            {/* User Avatar */}
            <div className="relative">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full shadow-sm ring-2 ring-white">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xs font-bold">
                    {(user.name || 'User').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>

            {/* User Info - Simplified */}
            <div className="flex flex-col items-start min-w-0 mr-1 hidden sm:flex">
              <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {user.name || 'User'}
              </span>
              <span className="text-xs text-gray-500 font-medium capitalize">
                {hasOrganizationContext && currentOrganization 
                  ? currentOrganization.name 
                  : 'No Organization'}
              </span>
            </div>

            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
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
                        {userOrg.role} access
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
            
            {/* Create Organization Option */}
            <DropdownMenuItem
              onClick={() => setShowCreateOrganizationModal(true)}
              className="cursor-pointer border-t border-gray-100 mt-1"
            >
              <Plus className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-sm text-green-600">Create Organization</span>
            </DropdownMenuItem>
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
              <span className="text-sm">Profile & Preferences</span>
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
              <Settings className="w-5 h-5" />
              Profile & Preferences
            </ModalTitle>
            <ModalDescription>
              Your user information, preferences, and permissions
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-6 p-6 max-h-[70vh] overflow-y-auto">
            {/* Preferences Section */}
            <div className="space-y-4 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Display Preferences
              </h3>
              <p className="text-sm text-gray-600">
                Customize how dates and times are displayed across the application.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg p-4">
                <DateFormatSelector />
                <TimezoneSelector />
              </div>
            </div>

            {/* User Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between min-h-[40px]">
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  {isEditingProfile ? (
                    <div className="flex items-center gap-2">
                       <Input 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="h-8 w-48"
                        placeholder="Enter your name"
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileName(user.name || '');
                        }}
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{user.name || 'Not set'}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <span className="text-sm text-gray-900">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Role:</span>
                  <Badge className={getRoleBadgeColor(permissions.role)}>
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleDisplayName(permissions.role as any)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <Badge variant={user.is_active ? "default" : "danger"}>
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

      {/* Create Organization Modal */}
      <CreateOrganizationForm
        isOpen={showCreateOrganizationModal}
        onClose={() => setShowCreateOrganizationModal(false)}
        onSuccess={handleCreateOrganizationSuccess}
      />
    </>
  );
}