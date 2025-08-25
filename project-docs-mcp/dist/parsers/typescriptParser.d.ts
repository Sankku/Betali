interface ComponentInfo {
    name: string;
    path: string;
    isPage?: boolean;
    exports?: string[];
}
export declare class TypeScriptParser {
    private projectRoot;
    constructor(projectRoot?: string);
    findAllComponents(): Promise<ComponentInfo[]>;
    findAllServices(): Promise<string[]>;
    findAllTypes(): Promise<string[]>;
    findAllRoutes(): Promise<string[]>;
    private parseReactComponent;
    private parseServiceClasses;
    private parseTypeDeclarations;
    private parseRouteDefinitions;
    private extractPageRoute;
    private parseExports;
    analyzeProjectStructure(): Promise<{
        totalFiles: number;
        fileTypes: Record<string, number>;
        largestFiles: Array<{
            path: string;
            size: number;
        }>;
    }>;
}
export {};
//# sourceMappingURL=typescriptParser.d.ts.map