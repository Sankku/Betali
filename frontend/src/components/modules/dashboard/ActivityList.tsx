import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { Link } from "react-router-dom";

interface ActivityItemProps {
  type: string;
  product?: string;
  warehouse?: string;
  date: string;
  status?: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  type,
  product,
  warehouse,
  date,
  status,
}) => {
  let statusColor = "bg-gray-100 text-gray-800";

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
              {status}
            </span>
          </div>
        )}
      </div>
    </li>
  );
};

export function ActivityList() {
  const { data: recentActivity, isLoading } = useQuery({
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
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Actividad Reciente
        </h3>
      </div>
      <div className="px-4 py-3 sm:px-6">
        {isLoading ? (
          <p className="text-gray-500 text-sm">Cargando actividad...</p>
        ) : recentActivity && recentActivity.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recentActivity.map((movement: any) => (
              <ActivityItem
                key={movement.movement_id}
                type={movement.movement_type}
                product={movement.products?.name}
                warehouse={movement.warehouse?.name}
                date={new Date(movement.movement_date).toLocaleDateString()}
                status="completed"
              />
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No hay actividad reciente</p>
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
  );
}
