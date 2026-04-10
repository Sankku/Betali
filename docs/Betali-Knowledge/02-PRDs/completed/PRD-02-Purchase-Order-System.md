---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# PRD: Purchase Order Management System

> **Product**: Betali Inventory Management SaaS  
> **Feature**: Purchase Order System  
> **Priority**: P0 (Critical for Complete Business Cycle)  
> **Status**: ✅ Implemented (Production)
> **Implemented**: 2026-03-20

## 📋 Executive Summary

The Purchase Order Management System completes Betali's inventory management cycle by enabling businesses to manage supplier relationships, procurement workflows, and inventory replenishment. This system is essential for businesses to maintain optimal stock levels and manage their supply chain effectively.

**Business Impact**: Enables complete inventory lifecycle management from procurement to sales, providing businesses with end-to-end supply chain visibility and control.

## 🎯 Problem Statement

### Current State
- ✅ Supplier management (basic contact information)
- ✅ Inventory tracking (products, stock levels)
- ✅ Stock movements (manual entries)
- ❌ **No procurement workflow**
- ❌ **No supplier ordering system**
- ❌ **No automated stock replenishment**
- ❌ **No purchase cost tracking**

### Pain Points
1. **Manual Procurement**: No systematic way to order from suppliers
2. **Stock Replenishment**: Manual monitoring and ordering of low stock items
3. **Cost Tracking**: No visibility into purchase costs and supplier performance
4. **Supplier Management**: Basic contact info only, no transaction history
5. **Inventory Planning**: No tools for demand forecasting or reorder points

## 🎯 Goals & Success Metrics

### Primary Goals
- Streamline supplier ordering process
- Automate inventory replenishment workflows
- Track purchase costs and supplier performance
- Integrate with existing inventory management system

### Success Metrics
- **Adoption**: 70% of active organizations create purchase orders within 45 days
- **Efficiency**: 50% reduction in time spent on procurement tasks
- **Accuracy**: <2% variance between ordered and received quantities
- **Cost Control**: 15% improvement in inventory carrying cost optimization

## 👥 Target Users

### Primary Users
1. **Operations Managers**: Responsible for inventory replenishment and supplier relationships
2. **Purchasing Agents**: Handle procurement and supplier negotiations
3. **Warehouse Managers**: Receive orders and update inventory
4. **Business Owners**: Monitor costs and supplier performance

### User Personas
- **Roberto (Operations Manager)**: Needs efficient ordering and cost control
- **Patricia (Purchasing Agent)**: Manages multiple suppliers and negotiates pricing
- **Diego (Warehouse Manager)**: Receives orders and needs accurate inventory updates

## 📋 Detailed Requirements

### 🔧 Functional Requirements

#### 1. Purchase Order Creation & Management
- **Create Purchase Orders**: Select suppliers, products, quantities, and pricing
- **PO States**: Draft → Sent → Confirmed → Partially Received → Received → Completed
- **Order Templates**: Save recurring orders for quick reordering
- **Order Approval**: Optional approval workflows for budget control
- **Order Modifications**: Edit orders before confirmation, limited changes after

#### 2. Supplier Integration
- **Supplier Selection**: Choose from existing suppliers with contact details
- **Supplier Products**: Maintain supplier-specific product catalogs
- **Supplier Pricing**: Track historical and current pricing from suppliers
- **Lead Times**: Manage expected delivery times per supplier/product
- **Supplier Performance**: Track delivery accuracy and timing

#### 3. Product & Inventory Integration
- **Product Catalog**: Select products from existing inventory system
- **Reorder Points**: Set minimum stock levels for automatic reorder suggestions
- **Expected Inventory**: Track expected stock increases from pending orders
- **Receiving Workflow**: Match received items against purchase orders
- **Inventory Updates**: Automatically update stock levels upon receipt

#### 4. Cost Management
- **Purchase Pricing**: Track cost per unit for each product/supplier combination
- **Cost Analysis**: Compare pricing across suppliers
- **Budget Tracking**: Monitor spending against budgets
- **Currency Support**: Handle multiple currencies for international suppliers

#### 5. Receiving & Fulfillment
- **Partial Receipts**: Handle partial deliveries and backorders
- **Quality Control**: Note quality issues and adjustments
- **Variance Tracking**: Track differences between ordered and received quantities
- **Returns Processing**: Handle returned or defective items

### 🎨 User Experience Requirements

#### 1. Purchase Order Creation Flow
```
Supplier Selection → Product Selection → Quantities & Pricing → Review → Send/Save
```

#### 2. Order Management Interface
- **PO Dashboard**: Overview of all purchase orders with status indicators
- **Order Detail View**: Complete order information with receiving capabilities
- **Supplier Dashboard**: View all orders per supplier
- **Receiving Interface**: Simple interface for warehouse receiving process

#### 3. Automated Workflows
- **Reorder Alerts**: Notifications when products fall below reorder points
- **Approval Routing**: Automatic routing for orders requiring approval
- **Receipt Reminders**: Alerts for overdue deliveries

### 🔗 Integration Requirements

#### 1. Database Schema
```sql
-- Purchase orders table
purchase_orders {
  purchase_order_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  supplier_id: uuid REFERENCES suppliers(supplier_id)
  po_number: string UNIQUE -- Auto-generated (PO-001, PO-002, etc.)
  
  -- Order details
  status: purchase_order_status DEFAULT 'draft'
  order_date: timestamp DEFAULT now()
  expected_delivery_date: timestamp NULL
  delivery_date: timestamp NULL
  
  -- Financial
  subtotal: decimal(10,2)
  tax_amount: decimal(10,2)
  shipping_cost: decimal(10,2) DEFAULT 0
  total_amount: decimal(10,2)
  currency: string DEFAULT 'USD'
  
  -- Additional info
  notes: text NULL
  terms: text NULL
  
  -- Workflow
  approved_by: uuid NULL REFERENCES users(user_id)
  approved_at: timestamp NULL
  sent_at: timestamp NULL
  
  -- Audit
  created_by: uuid REFERENCES users(user_id)
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}

-- Purchase order items
purchase_order_items {
  po_item_id: uuid PRIMARY KEY
  purchase_order_id: uuid REFERENCES purchase_orders(purchase_order_id)
  product_id: uuid REFERENCES products(product_id)
  
  -- Order details
  quantity_ordered: decimal(10,3)
  quantity_received: decimal(10,3) DEFAULT 0
  unit_cost: decimal(10,2)
  line_total: decimal(10,2)
  
  -- Receiving
  received_at: timestamp NULL
  quality_notes: text NULL
  
  created_at: timestamp DEFAULT now()
}

-- Product reorder settings
product_reorder_settings {
  setting_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  product_id: uuid REFERENCES products(product_id)
  warehouse_id: uuid REFERENCES warehouse(warehouse_id)
  
  -- Reorder rules
  reorder_point: decimal(10,3) -- Minimum stock level
  reorder_quantity: decimal(10,3) -- Standard order quantity
  max_stock_level: decimal(10,3) -- Maximum desired stock
  
  -- Supplier preferences
  preferred_supplier_id: uuid REFERENCES suppliers(supplier_id)
  lead_time_days: integer DEFAULT 7
  
  -- Status
  is_active: boolean DEFAULT true
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}

-- Supplier product catalog
supplier_products {
  supplier_product_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  supplier_id: uuid REFERENCES suppliers(supplier_id)
  product_id: uuid REFERENCES products(product_id)
  
  -- Supplier-specific details
  supplier_product_code: string NULL
  supplier_product_name: string NULL
  current_cost: decimal(10,2)
  minimum_order_qty: decimal(10,3) DEFAULT 1
  lead_time_days: integer DEFAULT 7
  
  -- Status
  is_available: boolean DEFAULT true
  last_ordered: timestamp NULL
  last_cost_update: timestamp DEFAULT now()
  
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}
```

#### 2. API Endpoints
```typescript
// Purchase Orders CRUD
GET /api/purchase-orders           // List POs with filters
POST /api/purchase-orders          // Create new PO
GET /api/purchase-orders/:id       // Get PO details
PUT /api/purchase-orders/:id       // Update PO
DELETE /api/purchase-orders/:id    // Delete draft PO

// PO Workflow
POST /api/purchase-orders/:id/send     // Send PO to supplier
POST /api/purchase-orders/:id/approve  // Approve PO
POST /api/purchase-orders/:id/receive  // Mark items as received
POST /api/purchase-orders/:id/complete // Complete PO

// Receiving
POST /api/purchase-orders/:id/receive-items  // Receive specific items
PUT /api/purchase-orders/:id/items/:itemId   // Update received quantities

// Automation
GET /api/products/reorder-suggestions      // Get products needing reorder
POST /api/purchase-orders/from-suggestions // Create PO from suggestions

// Supplier Management
GET /api/suppliers/:id/products            // Get supplier's product catalog
PUT /api/suppliers/:id/products/:productId // Update supplier product info
GET /api/suppliers/:id/performance         // Supplier performance metrics
```

#### 3. Integration Points
- **Stock Movement Integration**: Create "purchase" stock movements on receipt
- **Supplier System**: Enhance existing supplier management
- **Notification System**: Email notifications for order status changes
- **Reporting Integration**: Purchase analytics and cost reports

### 🔒 Security & Permissions

#### Permission Matrix
| Permission | Owner | Admin | Manager | Employee | Viewer |
|------------|-------|-------|---------|----------|--------|
| Create POs | ✅ | ✅ | ✅ | ⚠️* | ❌ |
| View all POs | ✅ | ✅ | ✅ | ⚠️** | ⚠️** |
| Approve POs | ✅ | ✅ | ⚠️*** | ❌ | ❌ |
| Receive orders | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage suppliers | ✅ | ✅ | ✅ | ❌ | ❌ |
| View cost reports | ✅ | ✅ | ⚠️**** | ❌ | ❌ |

*Draft POs only  
**Limited to POs they created  
***With approval limits  
****Limited cost visibility

#### Data Security
- Organization-scoped data isolation
- Audit logging for all PO changes
- Supplier cost data protection
- Approval workflow compliance

## 🚀 Implementation Plan

### Phase 1: Core PO System (4 weeks)
**Week 1-2: Backend Foundation**
- Database schema implementation
- Basic CRUD API endpoints
- PO status management
- Integration with existing supplier system

**Week 3-4: Frontend Interface**
- PO creation form with supplier/product selection
- PO list and detail views
- Basic PO management actions
- Supplier integration in PO flow

**Deliverables:**
- Create, view, and manage purchase orders
- Link POs to suppliers and products
- PO status tracking and basic workflow

### Phase 2: Receiving & Inventory Integration (3 weeks)
**Week 5-6: Receiving System**
- Receiving workflow implementation
- Partial receipt handling
- Inventory update automation
- Stock movement integration

**Week 7: Advanced Receiving**
- Quality control notes
- Variance tracking and reporting
- Return/adjustment handling

**Deliverables:**
- Complete receiving workflow
- Automated inventory updates
- Variance and quality tracking

### Phase 3: Automation & Intelligence (3 weeks)
**Week 8-9: Reorder Management**
- Reorder point configuration
- Automated reorder suggestions
- Bulk PO creation from suggestions
- Lead time tracking

**Week 10: Supplier Analytics**
- Supplier performance tracking
- Cost analysis and comparison
- Supplier product catalog management

**Deliverables:**
- Automated reorder suggestions
- Supplier performance analytics
- Complete supplier relationship management

### Phase 4: Advanced Features & Polish (2 weeks)
**Week 11: Workflow Enhancement**
- PO approval workflows
- Order templates and quick reorder
- Advanced reporting and analytics

**Week 12: Testing & Optimization**
- End-to-end testing
- Performance optimization
- User training materials

**Deliverables:**
- Production-ready system with advanced features
- Complete testing and documentation

## 🧪 Testing Strategy

### Unit Testing
- PO creation and management logic
- Receiving and inventory update workflows
- Reorder calculations and suggestions
- Supplier performance calculations

### Integration Testing
- PO-to-inventory integration
- Supplier system integration
- Stock movement automation
- Email notification systems

### User Acceptance Testing
- End-to-end procurement workflows
- Multi-user receiving scenarios
- Reorder automation accuracy
- Supplier management workflows

## 📊 Analytics & Monitoring

### Key Metrics to Track
- PO creation and completion rates
- Average lead times by supplier
- Receiving accuracy (ordered vs received)
- Cost savings from supplier comparison
- Reorder automation adoption

### Performance Monitoring
- PO creation response time
- Receiving workflow performance
- Reorder calculation efficiency
- Report generation speed

## 🔮 Future Enhancements

### V2 Features
- **EDI Integration**: Electronic data interchange with suppliers
- **Contract Management**: Supplier contract tracking and renewals
- **Budgeting Integration**: Budget allocation and spending tracking
- **Mobile Receiving**: Dedicated mobile app for warehouse receiving

### V3 Features
- **Predictive Analytics**: AI-powered demand forecasting
- **Supplier Portal**: Self-service portal for suppliers
- **Blanket POs**: Long-term agreements with call-off orders
- **International Trade**: Import/export documentation and compliance

## 🏁 Definition of Done

### Minimum Viable Product (MVP)
- [ ] Users can create and manage purchase orders
- [ ] POs integrate with existing supplier and product systems
- [ ] Receiving workflow updates inventory automatically
- [ ] Basic reorder point suggestions work correctly
- [ ] Supplier performance tracking is available
- [ ] All functionality works across different user roles
- [ ] Mobile-responsive receiving interface
- [ ] Complete test coverage
- [ ] User and developer documentation

### Success Criteria
- [ ] 70% of test organizations use the PO system within 6 weeks
- [ ] 90% receiving accuracy (ordered vs received quantities)
- [ ] 50% reduction in manual procurement tasks
- [ ] Reorder suggestions generate 80% of new POs
- [ ] User satisfaction rating >4.3/5 for procurement workflows

---

**Owner**: Product Team  
**Engineering**: Backend + Frontend Teams  
**Design**: UX Team  
**Stakeholders**: Operations, Finance, Procurement