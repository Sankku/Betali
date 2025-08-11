import React from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryProvider } from "./lib/providers/query-provider";
import { AuthProvider } from "./context/AuthContext";
import { UserContextSwitcherProvider } from "./context/UserContextSwitcher";
import { OrganizationProvider } from "./context/OrganizationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Dashboard/Products";
import Warehouses from "./pages/Dashboard/Warehouse";
import StockMovements from "./pages/Dashboard/StockMovements";
import Users from "./pages/Dashboard/Users";
import Organizations from "./pages/Dashboard/Organizations";

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
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
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </BrowserRouter>
            </HelmetProvider>
          </UserContextSwitcherProvider>
        </OrganizationProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
