import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import {
  Package,
  Warehouse,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string | number | undefined;
  description?: string;
  icon: React.ReactNode;
  to: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  to,
  color,
}) => (
  <Link to={to} className="block">
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${color}`}>{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
              {description && (
                <dd className="mt-1 text-sm text-gray-500">{description}</dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  </Link>
);

const ActivityItem: React.FC<{
  type: string;
  product?: string;
  warehouse?: string;
  date: string;
  status?: string;
}> = ({ type, product, warehouse, date, status }) => {
  let statusColor = "bg-gray-100 text-gray-800";
  let statusIcon = null;

  if (status === "completed") {
    statusColor = "bg-green-100 text-green-800";
  } else if (status === "pending") {
    statusColor = "bg-yellow-100 text-yellow-800";
  } else if (status === "error") {
    statusColor = "bg-red-100 text-red-800";
  }

  return (
    <li className="py-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {type}
            {product && <span className="font-normal"> - {product}</span>}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {warehouse && <span>{warehouse} • </span>}
            {date}
          </p>
        </div>
        {status && (
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
            >
              {statusIcon}
              {status}
            </span>
          </div>
        )}
      </div>
    </li>
  );
};

const Dashboard: React.FC = () => {
  const { data: productsCount, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["productsCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: warehousesCount, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehousesCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("warehouse")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: movementsCount, isLoading: isLoadingMovements } = useQuery({
    queryKey: ["movementsCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("stock_movements")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: alertsCount } = useQuery({
    queryKey: ["alertsCount"],
    queryFn: async () => {
      return 3;
    },
  });

  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["recentActivity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(
          `
          movement_id,
          movement_date,
          movement_type,
          quantity,
          products(name),
          warehouse:warehouse_id(name)
        `
        )
        .order("movement_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Resumen</h2>
          <p className="mt-1 text-sm text-gray-500">
            Vista general del sistema de gestión de stock
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Productos"
            value={isLoadingProducts ? "Cargando..." : productsCount}
            icon={<Package className="h-5 w-5 text-white" />}
            to="/dashboard/productos"
            color="bg-blue-500"
          />
          <StatCard
            title="Depósitos"
            value={isLoadingWarehouses ? "Cargando..." : warehousesCount}
            icon={<Warehouse className="h-5 w-5 text-white" />}
            to="/dashboard/depositos"
            color="bg-green-500"
          />
          <StatCard
            title="Movimientos"
            value={isLoadingMovements ? "Cargando..." : movementsCount}
            icon={<RefreshCw className="h-5 w-5 text-white" />}
            to="/dashboard/movimientos"
            color="bg-purple-500"
          />
          <StatCard
            title="Alertas"
            value={alertsCount || 0}
            description="Discrepancias de stock"
            icon={<AlertTriangle className="h-5 w-5 text-white" />}
            to="/dashboard/control-stock"
            color="bg-red-500"
          />
        </div>

        {/* Activity and Charts */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Actividad Reciente
              </h3>
            </div>
            <div className="px-4 py-3 sm:px-6">
              {isLoadingActivity ? (
                <p className="text-gray-500 text-sm">Cargando actividad...</p>
              ) : recentActivity && recentActivity.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentActivity.map((movement: any) => (
                    <ActivityItem
                      key={movement.movement_id}
                      type={movement.movement_type}
                      product={movement.products?.name}
                      warehouse={movement.warehouse?.name}
                      date={new Date(
                        movement.movement_date
                      ).toLocaleDateString()}
                      status="completed"
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">
                  No hay actividad reciente
                </p>
              )}
            </div>
            <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
              <Link
                to="/dashboard/movimientos"
                className="text-sm font-medium text-green-600 hover:text-green-500"
              >
                Ver todos los movimientos
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Tendencias de Stock
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Datos de tendencias
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Aquí se mostrará un gráfico con las tendencias de stock
                </p>
                <div className="mt-6">
                  <Link
                    to="/dashboard/control-stock"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    Ver análisis completo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
