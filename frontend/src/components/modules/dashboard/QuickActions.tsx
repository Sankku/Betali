import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ShoppingCart, Truck, Users } from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      label: 'Nueva Venta',
      icon: ShoppingCart,
      to: '/dashboard/orders?action=new',
      color: 'bg-blue-500',
      description: 'Crear orden de venta'
    },
    {
      label: 'Nuevo Producto',
      icon: PlusCircle,
      to: '/dashboard/products?action=new',
      color: 'bg-emerald-500',
      description: 'Agregar al catálogo'
    },
    {
      label: 'Nueva Compra',
      icon: Truck,
      to: '/dashboard/purchase-orders?action=new',
      color: 'bg-purple-500',
      description: 'Reponer stock'
    },
    {
      label: 'Nuevo Cliente',
      icon: Users,
      to: '/dashboard/clients?action=new',
      color: 'bg-amber-500',
      description: 'Registrar cliente'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
      {actions.map((action) => (
        <Link
          key={action.label}
          to={action.to}
          className="relative group bg-white p-4 focus:outline-none rounded-lg shadow hover:shadow-md transition-all duration-200 border border-transparent hover:border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <span className={`inline-flex rounded-lg p-3 ring-4 ring-white ${action.color} shadow-sm`}>
              <action.icon className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                {action.label}
              </p>
              <p className="text-xs text-gray-500 truncate">{action.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
