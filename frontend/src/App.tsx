import React, { Suspense, lazy } from "react";
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
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eagerly loaded — needed immediately on cold start
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

// Lazily loaded — only fetched when the user navigates to the route
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Dashboard/Products"));
const Warehouses = lazy(() => import("./pages/Dashboard/Warehouse"));
const StockMovements = lazy(() => import("./pages/Dashboard/StockMovements"));
const Users = lazy(() => import("./pages/Dashboard/Users"));
const Organizations = lazy(() => import("./pages/Dashboard/Organizations"));
const Clients = lazy(() => import("./pages/Dashboard/Clients"));
const Suppliers = lazy(() => import("./pages/Dashboard/Suppliers"));
const Orders = lazy(() => import("./pages/Dashboard/Orders"));
const PurchaseOrders = lazy(() => import("./pages/Dashboard/PurchaseOrders"));
const TaxManagement = lazy(() => import("./pages/Dashboard/TaxManagement"));
const Settings = lazy(() => import("./pages/Dashboard/Settings"));
const Help = lazy(() => import("./pages/Dashboard/Help"));
const Pricing = lazy(() => import("./pages/Dashboard/Pricing"));
const SubscriptionManagement = lazy(() => import("./pages/Dashboard/SubscriptionManagement"));
const PaymentHistory = lazy(() => import("./pages/Dashboard/PaymentHistory"));
const PaymentSuccess = lazy(() => import("./pages/Dashboard/PaymentSuccess"));
const PaymentFailure = lazy(() => import("./pages/Dashboard/PaymentFailure"));
const PaymentPending = lazy(() => import("./pages/Dashboard/PaymentPending"));
const OnboardingWizard = lazy(() =>
  import("./components/features/help/OnboardingWizard").then((m) => ({ default: m.OnboardingWizard }))
);

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
                      <ErrorBoundary>
                        <Suspense fallback={null}>
                          <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/terms" element={<TermsOfService />} />
                            <Route path="/privacy" element={<PrivacyPolicy />} />
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
                              path="/dashboard/payments"
                              element={
                                <ProtectedRoute>
                                  <PaymentHistory />
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
                            {/* 404 — must be last */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                      </ErrorBoundary>
                    </BrowserRouter>
                  </HelmetProvider>
                  <Suspense fallback={null}><OnboardingWizard /></Suspense>
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
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export default App;
