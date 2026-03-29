import React, { useState } from 'react';
import { Building2, Settings, Shield, ShieldCheck, Eye, User, ChevronRight, Info } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useOrganization } from "../../../context/OrganizationContext";
import { UserRole } from "../../../types/organization";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalCloseButton } from "../../ui/modal";
import { CreateOrganizationForm } from "./create-organization-form";
import { useTranslation } from "../../../contexts/LanguageContext";

interface ContextSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContextSwitcherModal({ isOpen, onClose }: ContextSwitcherModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    currentOrganization,
    currentUserRole,
    userOrganizations,
    loading,
    switching,
    switchOrganization
  } = useOrganization();

  const [view, setView] = useState<'switch' | 'info'>('switch');

  const roleConfig: Record<UserRole, {
    label: string;
    icon: JSX.Element;
    color: string;
    description: string;
    permissions: string[];
  }> = {
    super_admin: {
      label: t('users.roleSwitcher.roleLabels.super_admin'),
      icon: <ShieldCheck className="w-4 h-4" />,
      color: 'text-red-600 bg-red-100',
      description: t('users.roleSwitcher.roleDescriptions.super_admin'),
      permissions: t('users.roleSwitcher.rolePermissions.super_admin', { returnObjects: true }) as string[]
    },
    admin: {
      label: t('users.roleSwitcher.roleLabels.admin'),
      icon: <Shield className="w-4 h-4" />,
      color: 'text-purple-600 bg-purple-100',
      description: t('users.roleSwitcher.roleDescriptions.admin'),
      permissions: t('users.roleSwitcher.rolePermissions.admin', { returnObjects: true }) as string[]
    },
    manager: {
      label: t('users.roleSwitcher.roleLabels.manager'),
      icon: <Settings className="w-4 h-4" />,
      color: 'text-blue-600 bg-blue-100',
      description: t('users.roleSwitcher.roleDescriptions.manager'),
      permissions: t('users.roleSwitcher.rolePermissions.manager', { returnObjects: true }) as string[]
    },
    employee: {
      label: t('users.roleSwitcher.roleLabels.employee'),
      icon: <User className="w-4 h-4" />,
      color: 'text-green-600 bg-green-100',
      description: t('users.roleSwitcher.roleDescriptions.employee'),
      permissions: t('users.roleSwitcher.rolePermissions.employee', { returnObjects: true }) as string[]
    },
    viewer: {
      label: t('users.roleSwitcher.roleLabels.viewer'),
      icon: <Eye className="w-4 h-4" />,
      color: 'text-gray-600 bg-gray-100',
      description: t('users.roleSwitcher.roleDescriptions.viewer'),
      permissions: t('users.roleSwitcher.rolePermissions.viewer', { returnObjects: true }) as string[]
    }
  };

  const safeUserOrganizations = userOrganizations || [];
  const currentRoleInfo = currentUserRole ? roleConfig[currentUserRole] : null;

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
    }
  };

  const handleViewChange = (newView: 'switch' | 'info') => {
    setView(newView);
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
          <div className="flex-1">
            <ModalTitle>
              {view === 'switch' ? t('organizations.contextSwitcher.switchTitle') : t('organizations.contextSwitcher.roleTitle')}
            </ModalTitle>
            <ModalDescription>
              {view === 'switch'
                ? t('organizations.contextSwitcher.switchDesc')
                : t('organizations.contextSwitcher.roleDesc')
              }
            </ModalDescription>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => handleViewChange('switch')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                view === 'switch'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t('organizations.contextSwitcher.switchButton')}
            </button>
            <button
              onClick={() => handleViewChange('info')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                view === 'info'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t('organizations.contextSwitcher.infoButton')}
            </button>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        {view === 'switch' ? (
          <>
            {/* Current Context Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {currentOrganization?.name || t('organizations.contextSwitcher.loading')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {currentOrganization?.slug}
                    </div>
                  </div>
                </div>
                {currentRoleInfo && (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${currentRoleInfo.color}`}>
                    {currentRoleInfo.icon}
                    <span className="text-xs font-medium">{currentRoleInfo.label}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Organization List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {safeUserOrganizations.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="text-neutral-500 text-sm mb-4">
                      {t('organizations.contextSwitcher.noOrganizations')}
                    </div>
                    <CreateOrganizationForm onSuccess={onClose} />
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
                                    {t('organizations.contextSwitcher.currentBadge')}
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
                  })
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Role Information View */}
            {currentRoleInfo && (
              <div className="space-y-6">
                {/* Current Organization */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{t('organizations.contextSwitcher.currentOrganization')}</h3>
                      <p className="text-sm text-gray-600">{currentOrganization?.name}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('organizations.contextSwitcher.slugLabel')}{currentOrganization?.slug}
                  </div>
                </div>

                {/* Role Information */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${currentRoleInfo.color}`}>
                      {currentRoleInfo.icon}
                      <span className="font-medium">{currentRoleInfo.label}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {currentRoleInfo.description}
                  </p>
                </div>

                {/* Permissions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{t('organizations.contextSwitcher.yourPermissions')}</h4>
                  <ul className="space-y-2">
                    {currentRoleInfo.permissions.map((permission, index) => (
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
                    <div><strong>{t('organizations.contextSwitcher.userLabel')}</strong> {user?.email}</div>
                    <div><strong>{t('organizations.contextSwitcher.roleLabel')}</strong> {currentRoleInfo.label}</div>
                    <div><strong>{t('organizations.contextSwitcher.organizationLabel')}</strong> {currentOrganization?.name}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </ModalBody>
    </Modal>
  );
}
