import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { PurchaseOrdersPage } from '../../components/features/purchase-orders';

export default function PurchaseOrdersDashboard() {
  return (
    <>
      <Helmet>
        <title>Órdenes de Compra - Betali</title>
      </Helmet>
      <DashboardLayout>
        <PurchaseOrdersPage />
      </DashboardLayout>
    </>
  );
}
