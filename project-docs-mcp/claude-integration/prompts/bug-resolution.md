<!-- bug-resolution.md -->
# Prompt para Resolución de Bugs

## Contexto
Usa el MCP tool `detect-bugs` para obtener bugs conocidos.
Usa el MCP tool `analyze-project` para entender el contexto del código.

## Proceso de Resolución
1. **Análisis del Bug**:
   - Reproduce el error siguiendo los pasos del BUGS_REGISTRY.md
   - Identifica la causa raíz usando el CODEBASE_MAP.md
   - Analiza el impacto en otras funcionalidades

2. **Propuesta de Solución**:
   - Describe la solución técnica
   - Identifica archivos a modificar
   - Evalúa efectos secundarios

3. **Implementación**:
   - Implementa el fix
   - Crea/actualiza tests para prevenir regresiones
   - Verifica que no se rompen funcionalidades existentes

4. **Documentación**:
   - Actualiza BUGS_REGISTRY.md marcando como resuelto
   - Documenta la solución para futuros casos similares