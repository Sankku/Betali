import { useState } from "react";
import {
  Package,
  Warehouse,
  RefreshCw,
  FileSpreadsheet,
  BarChart3,
  Users,
  Building2,
  Menu,
  X,
  LogOut,
  ChevronUp,
  Info,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useOrganization } from "../../../context/OrganizationContext";
import { useUserContextSwitcher } from "../../../context/UserContextSwitcher";
import { SidebarItem } from "../Sidebar/SidebarItem";
import { OrganizationSwitcherModal } from "../../features/organizations/organization-switcher-modal";
import { RoleInfoModal } from "../../features/organizations/role-info-modal";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentOrganization, currentUserRole, canAccessUsersSection } = useOrganization();
  const { currentUserContext, canAccessUsersSection: userCanAccessUsers, loading: userLoading } = useUserContextSwitcher();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOrgSwitcherOpen, setIsOrgSwitcherOpen] = useState(false);
  const [isRoleInfoOpen, setIsRoleInfoOpen] = useState(false);

  // Check if user can access users section from multiple sources
  // For super_admin, always allow access
  const hasUsersAccess = canAccessUsersSection || 
                        userCanAccessUsers || 
                        currentUserContext?.role === 'super_admin' ||
                        currentUserContext?.role === 'admin' ||
                        currentUserContext?.role === 'manager' ||
                        // If we have user data with super_admin from response, show users
                        (user && currentUserContext && !userLoading && currentUserContext.role === 'super_admin');


  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const routes = [
    {
      path: "/dashboard/products",
      icon: <Package className="w-5 h-5" />,
      label: "Products",
      requiresRole: ["super_admin", "admin", "manager", "employee"],
    },
    {
      path: "/dashboard/warehouse",
      icon: <Warehouse className="w-5 h-5" />,
      label: "Warehouses",
      requiresRole: ["super_admin", "admin", "manager", "employee"],
    },
    {
      path: "/dashboard/stock-movements",
      icon: <RefreshCw className="w-5 h-5" />,
      label: "Movements",
      requiresRole: ["super_admin", "admin", "manager", "employee"],
    },
    {
      path: "/dashboard/users",
      icon: <Users className="w-5 h-5" />,
      label: "Users",
      requiresRole: ["super_admin", "admin", "manager"],
    },
    {
      path: "/dashboard/organizations",
      icon: <Building2 className="w-5 h-5" />,
      label: "Organizations",
      requiresRole: ["super_admin", "admin", "manager"],
    },
    {
      path: "/dashboard/trazabilidad",
      icon: <FileSpreadsheet className="w-5 h-5" />,
      label: "Traceability",
      requiresRole: ["super_admin", "admin", "manager", "employee"],
    },
    {
      path: "/dashboard/control-stock",
      icon: <BarChart3 className="w-5 h-5" />,
      label: "Stock Control",
      requiresRole: ["super_admin", "admin", "manager", "employee"],
    },
  ];

  const getPageTitle = () => {
    const currentRoute = routes.find(
      (route) => route.path === location.pathname,
    );
    return currentRoute?.label || "Dashboard";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 h-16">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-md bg-green-600 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-900">Betali</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {routes
            .filter((route) => {
              // Filter routes based on current user context role
              if (route.path === "/dashboard/users") {
                return hasUsersAccess;
              }
              
              // For other routes, check role from either context
              const role = currentUserRole || currentUserContext?.role;
              if (role) {
                return route.requiresRole.includes(role);
              }
              return true; // Show all routes if context is not loaded yet
            })
            .map((route) => (
              <SidebarItem
                key={route.path}
                to={route.path}
                icon={route.icon}
                label={route.label}
                isActive={location.pathname === route.path}
              />
            ))}
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-2">
          {/* Organization Switcher */}
          <button
            onClick={() => setIsOrgSwitcherOpen(true)}
            className="flex items-center w-full p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            aria-label="Switch organization"
          >
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {currentOrganization?.name || 'Loading...'}
              </p>
              <p className="text-xs text-gray-500">
                Switch organization
              </p>
            </div>
            <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </button>

          {/* Role Information */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsRoleInfoOpen(true)}
              className="flex items-center flex-1 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              aria-label="View role information"
            >
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-sm font-medium text-green-700">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">
                  {currentUserRole ? currentUserRole.replace('_', ' ') : 'Loading role...'}
                </p>
              </div>
              <Info className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button
              onClick={handleSignOut}
              className="ml-2 p-2 rounded-full text-gray-400 hover:text-gray-600"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 z-10 h-16">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                  aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
                <h1 className="ml-3 text-xl font-semibold text-gray-900">
                  Betali
                </h1>
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold text-gray-900">
                  {getPageTitle()}
                </h1>
              </div>
              <div className="flex items-center md:hidden">
                <button
                  onClick={handleSignOut}
                  className="ml-4 p-1 rounded-full text-gray-400 hover:text-gray-600"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
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
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-md bg-green-600 flex items-center justify-center">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="ml-3 text-xl font-semibold text-gray-900">
                      Betali
                    </h1>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {routes
                  .filter((route) => {
                    // Filter routes based on current user context role
                    if (route.path === "/dashboard/users") {
                      return hasUsersAccess;
                    }
                    
                    // For other routes, check role from either context
                    const role = currentUserRole || currentUserContext?.role;
                    if (role) {
                      return route.requiresRole.includes(role);
                    }
                    return true; // Show all routes if context is not loaded yet
                  })
                  .map((route) => (
                    <SidebarItem
                      key={route.path}
                      to={route.path}
                      icon={route.icon}
                      label={route.label}
                      isActive={location.pathname === route.path}
                    />
                  ))}
              </nav>
              <div className="p-4 border-t border-gray-200 space-y-2">
                {/* Organization Switcher */}
                <button
                  onClick={() => setIsOrgSwitcherOpen(true)}
                  className="flex items-center w-full p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  aria-label="Switch organization"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {currentOrganization?.name || 'Loading...'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Switch organization
                    </p>
                  </div>
                  <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </button>

                {/* Role Information */}
                <button
                  onClick={() => setIsRoleInfoOpen(true)}
                  className="flex items-center w-full p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  aria-label="View role information"
                >
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-green-700">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentUserRole ? currentUserRole.replace('_', ' ') : 'Loading role...'}
                    </p>
                  </div>
                  <Info className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <OrganizationSwitcherModal
        isOpen={isOrgSwitcherOpen}
        onClose={() => setIsOrgSwitcherOpen(false)}
      />

      <RoleInfoModal
        isOpen={isRoleInfoOpen}
        onClose={() => setIsRoleInfoOpen(false)}
      />
    </div>
  );
}
