import { useState } from "react";
import {
  Package,
  Warehouse,
  RefreshCw,
  FileSpreadsheet,
  BarChart3,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { SidebarItem } from "../Sidebar/SidebarItem";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const routes = [
    {
      path: "/dashboard/productos",
      icon: <Package className="w-5 h-5" />,
      label: "Productos",
    },
    {
      path: "/dashboard/depositos",
      icon: <Warehouse className="w-5 h-5" />,
      label: "Depósitos",
    },
    {
      path: "/dashboard/movimientos",
      icon: <RefreshCw className="w-5 h-5" />,
      label: "Movimientos",
    },
    {
      path: "/dashboard/trazabilidad",
      icon: <FileSpreadsheet className="w-5 h-5" />,
      label: "Trazabilidad",
    },
    {
      path: "/dashboard/control-stock",
      icon: <BarChart3 className="w-5 h-5" />,
      label: "Control de Stock",
    },
  ];

  const getPageTitle = () => {
    const currentRoute = routes.find(
      (route) => route.path === location.pathname
    );
    return currentRoute?.label || "Dashboard";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-md bg-green-600 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-900">Betali</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {routes.map((route) => (
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                  aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
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
                  aria-label="Cerrar sesión"
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
                    aria-label="Cerrar menú"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {routes.map((route) => (
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
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido de la página */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
