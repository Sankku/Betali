export declare class DocumentAnalyzer {
    private parser;
    private projectRoot;
    constructor(projectRoot?: string);
    analyzeFullProject(): Promise<string>;
    detectPotentialBugs(): Promise<Array<{
        id: string;
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        file: string;
        line?: number;
        foundAt: string;
    }>>;
}
//# sourceMappingURL=documentAnalyzer.d.ts.map