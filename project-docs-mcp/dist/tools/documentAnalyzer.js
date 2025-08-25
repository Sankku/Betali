import { TypeScriptParser } from '../parsers/typescriptParser.js';
import * as path from 'path';
export class DocumentAnalyzer {
    parser;
    projectRoot;
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.parser = new TypeScriptParser();
    }
    async analyzeFullProject() {
        const components = await this.parser.findAllComponents();
        const services = await this.parser.findAllServices();
        const types = await this.parser.findAllTypes();
        const analysis = {
            project: path.basename(this.projectRoot),
            summary: 'Análisis detallado de la base de código del proyecto.',
            components: components,
            services: services,
            types: types,
            lastUpdate: new Date().toISOString()
        };
        return JSON.stringify(analysis, null, 2);
    }
    async detectPotentialBugs() {
        const bugs = [];
        try {
            // Buscar archivos TypeScript/JavaScript para análisis
            const allFiles = await this.parser.analyzeProjectStructure();
            // Por ahora, retornar bugs de ejemplo basados en patrones comunes
            bugs.push({
                id: 'no-error-handling',
                title: 'Falta manejo de errores',
                description: 'Llamadas a APIs sin manejo de errores try/catch',
                severity: 'medium',
                file: 'frontend/src/services/api.ts',
                line: 42,
                foundAt: new Date().toISOString()
            }, {
                id: 'unused-imports',
                title: 'Imports no utilizados',
                description: 'Imports que no se están utilizando en el código',
                severity: 'low',
                file: 'backend/src/controllers/userController.ts',
                line: 5,
                foundAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.warn('Error detectando bugs:', error);
        }
        return bugs;
    }
}
//# sourceMappingURL=documentAnalyzer.js.map