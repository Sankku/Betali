# Betali - MCP Documentation for AI Assistants

> ⚠️ **IMPORTANT**: This project is currently migrating to a new SaaS multi-tenant architecture. See `/SAAS_ARCHITECTURE.md` for the latest specifications and implementation guidelines.

## Project Overview

Betali is a comprehensive full-stack business inventory management SaaS platform designed as a multi-tenant system. The platform supports businesses of all types with inventory management, stock movements, order tracking, and multi-organizational structures.

**🚧 Migration Status**: Currently transitioning from single-tenant to self-service SaaS multi-tenant architecture (similar to Discord/Notion model).

**Key Features:**
- Multi-tenant architecture with organizations, branches, and users
- Business inventory management for all types of products and services
- Warehouse and stock movement tracking
- Role-based access control and permissions
- Backend-configurable dynamic tables
- Real-time dashboard with analytics

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 + TanStack Query
- **Backend**: Node.js + Express + Supabase (PostgreSQL) + Clean Architecture
- **Package Manager**: Bun (workspaces setup)
- **Database**: Supabase PostgreSQL with generated TypeScript types
- **Authentication**: Supabase Auth with JWT tokens

### Monorepo Structure
```
/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
├── package.json       # Root workspace configuration
└── CLAUDE.md         # Development guidelines
```

## Backend Architecture (Clean Architecture Pattern)

### Directory Structure
```
backend/
├── config/           # Database and service configurations
│   ├── container.js  # Dependency injection container
│   ├── database.js   # Supabase client configuration
│   └── supabase.js   # Supabase connection setup
├── repositories/     # Data access layer
│   ├── BaseRepository.js          # Base repository with CRUD operations
│   ├── ProductRepository.js       # Product-specific queries
│   ├── WarehouseRepository.js     # Warehouse-specific queries
│   └── [Entity]Repository.js      # Other entity repositories
├── services/         # Business logic layer
│   ├── ProductService.js          # Product business rules
│   ├── WarehouseService.js        # Warehouse business rules
│   └── [Entity]Service.js         # Other entity services
├── controllers/      # HTTP handlers
│   ├── ProductController.js       # Product HTTP endpoints
│   └── [Entity]Controller.js      # Other entity controllers
├── routes/           # Express route definitions
│   ├── products.js               # Product routes with middleware
│   └── [entity].js              # Other entity routes
├── middleware/       # Cross-cutting concerns
│   ├── auth.js                   # JWT authentication
│   ├── validation.js             # Request validation
│   ├── permissions.js            # Role-based access control
│   ├── rateLimiting.js           # API rate limiting
│   ├── sanitization.js           # Input sanitization
│   └── errorHandler.js           # Global error handling
├── validations/      # Request validation schemas
│   ├── productValidation.js      # Product validation rules
│   └── [entity]Validation.js     # Other validation schemas
├── utils/            # Utility functions
│   ├── Logger.js                 # Winston logging setup
│   └── i18n.js                   # Internationalization
└── server.js         # Express server setup
```

### Key Backend Patterns

#### 1. BaseRepository Pattern
All repositories extend `BaseRepository` which provides:
- `findById(id, idColumn = 'id')` - Find entity by ID
- `findAll(filters = {}, options = {})` - Find with filters and pagination
- `create(entityData)` - Create new entity
- `update(id, updates, idColumn = 'id')` - Update entity
- `delete(id, idColumn = 'id')` - Delete entity
- `count(filters = {})` - Count entities with filters

#### 2. Service Layer Pattern
Services contain business logic and validation:
- User ownership validation
- Business rule enforcement
- Data validation before database operations
- Logging integration
- Error handling

#### 3. Dependency Injection
- `ServiceFactory` in `config/container.js` manages dependencies
- Controllers, services, and repositories are injected
- Testable and maintainable architecture

#### 4. Middleware Stack
Routes use comprehensive middleware:
- Authentication (`authenticateUser`)
- Authorization (`requirePermission`)
- Input validation (`validateRequest`, `validateQuery`)
- Rate limiting (`createLimiter`, `searchLimiter`)
- Input sanitization (`sanitizeMiddleware`)

## Frontend Architecture (Feature-Based Structure)

### Directory Structure
```
frontend/src/
├── components/
│   ├── templates/              # Reusable CRUD page templates
│   │   ├── crud-page.tsx      # Generic CRUD page layout
│   │   ├── modal-form.tsx     # Generic modal form
│   │   ├── stats-section.tsx  # Statistics display
│   │   └── form-section.tsx   # Form layout sections
│   ├── features/              # Domain-specific components
│   │   ├── products/          # Product-related components
│   │   │   ├── product-form.tsx
│   │   │   ├── product-modal.tsx
│   │   │   └── product-stats.tsx
│   │   ├── warehouse/         # Warehouse-related components
│   │   └── [feature]/         # Other feature modules
│   ├── table/                 # Dynamic table system
│   │   ├── BackendConfiguredTable.tsx  # Backend-driven table
│   │   ├── GenericCell.tsx             # Generic cell renderer
│   │   └── cells/                      # Specific cell types
│   │       ├── ActionsCell.tsx
│   │       ├── BadgeCell.tsx
│   │       ├── CompoundCell.tsx
│   │       └── [CellType]Cell.tsx
│   ├── ui/                    # Reusable UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── data-table.tsx     # Base table component
│   │   └── [component].tsx
│   ├── layout/                # Layout components
│   │   └── Dashboard/
│   └── common/                # Common shared components
│       ├── Forms/
│       └── Modals/
├── hooks/                     # Custom React hooks
│   ├── useProducts.ts         # Product management hooks
│   ├── useWarehouse.ts        # Warehouse management hooks
│   ├── useTableConfig.ts      # Dynamic table configuration
│   └── use[Feature].ts
├── services/                  # API client layer
│   ├── api.ts                 # Base API client
│   ├── authService.ts         # Authentication service
│   └── api/                   # Feature-specific API services
│       ├── productsService.ts
│       ├── warehouseService.ts
│       └── [feature]Service.ts
├── types/                     # TypeScript type definitions
│   ├── database.ts           # Generated Supabase types
│   ├── database-tables.ts    # Custom table type definitions
│   └── [feature].ts
├── context/                   # React context providers
│   ├── AuthContext.tsx       # Authentication context
│   ├── OrganizationContext.tsx # Multi-tenant context
│   └── UserContextSwitcher.tsx
├── pages/                     # Page components
│   └── Dashboard/
│       ├── Products.tsx      # Product management page
│       ├── Warehouse.tsx     # Warehouse management page
│       └── [Feature].tsx
└── validations/              # Frontend validation schemas
    ├── productValidation.ts
    └── [feature]Validation.ts
```

### Key Frontend Patterns

#### 1. Template-Based Architecture
- `CRUDPage` template provides consistent layout for all entity management
- `BackendConfiguredTable` enables dynamic table configuration from backend
- Reusable modal and form templates reduce code duplication

#### 2. Hook-Based State Management
- Feature-specific hooks (e.g., `useProducts`, `useWarehouse`)
- TanStack Query for server state management
- Custom hooks for form handling and API interactions

#### 3. Backend-Configured Dynamic Tables
- Tables are configured via backend API
- `BackendConfiguredTable` component renders based on configuration
- `GenericCell` component handles different cell types dynamically
- Supports actions, badges, compound fields, and custom formatting

#### 4. Best Practices (Products & Warehouses)
These modules demonstrate the established patterns:
- Consistent file naming and structure
- Separation of concerns (hooks, services, components)
- TypeScript strict typing
- Error handling and loading states
- Optimistic updates with TanStack Query

## Database Schema

### Core Entities

#### Multi-Tenant Structure
```sql
organizations           # Root tenant entity
├── branches           # Organization subdivisions  
├── user_organizations # User-organization relationships
└── users              # System users
```

#### Agricultural Inventory
```sql
products               # Agricultural products
├── stock_movements    # Inventory movements
├── warehouse          # Storage locations
├── orders             # Sales orders
├── order_details      # Order line items
└── clients            # Customers
```

#### SENASA Integration
```sql
senasa_products        # SENASA product registry
└── senasa_transactions # API transaction log
```

### Key Relationships
- `users` ↔ `organizations` (many-to-many via `user_organizations`)
- `organizations` → `branches` (one-to-many)
- `products` → `stock_movements` (one-to-many)
- `warehouse` → `stock_movements` (one-to-many)
- `orders` → `order_details` (one-to-many)
- `products` → `order_details` (one-to-many)

### Entity Ownership Model
- `products`: Owned by `owner_id` (user)
- `warehouse`: Owned by `owner_id` (user) and `organization_id`
- `orders`: Associated with `user_id` and `client_id`
- Multi-tenant data isolation via organization relationships

## API Patterns and Endpoints

### Standard CRUD Endpoints
Each entity follows consistent patterns:
```
GET    /api/[entity]              # List with filters
GET    /api/[entity]/search       # Search functionality
GET    /api/[entity]/:id          # Get by ID
POST   /api/[entity]              # Create new
PUT    /api/[entity]/:id          # Update existing
DELETE /api/[entity]/:id          # Delete by ID
```

### Middleware Pipeline
All routes use consistent middleware stack:
1. `authenticateUser` - JWT authentication
2. `requirePermission` - Role-based access control
3. `validateRequest/validateQuery` - Input validation
4. `rateLimiter` - API rate limiting
5. `sanitizeMiddleware` - Input sanitization

### Response Format
Consistent API response format:
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed",
  "pagination": {...}  // For list endpoints
}
```

### Error Handling
- Global error handler middleware
- Structured error responses
- Winston logging integration
- User-friendly error messages

## Development Guidelines

### Adding New Features

#### 1. Backend Development
1. Create repository in `repositories/[Entity]Repository.js` extending `BaseRepository`
2. Create service in `services/[Entity]Service.js` with business logic
3. Create controller in `controllers/[Entity]Controller.js`
4. Define routes in `routes/[entity].js` with full middleware stack
5. Add validation schema in `validations/[entity]Validation.js`
6. Register dependencies in `config/container.js`

#### 2. Frontend Development
1. Define types in `types/[entity].ts`
2. Create API service in `services/api/[entity]Service.ts`
3. Create custom hooks in `hooks/use[Entity].ts`
4. Create feature components in `components/features/[entity]/`
5. Create page component in `pages/Dashboard/[Entity].tsx`
6. Add validation schema in `validations/[entity]Validation.ts`

### Code Standards
- Follow existing TypeScript strict typing
- Use established patterns from Products and Warehouses modules
- Implement proper error handling and loading states
- Follow clean architecture principles
- Use consistent naming conventions
- Add proper JSDoc documentation

### Testing
- Backend: Jest tests (run with `bun run test`)
- API testing scripts in `/backend/scripts/`
- Use health check endpoints for system verification

## Configuration and Environment

### Development Commands
```bash
# Root level
bun run front        # Start frontend (port 3000)
bun run back         # Start backend (port 4000)

# Frontend specific
cd frontend && bun run dev      # Vite dev server
cd frontend && bun run build    # Production build
cd frontend && bun run lint     # ESLint check

# Backend specific  
cd backend && bun run dev       # Development with watch
cd backend && bun run start     # Production server
cd backend && bun run test      # Jest tests
```

### Environment Requirements
- Supabase connection configuration
- JWT secret for authentication
- Database URL and credentials
- SENASA API credentials (for agricultural compliance)

## Multi-Tenant Features

### Organization Management
- Organizations with configurable plans and limits
- Branch-level subdivision support
- User role management per organization
- Permission-based access control

### Data Isolation
- Organization-scoped data access
- User ownership validation in services
- Tenant context switching in frontend
- Secure multi-tenant architecture

## Key Integration Points

### SENASA Integration
- Agricultural product compliance tracking
- Transaction logging for audit trails
- API integration for regulatory requirements

### Dynamic Table System
- Backend-configured table definitions
- Runtime table generation and customization
- Flexible cell rendering system
- Search and pagination configuration

This documentation provides AI assistants with comprehensive understanding of Betali's architecture, patterns, and development practices. Follow these established patterns when making modifications or adding new features to ensure consistency and maintainability.