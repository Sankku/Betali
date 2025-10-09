const { DatabaseConfig } = require('../config/database');
const { TableConfigRepository } = require('../repositories/TableConfigRepository');

const tableConfigurations = [
  {
    id: 'products',
    name: 'Product Management',
    entity: 'products',
    config: {
      columns: [
        {
          key: 'name',
          header: 'Product',
          dataType: 'compound',
          sortable: true,
          filterable: true,
          compoundConfig: {
            fields: [
              {
                key: 'name',
                type: 'icon-text',
                config: {
                  dataType: 'icon-text',
                  iconConfig: { name: 'package', position: 'left', size: 16 },
                  textConfig: { weight: 'medium' }
                }
              },
              {
                key: 'batch_number',
                type: 'text',
                config: {
                  dataType: 'text',
                  textConfig: { 
                    size: 'sm', 
                    color: 'text-neutral-500',
                    prefix: 'Batch: '
                  }
                }
              }
            ],
            layout: 'vertical',
            spacing: 'tight'
          }
        },
        {
          key: 'price',
          header: 'Price',
          dataType: 'currency',
          sortable: true,
          filterable: true,
          currencyConfig: {
            currency: 'USD',
            locale: 'en-US'
          }
        },
        {
          key: 'current_stock',
          header: 'Stock',
          dataType: 'badge',
          sortable: true,
          filterable: true,
          badgeConfig: {
            variant: 'dynamic',
            valueMap: [
              { condition: { operator: '>', value: 10 }, label: null, variant: 'success' },
              { condition: { operator: '>', value: 0 }, label: null, variant: 'warning' },
              { condition: { operator: '<=', value: 0 }, label: 'Out of stock', variant: 'destructive' }
            ]
          }
        },
        {
          key: 'expiration_date',
          header: 'Expiration',
          dataType: 'compound',
          sortable: true,
          filterable: true,
          compoundConfig: {
            fields: [
              {
                key: 'expiration_date',
                type: 'icon-text',
                config: {
                  dataType: 'icon-text',
                  iconConfig: { name: 'calendar', position: 'left', size: 16 },
                  textConfig: { size: 'sm' }
                }
              }
            ],
            layout: 'horizontal',
            spacing: 'normal'
          }
        },
        {
          key: 'origin_country',
          header: 'Country of Origin',
          dataType: 'icon-text',
          sortable: true,
          filterable: true,
          iconConfig: {
            name: 'globe',
            position: 'left',
            size: 16
          },
          textConfig: {
            weight: 'normal'
          }
        },
        {
          key: 'created_at',
          header: 'Registration Date',
          dataType: 'date',
          sortable: true,
          filterable: true,
          dateConfig: {
            format: 'short',
            locale: 'en-US'
          }
        },
        {
          key: 'actions',
          header: 'Acciones',
          dataType: 'actions',
          sortable: false,
          filterable: false,
          actionsConfig: {
            actions: [
              { key: 'view', label: 'View', icon: 'eye', variant: 'ghost' },
              { key: 'edit', label: 'Edit', icon: 'edit', variant: 'ghost' },
              { key: 'delete', label: 'Delete', icon: 'trash', variant: 'destructive' }
            ]
          }
        }
      ],
      pagination: {
        enabled: true,
        defaultPageSize: 10,
        pageSizeOptions: [5, 10, 20, 50]
      },
      search: {
        enabled: true,
        placeholder: 'Search products...',
        searchableColumns: ['name', 'batch_number', 'origin_country']
      }
    }
  },
  {
    id: 'warehouse',
    name: 'Warehouse Management',
    entity: 'warehouse',
    config: {
      columns: [
        {
          key: 'name',
          header: 'Name',
          dataType: 'compound',
          sortable: true,
          filterable: true,
          compoundConfig: {
            fields: [
              {
                key: 'name',
                type: 'icon-text',
                config: {
                  dataType: 'icon-text',
                  iconConfig: { name: 'warehouse', position: 'left', size: 16 },
                  textConfig: { weight: 'medium' }
                }
              },
              {
                key: 'warehouse_id',
                type: 'text',
                config: {
                  dataType: 'text',
                  textConfig: { 
                    size: 'sm', 
                    color: 'text-neutral-500',
                    prefix: 'ID: ',
                    truncate: 8
                  }
                }
              }
            ],
            layout: 'vertical',
            spacing: 'tight'
          }
        },
        {
          key: 'location',
          header: 'Location',
          dataType: 'icon-text',
          sortable: true,
          filterable: true,
          iconConfig: {
            name: 'map-pin',
            position: 'left',
            size: 16
          },
          textConfig: {
            color: 'text-neutral-600'
          }
        },
        {
          key: 'is_active',
          header: 'Status',
          dataType: 'status',
          sortable: true,
          filterable: true,
          statusConfig: {
            activeLabel: 'Active',
            inactiveLabel: 'Inactive',
            activeVariant: 'success',
            inactiveVariant: 'danger',
            showToggle: true,
            toggleDisabled: false
          }
        },
        {
          key: 'created_at',
          header: 'Creation Date',
          dataType: 'date',
          sortable: true,
          filterable: true,
          dateConfig: {
            format: 'short',
            locale: 'en-US'
          }
        },
        {
          key: 'actions',
          header: 'Acciones',
          dataType: 'actions',
          sortable: false,
          filterable: false,
          actionsConfig: {
            actions: [
              { key: 'view', label: 'View', icon: 'eye', variant: 'ghost' },
              { key: 'edit', label: 'Edit', icon: 'edit', variant: 'ghost' },
              { key: 'delete', label: 'Delete', icon: 'trash', variant: 'destructive' }
            ]
          }
        }
      ],
      pagination: {
        enabled: true,
        defaultPageSize: 10,
        pageSizeOptions: [5, 10, 20, 50]
      },
      search: {
        enabled: true,
        placeholder: 'Search warehouses...',
        searchableColumns: ['name', 'location']
      }
    }
  },
  {
    id: 'stock_movements',
    name: 'Stock Movements',
    entity: 'stock_movements',
    config: {
      columns: [
        {
          key: 'movement_type',
          header: 'Type',
          dataType: 'badge',
          sortable: true,
          filterable: true,
          badgeConfig: {
            variantMap: {
              'in': 'success',
              'out': 'danger',
              'adjustment': 'warning',
              'transfer': 'primary'
            },
            labelMap: {
              'in': 'In',
              'out': 'Out',
              'adjustment': 'Adjustment',
              'transfer': 'Transfer'
            },
            size: 'md'
          }
        },
        {
          key: 'product_name',
          header: 'Product',
          dataType: 'icon-text',
          sortable: true,
          filterable: true,
          iconConfig: {
            name: 'package',
            position: 'left',
            size: 16
          },
          textConfig: {
            truncate: 30,
            weight: 'normal'
          }
        },
        {
          key: 'quantity',
          header: 'Quantity',
          dataType: 'number',
          sortable: true,
          filterable: true,
          numberConfig: {
            format: 'decimal',
            decimals: 0,
            suffix: ' units',
            showPositiveColor: true,
            showNegativeColor: true
          }
        },
        {
          key: 'warehouse_name',
          header: 'Warehouse',
          dataType: 'icon-text',
          sortable: true,
          filterable: true,
          iconConfig: {
            name: 'warehouse',
            position: 'left',
            size: 16
          },
          textConfig: {
            truncate: 20,
            weight: 'normal'
          }
        },
        {
          key: 'movement_date',
          header: 'Date',
          dataType: 'icon-text',
          sortable: true,
          filterable: true,
          iconConfig: {
            name: 'calendar',
            position: 'left',
            size: 16
          },
          textConfig: {
            size: 'sm'
          }
        },
        {
          key: 'reference',
          header: 'Reference',
          dataType: 'icon-text',
          sortable: false,
          filterable: true,
          iconConfig: {
            name: 'file-text',
            position: 'left',
            size: 16
          },
          textConfig: {
            truncate: 60,
            weight: 'normal',
            size: 'sm'
          }
        },
        {
          key: 'actions',
          header: 'Actions',
          dataType: 'actions',
          sortable: false,
          filterable: false,
          actionsConfig: {
            actions: [
              { key: 'view', label: 'View', icon: 'eye', variant: 'ghost' },
              { key: 'edit', label: 'Edit', icon: 'edit', variant: 'ghost' },
              { key: 'delete', label: 'Delete', icon: 'trash', variant: 'destructive' }
            ]
          }
        }
      ],
      pagination: {
        enabled: true,
        defaultPageSize: 20,
        pageSizeOptions: [10, 20, 50, 100]
      },
      search: {
        enabled: true,
        placeholder: 'Search movements...',
        searchableColumns: ['product_name', 'reference', 'warehouse_name']
      }
    }
  },
  {
    id: 'organizations',
    name: 'Organization Management',
    entity: 'organizations',
    config: {
      columns: [
        {
          key: 'name',
          header: 'Organization',
          dataType: 'compound',
          sortable: true,
          filterable: true,
          compoundConfig: {
            fields: [
              {
                key: 'name',
                type: 'icon-text',
                config: {
                  dataType: 'icon-text',
                  iconConfig: { name: 'building', position: 'left', size: 16 },
                  textConfig: { weight: 'medium' }
                }
              },
              {
                key: 'slug',
                type: 'text',
                config: {
                  dataType: 'text',
                  textConfig: { 
                    size: 'sm', 
                    color: 'text-neutral-500',
                    prefix: '@'
                  }
                }
              }
            ],
            layout: 'vertical',
            spacing: 'tight'
          }
        },
        {
          key: 'plan_type',
          header: 'Plan',
          dataType: 'badge',
          sortable: true,
          filterable: true,
          badgeConfig: {
            variantMap: {
              'basic': 'secondary',
              'premium': 'warning',
              'enterprise': 'success'
            },
            labelMap: {
              'basic': 'Basic',
              'premium': 'Premium',
              'enterprise': 'Enterprise'
            },
            size: 'md'
          }
        },
        {
          key: 'is_active',
          header: 'Status',
          dataType: 'status',
          sortable: true,
          filterable: true,
          statusConfig: {
            activeLabel: 'Active',
            inactiveLabel: 'Inactive',
            activeVariant: 'success',
            inactiveVariant: 'danger',
            showToggle: true,
            toggleDisabled: false
          }
        },
        {
          key: 'max_users',
          header: 'Max Users',
          dataType: 'number',
          sortable: true,
          filterable: true,
          numberConfig: {
            format: 'integer',
            decimals: 0,
            suffix: ' users'
          }
        },
        {
          key: 'email',
          header: 'Contact',
          dataType: 'icon-text',
          sortable: true,
          filterable: true,
          iconConfig: {
            name: 'mail',
            position: 'left',
            size: 16
          },
          textConfig: {
            color: 'text-neutral-600'
          }
        },
        {
          key: 'created_at',
          header: 'Created',
          dataType: 'date',
          sortable: true,
          filterable: true,
          dateConfig: {
            format: 'short',
            locale: 'en-US'
          }
        },
        {
          key: 'actions',
          header: 'Actions',
          dataType: 'actions',
          sortable: false,
          filterable: false,
          actionsConfig: {
            actions: [
              { key: 'view', label: 'View', icon: 'eye', variant: 'ghost' },
              { key: 'edit', label: 'Edit', icon: 'edit', variant: 'ghost' },
              { key: 'delete', label: 'Delete', icon: 'trash', variant: 'destructive' }
            ]
          }
        }
      ],
      pagination: {
        enabled: true,
        defaultPageSize: 10,
        pageSizeOptions: [5, 10, 20, 50]
      },
      search: {
        enabled: true,
        placeholder: 'Search organizations...',
        searchableColumns: ['name', 'slug', 'email']
      }
    }
  },
  {
    id: 'users',
    name: 'User Management',
    entity: 'users',
    config: {
      columns: [
        {
          key: 'user_info',
          header: 'User',
          dataType: 'compound',
          sortable: true,
          filterable: true,
          compoundConfig: {
            fields: [
              {
                key: 'name',
                type: 'icon-text',
                config: {
                  dataType: 'icon-text',
                  iconConfig: { name: 'user', position: 'left', size: 16 },
                  textConfig: { weight: 'medium' }
                }
              },
              {
                key: 'email',
                type: 'text',
                config: {
                  dataType: 'text',
                  textConfig: { 
                    size: 'sm', 
                    color: 'text-neutral-500'
                  }
                }
              }
            ],
            layout: 'vertical',
            spacing: 'tight'
          }
        },
        {
          key: 'role',
          header: 'Role',
          dataType: 'badge',
          sortable: true,
          filterable: true,
          badgeConfig: {
            variantMap: {
              'super_admin': 'danger',
              'admin': 'warning',
              'manager': 'primary',
              'employee': 'secondary',
              'viewer': 'outline'
            },
            labelMap: {
              'super_admin': 'Super Admin',
              'admin': 'Admin',
              'manager': 'Manager',
              'employee': 'Employee',
              'viewer': 'Viewer'
            },
            size: 'md'
          }
        },
        {
          key: 'is_active',
          header: 'Status',
          dataType: 'status',
          sortable: true,
          filterable: true,
          statusConfig: {
            activeLabel: 'Active',
            inactiveLabel: 'Inactive',
            activeVariant: 'success',
            inactiveVariant: 'danger',
            showToggle: true,
            toggleDisabled: false
          }
        },
        {
          key: 'organization_name',
          header: 'Organization',
          dataType: 'icon-text',
          sortable: true,
          filterable: true,
          iconConfig: {
            name: 'building',
            position: 'left',
            size: 16
          },
          textConfig: {
            color: 'text-neutral-600',
            truncate: 25
          }
        },
        {
          key: 'last_login',
          header: 'Last Login',
          dataType: 'date',
          sortable: true,
          filterable: true,
          dateConfig: {
            format: 'relative',
            locale: 'en-US'
          }
        },
        {
          key: 'created_at',
          header: 'Created',
          dataType: 'date',
          sortable: true,
          filterable: true,
          dateConfig: {
            format: 'short',
            locale: 'en-US'
          }
        },
        {
          key: 'actions',
          header: 'Actions',
          dataType: 'actions',
          sortable: false,
          filterable: false,
          actionsConfig: {
            actions: [
              { key: 'view', label: 'View', icon: 'eye', variant: 'ghost' },
              { key: 'edit', label: 'Edit', icon: 'edit', variant: 'ghost' },
              { key: 'toggle-status', label: 'Toggle Status', icon: 'toggle-left', variant: 'outline' },
              { key: 'delete', label: 'Delete', icon: 'trash', variant: 'destructive' }
            ]
          }
        }
      ],
      pagination: {
        enabled: true,
        defaultPageSize: 15,
        pageSizeOptions: [10, 15, 25, 50]
      },
      search: {
        enabled: true,
        placeholder: 'Search users...',
        searchableColumns: ['name', 'email', 'organization_name', 'role']
      }
    }
  },
  {
    id: 'tax_rates',
    name: 'Tax Rate Management',
    entity: 'tax_rates',
    config: {
      columns: [
        {
          key: 'name',
          header: 'Tax Name',
          dataType: 'compound',
          sortable: true,
          filterable: true,
          compoundConfig: {
            fields: [
              {
                key: 'name',
                type: 'icon-text',
                config: {
                  dataType: 'icon-text',
                  iconConfig: { name: 'percent', position: 'left', size: 16 },
                  textConfig: { weight: 'medium' }
                }
              },
              {
                key: 'description',
                type: 'text',
                config: {
                  dataType: 'text',
                  textConfig: { 
                    size: 'sm', 
                    color: 'text-neutral-500'
                  }
                }
              }
            ],
            layout: 'vertical',
            spacing: 'tight'
          }
        },
        {
          key: 'rate',
          header: 'Tax Rate',
          dataType: 'percentage',
          sortable: true,
          filterable: true,
          percentageConfig: {
            decimals: 2,
            showIcon: true,
            iconPosition: 'left'
          }
        },
        {
          key: 'is_active',
          header: 'Status',
          dataType: 'status',
          sortable: true,
          filterable: true,
          statusConfig: {
            activeLabel: 'Active',
            inactiveLabel: 'Inactive',
            activeVariant: 'success',
            inactiveVariant: 'danger',
            showToggle: true,
            toggleDisabled: false
          }
        },
        {
          key: 'created_at',
          header: 'Created',
          dataType: 'date',
          sortable: true,
          filterable: true,
          dateConfig: {
            format: 'short',
            locale: 'en-US'
          }
        },
        {
          key: 'actions',
          header: 'Actions',
          dataType: 'actions',
          sortable: false,
          filterable: false,
          actionsConfig: {
            actions: [
              { key: 'view', label: 'View', icon: 'eye', variant: 'ghost' },
              { key: 'edit', label: 'Edit', icon: 'edit', variant: 'ghost' },
              { key: 'delete', label: 'Delete', icon: 'trash', variant: 'destructive' }
            ]
          }
        }
      ],
      pagination: {
        enabled: true,
        defaultPageSize: 10,
        pageSizeOptions: [5, 10, 20, 50]
      },
      search: {
        enabled: true,
        placeholder: 'Search tax rates...',
        searchableColumns: ['name', 'description']
      }
    }
  }
];

async function populateTableConfigurations() {
  console.log('🚀 Starting table configuration population...');
  
  try {
    // Initialize database connection
    const dbConfig = new DatabaseConfig();
    const client = dbConfig.getClient();
    const repository = new TableConfigRepository(client);
    
    console.log('✅ Database connection established');
    
    // Insert each configuration
    for (const config of tableConfigurations) {
      try {
        console.log(`📝 Inserting configuration for: ${config.name} (${config.id})`);
        
        const result = await repository.upsertConfiguration(config);
        
        console.log(`✅ Configuration ${config.id} inserted/updated successfully`);
        console.log(`   - ID: ${result.id}`);
        console.log(`   - Name: ${result.name}`);
        console.log(`   - Entity: ${result.entity}`);
        console.log(`   - Columns: ${result.config.columns.length}`);
        
      } catch (error) {
        console.error(`❌ Error inserting configuration ${config.id}:`, error.message);
      }
    }
    
    console.log('\n🎉 Population process completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Configurations processed: ${tableConfigurations.length}`);
    console.log('   - Configured tables: products, warehouse, stock_movements, organizations, users, tax_rates');
    console.log('\n🔗 You can test the APIs:');
    console.log('   - GET /api/tables/available');
    console.log('   - GET /api/tables/products/config');
    console.log('   - GET /api/tables/warehouse/config');
    console.log('   - GET /api/tables/stock_movements/config');
    console.log('   - GET /api/tables/tax_rates/config');
    
  } catch (error) {
    console.error('❌ Error during population:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the population if called directly
if (require.main === module) {
  populateTableConfigurations();
}

module.exports = { populateTableConfigurations, tableConfigurations };