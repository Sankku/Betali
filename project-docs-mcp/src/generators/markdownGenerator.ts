interface Feature {
  id: string;
  name: string;
  description: string;
  status: 'implemented' | 'in_progress' | 'planned' | 'deprecated';
  components: string[];
  services: string[];
  lastUpdate: string;
  version?: string;
}

interface FeatureRegistry {
  features: Feature[];
  lastGenerated: string;
  totalFeatures: number;
}

interface ProjectAnalysis {
  project: string;
  summary: string;
  components: { name: string; path: string }[];
  services: string[];
  types: string[];
  lastUpdate: string;
}

interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  foundAt: string;
}

export class MarkdownGenerator {
  
  async generateFeaturesDocument(registry: FeatureRegistry): Promise<string> {
    const { features, lastGenerated, totalFeatures } = registry;
    
    let markdown = `# =Ë Features Registry - Betali\n\n`;
    markdown += `> Registro automático de funcionalidades del proyecto\n\n`;
    markdown += `**Total de Features:** ${totalFeatures}  \n`;
    markdown += `**Última actualización:** ${new Date(lastGenerated).toLocaleDateString('es-ES')}\n\n`;
    
    // Agrupar por estado
    const byStatus = features.reduce((acc, feature) => {
      if (!acc[feature.status]) acc[feature.status] = [];
      acc[feature.status].push(feature);
      return acc;
    }, {} as Record<string, Feature[]>);

    // Sección de implementadas
    if (byStatus.implemented?.length) {
      markdown += `##  Features Implementadas (${byStatus.implemented.length})\n\n`;
      for (const feature of byStatus.implemented) {
        markdown += this.generateFeatureSection(feature);
      }
    }

    // Sección en progreso
    if (byStatus.in_progress?.length) {
      markdown += `## =§ En Progreso (${byStatus.in_progress.length})\n\n`;
      for (const feature of byStatus.in_progress) {
        markdown += this.generateFeatureSection(feature);
      }
    }

    // Sección planeadas
    if (byStatus.planned?.length) {
      markdown += `## =Ë Planeadas (${byStatus.planned.length})\n\n`;
      for (const feature of byStatus.planned) {
        markdown += this.generateFeatureSection(feature);
      }
    }

    // Sección deprecated
    if (byStatus.deprecated?.length) {
      markdown += `## =Â Deprecated (${byStatus.deprecated.length})\n\n`;
      for (const feature of byStatus.deprecated) {
        markdown += this.generateFeatureSection(feature);
      }
    }

    markdown += `\n---\n*Documento generado automáticamente por Betali MCP*`;
    
    return markdown;
  }

  private generateFeatureSection(feature: Feature): string {
    let section = `### ${feature.name}\n\n`;
    section += `**ID:** \`${feature.id}\`  \n`;
    section += `**Estado:** ${this.getStatusBadge(feature.status)}  \n`;
    section += `**Descripción:** ${feature.description}\n\n`;
    
    if (feature.components.length > 0) {
      section += `**Componentes:**\n`;
      for (const comp of feature.components) {
        section += `- \`${comp}\`\n`;
      }
      section += `\n`;
    }
    
    if (feature.services.length > 0) {
      section += `**Servicios:**\n`;
      for (const service of feature.services) {
        section += `- \`${service}\`\n`;
      }
      section += `\n`;
    }

    section += `**Última actualización:** ${new Date(feature.lastUpdate).toLocaleDateString('es-ES')}\n\n`;
    section += `---\n\n`;
    
    return section;
  }

  private getStatusBadge(status: Feature['status']): string {
    const badges = {
      implemented: '=â Implementada',
      in_progress: '=á En Progreso', 
      planned: '=5 Planeada',
      deprecated: '=4 Deprecated'
    };
    return badges[status];
  }

  async generateProjectOverview(analysis: ProjectAnalysis): Promise<string> {
    let markdown = `# =Ê Project Overview - ${analysis.project}\n\n`;
    markdown += `${analysis.summary}\n\n`;
    markdown += `**Última actualización:** ${new Date(analysis.lastUpdate).toLocaleDateString('es-ES')}\n\n`;

    // Sección de componentes
    if (analysis.components.length > 0) {
      markdown += `## >é Componentes (${analysis.components.length})\n\n`;
      for (const component of analysis.components) {
        markdown += `- **${component.name}** - \`${component.path}\`\n`;
      }
      markdown += `\n`;
    }

    // Sección de servicios
    if (analysis.services.length > 0) {
      markdown += `## ™ Servicios (${analysis.services.length})\n\n`;
      for (const service of analysis.services) {
        markdown += `- \`${service}\`\n`;
      }
      markdown += `\n`;
    }

    // Sección de tipos
    if (analysis.types.length > 0) {
      markdown += `## =Ý Tipos (${analysis.types.length})\n\n`;
      for (const type of analysis.types) {
        markdown += `- \`${type}\`\n`;
      }
      markdown += `\n`;
    }

    markdown += `\n---\n*Documento generado automáticamente por Betali MCP*`;
    
    return markdown;
  }

  async generateBugReport(bugs: BugReport[]): Promise<string> {
    let markdown = `# = Bug Report - Betali\n\n`;
    markdown += `**Total de bugs detectados:** ${bugs.length}  \n`;
    markdown += `**Fecha de análisis:** ${new Date().toLocaleDateString('es-ES')}\n\n`;

    // Agrupar por severidad
    const bySeverity = bugs.reduce((acc, bug) => {
      if (!acc[bug.severity]) acc[bug.severity] = [];
      acc[bug.severity].push(bug);
      return acc;
    }, {} as Record<string, BugReport[]>);

    // Críticos primero
    const severityOrder: Array<keyof typeof bySeverity> = ['critical', 'high', 'medium', 'low'];
    
    for (const severity of severityOrder) {
      const severityBugs = bySeverity[severity];
      if (!severityBugs?.length) continue;

      markdown += `## ${this.getSeverityIcon(severity)} ${severity.toUpperCase()} (${severityBugs.length})\n\n`;
      
      for (const bug of severityBugs) {
        markdown += `### ${bug.title}\n\n`;
        markdown += `**Archivo:** \`${bug.file}\`${bug.line ? `:${bug.line}` : ''}\n\n`;
        markdown += `**Descripción:** ${bug.description}\n\n`;
        markdown += `**Detectado:** ${new Date(bug.foundAt).toLocaleDateString('es-ES')}\n\n`;
        markdown += `---\n\n`;
      }
    }

    markdown += `\n---\n*Reporte generado automáticamente por Betali MCP*`;
    
    return markdown;
  }

  private getSeverityIcon(severity: string): string {
    const icons = {
      critical: '=¨',
      high: ' ',
      medium: '=á',
      low: '=5'
    };
    return icons[severity as keyof typeof icons] || 'S';
  }

  async generatePRDTemplate(featureName: string, requirements?: string[]): Promise<string> {
    const featureId = featureName.toUpperCase().replace(/\s/g, '_');
    const today = new Date().toISOString().split('T')[0];

    let markdown = `# PRD_${featureId}: ${featureName}\n\n`;
    markdown += `## <¯ Objetivo\n\n`;
    markdown += `Implementar la funcionalidad "${featureName}" siguiendo la nueva arquitectura SaaS multi-tenant de Betali.\n\n`;
    
    markdown += `## =Ë Requerimientos Funcionales\n\n`;
    if (requirements?.length) {
      requirements.forEach((req, index) => {
        markdown += `${index + 1}. **RF00${index + 1}**: ${req}\n`;
      });
    } else {
      markdown += `1. **RF001**: [Describir requerimiento funcional]\n`;
      markdown += `2. **RF002**: [Describir requerimiento funcional]\n`;
    }
    markdown += `\n`;

    markdown += `## =' Requerimientos Técnicos\n\n`;
    markdown += `- **Frontend**: Usar React 18 + TypeScript + TanStack Query\n`;
    markdown += `- **Backend**: Seguir Clean Architecture con Express + Supabase\n`;
    markdown += `- **Multi-tenant**: Implementar aislamiento por organización\n`;
    markdown += `- **Componentes a crear**: [Listar componentes]\n`;
    markdown += `- **APIs necesarias**: [Listar endpoints]\n`;
    markdown += `- **Base de datos**: [Cambios en esquema si aplica]\n\n`;

    markdown += `##  Criterios de Aceptación\n\n`;
    markdown += `- [ ] Feature funciona correctamente en modo multi-tenant\n`;
    markdown += `- [ ] Tests unitarios implementados\n`;
    markdown += `- [ ] Documentación actualizada\n`;
    markdown += `- [ ] Performance optimizada\n`;
    markdown += `- [ ] Seguridad validada\n\n`;

    markdown += `## <× Arquitectura\n\n`;
    markdown += `### Frontend\n`;
    markdown += `- **Ruta**: /features/${featureName.toLowerCase().replace(/\s/g, '-')}\n`;
    markdown += `- **Componentes**: [Listar componentes principales]\n`;
    markdown += `- **Hooks**: [Custom hooks necesarios]\n\n`;

    markdown += `### Backend\n`;
    markdown += `- **Controller**: \`${featureName}Controller\`\n`;
    markdown += `- **Service**: \`${featureName}Service\`\n`;
    markdown += `- **Repository**: \`${featureName}Repository\`\n`;
    markdown += `- **Rutas**: \`/api/v1/${featureName.toLowerCase()}\`\n\n`;

    markdown += `## = Testing\n\n`;
    markdown += `- [ ] Unit tests para servicios\n`;
    markdown += `- [ ] Integration tests para APIs\n`;
    markdown += `- [ ] Component tests para UI\n`;
    markdown += `- [ ] E2E tests para flujos críticos\n\n`;

    markdown += `---\n`;
    markdown += `**Fecha de creación:** ${today}  \n`;
    markdown += `**Generado por:** Betali MCP\n`;
    
    return markdown;
  }
}