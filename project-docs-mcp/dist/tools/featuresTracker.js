import { TypeScriptParser } from '../parsers/typescriptParser.js';
import { MarkdownGenerator } from '../generators/markdownGenerator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
export class FeaturesTracker {
    parser;
    markdownGen;
    projectRoot;
    featuresFile;
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.parser = new TypeScriptParser();
        this.markdownGen = new MarkdownGenerator();
        this.featuresFile = path.join(projectRoot, 'docs', 'FEATURES_REGISTRY.md');
    }
    async generateFeaturesRegistry() {
        const features = await this.discoverFeatures();
        const registry = {
            features,
            lastGenerated: new Date().toISOString(),
            totalFeatures: features.length
        };
        const markdown = await this.markdownGen.generateFeaturesDocument(registry);
        // Guardar en archivo si existe la carpeta docs
        try {
            const docsDir = path.dirname(this.featuresFile);
            await fs.mkdir(docsDir, { recursive: true });
            await fs.writeFile(this.featuresFile, markdown);
        }
        catch (error) {
            console.warn('No se pudo guardar el registro de features:', error);
        }
        return JSON.stringify(registry, null, 2);
    }
    async discoverFeatures() {
        const features = [];
        // Buscar features en componentes React
        const components = await this.parser.findAllComponents();
        const componentFeatures = this.extractFeaturesFromComponents(components);
        features.push(...componentFeatures);
        // Buscar features en servicios
        const services = await this.parser.findAllServices();
        const serviceFeatures = this.extractFeaturesFromServices(services);
        features.push(...serviceFeatures);
        // Buscar features en rutas/páginas
        const routes = await this.parser.findAllRoutes();
        const routeFeatures = this.extractFeaturesFromRoutes(routes);
        features.push(...routeFeatures);
        return this.deduplicateFeatures(features);
    }
    extractFeaturesFromComponents(components) {
        return components
            .filter(comp => !this.isUtilityComponent(comp.name))
            .map(comp => ({
            id: this.generateFeatureId(comp.name),
            name: this.humanizeFeatureName(comp.name),
            description: `Feature basada en el componente ${comp.name}`,
            status: 'implemented',
            components: [comp.name],
            services: [],
            lastUpdate: new Date().toISOString()
        }));
    }
    extractFeaturesFromServices(services) {
        return services
            .filter(service => !this.isUtilityService(service))
            .map(service => ({
            id: this.generateFeatureId(service),
            name: this.humanizeFeatureName(service.replace('Service', '')),
            description: `Feature basada en el servicio ${service}`,
            status: 'implemented',
            components: [],
            services: [service],
            lastUpdate: new Date().toISOString()
        }));
    }
    extractFeaturesFromRoutes(routes) {
        return routes.map(route => ({
            id: this.generateFeatureId(route),
            name: this.humanizeFeatureName(route),
            description: `Feature basada en la ruta ${route}`,
            status: 'implemented',
            components: [],
            services: [],
            lastUpdate: new Date().toISOString()
        }));
    }
    generateFeatureId(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    humanizeFeatureName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
    isUtilityComponent(name) {
        const utilityPatterns = ['Button', 'Input', 'Modal', 'Loading', 'Spinner', 'Icon'];
        return utilityPatterns.some(pattern => name.includes(pattern));
    }
    isUtilityService(name) {
        const utilityPatterns = ['HttpService', 'UtilService', 'HelperService'];
        return utilityPatterns.some(pattern => name.includes(pattern));
    }
    deduplicateFeatures(features) {
        const uniqueFeatures = new Map();
        for (const feature of features) {
            const existing = uniqueFeatures.get(feature.id);
            if (existing) {
                // Combinar componentes y servicios
                existing.components = [...new Set([...existing.components, ...feature.components])];
                existing.services = [...new Set([...existing.services, ...feature.services])];
            }
            else {
                uniqueFeatures.set(feature.id, feature);
            }
        }
        return Array.from(uniqueFeatures.values());
    }
    async trackNewFeature(name, description) {
        const feature = {
            id: this.generateFeatureId(name),
            name,
            description,
            status: 'planned',
            components: [],
            services: [],
            lastUpdate: new Date().toISOString()
        };
        // Aquí podrías persistir la feature en una base de datos o archivo
        console.log('Nueva feature registrada:', feature);
    }
    async updateFeatureStatus(featureId, status) {
        // Implementar actualización de estado de features
        console.log(`Feature ${featureId} actualizada a estado: ${status}`);
    }
}
//# sourceMappingURL=featuresTracker.js.map