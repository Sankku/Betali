import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "../../components/layout/Dashboard";
import {
  DashboardStats,
  ActivityList,
  TrendChart,
} from "../../components/modules/dashboard";

export default function DashboardPage() {
  return (
    <>
      <Helmet>
        <title>Dashboard | Betali</title>
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Resumen</h2>
            <p className="mt-1 text-sm text-gray-500">
              Vista general del sistema de gestión de stock
            </p>
          </div>
          <DashboardStats />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ActivityList />
            <TrendChart />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
