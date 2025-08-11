import { Shield, ShieldCheck, Settings, User, Eye, Building2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useOrganization } from "../../../context/OrganizationContext";
import { UserRole } from "../../../types/organization";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalCloseButton } from "../../ui/modal";

interface RoleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleConfig: Record<UserRole, { 
  label: string; 
  icon: JSX.Element; 
  color: string; 
  description: string;
  permissions: string[];
}> = {
  super_admin: {
    label: 'Super Administrator',
    icon: <ShieldCheck className="w-5 h-5" />,
    color: 'text-red-600 bg-red-100',
    description: 'Full system access with unrestricted privileges',
    permissions: [
      'Manage all organizations',
      'Create and delete organizations',
      'Manage all users across organizations',
      'Access all system features',
      'System configuration'
    ]
  },
  admin: {
    label: 'Administrator',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-purple-600 bg-purple-100',
    description: 'Full administrative privileges within the organization',
    permissions: [
      'Manage organization settings',
      'Manage all users in organization',
      'Access all features within organization',
      'View all data and reports',
      'Configure organization preferences'
    ]
  },
  manager: {
    label: 'Manager',
    icon: <Settings className="w-5 h-5" />,
    color: 'text-blue-600 bg-blue-100',
    description: 'Management-level access with limited administrative features',
    permissions: [
      'Manage employees and viewers',
      'Access management features',
      'View detailed reports',
      'Manage inventory and stock',
      'Configure department settings'
    ]
  },
  employee: {
    label: 'Employee',
    icon: <User className="w-5 h-5" />,
    color: 'text-green-600 bg-green-100',
    description: 'Standard user access for day-to-day operations',
    permissions: [
      'Access core features',
      'Create and edit records',
      'View assigned data',
      'Generate basic reports',
      'Update inventory information'
    ]
  },
  viewer: {
    label: 'Viewer',
    icon: <Eye className="w-5 h-5" />,
    color: 'text-gray-600 bg-gray-100',
    description: 'Read-only access to view information',
    permissions: [
      'View data and reports',
      'Export information',
      'Access dashboard',
      'View inventory status',
      'Read-only access to features'
    ]
  }
};

export function RoleInfoModal({ isOpen, onClose }: RoleInfoModalProps) {
  const { user } = useAuth();
  const { currentOrganization, currentUserRole } = useOrganization();

  if (!currentUserRole) {
    return null;
  }

  const roleInfo = roleConfig[currentUserRole];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalCloseButton onClose={onClose} />
      <ModalHeader>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${roleInfo.color.split(' ')[1]}`}>
            {roleInfo.icon}
          </div>
          <div>
            <ModalTitle>Your Role & Permissions</ModalTitle>
            <ModalDescription>
              Current access level and capabilities
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Current Organization */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Current Organization</h3>
                <p className="text-sm text-gray-600">{currentOrganization?.name}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Slug: {currentOrganization?.slug}
            </div>
          </div>

          {/* Role Information */}
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${roleInfo.color}`}>
                {roleInfo.icon}
                <span className="font-medium">{roleInfo.label}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {roleInfo.description}
            </p>
          </div>

          {/* Permissions */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Your Permissions</h4>
            <ul className="space-y-2">
              {roleInfo.permissions.map((permission, index) => (
                <li key={index} className="flex items-center space-x-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-gray-700">{permission}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* User Information */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <div><strong>User:</strong> {user?.email}</div>
              <div><strong>Role:</strong> {roleInfo.label}</div>
              <div><strong>Organization:</strong> {currentOrganization?.name}</div>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}