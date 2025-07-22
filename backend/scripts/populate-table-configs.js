const { DatabaseConfig } = require('../config/database');
const { TableConfigRepository } = require('../repositories/TableConfigRepository');

// Initial table configurations
const tableConfigurations = [
  {
    id: 'products',
    name: 'Gestión de Productos',
    entity: 'products',
    config: {
      columns: [
        {
          key: 'name',
          header: 'Producto',
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
                    prefix: 'Lote: '
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
          header: 'Vencimiento',
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
          header: 'País de Origen',
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
          header: 'Fecha Registro',
          dataType: 'date',
          sortable: true,
          filterable: true,
          dateConfig: {
            format: 'short',
            locale: 'es-ES'
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
              { key: 'view', label: 'Ver', icon: 'eye', variant: 'ghost' },
              { key: 'edit', label: 'Editar', icon: 'edit', variant: 'ghost' },
              { key: 'delete', label: 'Eliminar', icon: 'trash', variant: 'destructive' }
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
        placeholder: 'Buscar productos...',
        searchableColumns: ['name', 'batch_number', 'origin_country']
      }
    }
  },
  {
    id: 'warehouse',
    name: 'Gestión de Almacenes',
    entity: 'warehouse',
    config: {
      columns: [
        {
          key: 'name',
          header: 'Nombre',
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
          header: 'Ubicación',
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
          header: 'Estado',
          dataType: 'status',
          sortable: true,
          filterable: true,
          statusConfig: {
            activeLabel: 'Activo',
            inactiveLabel: 'Inactivo',
            activeVariant: 'success',
            inactiveVariant: 'danger',
            showToggle: true,
            toggleDisabled: false
          }
        },
        {
          key: 'created_at',
          header: 'Fecha Creación',
          dataType: 'date',
          sortable: true,
          filterable: true,
          dateConfig: {
            format: 'short',
            locale: 'es-ES'
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
              { key: 'view', label: 'Ver', icon: 'eye', variant: 'ghost' },
              { key: 'edit', label: 'Editar', icon: 'edit', variant: 'ghost' },
              { key: 'delete', label: 'Eliminar', icon: 'trash', variant: 'destructive' }
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
        placeholder: 'Buscar almacenes...',
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
          header: 'Tipo',
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
              'in': 'Entrada',
              'out': 'Salida',
              'adjustment': 'Ajuste',
              'transfer': 'Transferencia'
            },
            size: 'md'
          }
        },
        {
          key: 'product_name',
          header: 'Producto',
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
          header: 'Cantidad',
          dataType: 'number',
          sortable: true,
          filterable: true,
          numberConfig: {
            format: 'decimal',
            decimals: 0,
            suffix: ' unidades',
            showPositiveColor: true,
            showNegativeColor: true
          }
        },
        {
          key: 'warehouse_name',
          header: 'Almacén',
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
          header: 'Fecha',
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
          header: 'Referencia',
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
        placeholder: 'Buscar movimientos...',
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