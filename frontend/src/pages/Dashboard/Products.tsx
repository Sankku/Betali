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
        <ProductList />
      </DashboardLayout>
    </>
  );
}
