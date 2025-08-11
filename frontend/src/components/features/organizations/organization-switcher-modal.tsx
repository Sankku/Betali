import { Building2, Settings, Shield, ShieldCheck, Eye, User } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useOrganization } from "../../../context/OrganizationContext";
import { UserRole } from "../../../types/organization";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalCloseButton } from "../../ui/modal";

interface OrganizationSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleConfig: Record<UserRole, { label: string; icon: JSX.Element; color: string; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    icon: <ShieldCheck className="w-4 h-4" />,
    color: 'text-red-600 bg-red-100',
    description: 'Full system access'
  },
  admin: {
    label: 'Administrator',
    icon: <Shield className="w-4 h-4" />,
    color: 'text-purple-600 bg-purple-100',
    description: 'Administrative privileges'
  },
  manager: {
    label: 'Manager',
    icon: <Settings className="w-4 h-4" />,
    color: 'text-blue-600 bg-blue-100',
    description: 'Management access'
  },
  employee: {
    label: 'Employee',
    icon: <User className="w-4 h-4" />,
    color: 'text-green-600 bg-green-100',
    description: 'Standard user access'
  },
  viewer: {
    label: 'Viewer',
    icon: <Eye className="w-4 h-4" />,
    color: 'text-gray-600 bg-gray-100',
    description: 'Read-only access'
  }
};

export function OrganizationSwitcherModal({ isOpen, onClose }: OrganizationSwitcherModalProps) {
  const { user } = useAuth();
  const { 
    currentOrganization,
    currentUserRole,
    userOrganizations,
    loading,
    switching,
    switchOrganization
  } = useOrganization();
  

  // Ensure userOrganizations is always an array
  const safeUserOrganizations = userOrganizations || [];

  const handleOrganizationSwitch = async (organizationId: string) => {
    if (organizationId === currentOrganization?.organization_id) {
      onClose();
      return;
    }

    try {
      await switchOrganization(organizationId);
      onClose();
    } catch (error) {
      console.error('Error switching organization:', error);
      // You might want to show a toast error here
    }
  };


  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalCloseButton onClose={onClose} />
      <ModalHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <ModalTitle>Switch Organization</ModalTitle>
            <ModalDescription>Choose an organization to work with</ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {safeUserOrganizations.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-neutral-500 text-sm">
                  No organizations found. Contact your administrator.
                </div>
              </div>
            ) : (
              safeUserOrganizations.filter(Boolean).map((userOrg) => {
              if (!userOrg?.organization?.organization_id) return null;
              
              const roleInfo = roleConfig[userOrg.userRole] || roleConfig.viewer;
              const isCurrentOrg = userOrg.organization.organization_id === currentOrganization?.organization_id;
              
              return (
                <button
                  key={userOrg.organization.organization_id}
                  onClick={() => handleOrganizationSwitch(userOrg.organization.organization_id)}
                  disabled={switching}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    isCurrentOrg
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  } ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-neutral-900">
                          {userOrg.organization.name}
                          {isCurrentOrg && (
                            <span className="ml-2 text-xs text-blue-600 font-normal">
                              (Current)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {userOrg.organization.slug}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${roleInfo.color}`}>
                        {roleInfo.icon}
                        <span className="text-xs font-medium">{roleInfo.label}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            }))
            }
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-200">
          <div className="text-xs text-neutral-500">
            <strong>Current Organization:</strong> {currentOrganization?.name || 'Loading...'}
            {currentUserRole && (
              <span className="ml-1">
                ({roleConfig[currentUserRole]?.label || 'Unknown Role'})
              </span>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}