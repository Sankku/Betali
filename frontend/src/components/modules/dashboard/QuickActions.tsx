
import { Link } from 'react-router-dom';
import { PlusCircle, ShoppingCart, Truck, Users } from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      label: 'Nueva Venta',
      icon: ShoppingCart,
      to: '/dashboard/orders?action=new',
      color: 'primary',
      description: 'Crear orden de venta'
    },
    {
      label: 'Nuevo Producto',
      icon: PlusCircle,
      to: '/dashboard/products?action=new',
      color: 'success',
      description: 'Agregar al catálogo'
    },
    {
      label: 'Nueva Compra',
      icon: Truck,
      to: '/dashboard/purchase-orders?action=new',
      color: 'primary',
      description: 'Reponer stock'
    },
    {
      label: 'Nuevo Cliente',
      icon: Users,
      to: '/dashboard/clients?action=new',
      color: 'warning',
      description: 'Registrar cliente'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
      {actions.map((action) => {
        const theme = {
          primary: {
            bgProps: 'bg-primary-50 dark:bg-primary-500/20',
            textProps: 'text-primary-600 dark:text-primary-400',
            hoverBg: 'group-hover:!bg-primary-500 dark:group-hover:!bg-primary-600',
            border: 'border-primary-100 dark:border-primary-500/20',
          },
          success: {
            bgProps: 'bg-success-50 dark:bg-success-500/20',
            textProps: 'text-success-600 dark:text-success-400',
            hoverBg: 'group-hover:!bg-success-500 dark:group-hover:!bg-success-600',
            border: 'border-success-100 dark:border-success-500/20',
          },
          warning: {
            bgProps: 'bg-warning-50 dark:bg-warning-500/20',
            textProps: 'text-warning-600 dark:text-warning-400',
            hoverBg: 'group-hover:!bg-warning-500 dark:group-hover:!bg-warning-600',
            border: 'border-warning-100 dark:border-warning-500/20',
          }
        }[action.color] || {
            bgProps: 'bg-primary-50 dark:bg-primary-500/20',
            textProps: 'text-primary-600 dark:text-primary-400',
            hoverBg: 'group-hover:!bg-primary-500 dark:group-hover:!bg-primary-600',
            border: 'border-primary-100 dark:border-primary-500/20',
        };

        return (
          <Link
            key={action.label}
            to={action.to}
            className="group relative bg-white dark:bg-neutral-800/80 p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-neutral-100 dark:border-neutral-700/50 hover:border-primary-200 dark:hover:border-primary-500/30 hover-lift backdrop-blur-md cursor-pointer flex items-center space-x-4 h-full"
          >
            <div className={`flex-shrink-0 rounded-xl p-3 ${theme.bgProps} ${theme.textProps} ${theme.hoverBg} group-hover:text-white transition-colors duration-300 shadow-sm border ${theme.border} group-hover:border-transparent`}>
              <action.icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-200 transition-colors">
                {action.label}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{action.description}</p>
            </div>
          </Link>
        )
      })}
    </div>
  );
}
