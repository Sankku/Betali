const { DatabaseConfig } = require('../config/database');

const usersTableConfig = {
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
};

async function updateUsersConfig() {
  console.log('🚀 Updating users table configuration...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const client = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // First check if the record exists
    const { data: existing } = await client
      .from('table_configurations')
      .select('*')
      .eq('id', 'users')
      .single();

    let result;
    if (existing) {
      console.log('📝 Updating existing users configuration...');
      const { data, error } = await client
        .from('table_configurations')
        .update(usersTableConfig)
        .eq('id', 'users')
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    } else {
      console.log('📝 Creating new users configuration...');
      const { data, error } = await client
        .from('table_configurations')
        .insert(usersTableConfig)
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }
    
    console.log('✅ Users configuration updated successfully');
    console.log(`   - ID: ${result.id}`);
    console.log(`   - Name: ${result.name}`);
    console.log(`   - Entity: ${result.entity}`);
    console.log(`   - Columns: ${result.config.columns.length}`);
    
  } catch (error) {
    console.error('❌ Error updating users configuration:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the update if called directly
if (require.main === module) {
  updateUsersConfig();
}

module.exports = { updateUsersConfig };