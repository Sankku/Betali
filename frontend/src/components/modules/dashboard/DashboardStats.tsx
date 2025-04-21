import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { Link } from "react-router-dom";
import { Package, Warehouse, RefreshCw, AlertTriangle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number | undefined;
  description?: string;
  icon: React.ReactNode;
  to: string;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({
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

export function DashboardStats() {
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

  return (
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
  );
}
