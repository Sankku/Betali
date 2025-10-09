import React from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryProvider } from "./lib/providers/query-provider";
import { AuthProvider } from "./context/AuthContext";
import { UserContextSwitcherProvider } from "./context/UserContextSwitcher";
import { OrganizationProvider } from "./context/OrganizationContext";
import { GlobalSyncProvider } from "./context/GlobalSyncContext";
import { GlobalLoading } from "./components/ui/global-loading";
import { ToastContainer } from "./components/ui/toast";
import { useAuthStateChange } from "./hooks/useAuthStateChange";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Dashboard/Products";
import Warehouses from "./pages/Dashboard/Warehouse";
import StockMovements from "./pages/Dashboard/StockMovements";
import Users from "./pages/Dashboard/Users";
import Organizations from "./pages/Dashboard/Organizations";
import Clients from "./pages/Dashboard/Clients";
import Suppliers from "./pages/Dashboard/Suppliers";
import Orders from "./pages/Dashboard/Orders";
import TaxManagement from "./pages/Dashboard/TaxManagement";

function AppContent() {
  useAuthStateChange();
  
  return (
    <AuthProvider>
      <GlobalSyncProvider>
        <OrganizationProvider>
          <UserContextSwitcherProvider>
          <HelmetProvider>
            <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/products"
                    element={
                      <ProtectedRoute>
                        <Products />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/warehouse"
                    element={
                      <ProtectedRoute>
                        <Warehouses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/stock-movements"
                    element={
                      <ProtectedRoute>
                        <StockMovements />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/users"
                    element={
                      <ProtectedRoute>
                        <Users />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/organizations"
                    element={
                      <ProtectedRoute>
                        <Organizations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/clients"
                    element={
                      <ProtectedRoute>
                        <Clients />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/suppliers"
                    element={
                      <ProtectedRoute>
                        <Suppliers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/orders"
                    element={
                      <ProtectedRoute>
                        <Orders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/taxes"
                    element={
                      <ProtectedRoute>
                        <TaxManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
          </HelmetProvider>
          <GlobalLoading />
          <ToastContainer />
          </UserContextSwitcherProvider>
        </OrganizationProvider>
      </GlobalSyncProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
}

export default App;
