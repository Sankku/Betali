---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# PRD: Sales Order Management System

> **Product**: Betali Inventory Management SaaS  
> **Feature**: Sales Order Management  
> **Priority**: P0 (Critical for MVP)  
> **Status**: ✅ Implemented (Production)
> **Implemented**: 2026-03-20

## 📋 Executive Summary

The Sales Order Management System is the most critical missing feature in Betali's inventory management platform. This system will enable businesses to process customer orders, manage sales workflows, and track revenue - essential functionality for any complete inventory management solution.

**Impact**: Without this feature, Betali can only track inventory but cannot process the primary business transactions that drive inventory changes, making it incomplete for real business use.

## 🎯 Problem Statement

### Current State
- ✅ Inventory tracking (products, warehouses, stock movements)
- ✅ Customer management (clients)
- ❌ **No way to process sales orders**
- ❌ **No revenue tracking**
- ❌ **No automated stock deduction from sales**
- ❌ **No sales reporting**

### Pain Points
1. **Business Incomplete**: Companies cannot use Betali for actual sales transactions
2. **Manual Workarounds**: Users must track sales externally and manually adjust inventory
3. **No Revenue Insights**: No visibility into sales performance or profitability
4. **Stock Accuracy**: Manual inventory adjustments prone to errors

## 🎯 Goals & Success Metrics

### Primary Goals
- Enable end-to-end sales order processing
- Automate inventory deduction from sales
- Provide sales analytics and reporting
- Support multiple sales workflows (quotes → orders → fulfillment)

### Success Metrics
- **Adoption**: 80% of active organizations create at least one sales order within 30 days
- **Usage**: Average 15+ orders per active organization per month
- **Efficiency**: Order processing time < 2 minutes per order
- **Accuracy**: <1% inventory discrepancies due to order processing errors

## 👥 Target Users

### Primary Users
1. **Business Owners**: Need complete sales visibility and control
2. **Sales Managers**: Process orders and manage sales pipeline
3. **Warehouse Employees**: Fulfill orders and update stock

### User Personas
- **Maria (Restaurant Owner)**: Needs to track ingredient sales to other businesses
- **Carlos (Retail Manager)**: Manages product sales across multiple locations
- **Ana (Operations Manager)**: Oversees order fulfillment and inventory accuracy

## 📋 Detailed Requirements

### 🔧 Functional Requirements

#### 1. Order Creation & Management
- **Create Orders**: From clients, products, quantities, and pricing
- **Order States**: Draft → Confirmed → Processed → Fulfilled → Delivered → Completed
- **Order Editing**: Modify draft orders, limited editing of confirmed orders
- **Order Cancellation**: Cancel orders with appropriate stock restoration
- **Order Cloning**: Duplicate existing orders for recurring sales

#### 2. Product & Inventory Integration
- **Product Selection**: Search and select products from inventory
- **Stock Validation**: Prevent overselling with real-time stock checks
- **Stock Reservation**: Reserve stock for confirmed orders
- **Automatic Stock Deduction**: Reduce inventory when orders are fulfilled
- **Backorder Management**: Handle orders when stock insufficient

#### 3. Pricing & Calculations
- **Product Pricing**: Support for base prices per product
- **Dynamic Pricing**: Quantity-based pricing tiers
- **Tax Calculation**: Configurable tax rates (IVA, etc.)
- **Discounts**: Line-item and order-level discounts
- **Total Calculations**: Subtotal, tax, discounts, final total

#### 4. Customer Integration
- **Client Selection**: Link orders to existing clients
- **Client Information**: Auto-populate delivery and billing details
- **New Client Creation**: Create clients during order process
- **Client History**: View all orders per client

#### 5. Workflow Management
- **Order Approval**: Optional approval workflow for large orders
- **Fulfillment Process**: Mark items as picked, packed, shipped
- **Delivery Tracking**: Delivery dates and status updates
- **Payment Status**: Track payment status (pending, partial, paid)

### 🎨 User Experience Requirements

#### 1. Order Creation Flow
```
Products Selection → Quantities & Pricing → Client Selection → Review → Confirm
```

#### 2. Order Management Interface
- **Order List**: Filterable/searchable list of all orders
- **Order Detail**: Complete order information with action buttons
- **Quick Actions**: Common actions accessible from order list
- **Status Indicators**: Visual status indicators throughout UI

#### 3. Mobile Considerations
- **Responsive Design**: Full functionality on mobile devices
- **Touch-Friendly**: Large buttons for warehouse fulfillment tasks
- **Offline Capability**: Basic order viewing when offline

### 🔗 Integration Requirements

#### 1. Database Schema
```sql
-- Orders table
orders {
  order_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  client_id: uuid REFERENCES clients(client_id)
  order_number: string UNIQUE -- Auto-generated (ORD-001, ORD-002, etc.)
  
  -- Order details
  status: order_status DEFAULT 'draft'
  order_date: timestamp DEFAULT now()
  delivery_date: timestamp NULL
  
  -- Pricing
  subtotal: decimal(10,2)
  tax_amount: decimal(10,2)
  discount_amount: decimal(10,2) DEFAULT 0
  total_amount: decimal(10,2)
  
  -- Additional info
  notes: text NULL
  internal_notes: text NULL -- Staff only
  
  -- Audit
  created_by: uuid REFERENCES users(user_id)
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}

-- Order items table
order_items {
  order_item_id: uuid PRIMARY KEY
  order_id: uuid REFERENCES orders(order_id)
  product_id: uuid REFERENCES products(product_id)
  warehouse_id: uuid REFERENCES warehouse(warehouse_id)
  
  -- Quantities
  quantity: decimal(10,3)
  unit_price: decimal(10,2)
  line_total: decimal(10,2) -- quantity * unit_price
  
  -- Stock reservation
  reserved_at: timestamp NULL
  fulfilled_at: timestamp NULL
  fulfilled_quantity: decimal(10,3) DEFAULT 0
  
  created_at: timestamp DEFAULT now()
}

-- Order status history
order_status_history {
  history_id: uuid PRIMARY KEY
  order_id: uuid REFERENCES orders(order_id)
  status: order_status
  changed_by: uuid REFERENCES users(user_id)
  changed_at: timestamp DEFAULT now()
  notes: text NULL
}
```

#### 2. API Endpoints
```typescript
// Orders CRUD
GET /api/orders                    // List orders with filters
POST /api/orders                   // Create new order
GET /api/orders/:id                // Get order details
PUT /api/orders/:id                // Update order
DELETE /api/orders/:id             // Cancel order

// Order workflow
POST /api/orders/:id/confirm       // Confirm order
POST /api/orders/:id/fulfill       // Mark as fulfilled
POST /api/orders/:id/deliver       // Mark as delivered
POST /api/orders/:id/complete      // Complete order

// Order items
GET /api/orders/:id/items          // Get order items
POST /api/orders/:id/items         // Add item to order
PUT /api/orders/:id/items/:itemId  // Update order item
DELETE /api/orders/:id/items/:itemId // Remove item

// Reporting
GET /api/orders/analytics          // Sales analytics
GET /api/orders/reports            // Sales reports
```

#### 3. Stock Movement Integration
- **Automatic Creation**: Create "sale" stock movements when orders fulfilled
- **Stock Reservation**: Temporary stock holds for confirmed orders
- **Batch Processing**: Efficient stock updates for large orders

### 🔒 Security & Permissions

#### Permission Matrix
| Permission | Owner | Admin | Manager | Employee | Viewer |
|------------|-------|-------|---------|----------|--------|
| Create orders | ✅ | ✅ | ✅ | ✅ | ❌ |
| View all orders | ✅ | ✅ | ✅ | ⚠️* | ⚠️* |
| Edit orders | ✅ | ✅ | ✅ | ⚠️** | ❌ |
| Delete orders | ✅ | ✅ | ⚠️** | ❌ | ❌ |
| Fulfill orders | ✅ | ✅ | ✅ | ✅ | ❌ |
| View reports | ✅ | ✅ | ✅ | ❌ | ❌ |

*Limited to orders they created or are assigned to  
**Only draft orders

#### Data Security
- Organization-scoped data isolation
- Audit logging for all order changes
- Sensitive pricing data protection
- Client data privacy compliance

## 🚀 Implementation Plan

### Phase 1: Core Order System (4 weeks)
**Week 1-2: Backend Foundation**
- Database schema implementation
- Basic CRUD API endpoints
- Order status management
- Integration with existing client system

**Week 3-4: Frontend Interface**
- Order creation form
- Order list and detail views
- Basic order management actions
- Client integration in order flow

**Deliverables:**
- Create, view, and manage basic orders
- Link orders to existing clients
- Order status tracking

### Phase 2: Inventory Integration (3 weeks)
**Week 5-6: Stock Management**
- Stock validation during order creation
- Automatic stock reservation system
- Stock deduction on fulfillment
- Integration with existing stock movements

**Week 7: Advanced Features**
- Order cancellation with stock restoration
- Backorder management
- Bulk order operations

**Deliverables:**
- Automated inventory updates
- Stock reservation system
- Complete order-to-inventory workflow

### Phase 3: Business Features (3 weeks)
**Week 8-9: Pricing & Calculations**
- Product pricing management
- Tax calculation system
- Discount management
- Order totals calculation

**Week 10: Workflow Enhancement**
- Order approval workflows
- Advanced status management
- Order fulfillment tracking

**Deliverables:**
- Complete pricing system
- Advanced workflow management
- Order approval process

### Phase 4: Reporting & Polish (2 weeks)
**Week 11: Analytics & Reporting**
- Sales analytics dashboard
- Order reporting system
- Performance metrics

**Week 12: Testing & Optimization**
- End-to-end testing
- Performance optimization
- Bug fixes and polish

**Deliverables:**
- Sales reporting and analytics
- Production-ready system

## 🧪 Testing Strategy

### Unit Testing
- Order creation and management logic
- Stock reservation and deduction
- Pricing calculations
- Permission validations

### Integration Testing
- Order-to-inventory workflow
- Client integration
- Stock movement automation
- Multi-warehouse scenarios

### User Acceptance Testing
- End-to-end order processing
- Different user role workflows
- Mobile responsiveness
- Performance under load

## 📊 Analytics & Monitoring

### Key Metrics to Track
- Order creation rate
- Order completion rate
- Average order value
- Time to fulfill orders
- Stock accuracy impact
- User adoption by role

### Performance Monitoring
- Order creation response time
- Stock validation performance
- Report generation speed
- Database query optimization

## 🔮 Future Enhancements

### V2 Features
- **Quote System**: Generate quotes before orders
- **Recurring Orders**: Subscription-based ordering
- **Order Templates**: Save and reuse common orders
- **Advanced Pricing**: Time-based pricing, customer-specific pricing

### V3 Features
- **Multi-location Fulfillment**: Orders from multiple warehouses
- **Dropshipping Support**: Orders fulfilled by suppliers
- **Order API**: Allow external systems to create orders
- **Advanced Analytics**: Predictive analytics, demand forecasting

## 🏁 Definition of Done

### Minimum Viable Product (MVP)
- [ ] Users can create orders with products and clients
- [ ] Stock is automatically validated and reserved
- [ ] Orders progress through defined workflow states
- [ ] Inventory is automatically updated on fulfillment
- [ ] Basic order reporting is available
- [ ] All functionality works across different user roles
- [ ] Mobile-responsive interface
- [ ] Complete test coverage
- [ ] Documentation for users and developers

### Success Criteria
- [ ] 90% of test organizations use the order system within 2 weeks
- [ ] Order processing generates no inventory discrepancies
- [ ] System handles 1000+ orders per organization
- [ ] Order creation time averages under 2 minutes
- [ ] User satisfaction rating >4.5/5 for order management

---

**Owner**: Product Team  
**Engineering**: Backend + Frontend Teams  
**Design**: UX Team  
**Stakeholders**: Sales, Operations, Customer Success