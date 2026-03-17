# 🗄️ BETALI DATABASE SCHEMA DOCUMENTATION

## 📋 Table Overview

### 🏢 **Multi-Tenant Core Tables**

#### `organizations`
**Purpose:** Main tenant entities for SaaS multi-tenancy
```sql
- organization_id (UUID, PK)
- name (VARCHAR 255, NOT NULL)
- slug (VARCHAR 100, UNIQUE, NOT NULL) 
- domain (VARCHAR 255, NULLABLE)
- logo_url (TEXT, NULLABLE)
- address (TEXT, NULLABLE)
- phone (VARCHAR 50, NULLABLE)
- email (VARCHAR 255, NULLABLE)
- tax_id (VARCHAR 50, NULLABLE)
- plan_type (ENUM: basic, premium, enterprise)
- max_users (INTEGER, DEFAULT 10)
- max_warehouses (INTEGER, DEFAULT 5)
- features (JSONB, DEFAULT '{}')
- settings (JSONB, DEFAULT '{}')
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
- owner_user_id (UUID, FK → users.user_id)
```

#### `branches`
**Purpose:** Physical locations/branches within organizations
```sql
- branch_id (UUID, PK)
- organization_id (UUID, FK → organizations.organization_id, CASCADE)
- name (VARCHAR 255, NOT NULL)
- address (TEXT, NULLABLE)
- phone (VARCHAR 50, NULLABLE)
- manager_user_id (UUID, FK → users.user_id, SET NULL)
- is_main_branch (BOOLEAN, DEFAULT false)
- is_active (BOOLEAN, DEFAULT true)
- settings (JSONB, DEFAULT '{}')
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### `users`
**Purpose:** System users with role-based access
```sql
- user_id (UUID, PK)
- name (VARCHAR 100, NOT NULL)
- email (VARCHAR 100, UNIQUE, NOT NULL)
- password_hash (TEXT, NOT NULL)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- role (VARCHAR 50, DEFAULT 'member')
- organization_id (UUID, FK → organizations.organization_id)
```

#### `user_organizations`
**Purpose:** Many-to-many relationship between users and organizations
```sql
- user_organization_id (UUID, PK)
- user_id (UUID, FK → users.user_id, CASCADE)
- organization_id (UUID, FK → organizations.organization_id, CASCADE)
- branch_id (UUID, FK → branches.branch_id, SET NULL)
- role (ENUM: admin, manager, employee)
- permissions (JSONB, DEFAULT '[]')
- is_active (BOOLEAN, DEFAULT true)
- joined_at (TIMESTAMP, DEFAULT now())
```

### 📦 **Inventory Management Tables**

#### `products`
**Purpose:** Product/item catalog for any type of business (goods, raw materials, finished goods, services)
```sql
- product_id (UUID, PK)
- name (VARCHAR 100, NOT NULL)
- description (TEXT, NULLABLE)
- category (VARCHAR 100, NULLABLE)
- unit (VARCHAR 50, NULLABLE)             -- e.g. kg, units, liters
- product_type (VARCHAR 20, NULLABLE)     -- standard | raw_material | finished_good
- batch_number (VARCHAR 50, NOT NULL)
- expiration_date (DATE, NOT NULL)
- origin_country (VARCHAR 100, NOT NULL)
- destination_id (UUID, NULLABLE)
- senasa_product_id (VARCHAR 50, UNIQUE, NULLABLE)  -- legacy: Argentine agro compliance field
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- owner_id (UUID, DEFAULT gen_random_uuid())
- organization_id (UUID, FK → organizations.organization_id, RESTRICT)
- branch_id (UUID, FK → branches.branch_id, SET NULL)
```

#### `warehouse`
**Purpose:** Storage locations for inventory
```sql
- warehouse_id (UUID, PK)
- name (VARCHAR 100, NOT NULL)
- location (TEXT, NULLABLE)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- user_id (UUID, FK → auth.users.id, SET NULL)
- owner_id (UUID, FK → auth.users.id, SET NULL)
- organization_id (UUID, FK → organizations.organization_id, RESTRICT)
- branch_id (UUID, FK → branches.branch_id, RESTRICT)
```

#### `stock_movements`
**Purpose:** Track all inventory movements (in/out/adjustments)
```sql
- movement_id (UUID, PK)
- product_id (UUID, FK → products.product_id, CASCADE)
- warehouse_id (UUID, FK → warehouse.warehouse_id, CASCADE)
- movement_type (VARCHAR 20, CHECK: entry|exit|adjustment|production|senasa)
- quantity (INTEGER, > 0)
- movement_date (TIMESTAMP, DEFAULT now())
- reference (VARCHAR 255, NULLABLE)
- created_at (TIMESTAMP)
- organization_id (UUID, FK → organizations.organization_id, RESTRICT)
- branch_id (UUID, FK → branches.branch_id, SET NULL)
```

### 👥 **Customer/Client Management**

#### `clients`
**Purpose:** Customer/client management for sales
```sql
- client_id (UUID, PK)
- name (VARCHAR 100, NOT NULL)
- cuit (VARCHAR 20, UNIQUE, NOT NULL)
- phone (VARCHAR 20, NULLABLE)
- email (VARCHAR 100, UNIQUE, NOT NULL)
- address (TEXT, NULLABLE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- user_id (UUID, FK → users.user_id, SET NULL)
- organization_id (UUID, FK → organizations.organization_id, RESTRICT)
- branch_id (UUID, FK → branches.branch_id, SET NULL)
```

### 📝 **Orders & Sales Management**

#### `orders`
**Purpose:** Sales orders management
```sql
- order_id (UUID, PK)
- client_id (UUID, FK → clients.client_id, SET NULL)
- warehouse_id (UUID, FK → warehouse.warehouse_id, SET NULL)
- order_date (TIMESTAMP, DEFAULT now())
- status (VARCHAR 20, CHECK: pending|shipped|delivered|cancelled)
- total_price (NUMERIC 10,2, DEFAULT 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- user_id (UUID, DEFAULT gen_random_uuid())
- organization_id (UUID, FK → organizations.organization_id, RESTRICT)
- branch_id (UUID, FK → branches.branch_id, SET NULL)
```

#### `order_details`
**Purpose:** Line items for sales orders
```sql
- order_detail_id (UUID, PK)
- order_id (UUID, FK → orders.order_id, CASCADE)
- product_id (UUID, FK → products.product_id, CASCADE)
- quantity (INTEGER, > 0)
- price (NUMERIC 10,2, >= 0)
- created_at (TIMESTAMP)
- organization_id (UUID, FK → organizations.organization_id, RESTRICT)
```

### 🔧 **System Configuration**

#### `table_configurations`
**Purpose:** Dynamic table configuration for UI
```sql
- id (VARCHAR, PK)
- name (VARCHAR, NOT NULL)
- entity (VARCHAR, NOT NULL)
- config (JSONB, NOT NULL)
- created_at (TIMESTAMP)
```

### 🏭 **Manufacturing / Production** *(planned feature)*

#### `product_formulas` *(not yet implemented — planned)*
**Purpose:** Bill of Materials (BOM) — defines which raw materials are needed to produce a finished good
```sql
- formula_id (UUID, PK)
- finished_product_id (UUID, FK → products.product_id)   -- the product being manufactured
- raw_material_id (UUID, FK → products.product_id)        -- each input ingredient/component
- quantity_required (NUMERIC 10,4, NOT NULL)              -- quantity consumed per unit produced
- organization_id (UUID, FK → organizations.organization_id)
- created_at (TIMESTAMP)
```

### 🔗 **Legacy / Domain-Specific Integration**
> These tables exist from an earlier version targeting Argentine agro/SENASA compliance. They are preserved for backwards compatibility but are not part of the generic SaaS product.

#### `senasa_products`
**Purpose:** [Legacy] Official SENASA (Argentine agricultural authority) product catalog
```sql
- senasa_product_id (VARCHAR 50, PK)
- reg_senasa (VARCHAR 50, NULLABLE)
- formulation_id (VARCHAR 50, NULLABLE)
- toxicological_class_id (VARCHAR 50, NULLABLE)
- package_id (VARCHAR 50, NULLABLE)
- material_id (VARCHAR 50, NULLABLE)
- capacity (NUMERIC 10,2, NULLABLE)
- unit_id (VARCHAR 50, NULLABLE)
- created_at (TIMESTAMP)
```

#### `senasa_transactions`
**Purpose:** [Legacy] Log of SENASA API interactions for agricultural compliance
```sql
- transaction_id (UUID, PK)
- transaction_date (TIMESTAMP, DEFAULT now())
- method_name (VARCHAR 100, NOT NULL)
- request_data (JSONB, NOT NULL)
- response_data (JSONB, NULLABLE)
- status (VARCHAR 20, CHECK: success|error|pending)
- error_message (TEXT, NULLABLE)
- created_at (TIMESTAMP)
```

## 🔗 **Key Relationships**

### Multi-Tenant Hierarchy
```
organizations (1) → (N) branches
organizations (1) → (N) users
organizations (1) → (N) clients
organizations (1) → (N) products
organizations (1) → (N) warehouse
organizations (1) → (N) orders
```

### Business Flow
```
clients (1) → (N) orders
orders (1) → (N) order_details
products (1) → (N) order_details
warehouse (1) → (N) stock_movements
products (1) → (N) stock_movements
```

## 📊 **Current Indexes**

- Organizations: slug, is_active, owner_user_id
- Branches: organization_id, (organization_id, is_active)
- Users: organization_id, role
- Clients: organization_id, (organization_id, branch_id)
- Products: organization_id, (organization_id, branch_id)
- Warehouse: organization_id, (organization_id, branch_id)
- Stock Movements: organization_id, (organization_id, branch_id)
- Orders: organization_id, (organization_id, branch_id)

## 🚧 **Missing for MVP**

### Critical Missing Tables:
- **suppliers** - For purchase orders
- **purchase_orders** - Procurement management
- **purchase_order_details** - Line items for purchases
- **taxes** - Tax configuration (IVA, etc.)
- **promotions** - Discount/promotion system

### Potential Enhancements:
- **invoices** - Invoice generation
- **payments** - Payment tracking
- **inventory_alerts** - Low stock alerts
- **audit_logs** - Change tracking

## 🚨 **Known Schema Issues**

### Smoke Test Results: 8/11 Tests Passing

✅ **Working Correctly:**
- Organizations CRUD
- Users management
- Branches management
- Clients management
- Products management
- Multi-tenant data isolation
- Database connections
- Data cleanup

❌ **Known Issues:**
1. **Warehouse table FK constraints** - References `auth.users` instead of `users` table
2. **Stock movements** - Depends on warehouse creation
3. **Orders** - Depends on warehouse creation

### Technical Debt:
- `warehouse.user_id` → Should reference `users.user_id` not `auth.users.id`
- `warehouse.owner_id` → Should reference `users.user_id` not `auth.users.id`
- Default UUID generation causing FK constraint violations

## 📊 **System Health Status**

🟢 **Core Multi-Tenant**: Fully functional  
🟢 **User Management**: Fully functional  
🟢 **Product Catalog**: Fully functional  
🟢 **Client Management**: Fully functional  
🟡 **Inventory Management**: Partially functional (warehouse issues)  
🟡 **Order Management**: Partially functional (depends on warehouse)