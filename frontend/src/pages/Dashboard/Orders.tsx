import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { OrdersPage } from '../../components/features/orders';

export default function OrdersDashboard() {
  return (
    <>
      <Helmet>
        <title>Orders - Betali</title>
      </Helmet>
      <DashboardLayout>
        <OrdersPage />
      </DashboardLayout>
    </>
  );
}