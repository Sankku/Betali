import React, { useState } from 'react';
import { AlertTriangle, Building2, Plus, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal';
import { CreateOrganizationForm } from './create-organization-form';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';

/**
 * Component shown when user has no organization context selected
 * Provides options to create or join an organization
 */
export function NoOrganizationFallback() {
  const { userOrganizations, loading, switchOrganization } = useOrganization();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  const handleCreateOrganization = async (data: { name: string; description?: string }) => {
    setIsCreating(true);
    try {
      // This will be handled by the CreateOrganizationForm
    } catch (error) {
      // Error creating organization
    } finally {
      setIsCreating(false);
      setShowCreateModal(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              No Organization Selected
            </h1>
            <p className="text-gray-600 mb-4">
              Welcome, <strong>{user?.name || user?.email}</strong>! To use Betali, you need to be part of an organization.
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid gap-4 mb-8">
            {userOrganizations.length === 0 ? (
              // No organizations available
              <Card className="p-6 border border-orange-200 bg-orange-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      No Organizations Found
                    </h3>
                    <p className="text-gray-600 text-sm">
                      You're not currently a member of any organizations. You can create a new organization or ask an admin to invite you.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              // Has organizations but none selected
              <Card className="p-6 border border-blue-200 bg-blue-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {userOrganizations.length} Organization{userOrganizations.length !== 1 ? 's' : ''} Available
                    </h3>
                    <p className="text-gray-600 text-sm">
                      You have access to organizations, but none is currently selected. Please choose one to continue.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {userOrganizations.length > 0 && (
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Select an Organization:</h4>
                <div className="space-y-2">
                  {userOrganizations.map((userOrg) => (
                    <Button
                      key={userOrg.organization?.organization_id}
                      variant="outline"
                      className="w-full justify-start"
                      disabled={switchingOrgId === userOrg.organization?.organization_id}
                      onClick={async () => {
                        const orgId = userOrg.organization?.organization_id;
                        if (orgId) {
                          setSwitchingOrgId(orgId);
                          try {
                            await switchOrganization(orgId);
                          } catch (error) {
                            console.error('Error switching organization:', error);
                            setSwitchingOrgId(null);
                          }
                        }
                      }}
                    >
                      {switchingOrgId === userOrg.organization?.organization_id ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Building2 className="w-4 h-4 mr-2" />
                      )}
                      {userOrg.organization?.name}
                      <span className="ml-auto text-xs text-gray-500 capitalize">
                        {userOrg.userRole}
                      </span>
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {/* Create Organization Option */}
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">Create New Organization</h4>
              <p className="text-sm text-gray-600 mb-4">
                Start your own organization and invite team members to collaborate.
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full"
                disabled={isCreating}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            </Card>

            {/* Need Invitation */}
            <Card className="p-4 bg-gray-50">
              <h4 className="font-medium text-gray-700 mb-2">Need an Invitation?</h4>
              <p className="text-sm text-gray-600">
                If you should have access to an existing organization, contact your administrator 
                to send you an invitation to <strong>{user?.email}</strong>.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      <CreateOrganizationForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          setIsCreating(false);
        }}
      />
    </>
  );
}