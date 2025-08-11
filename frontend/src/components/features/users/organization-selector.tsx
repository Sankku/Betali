import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { apiService } from '../../../services/api';

interface Organization {
  organization_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface OrganizationSelectorProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function OrganizationSelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select organization..."
}: OrganizationSelectorProps) {
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiService.organizations.getAll(),
  });

  // Filter only active organizations
  const activeOrganizations = organizations.filter((org: Organization) => org.is_active);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    onValueChange(selectedValue === '' ? null : selectedValue);
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <Building2 className="h-4 w-4 text-gray-400" />
      </div>
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none bg-white"
      >
        <option value="">
          {isLoading ? "Loading organizations..." : placeholder}
        </option>
        {activeOrganizations.map((organization: Organization) => (
          <option 
            key={organization.organization_id} 
            value={organization.organization_id}
          >
            {organization.name} (@{organization.slug})
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg 
          className="h-4 w-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}