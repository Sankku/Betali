import { useState } from 'react';
import { User, ChevronDown, AlertCircle, Building2, LogOut, Settings, RefreshCw, Plus } from 'lucide-react';
import { useUserContext } from '@/hooks/useUsers';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { useGlobalSync } from '@/context/GlobalSyncContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateOrganizationForm } from '../organizations/create-organization-form';
import { UserProfileModal } from './user-profile-modal';

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

  const { user } = userContext;
  
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
                {currentOrganization 
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
      <UserProfileModal 
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        userContext={userContext}
        userOrganizations={userOrganizations}
        currentOrganization={currentOrganization}
        onRefresh={handleRefreshContext}
      />

      {/* Create Organization Modal */}
      <CreateOrganizationForm
        isOpen={showCreateOrganizationModal}
        onClose={() => setShowCreateOrganizationModal(false)}
        onSuccess={handleCreateOrganizationSuccess}
      />
    </>
  );
}