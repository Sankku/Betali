import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export function TrendChart() {
  return (
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
  );
}
