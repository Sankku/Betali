import React from 'react';
import { Building2, Settings, Shield, ShieldCheck, Eye, User, ChevronUp } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useOrganization } from "../../../context/OrganizationContext";
import { UserRole } from "../../../types/organization";

interface UnifiedContextSelectorProps {
  onClick: () => void;
  className?: string;
}

const roleConfig: Record<UserRole, { 
  label: string; 
  icon: JSX.Element; 
  color: string;
}> = {
  super_admin: {
    label: 'Super Admin',
    icon: <ShieldCheck className="w-3 h-3" />,
    color: 'text-red-600 bg-red-100'
  },
  admin: {
    label: 'Administrator',
    icon: <Shield className="w-3 h-3" />,
    color: 'text-purple-600 bg-purple-100'
  },
  manager: {
    label: 'Manager',
    icon: <Settings className="w-3 h-3" />,
    color: 'text-blue-600 bg-blue-100'
  },
  employee: {
    label: 'Employee',
    icon: <User className="w-3 h-3" />,
    color: 'text-green-600 bg-green-100'
  },
  viewer: {
    label: 'Viewer',
    icon: <Eye className="w-3 h-3" />,
    color: 'text-gray-600 bg-gray-100'
  }
};

export function UnifiedContextSelector({ onClick, className = "" }: UnifiedContextSelectorProps) {
  const { user } = useAuth();
  const { currentOrganization, currentUserRole, loading, userOrganizations } = useOrganization();
  
  const roleInfo = currentUserRole ? roleConfig[currentUserRole] : null;
  
  // Show loading state
  if (loading) {
    return (
      <div className={`p-3 rounded-lg bg-gray-50 animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gray-200"></div>
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show "no organizations" state
  if (!loading && (!userOrganizations || userOrganizations.length === 0)) {
    return (
      <button
        onClick={onClick}
        className={`w-full p-3 rounded-lg hover:bg-orange-50 transition-colors group border border-orange-200 ${className}`}
        aria-label="Create or join organization"
      >
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-orange-700">
              No Organization
            </p>
            <p className="text-xs text-orange-600">
              Click to create or join
            </p>
          </div>
          <ChevronUp className="h-4 w-4 text-orange-400 group-hover:text-orange-600 flex-shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-gray-200 ${className}`}
      aria-label="Switch organization and view role"
    >
      <div className="flex items-center space-x-3">
        {/* Organization Avatar */}
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        
        {/* Organization and Role Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentOrganization?.name || 'No Organization'}
            </p>
            {roleInfo && (
              <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full ${roleInfo.color}`}>
                {roleInfo.icon}
                <span className="text-xs font-medium">{roleInfo.label}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {user?.email || 'No user'}
          </p>
        </div>
        
        {/* Chevron */}
        <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
      </div>
    </button>
  );
}