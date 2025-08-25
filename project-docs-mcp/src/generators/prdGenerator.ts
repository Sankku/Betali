// src/tools/prdGenerator.ts

export class PRDGenerator {
    async createPRD(featureName: string): Promise<string> {
      const featureId = featureName.toUpperCase().replace(/\s/g, '_');
      const today = new Date().toISOString().split('T')[0];
  
      const prd = `# PRD_${featureId}: ${featureName}
  
  ## Objetivo
  Implementar la funcionalidad "${featureName}" para ...
  
  ## Requerimientos Funcionales
  1. **RF001**: ...
  2. **RF002**: ...
  
  ## Requerimientos Técnicos
  - **Componentes a crear**: ...
  - **APIs necesarias**: ...
  
  ## Criterios de Aceptación
  - [ ] Criterio 1
  - [ ] Criterio 2
  
  ---
  *Generado automáticamente el ${today}*
  `;
  
      return prd;
    }
  }