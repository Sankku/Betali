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
    components: {
        name: string;
        path: string;
    }[];
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
export declare class MarkdownGenerator {
    generateFeaturesDocument(registry: FeatureRegistry): Promise<string>;
    private generateFeatureSection;
    private getStatusBadge;
    generateProjectOverview(analysis: ProjectAnalysis): Promise<string>;
    generateBugReport(bugs: BugReport[]): Promise<string>;
    private getSeverityIcon;
    generatePRDTemplate(featureName: string, requirements?: string[]): Promise<string>;
}
export {};
//# sourceMappingURL=markdownGenerator.d.ts.map