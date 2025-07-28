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
    console.log('   - Configured tables: products, warehouse, stock_movements');
    console.log('\n🔗 You can test the APIs:');
    console.log('   - GET /api/tables/available');
    console.log('   - GET /api/tables/products/config');
    console.log('   - GET /api/tables/warehouse/config');
    console.log('   - GET /api/tables/stock_movements/config');
    
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