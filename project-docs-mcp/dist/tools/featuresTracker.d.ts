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
export declare class FeaturesTracker {
    private parser;
    private markdownGen;
    private projectRoot;
    private featuresFile;
    constructor(projectRoot?: string);
    generateFeaturesRegistry(): Promise<string>;
    private discoverFeatures;
    private extractFeaturesFromComponents;
    private extractFeaturesFromServices;
    private extractFeaturesFromRoutes;
    private generateFeatureId;
    private humanizeFeatureName;
    private isUtilityComponent;
    private isUtilityService;
    private deduplicateFeatures;
    trackNewFeature(name: string, description: string): Promise<void>;
    updateFeatureStatus(featureId: string, status: Feature['status']): Promise<void>;
}
export {};
//# sourceMappingURL=featuresTracker.d.ts.map