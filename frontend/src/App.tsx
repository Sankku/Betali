import React from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryProvider } from "./lib/providers/query-provider";
import { AuthProvider } from "./context/AuthContext";
import { UserContextSwitcherProvider } from "./context/UserContextSwitcher";
import { OrganizationProvider } from "./context/OrganizationContext";
import { GlobalSyncProvider } from "./context/GlobalSyncContext";
import { DateFormatProvider } from "./contexts/DateFormatContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
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
import PurchaseOrders from "./pages/Dashboard/PurchaseOrders";
import TaxManagement from "./pages/Dashboard/TaxManagement";
import Settings from "./pages/Dashboard/Settings";
import Help from "./pages/Dashboard/Help";
import Pricing from "./pages/Dashboard/Pricing";
import SubscriptionManagement from "./pages/Dashboard/SubscriptionManagement";
import PaymentSuccess from "./pages/Dashboard/PaymentSuccess";
import PaymentFailure from "./pages/Dashboard/PaymentFailure";
import PaymentPending from "./pages/Dashboard/PaymentPending";
import { OnboardingWizard } from "./components/features/help/OnboardingWizard";

function AppContent() {
  useAuthStateChange();
  
  return (
    <AuthProvider>
      <GlobalSyncProvider>
        <OrganizationProvider>
          <UserContextSwitcherProvider>
            <LanguageProvider>
              <DateFormatProvider>
                <OnboardingProvider>
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
                    path="/dashboard/purchase-orders"
                    element={
                      <ProtectedRoute>
                        <PurchaseOrders />
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
                  <Route
                    path="/dashboard/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/help"
                    element={
                      <ProtectedRoute>
                        <Help />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/pricing"
                    element={
                      <ProtectedRoute>
                        <Pricing />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/subscription"
                    element={
                      <ProtectedRoute>
                        <SubscriptionManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payment/success"
                    element={
                      <ProtectedRoute>
                        <PaymentSuccess />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payment/failure"
                    element={
                      <ProtectedRoute>
                        <PaymentFailure />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payment/pending"
                    element={
                      <ProtectedRoute>
                        <PaymentPending />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                  </BrowserRouter>
                </HelmetProvider>
                <OnboardingWizard />
                <GlobalLoading />
                <ToastContainer />
                </OnboardingProvider>
              </DateFormatProvider>
            </LanguageProvider>
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
