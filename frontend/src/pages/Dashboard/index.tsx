import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { 
  DashboardStats, 
  ActivityList, 
  TrendChart, 
  ExpiringProducts, 
  QuickActions 
} from '../../components/modules/dashboard';
import { useAuth } from '../../context/AuthContext';
import { AlertsWidget } from '../../components/features/alerts/AlertsWidget';

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const { user } = useAuth();
  const isWelcome = searchParams.get('welcome') === 'true';

  useEffect(() => {
    if (isWelcome) {
      setShowWelcome(true);
      // Remove the welcome parameter from URL after showing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('welcome');
      setSearchParams(newParams, { replace: true });
      
      // Auto-hide welcome message after 8 seconds
      const timer = setTimeout(() => setShowWelcome(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isWelcome, searchParams, setSearchParams]);

  return (
    <>
      <Helmet>
        <title>Dashboard | Betali</title>
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          {showWelcome && (
            <div className="rounded-xl bg-gradient-to-r from-success-50 to-success-100 dark:from-success-900/40 dark:to-success-800/40 border border-success-200 dark:border-success-800/50 p-6 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-success-500">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-success-800 dark:text-success-300">
                    🎉 Welcome to Betali!
                  </h3>
                  <p className="mt-1 text-sm text-success-700 dark:text-success-400">
                    Your account has been created successfully. You can now start managing your inventory and business operations.
                  </p>
                </div>
                <div className="ml-auto pl-4">
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="text-success-600 dark:text-success-400 hover:text-success-800 dark:hover:text-success-200 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">Resumen</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Vista general del sistema de gestión de stock
              </p>
            </div>
          </div>

          <QuickActions />

          <DashboardStats />

          {/* Alerts Widget - Full width */}
          <AlertsWidget maxAlerts={5} showDismissButton={true} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <TrendChart />
            </div>
            <div className="lg:col-span-1 h-full"> 
              <ExpiringProducts />
            </div>
          </div>
          
          <div className="grid grid-cols-1">
             <ActivityList />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
