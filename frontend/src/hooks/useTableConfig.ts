import { useQuery } from '@tanstack/react-query';
import { TableConfigService, ApiTableConfigResponse } from '../services/api/tableConfigService';
import { TableConfig } from '../types/table';

/**
 * Hook para obtener la configuración de una tabla específica
 */
export function useTableConfig(tableId: string) {
  return useQuery({
    queryKey: ['table-config', tableId],
    queryFn: () => TableConfigService.getTableConfig(tableId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener múltiples configuraciones de tabla
 */
export function useTableConfigs(tableIds: string[]) {
  return useQuery({
    queryKey: ['table-configs', tableIds.sort().join(',')],
    queryFn: () => TableConfigService.getTableConfigs(tableIds),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    enabled: tableIds.length > 0,
  });
}

/**
 * Hook para obtener las tablas disponibles
 */
export function useAvailableTableConfigs() {
  return useQuery({
    queryKey: ['available-table-configs'],
    queryFn: () => TableConfigService.getAvailableTableConfigs(),
    staleTime: 15 * 60 * 1000, // 15 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
  });
}

/**
 * Hook personalizado para configuraciones específicas de usuario
 */
export function useUserTableConfig(tableId: string, userId?: string) {
  return useQuery({
    queryKey: ['user-table-config', tableId, userId],
    queryFn: () => {
      if (!userId) return null;
      return TableConfigService.getUserTableConfig(tableId, userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook combinado que obtiene la configuración base y la personalización del usuario
 */
export function useMergedTableConfig(tableId: string, userId?: string) {
  const { data: baseConfig, ...baseQuery } = useTableConfig(tableId);
  const { data: userConfig } = useUserTableConfig(tableId, userId);

  // Combinar configuración base con personalización del usuario
  const mergedConfig: ApiTableConfigResponse | undefined = baseConfig 
    ? {
        ...baseConfig,
        ...userConfig,
        config: {
          ...baseConfig.config,
          columns: baseConfig.config.columns.map(column => {
            const userColumnConfig = userConfig?.config?.columns?.find(
              userCol => userCol.key === column.key
            );
            return userColumnConfig ? { ...column, ...userColumnConfig } : column;
          })
        }
      }
    : undefined;

  return {
    data: mergedConfig,
    baseConfig,
    userConfig,
    ...baseQuery
  };
}