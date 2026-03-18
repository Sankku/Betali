import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { useTranslation } from '@/contexts/LanguageContext';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, ModalCloseButton } from "../../ui/modal";
import { Button } from "../../ui/button";
import { Organization } from "../../../types/organization";

interface OrganizationModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  organization?: Organization;
  onClose: () => void;
  onSubmit: (data: Partial<Organization>) => void;
  isLoading?: boolean;
}

export function OrganizationModal({
  isOpen,
  mode,
  organization,
  onClose,
  onSubmit,
  isLoading = false
}: OrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    if (organization && mode !== 'create') {
      setFormData({
        name: organization.name || '',
        slug: organization.slug || '',
        description: organization.description || '',
        is_active: organization.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        is_active: true
      });
    }
  }, [organization, mode, isOpen]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate slug from name
    if (field === 'name' && typeof value === 'string') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({
        ...prev,
        slug
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSubmit(formData);
  };

  const { t } = useTranslation();
  const isViewMode = mode === 'view';
  const title = mode === 'create' ? t('organizations.modal.createTitle') :
               mode === 'edit' ? t('organizations.modal.editTitle') :
               t('organizations.modal.viewTitle');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalCloseButton onClose={onClose} />
      <ModalHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <ModalTitle>{title}</ModalTitle>
            <ModalDescription>
              {mode === 'create' && t('organizations.modal.createDescription')}
              {mode === 'edit' && t('organizations.modal.editDescription')}
              {mode === 'view' && t('organizations.modal.viewDescription')}
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('organizations.modal.nameLabel')}
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
                placeholder={t('organizations.modal.namePlaceholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                {t('organizations.modal.slugLabel')}
              </label>
              <input
                type="text"
                id="slug"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
                placeholder={t('organizations.modal.slugPlaceholder')}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                title="Only lowercase letters, numbers, and hyphens are allowed"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('organizations.modal.slugHint')}
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                {t('organizations.modal.descriptionLabel')}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
                placeholder={t('organizations.modal.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                disabled={isViewMode}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                {t('organizations.modal.activeLabel')}
              </label>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {isViewMode ? t('organizations.modal.closeButton') : t('organizations.modal.cancelButton')}
            </Button>
            {!isViewMode && (
              <Button
                type="submit"
                loading={isLoading}
                disabled={!formData.name.trim() || isLoading}
              >
                {mode === 'create' ? t('organizations.modal.createButton') : t('organizations.modal.updateButton')}
              </Button>
            )}
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}