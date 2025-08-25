import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  AlertTriangle, 
  Building, 
  Search, 
  Star, 
  TrendingUp, 
  Eye, 
  Edit, 
  Trash, 
  ToggleLeft,
  ToggleRight,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { CRUDPage } from '@/components/templates/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ToastContainer } from '@/components/ui/toast';
import { FormSelect, SelectOption } from '@/components/ui/form-select';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui';
import { SupplierModal, Supplier } from './supplier-modal';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useDeactivateSupplier,
  useReactivateSupplier,
  useSetSupplierPreferred,
  useSearchSuppliers,
  useSupplierStats,
  useBusinessTypes,
  CreateSupplierData,
} from '@/hooks/useSuppliers';
import { supplierService } from '@/services/api/supplierService';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  supplier?: Supplier;
}

interface DeleteConfirmState {
  show: boolean;
  supplier?: Supplier;
}

interface FilterState {
  businessType: string;
  isActive: string;
  isPreferred: string;
}

export function SuppliersPage() {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    businessType: 'all',
    isActive: 'all',
    isPreferred: 'all',
  });

  // Build search options from filters
  const searchOptions = {
    search: searchQuery || undefined,
    business_type: filters.businessType === 'all' ? undefined : filters.businessType,
    is_active: filters.isActive === 'all' ? undefined : filters.isActive === 'true',
    is_preferred: filters.isPreferred === 'all' ? undefined : filters.isPreferred === 'true',
  };

  const { data: suppliers = [], isLoading, error } = useSuppliers({ searchOptions });
  const { data: supplierStats } = useSupplierStats();
  const { data: businessTypes = [] } = useBusinessTypes();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const deactivateSupplier = useDeactivateSupplier();
  const reactivateSupplier = useReactivateSupplier();
  const setSupplierPreferred = useSetSupplierPreferred();
  const searchSuppliers = useSearchSuppliers();

  const openModal = (mode: ModalState['mode'], supplier?: Supplier) => {
    setModal({ isOpen: true, mode, supplier });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', supplier: undefined });
  };

  const handleCreateClick = () => openModal('create');

  const handleDelete = async (supplier: Supplier) => {
    if (!supplier?.supplier_id) {
      console.error('Supplier ID is missing:', supplier);
      return;
    }
    setShowDeleteConfirm({ show: true, supplier });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.supplier?.supplier_id) {
      try {
        await deleteSupplier.mutateAsync(showDeleteConfirm.supplier.supplier_id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error deleting:', error);
      }
    } else {
      console.error('Cannot delete: Supplier ID is missing');
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false });
  }, []);

  const handleSubmit = async (data: CreateSupplierData) => {
    try {
      if (modal.mode === 'create') {
        await createSupplier.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.supplier?.supplier_id) {
        await updateSupplier.mutateAsync({
          id: modal.supplier.supplier_id,
          data: data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  // Handle table actions
  const handleView = (supplier: Supplier) => openModal('view', supplier);
  const handleEdit = (supplier: Supplier) => openModal('edit', supplier);

  // Handle supplier activation toggle
  const handleToggleActive = async (supplier: Supplier) => {
    if (!supplier.supplier_id) return;
    
    if (supplier.is_active) {
      await deactivateSupplier.mutateAsync(supplier.supplier_id);
    } else {
      await reactivateSupplier.mutateAsync(supplier.supplier_id);
    }
  };

  // Handle preferred toggle
  const handleTogglePreferred = async (supplier: Supplier) => {
    if (!supplier.supplier_id) return;
    
    await setSupplierPreferred.mutateAsync({
      id: supplier.supplier_id,
      isPreferred: !supplier.is_preferred
    });
  };

  // Format CUIT for display
  const formatCuit = (cuit: string) => {
    return supplierService.formatCuit(cuit);
  };

  // Handle search
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        await searchSuppliers.mutateAsync({ query: searchQuery.trim() });
      } catch (error) {
        console.error('Search failed:', error);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilters({
      businessType: 'all',
      isActive: 'all',
      isPreferred: 'all',
    });
  };

  // Get business type display name
  const getBusinessTypeLabel = (businessType: string) => {
    const options = supplierService.getBusinessTypeOptions();
    const option = options.find(opt => opt.value === businessType);
    return option ? option.label : businessType;
  };

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Proveedores',
      value: supplierStats?.total ?? 0,
      icon: Building,
      color: 'blue',
    },
    {
      title: 'Activos',
      value: supplierStats?.active ?? 0,
      icon: Star,
      color: 'green',
    },
    {
      title: 'Preferidos',
      value: supplierStats?.preferred ?? 0,
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Gestión de Proveedores - Betali</title>
        <meta
          name="description"
          content="Administre proveedores, información de contacto y términos comerciales en Betali"
        />
      </Helmet>

      <CRUDPage
        title="Gestión de Proveedores"
        description="Administre proveedores, información de contacto y términos comerciales"
        data={suppliers}
        isLoading={isLoading}
        error={error}
        onCreateClick={handleCreateClick}
        isAnyMutationLoading={createSupplier.isPending}
        beforeTable={
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {statsCards.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                        <IconComponent className={`w-6 h-6 text-${stat.color}-600`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Search and Filters Section */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex gap-4 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nombre, email, CUIT o contacto..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || searchSuppliers.isPending}
                  >
                    {searchSuppliers.isPending ? 'Buscando...' : 'Buscar'}
                  </Button>
                  {(searchQuery || Object.values(filters).some(f => f !== 'all')) && (
                    <Button variant="outline" onClick={clearSearch}>
                      Limpiar
                    </Button>
                  )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormSelect
                    label="Tipo de Negocio"
                    value={filters.businessType}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, businessType: value }))}
                    options={[
                      { value: 'all', label: 'Todos los tipos' },
                      ...supplierService.getBusinessTypeOptions()
                    ]}
                    icon={<Building className="h-4 w-4" />}
                    description="Filtrar por tipo de negocio"
                    placeholder="Seleccionar tipo"
                  />

                  <FormSelect
                    label="Estado"
                    value={filters.isActive}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, isActive: value }))}
                    options={[
                      { value: 'all', label: 'Todos' },
                      { value: 'true', label: 'Activos' },
                      { value: 'false', label: 'Inactivos' }
                    ]}
                    icon={<ToggleLeft className="h-4 w-4" />}
                    description="Filtrar por estado del proveedor"
                    placeholder="Seleccionar estado"
                  />

                  <FormSelect
                    label="Preferencia"
                    value={filters.isPreferred}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, isPreferred: value }))}
                    options={[
                      { value: 'all', label: 'Todos' },
                      { value: 'true', label: 'Preferidos' },
                      { value: 'false', label: 'No preferidos' }
                    ]}
                    icon={<Star className="h-4 w-4" />}
                    description="Filtrar por proveedores preferidos"
                    placeholder="Seleccionar preferencia"
                  />
                </div>
              </div>
            </div>
          </div>
        }
        customTable={
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CUIT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo de Negocio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Cargando proveedores...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-red-500">
                        Error al cargar proveedores
                      </td>
                    </tr>
                  ) : suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No se encontraron proveedores
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier.supplier_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Building className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900">
                                  {supplier.name}
                                </div>
                                {supplier.is_preferred && (
                                  <Star className="ml-2 h-4 w-4 text-yellow-400 fill-current" />
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{supplier.contact_person}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {formatCuit(supplier.cuit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {supplier.email && (
                              <div className="flex items-center text-sm text-gray-900">
                                <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                {supplier.email}
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                {supplier.phone}
                              </div>
                            )}
                            {supplier.website && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Globe className="h-3 w-3 mr-1 text-gray-400" />
                                <a 
                                  href={supplier.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-600"
                                >
                                  Sitio web
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {supplier.business_type && (
                            <Badge variant="outline">
                              {getBusinessTypeLabel(supplier.business_type)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <Badge 
                              variant={supplier.is_active ? "default" : "secondary"}
                              className={supplier.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                            >
                              {supplier.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            {supplier.is_preferred && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                Preferido
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(supplier)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(supplier)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(supplier)}
                              className={supplier.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                            >
                              {supplier.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePreferred(supplier)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <Star className={`w-4 h-4 ${supplier.is_preferred ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(supplier)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        }
      />

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        mode={modal.mode}
        supplier={modal.supplier}
        isLoading={
          modal.mode === 'create' ? createSupplier.isPending : updateSupplier.isPending
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm.show} onClose={closeDeleteConfirm}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación
            </ModalTitle>
            <ModalDescription>
              ¿Está seguro que desea eliminar al proveedor{' '}
              <strong>{showDeleteConfirm.supplier?.name}</strong>? Esta acción no se puede deshacer.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={closeDeleteConfirm}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteSupplier.isPending}
            >
              {deleteSupplier.isPending ? 'Eliminando...' : 'Eliminar Proveedor'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
}