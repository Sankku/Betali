export class MarkdownGenerator {
    async generateFeaturesDocument(registry) {
        const { features, lastGenerated, totalFeatures } = registry;
        let markdown = `# =� Features Registry - Betali\n\n`;
        markdown += `> Registro autom�tico de funcionalidades del proyecto\n\n`;
        markdown += `**Total de Features:** ${totalFeatures}  \n`;
        markdown += `**�ltima actualizaci�n:** ${new Date(lastGenerated).toLocaleDateString('es-ES')}\n\n`;
        // Agrupar por estado
        const byStatus = features.reduce((acc, feature) => {
            if (!acc[feature.status])
                acc[feature.status] = [];
            acc[feature.status].push(feature);
            return acc;
        }, {});
        // Secci�n de implementadas
        if (byStatus.implemented?.length) {
            markdown += `##  Features Implementadas (${byStatus.implemented.length})\n\n`;
            for (const feature of byStatus.implemented) {
                markdown += this.generateFeatureSection(feature);
            }
        }
        // Secci�n en progreso
        if (byStatus.in_progress?.length) {
            markdown += `## =� En Progreso (${byStatus.in_progress.length})\n\n`;
            for (const feature of byStatus.in_progress) {
                markdown += this.generateFeatureSection(feature);
            }
        }
        // Secci�n planeadas
        if (byStatus.planned?.length) {
            markdown += `## =� Planeadas (${byStatus.planned.length})\n\n`;
            for (const feature of byStatus.planned) {
                markdown += this.generateFeatureSection(feature);
            }
        }
        // Secci�n deprecated
        if (byStatus.deprecated?.length) {
            markdown += `## =� Deprecated (${byStatus.deprecated.length})\n\n`;
            for (const feature of byStatus.deprecated) {
                markdown += this.generateFeatureSection(feature);
            }
        }
        markdown += `\n---\n*Documento generado autom�ticamente por Betali MCP*`;
        return markdown;
    }
    generateFeatureSection(feature) {
        let section = `### ${feature.name}\n\n`;
        section += `**ID:** \`${feature.id}\`  \n`;
        section += `**Estado:** ${this.getStatusBadge(feature.status)}  \n`;
        section += `**Descripci�n:** ${feature.description}\n\n`;
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
        section += `**�ltima actualizaci�n:** ${new Date(feature.lastUpdate).toLocaleDateString('es-ES')}\n\n`;
        section += `---\n\n`;
        return section;
    }
    getStatusBadge(status) {
        const badges = {
            implemented: '=� Implementada',
            in_progress: '=� En Progreso',
            planned: '=5 Planeada',
            deprecated: '=4 Deprecated'
        };
        return badges[status];
    }
    async generateProjectOverview(analysis) {
        let markdown = `# =� Project Overview - ${analysis.project}\n\n`;
        markdown += `${analysis.summary}\n\n`;
        markdown += `**�ltima actualizaci�n:** ${new Date(analysis.lastUpdate).toLocaleDateString('es-ES')}\n\n`;
        // Secci�n de componentes
        if (analysis.components.length > 0) {
            markdown += `## >� Componentes (${analysis.components.length})\n\n`;
            for (const component of analysis.components) {
                markdown += `- **${component.name}** - \`${component.path}\`\n`;
            }
            markdown += `\n`;
        }
        // Secci�n de servicios
        if (analysis.services.length > 0) {
            markdown += `## � Servicios (${analysis.services.length})\n\n`;
            for (const service of analysis.services) {
                markdown += `- \`${service}\`\n`;
            }
            markdown += `\n`;
        }
        // Secci�n de tipos
        if (analysis.types.length > 0) {
            markdown += `## =� Tipos (${analysis.types.length})\n\n`;
            for (const type of analysis.types) {
                markdown += `- \`${type}\`\n`;
            }
            markdown += `\n`;
        }
        markdown += `\n---\n*Documento generado autom�ticamente por Betali MCP*`;
        return markdown;
    }
    async generateBugReport(bugs) {
        let markdown = `# = Bug Report - Betali\n\n`;
        markdown += `**Total de bugs detectados:** ${bugs.length}  \n`;
        markdown += `**Fecha de an�lisis:** ${new Date().toLocaleDateString('es-ES')}\n\n`;
        // Agrupar por severidad
        const bySeverity = bugs.reduce((acc, bug) => {
            if (!acc[bug.severity])
                acc[bug.severity] = [];
            acc[bug.severity].push(bug);
            return acc;
        }, {});
        // Cr�ticos primero
        const severityOrder = ['critical', 'high', 'medium', 'low'];
        for (const severity of severityOrder) {
            const severityBugs = bySeverity[severity];
            if (!severityBugs?.length)
                continue;
            markdown += `## ${this.getSeverityIcon(severity)} ${severity.toUpperCase()} (${severityBugs.length})\n\n`;
            for (const bug of severityBugs) {
                markdown += `### ${bug.title}\n\n`;
                markdown += `**Archivo:** \`${bug.file}\`${bug.line ? `:${bug.line}` : ''}\n\n`;
                markdown += `**Descripci�n:** ${bug.description}\n\n`;
                markdown += `**Detectado:** ${new Date(bug.foundAt).toLocaleDateString('es-ES')}\n\n`;
                markdown += `---\n\n`;
            }
        }
        markdown += `\n---\n*Reporte generado autom�ticamente por Betali MCP*`;
        return markdown;
    }
    getSeverityIcon(severity) {
        const icons = {
            critical: '=�',
            high: '�',
            medium: '=�',
            low: '=5'
        };
        return icons[severity] || 'S';
    }
    async generatePRDTemplate(featureName, requirements) {
        const featureId = featureName.toUpperCase().replace(/\s/g, '_');
        const today = new Date().toISOString().split('T')[0];
        let markdown = `# PRD_${featureId}: ${featureName}\n\n`;
        markdown += `## <� Objetivo\n\n`;
        markdown += `Implementar la funcionalidad "${featureName}" siguiendo la nueva arquitectura SaaS multi-tenant de Betali.\n\n`;
        markdown += `## =� Requerimientos Funcionales\n\n`;
        if (requirements?.length) {
            requirements.forEach((req, index) => {
                markdown += `${index + 1}. **RF00${index + 1}**: ${req}\n`;
            });
        }
        else {
            markdown += `1. **RF001**: [Describir requerimiento funcional]\n`;
            markdown += `2. **RF002**: [Describir requerimiento funcional]\n`;
        }
        markdown += `\n`;
        markdown += `## =' Requerimientos T�cnicos\n\n`;
        markdown += `- **Frontend**: Usar React 18 + TypeScript + TanStack Query\n`;
        markdown += `- **Backend**: Seguir Clean Architecture con Express + Supabase\n`;
        markdown += `- **Multi-tenant**: Implementar aislamiento por organizaci�n\n`;
        markdown += `- **Componentes a crear**: [Listar componentes]\n`;
        markdown += `- **APIs necesarias**: [Listar endpoints]\n`;
        markdown += `- **Base de datos**: [Cambios en esquema si aplica]\n\n`;
        markdown += `##  Criterios de Aceptaci�n\n\n`;
        markdown += `- [ ] Feature funciona correctamente en modo multi-tenant\n`;
        markdown += `- [ ] Tests unitarios implementados\n`;
        markdown += `- [ ] Documentaci�n actualizada\n`;
        markdown += `- [ ] Performance optimizada\n`;
        markdown += `- [ ] Seguridad validada\n\n`;
        markdown += `## <� Arquitectura\n\n`;
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
        markdown += `- [ ] E2E tests para flujos cr�ticos\n\n`;
        markdown += `---\n`;
        markdown += `**Fecha de creaci�n:** ${today}  \n`;
        markdown += `**Generado por:** Betali MCP\n`;
        return markdown;
    }
}
//# sourceMappingURL=markdownGenerator.js.map