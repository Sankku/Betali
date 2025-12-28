import { useState } from 'react';
import {
  Package,
  Warehouse,
  RefreshCw,
  FileSpreadsheet,
  BarChart3,
  Users,
  Building2,
  UserCheck,
  Truck,
  ShoppingCart,
  ShoppingBag,
  Percent,
  Menu,
  X,
  Settings,
  HelpCircle,
  CreditCard,
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useOrganization } from '../../../context/OrganizationContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { SidebarItem } from '../Sidebar/SidebarItem';
import { UserContextIndicator } from '../../features/users/user-context-indicator';
import { NoOrganizationFallback } from '../../features/organizations/no-organization-fallback';
import { usePermissions } from '../../../hooks/usePermissions';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { currentOrganization, loading } = useOrganization();
  const { canAccess } = usePermissions();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show fallback if no organization is selected
  if (!loading && !currentOrganization) {
    return <NoOrganizationFallback />;
  }

  // Removed handleSignOut as it's now handled in UserContextIndicator

  const routes = [
    {
      path: '/dashboard/products',
      icon: <Package className="w-5 h-5" />,
      label: t('nav.products'),
      checkAccess: () => canAccess.viewProducts(),
    },
    {
      path: '/dashboard/warehouse',
      icon: <Warehouse className="w-5 h-5" />,
      label: t('nav.warehouses'),
      checkAccess: () => canAccess.viewWarehouses(),
    },
    {
      path: '/dashboard/stock-movements',
      icon: <RefreshCw className="w-5 h-5" />,
      label: t('nav.movements'),
      checkAccess: () => canAccess.viewStockMovements(),
    },
    {
      path: '/dashboard/users',
      icon: <Users className="w-5 h-5" />,
      label: t('nav.users'),
      checkAccess: () => canAccess.viewUsers(),
    },
    {
      path: '/dashboard/clients',
      icon: <UserCheck className="w-5 h-5" />,
      label: t('nav.clients'),
      checkAccess: () => canAccess.viewClients(),
    },
    {
      path: '/dashboard/suppliers',
      icon: <Truck className="w-5 h-5" />,
      label: t('nav.suppliers'),
      checkAccess: () => canAccess.viewSuppliers(),
    },
    {
      path: '/dashboard/orders',
      icon: <ShoppingCart className="w-5 h-5" />,
      label: t('nav.orders'),
      checkAccess: () => true, // Temporary: always visible until permissions are properly configured
    },
    {
      path: '/dashboard/purchase-orders',
      icon: <ShoppingBag className="w-5 h-5" />,
      label: t('nav.purchaseOrders'),
      checkAccess: () => true, // Temporary: always visible until permissions are properly configured
    },
    {
      path: '/dashboard/taxes',
      icon: <Percent className="w-5 h-5" />,
      label: t('nav.taxManagement'),
      checkAccess: () => true, // Temporary: always visible until permissions are properly configured
    },
    {
      path: '/dashboard/organizations',
      icon: <Building2 className="w-5 h-5" />,
      label: t('nav.organizations'),
      checkAccess: () => canAccess.viewOrganizations(),
    },
    {
      path: '/dashboard/trazabilidad',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      label: t('nav.traceability'),
      requiresRole: ['super_admin', 'admin', 'manager', 'employee'],
    },
    {
      path: '/dashboard/control-stock',
      icon: <BarChart3 className="w-5 h-5" />,
      label: t('nav.stockControl'),
      requiresRole: ['super_admin', 'admin', 'manager', 'employee'],
    },
    {
      path: '/dashboard/pricing',
      icon: <CreditCard className="w-5 h-5" />,
      label: t('nav.pricing'),
      checkAccess: () => true, // Always visible for all users
    },
    {
      path: '/dashboard/settings',
      icon: <Settings className="w-5 h-5" />,
      label: t('nav.settings'),
      checkAccess: () => true, // Always visible for all users
    },
    {
      path: '/dashboard/help',
      icon: <HelpCircle className="w-5 h-5" />,
      label: t('nav.help'),
      checkAccess: () => true, // Always visible for all users
    },
  ];

  const getPageTitle = () => {
    const currentRoute = routes.find(route => route.path === location.pathname);
    return currentRoute?.label || t('nav.dashboard');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden md:flex md:flex-col w-72 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 h-16 flex items-center">
          <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h1 className="ml-3 text-xl font-bold text-gray-900 tracking-tight">Betali</h1>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {routes
            .filter(route => {
              // Filter routes based on user permissions
              if (route.checkAccess) {
                return route.checkAccess();
              }
              // Default to showing route if no permission check defined
              return true;
            })
            .map(route => (
              <SidebarItem
                key={route.path}
                to={route.path}
                icon={route.icon}
                label={route.label}
                isActive={location.pathname === route.path}
              />
            ))}
        </nav>
        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          {/* Compact info or branding */}
          <div className="text-xs font-medium text-gray-500 text-center">{t('layout.version')}</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 z-10 h-16 flex items-center">
          <div className="px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                  aria-label={isMobileMenuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
                <Link to="/dashboard" className="ml-3 hover:opacity-80 transition-opacity">
                  <h1 className="text-xl font-semibold text-gray-900">Betali</h1>
                </Link>
              </div>
              <div className="hidden md:block">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{getPageTitle()}</h1>
              </div>
              <div className="flex items-center">
                {/* User Context Indicator - Always visible, responsive internally */}
                <UserContextIndicator />
              </div>
            </div>
          </div>
        </header>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 flex z-40 md:hidden">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            ></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="h-8 w-8 rounded-md bg-green-600 flex items-center justify-center">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="ml-3 text-xl font-semibold text-gray-900">Betali</h1>
                  </Link>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                    aria-label={t('layout.closeMenu')}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {routes
                  .filter(route => {
                    // Filter routes based on user permissions
                    if (route.checkAccess) {
                      return route.checkAccess();
                    }
                    // Default to showing route if no permission check defined
                    return true;
                  })
                  .map(route => (
                    <SidebarItem
                      key={route.path}
                      to={route.path}
                      icon={route.icon}
                      label={route.label}
                      isActive={location.pathname === route.path}
                    />
                  ))}
              </nav>
              <div className="p-4 border-t border-gray-200">
                {/* Mobile branding/info */}
                <div className="text-xs text-gray-500 text-center">{t('layout.version')}</div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
