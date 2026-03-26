
import { useQuery } from '@tanstack/react-query';
import { productsService } from '../../../services/api/productsService';
import { useOrganization } from '../../../context/OrganizationContext';
import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, ArrowRight } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ExpiringProducts() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: expiringProducts, isLoading } = useQuery({
    queryKey: ['expiringProducts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const products = await productsService.getAll();
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      return products
        .filter((product: any) => {
          if (!product.expiration_date) return false;
          const expDate = parseISO(product.expiration_date);
          return expDate >= today && expDate <= thirtyDaysFromNow;
        })
        .sort((a: any, b: any) => 
          new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
        )
        .slice(0, 5); // Take top 5
    },
  });

  if (isLoading) return (
    <div className="bg-white shadow rounded-lg p-6 h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warning-500"></div>
    </div>
  );

  const hasProducts = expiringProducts && expiringProducts.length > 0;

  return (
    <div className="bg-white dark:bg-neutral-800/90 shadow-sm rounded-xl h-full flex flex-col border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-md overflow-hidden relative">
      {/* Accent border top instead of left for better rounded-xl compatibility */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-warning-500 rounded-t-xl" />
      <div className="px-5 py-5 sm:px-6 border-b border-neutral-100 dark:border-neutral-700/50 flex justify-between items-center">
        <h3 className="text-lg font-semibold leading-6 text-neutral-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning-500" />
          Próximos a Vencer
        </h3>
        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-400 border border-transparent dark:border-warning-500/30">
          30 días
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!hasProducts ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <Calendar className="h-10 w-10 mb-2 text-neutral-300" />
            <p className="text-sm">No hay productos próximos a vencer</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {expiringProducts.map((product: any) => {
              const daysLeft = differenceInDays(parseISO(product.expiration_date), new Date());
              const isUrgent = daysLeft <= 7;

              return (
                <li key={product.product_id} className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded-lg transition-colors mx-2 cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Lote: {product.batch_number || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        isUrgent
                          ? 'bg-danger-100 text-danger-800 dark:bg-danger-500/20 dark:text-danger-400 border border-transparent dark:border-danger-500/30'
                          : 'bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-400 border border-transparent dark:border-warning-500/30'
                      }`}>
                        {daysLeft} días
                      </span>
                      <p className="text-xs text-neutral-400 mt-1">
                        {format(parseISO(product.expiration_date), 'dd MMM', { locale: es })}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-neutral-100 dark:border-neutral-700/50 bg-neutral-50 dark:bg-neutral-800/50 mt-auto">
        <Link
          to="/dashboard/products"
          className="text-sm font-medium text-warning-600 dark:text-warning-500 hover:text-warning-700 dark:hover:text-warning-400 flex items-center justify-center sm:justify-start transition-colors duration-150"
        >
          Gestionar inventario <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}
