import { DashboardLayout } from "../../components/layout/Dashboard";
import { ProductList } from "../../components/modules/products";
import { Helmet } from "react-helmet-async";

export default function ProductsPage() {
  return (
    <>
      <Helmet>
        <title>Productos | Betali</title>
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Gestión de Productos
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Administra el inventario de productos de tu sistema
              </p>
            </div>
          </div>

          <ProductList />
        </div>
      </DashboardLayout>
    </>
  );
}
