# Dashboard Metrics & Improvements

## ✅ Implemented Features

### 1. Dashboard Stats (`DashboardStats.tsx`)
Updated the metrics cards to show real-time business data:
- **Inventory Value**: Calculates the total value (`price * stock`) of all products.
- **Monthly Orders**: Shows the count of orders created in the current month.
- **Low Stock Alerts**: Displays a count of products with stock < 10 (Placeholder for the upcoming backend alerts system).
- **Active Warehouses**: Keeps the existing warehouse count.

### 2. Activity List (`ActivityList.tsx`)
- **Fixed Navigation**: Corrected link to point to `/dashboard/stock-movements`.
- **Improved UI**: Added color-coding for movement types (Entrada, Salida, Ajuste).
- **Translation**: Translated movement types to Spanish.

## 🔧 Technical Details
- **Products Service**: leveraging `productsService.getAll()` to ensure consistent data with the Products page.
- **Supabase Direct**: Optimized counts for Warehouses and Orders using direct `count` queries.
- **Date Filtering**: "Monthly Orders" filters by `created_at` from the 1st of the current month.

## 🔜 Next Steps regarding Alerts
Once the explicit "Inventory Alerts" backend (with `min_stock` column) is ready:
1. Update `DashboardStats.tsx` to filter by `current_stock <= min_stock`.
2. Update the "Alerts" card to link to a dedicated alerts view if created.
