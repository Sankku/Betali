import { Shield, ShieldCheck, Settings, User, Eye, Building2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useOrganization } from "../../../context/OrganizationContext";
import { UserRole } from "../../../types/organization";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalCloseButton } from "../../ui/modal";
import { useTranslation } from "../../../contexts/LanguageContext";

interface RoleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleInfoModal({ isOpen, onClose }: RoleInfoModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrganization, currentUserRole } = useOrganization();

  const roleConfig: Record<UserRole, {
    label: string;
    icon: JSX.Element;
    color: string;
    description: string;
    permissions: string[];
  }> = {
    super_admin: {
      label: t('users.roleSwitcher.roleLabels.super_admin'),
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'text-red-600 bg-red-100',
      description: t('users.roleSwitcher.roleDescriptions.super_admin'),
      permissions: t('users.roleSwitcher.rolePermissions.super_admin', { returnObjects: true }) as string[]
    },
    admin: {
      label: t('users.roleSwitcher.roleLabels.admin'),
      icon: <Shield className="w-5 h-5" />,
      color: 'text-purple-600 bg-purple-100',
      description: t('users.roleSwitcher.roleDescriptions.admin'),
      permissions: t('users.roleSwitcher.rolePermissions.admin', { returnObjects: true }) as string[]
    },
    manager: {
      label: t('users.roleSwitcher.roleLabels.manager'),
      icon: <Settings className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-100',
      description: t('users.roleSwitcher.roleDescriptions.manager'),
      permissions: t('users.roleSwitcher.rolePermissions.manager', { returnObjects: true }) as string[]
    },
    employee: {
      label: t('users.roleSwitcher.roleLabels.employee'),
      icon: <User className="w-5 h-5" />,
      color: 'text-green-600 bg-green-100',
      description: t('users.roleSwitcher.roleDescriptions.employee'),
      permissions: t('users.roleSwitcher.rolePermissions.employee', { returnObjects: true }) as string[]
    },
    viewer: {
      label: t('users.roleSwitcher.roleLabels.viewer'),
      icon: <Eye className="w-5 h-5" />,
      color: 'text-gray-600 bg-gray-100',
      description: t('users.roleSwitcher.roleDescriptions.viewer'),
      permissions: t('users.roleSwitcher.rolePermissions.viewer', { returnObjects: true }) as string[]
    }
  };

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
            <ModalTitle>{t('organizations.roleInfo.title')}</ModalTitle>
            <ModalDescription>
              {t('organizations.roleInfo.desc')}
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
                <h3 className="font-medium text-gray-900">{t('organizations.roleInfo.currentOrganization')}</h3>
                <p className="text-sm text-gray-600">{currentOrganization?.name}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {t('organizations.roleInfo.slugLabel')}{currentOrganization?.slug}
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
            <h4 className="font-medium text-gray-900 mb-3">{t('organizations.roleInfo.yourPermissions')}</h4>
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
              <div><strong>{t('organizations.roleInfo.userLabel')}</strong> {user?.email}</div>
              <div><strong>{t('organizations.roleInfo.roleLabel')}</strong> {roleInfo.label}</div>
              <div><strong>{t('organizations.roleInfo.organizationLabel')}</strong> {currentOrganization?.name}</div>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
