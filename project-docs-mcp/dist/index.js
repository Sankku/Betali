import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { DocumentAnalyzer } from './tools/documentAnalyzer.js';
import { FeaturesTracker } from './tools/featuresTracker.js';
import { PRDGenerator } from './generators/prdGenerator.js';
import { MarkdownGenerator } from './generators/markdownGenerator.js';
class ProjectDocsMCP {
    server;
    analyzer;
    tracker;
    prdGen;
    markdownGen;
    constructor() {
        this.server = new Server({ name: 'project-docs-mcp', version: '1.0.0' });
        this.analyzer = new DocumentAnalyzer();
        this.tracker = new FeaturesTracker();
        this.prdGen = new PRDGenerator();
        this.markdownGen = new MarkdownGenerator();
        this.setupTools();
    }
    setupTools() {
        // Registrar las tools disponibles
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'analyze-project',
                    description: 'Analiza el estado actual completo del proyecto Betali',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                {
                    name: 'track-features',
                    description: 'Rastrea y genera registro de todas las funcionalidades del proyecto',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                {
                    name: 'generate-prd',
                    description: 'Genera un PRD (Product Requirements Document) para una nueva feature',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            feature: { type: 'string', description: 'Nombre de la feature a implementar' },
                            requirements: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Lista opcional de requerimientos específicos'
                            }
                        },
                        required: ['feature']
                    }
                },
                {
                    name: 'detect-bugs',
                    description: 'Detecta posibles bugs y problemas en el código automáticamente',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                {
                    name: 'update-docs',
                    description: 'Actualiza toda la documentación del proyecto automáticamente',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            ]
        }));
        // Manejar las llamadas a las tools
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            switch (name) {
                case 'analyze-project':
                    return {
                        content: [{
                                type: 'text',
                                text: await this.analyzer.analyzeFullProject()
                            }]
                    };
                case 'track-features':
                    return {
                        content: [{
                                type: 'text',
                                text: await this.tracker.generateFeaturesRegistry()
                            }]
                    };
                case 'generate-prd':
                    const feature = args?.feature;
                    const requirements = args?.requirements;
                    return {
                        content: [{
                                type: 'text',
                                text: await this.markdownGen.generatePRDTemplate(feature, requirements)
                            }]
                    };
                case 'detect-bugs':
                    return {
                        content: [{
                                type: 'text',
                                text: await this.detectBugsFromCode()
                            }]
                    };
                case 'update-docs':
                    return {
                        content: [{
                                type: 'text',
                                text: await this.updateAllDocumentation()
                            }]
                    };
                default:
                    throw new Error(`Tool desconocida: ${name}`);
            }
        });
    }
    async detectBugsFromCode() {
        try {
            const bugs = await this.analyzer.detectPotentialBugs();
            return await this.markdownGen.generateBugReport(bugs);
        }
        catch (error) {
            return `Error detectando bugs: ${error}`;
        }
    }
    async updateAllDocumentation() {
        try {
            // Generar análisis del proyecto
            const projectAnalysis = JSON.parse(await this.analyzer.analyzeFullProject());
            // Generar registro de features 
            const featuresRegistry = JSON.parse(await this.tracker.generateFeaturesRegistry());
            // Generar documentos markdown
            const projectOverview = await this.markdownGen.generateProjectOverview(projectAnalysis);
            const featuresDoc = await this.markdownGen.generateFeaturesDocument(featuresRegistry);
            return `Documentación actualizada exitosamente:\n\n` +
                `## Documentos generados:\n` +
                `- PROJECT_OVERVIEW.md\n` +
                `- FEATURES_REGISTRY.md\n` +
                `- Total de features: ${featuresRegistry.totalFeatures}\n` +
                `- Total de componentes: ${projectAnalysis.components.length}\n` +
                `- Total de servicios: ${projectAnalysis.services.length}`;
        }
        catch (error) {
            return `Error actualizando documentación: ${error}`;
        }
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Betali Project Docs MCP server running on stdio');
    }
}
const server = new ProjectDocsMCP();
server.start().catch(console.error);
//# sourceMappingURL=index.js.map