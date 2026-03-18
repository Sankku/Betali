import { useState } from "react";
import { User, Settings, Shield, ShieldCheck, Eye } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useUserContextSwitcher } from "../../../context/UserContextSwitcher";
import { useTranslation } from "@/contexts/LanguageContext";

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee' | 'viewer';

interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
}

export function RoleSwitcherModal({ isOpen, onClose }: RoleSwitcherModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const roleConfig = {
    super_admin: {
      label: t('users.roleSwitcher.roleLabels.super_admin'),
      icon: <ShieldCheck className="w-4 h-4" />,
      color: 'text-red-600 bg-red-100',
      description: t('users.roleSwitcher.roleDescriptions.super_admin'),
    },
    admin: {
      label: t('users.roleSwitcher.roleLabels.admin'),
      icon: <Shield className="w-4 h-4" />,
      color: 'text-purple-600 bg-purple-100',
      description: t('users.roleSwitcher.roleDescriptions.admin'),
    },
    manager: {
      label: t('users.roleSwitcher.roleLabels.manager'),
      icon: <Settings className="w-4 h-4" />,
      color: 'text-blue-600 bg-blue-100',
      description: t('users.roleSwitcher.roleDescriptions.manager'),
    },
    employee: {
      label: t('users.roleSwitcher.roleLabels.employee'),
      icon: <User className="w-4 h-4" />,
      color: 'text-green-600 bg-green-100',
      description: t('users.roleSwitcher.roleDescriptions.employee'),
    },
    viewer: {
      label: t('users.roleSwitcher.roleLabels.viewer'),
      icon: <Eye className="w-4 h-4" />,
      color: 'text-gray-600 bg-gray-100',
      description: t('users.roleSwitcher.roleDescriptions.viewer'),
    },
  };
  const { 
    currentUserContext, 
    availableUsers, 
    loading, 
    switchToUser, 
    refreshUsers 
  } = useUserContextSwitcher();
  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async (targetUser: UserProfile) => {
    if (targetUser.user_id === currentUserContext?.user_id) {
      onClose();
      return;
    }

    setSwitching(true);
    try {
      await switchToUser(targetUser);
      
      // Refresh the users list to ensure we have the latest data
      await refreshUsers();
      
      // Close modal after successful switch
      onClose();
      
      // You might also want to show a success message
      // toast.success(`Switched to ${targetUser.name}'s context`);
      
    } catch (error) {
      console.error('Error switching user context:', error);
      // toast.error('Failed to switch user context');
    } finally {
      setSwitching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('users.roleSwitcher.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={switching}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 mb-3">
              {t('users.roleSwitcher.chooseContext')}
            </div>
            
            {availableUsers.map((userProfile) => {
              const roleInfo = roleConfig[userProfile.role] || roleConfig.viewer;
              const isCurrentUser = userProfile.user_id === currentUserContext?.user_id;
              
              return (
                <button
                  key={userProfile.user_id}
                  onClick={() => handleRoleSwitch(userProfile)}
                  disabled={switching}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ${
                    isCurrentUser
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {userProfile.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {userProfile.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-blue-600 font-normal">
                              {t('users.roleSwitcher.current')}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{userProfile.email}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${roleInfo.color}`}>
                        {roleInfo.icon}
                        <span className="text-xs font-medium">{roleInfo.label}</span>
                      </div>
                      {!userProfile.is_active && (
                        <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded-full">
                          {t('users.roleSwitcher.inactive')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <strong>{t('users.roleSwitcher.currentContext')}</strong> {currentUserContext?.name || t('common.loading')}
            {currentUserContext && (
              <span className="ml-1">
                ({roleConfig[currentUserContext.role]?.label || t('users.roleSwitcher.unknownRole')})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}