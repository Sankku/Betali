<!-- feature-implementation.md -->
# Prompt para Implementación de Funcionalidades

## Contexto
Usa el MCP tool `analyze-project` para obtener el estado actual del proyecto.
Usa el MCP tool `track-features` para ver funcionalidades existentes.

## Tarea
Implementa la funcionalidad definida en el PRD proporcionado.

## Proceso
1. **Análisis**: Revisa el PRD y el estado actual del proyecto
2. **Planificación**: Identifica componentes, servicios y archivos a modificar
3. **Implementación**: 
   - Sigue los patrones de código existentes
   - Mantén consistencia con la arquitectura actual
   - Implementa tests correspondientes
4. **Documentación**: 
   - Actualiza FEATURES_REGISTRY.md
   - Actualiza CODEBASE_MAP.md
   - Agrega comentarios en el código

## Criterios de Calidad
- Código TypeScript tipado
- Componentes React funcionales con hooks
- Gestión de errores adecuada
- Tests unitarios con > 80% cobertura
- Documentación actualizada