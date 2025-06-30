import React from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryProvider } from "./lib/providers/query-provider";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Dashboard/Products";
import Warehouses from "./pages/Dashboard/Warehouse";
import StockMovements from "./pages/Dashboard/StockMovements";

function App() {
  return (
    <React.StrictMode>
      <QueryProvider>
        <AuthProvider>
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
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </HelmetProvider>
        </AuthProvider>
      </QueryProvider>
    </React.StrictMode>
  );
}

export default App;
