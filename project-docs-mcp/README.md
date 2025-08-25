# Betali Project Docs MCP

MCP (Model Context Protocol) server para automatizar la documentación y desarrollo del proyecto Betali.

## 🚀 Funcionalidades

- **Análisis del proyecto**: Escanea y analiza toda la estructura del código
- **Registro de features**: Rastrea automáticamente todas las funcionalidades implementadas
- **Generación de PRDs**: Crea Product Requirements Documents automáticamente
- **Detección de bugs**: Identifica problemas potenciales en el código
- **Documentación automática**: Actualiza toda la documentación del proyecto

## 📦 Instalación

```bash
cd project-docs-mcp
npm install
npm run build
```

## 🔧 Configuración en Claude Desktop

Agrega esta configuración a tu archivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "betali-docs": {
      "command": "node",
      "args": ["/ruta/completa/a/project-docs-mcp/dist/index.js"],
      "cwd": "/Users/santiagoalaniz/Documents/Personal/SaasRestaurant"
    }
  }
}
```

## 🛠️ Tools disponibles

### `analyze-project`
Analiza el estado completo del proyecto Betali.

**Uso:**
```
Analiza el proyecto actual
```

### `track-features`
Genera un registro completo de todas las funcionalidades.

**Uso:**
```
Rastrea las features del proyecto
```

### `generate-prd`
Genera un PRD para una nueva feature.

**Parámetros:**
- `feature` (string): Nombre de la feature
- `requirements` (array, opcional): Lista de requerimientos

**Uso:**
```
Genera PRD para "Sistema de Notificaciones"
```

### `detect-bugs`
Detecta problemas potenciales en el código.

**Uso:**
```
Detecta bugs en el código
```

### `update-docs`
Actualiza toda la documentación del proyecto.

**Uso:**
```
Actualiza la documentación
```

## 🏗️ Arquitectura

```
project-docs-mcp/
├── src/
│   ├── index.ts              # Servidor MCP principal
│   ├── tools/
│   │   ├── documentAnalyzer.ts    # Análisis del proyecto
│   │   └── featuresTracker.ts     # Rastreo de features
│   ├── generators/
│   │   ├── markdownGenerator.ts   # Generación de documentos
│   │   └── prdGenerator.ts        # Generación de PRDs
│   └── parsers/
│       └── typescriptParser.ts    # Análisis de código TS
├── config/
│   └── project-config.json   # Configuración del proyecto
└── dist/                     # Código compilado
```

## 🎯 Uso con Claude Code

Una vez configurado, puedes usar estos comandos con Claude:

1. **"Analiza el estado actual del proyecto"** - Ejecuta `analyze-project`
2. **"¿Qué features tenemos implementadas?"** - Ejecuta `track-features`
3. **"Genera un PRD para autenticación OAuth"** - Ejecuta `generate-prd`
4. **"Busca bugs en el código"** - Ejecuta `detect-bugs`
5. **"Actualiza toda la documentación"** - Ejecuta `update-docs`

## 🔄 Desarrollo

```bash
# Modo desarrollo
npm run dev

# Compilar
npm run build

# Ejecutar
npm start
```

## 🎯 Roadmap

- [ ] Análisis más profundo de código (AST parsing)
- [ ] Integración con GitHub Issues
- [ ] Generación automática de tests
- [ ] Métricas de código y performance
- [ ] Integración con CI/CD