import { TableConfig } from '../../types/table';

// Interface for the actual API response structure
export interface ApiTableConfigResponse {
  id: string;
  name: string;
  entity: string;
  config: {
    columns: Array<{
      key: string;
      header: string;
      dataType: string;
      sortable?: boolean;
      actionsConfig?: any;
      badgeConfig?: any;
      textConfig?: any;
      numberConfig?: any;
      dateConfig?: any;
    }>;
    search?: {
      enabled: boolean;
      placeholder?: string;
      searchableColumns: string[];
    };
    pagination?: {
      enabled: boolean;
      defaultPageSize: number;
    };
  };
  created_at?: string;
  meta?: any;
}

const API_BASE_URL = 'http://localhost:4000/api';

// API response interfaces
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  error?: string;
}

interface AvailableTable {
  id: string;
  name: string;
  entity: string;
  created_at: string;
}

export class TableConfigService {
  
  /**
   * Gets configuration for a specific table
   * GET /api/tables/{tableId}/config
   */
  static async getTableConfig(tableId: string): Promise<ApiTableConfigResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/tables/${tableId}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<ApiTableConfigResponse> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch table configuration');
      }

      return result.data;
    } catch (error) {
      console.error(`Error fetching table config for ${tableId}:`, error);
      throw new Error(`Failed to load table configuration: ${error.message}`);
    }
  }

  /**
   * Gets configurations for multiple tables
   * Fetches each table configuration individually
   */
  static async getTableConfigs(tableIds: string[]): Promise<Record<string, TableConfig>> {
    const configs: Record<string, TableConfig> = {};
    
    try {
      // Fetch all configurations in parallel
      const promises = tableIds.map(async (tableId) => {
        try {
          const config = await this.getTableConfig(tableId);
          return { tableId, config };
        } catch (error) {
          console.warn(`Failed to load config for table ${tableId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      
      // Process results
      results.forEach((result) => {
        if (result) {
          configs[result.tableId] = result.config;
        }
      });

      return configs;
    } catch (error) {
      console.error('Error fetching multiple table configs:', error);
      throw new Error('Failed to load table configurations');
    }
  }

  /**
   * Lists all available table configurations
   * GET /api/tables/available
   */
  static async getAvailableTableConfigs(): Promise<{ id: string; name: string; description?: string }[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/tables/available`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<AvailableTable[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch available tables');
      }

      // Transform the API response to match the expected interface
      return result.data.map(table => ({
        id: table.id,
        name: table.name,
        description: `Manage ${table.entity} data`
      }));
    } catch (error) {
      console.error('Error fetching available table configs:', error);
      throw new Error(`Failed to load available tables: ${error.message}`);
    }
  }

  /**
   * Creates or updates table configuration
   * POST /api/tables (for new) or PUT /api/tables/{tableId} (for updates)
   */
  static async saveTableConfig(
    tableId: string, 
    config: TableConfig,
    isUpdate: boolean = true
  ): Promise<TableConfig> {
    try {
      const url = isUpdate 
        ? `${API_BASE_URL}/tables/${tableId}`
        : `${API_BASE_URL}/tables`;
      
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<TableConfig> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save table configuration');
      }

      return result.data;
    } catch (error) {
      console.error(`Error saving table config for ${tableId}:`, error);
      throw new Error(`Failed to save table configuration: ${error.message}`);
    }
  }

  /**
   * Deletes a table configuration
   * DELETE /api/tables/{tableId}
   */
  static async deleteTableConfig(tableId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<void> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete table configuration');
      }
    } catch (error) {
      console.error(`Error deleting table config for ${tableId}:`, error);
      throw new Error(`Failed to delete table configuration: ${error.message}`);
    }
  }

  /**
   * Utility method to check if the API is available
   */
  static async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.warn('API health check failed:', error);
      return false;
    }
  }

  // Legacy methods for backward compatibility - these now use the real API
  
  /**
   * @deprecated Use saveTableConfig instead
   * Personalizes table configuration for a specific user
   */
  static async saveUserTableConfig(
    tableId: string, 
    userId: string, 
    customConfig: Partial<TableConfig>
  ): Promise<void> {
    // For now, this just logs since user-specific configs aren't implemented yet
    console.log('User-specific table config would be saved:', { tableId, userId, customConfig });
    console.warn('User-specific configurations not yet implemented in backend');
  }

  /**
   * @deprecated Use getTableConfig instead
   * Gets user-specific table configuration
   */
  static async getUserTableConfig(tableId: string, userId: string): Promise<Partial<TableConfig> | null> {
    // For now, return null since user-specific configs aren't implemented yet
    console.warn('User-specific configurations not yet implemented in backend');
    return null;
  }
}