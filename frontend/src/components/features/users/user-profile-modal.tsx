import { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Shield, Building2, Monitor, X, Check, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getRoleDisplayName } from '@/utils/roleUtils';
import { userService } from '@/services/api/userService';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { DateFormatSelector } from '../settings/date-format-selector';
import { TimezoneSelector } from '../settings/timezone-selector';
import {
  Modal,
  ModalContent,
} from '@/components/ui/modal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userContext: any;
  userOrganizations: any[];
  currentOrganization: any;
  onRefresh: () => Promise<void>;
}

export function UserProfileModal({
  isOpen,
  onClose,
  userContext,
  userOrganizations,
  currentOrganization,
  onRefresh
}: UserProfileModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'account' | 'display' | 'permissions'>('account');
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, permissions } = userContext || {};

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
    }
  }, [user, isOpen]);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error(t('profile.nameRequired'));
      return;
    }

    setIsSaving(true);
    try {
      await userService.updateCurrentProfile({ name: profileName });
      await onRefresh();
      setIsEditingName(false);
      toast.success(t('profile.profileUpdated'));
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const backendError = error?.data?.error;
      const backendDetails = error?.data?.details;
      
      if (backendError) {
        toast.error(`${backendError}${backendDetails ? `: ${backendDetails}` : ''}`);
      } else {
        toast.error(t('profile.profileUpdateFailed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      await userService.uploadAvatar(file);
      await onRefresh();
      toast.success(t('profile.profileUpdated'));
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      const backendError = error?.data?.error;
      const backendDetails = error?.data?.details;
      
      let errorMsg = t('profile.profileUpdateFailed');
      
      if (backendError === 'File too large') {
         errorMsg = t('profile.errorFileTooLarge') + (backendDetails ? ` (${backendDetails})` : '');
      } else if (backendError) {
         errorMsg = `${backendError}${backendDetails ? `: ${backendDetails}` : ''}`;
      }

      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getPermissionCategories = (perms: string[]) => {
    const categories = new Set<string>();
    perms.forEach(p => {
      const category = p.split(':')[0];
      if (category && category !== '*') {
        categories.add(category);
      } else if (p === '*') {
        categories.add('*');
      }
    });
    
    return Array.from(categories).map(cat => {
      if (cat === '*') return t('profile.categoryNames.all') !== 'profile.categoryNames.all' ? t('profile.categoryNames.all') : 'All Permissions (Super Admin)';
      
      const key = cat.toLowerCase();
      const translated = t(`profile.categoryNames.${key}`);
      
      return translated !== `profile.categoryNames.${key}` 
        ? translated 
        : cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ');
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EMPLOYEE':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent className="max-w-4xl p-0 overflow-hidden rounded-2xl bg-gray-50 flex flex-col md:flex-row min-h-[600px]">
        {/* Left Sidebar */}
        <div className="w-full md:w-[280px] bg-gray-100 border-r border-gray-200 flex flex-col pt-6 pb-4">
          <div className="px-4 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('profile.title')}</h2>
          </div>
          <nav className="flex-1 space-y-1 px-2">
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'account' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'}`}
            >
              <UserIcon className="w-4 h-4 mr-3" />
              {t('profile.userInfo')}
            </button>
            <button
              onClick={() => setActiveTab('display')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'display' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'}`}
            >
              <Monitor className="w-4 h-4 mr-3" />
              {t('profile.displayPreferences')}
            </button>
            <div className="px-4 mt-6 mb-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seguridad</h2>
            </div>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'permissions' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'}`}
            >
              <Shield className="w-4 h-4 mr-3" />
              {t('profile.permissionsOverview')}
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          {/* Close Button Top Right */}
          <button 
            onClick={onClose}
            className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${
              activeTab === 'account' 
                ? 'bg-white/20 hover:bg-white/30 text-white border border-white/10' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>

          {activeTab === 'account' && (
            <div className="flex flex-col">
              {/* Banner Area */}
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 w-full relative"></div>
              
              <div className="px-8 pb-8 relative -mt-16">
                {/* Avatar */}
                <div className="flex justify-between items-end mb-6">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm flex items-center justify-center relative bg-gray-100">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-16 h-16 text-gray-400" />
                      )}
                      
                      {/* Hover Overlay for Avatar */}
                      <div 
                        onClick={handleAvatarClick}
                        className="absolute inset-0 bg-black/40 hidden group-hover:flex flex-col items-center justify-center cursor-pointer text-white transition-opacity"
                      >
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase">{t('profile.uploadAvatar')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden" 
                />

                {/* User Info Block */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{user.name || 'User'}</h3>
                    <Button variant="outline" size="sm" onClick={() => setIsEditingName(!isEditingName)}>
                      {isEditingName ? t('profile.cancel') : t('profile.edit')}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {/* Name Edit Mode */}
                    {isEditingName && (
                      <div className="flex gap-2 mb-2">
                        <Input 
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder={t('profile.enterName')}
                          className="max-w-xs"
                        />
                        <Button disabled={isSaving} onClick={handleSaveProfile} variant="default">
                          {t('profile.save')}
                        </Button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('profile.name')}</div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('profile.email')}</div>
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('profile.role')}</div>
                        <div className="mt-1">
                          <Badge className={getRoleBadgeColor(permissions?.role)}>
                            <Shield className="w-3 h-3 mr-1" />
                            {getRoleDisplayName(permissions?.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2 flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    {t('profile.currentOrg')}
                  </h3>
                  
                  {currentOrganization ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">{t('profile.currentOrg')}:</span>
                        <span className="text-sm font-bold text-gray-900">{currentOrganization.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">{t('profile.availableOrgs')}:</span>
                        <span className="text-sm text-gray-900 bg-gray-200 px-2 py-0.5 rounded-full">{userOrganizations.length}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-orange-600 text-sm italic">
                      {t('profile.noOrgSelected')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('profile.displayPreferences')}</h2>
              <p className="text-gray-500 mb-8">{t('profile.displayPreferencesDesc')}</p>
              
              <div className="space-y-8">
                <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                  <DateFormatSelector />
                </div>
                <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100">
                  <TimezoneSelector />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('profile.permissionsOverview')}</h2>
              <p className="text-gray-500 mb-6">Módulos a los que tienes acceso basado en tu rol activo.</p>
              
              <div className="bg-white border text-gray-900 overflow-hidden border-gray-200 rounded-xl mb-6">
                <div className="p-5 flex items-center border-b border-gray-100">
                  <Shield className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="font-semibold">{t('profile.categories')} ({getPermissionCategories(permissions?.permissions || []).length})</span>
                </div>
                <div className="p-5 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getPermissionCategories(permissions?.permissions || []).map((category) => (
                      <div key={category} className="bg-white px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="truncate">{category}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
