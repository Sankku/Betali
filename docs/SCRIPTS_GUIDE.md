# 🚀 Scripts de Desarrollo - Betali

Guía rápida de scripts NPM/Bun disponibles en el proyecto.

---

## 🏃 Scripts de Desarrollo

### Iniciar Servidores

```bash
# Frontend (React + Vite) en puerto 3000
bun run front

# Backend (Express API) en puerto 4000
bun run back

# Backend en modo desarrollo (watch mode)
bun run back:dev
```

---

## 🏗️ Scripts de Build

### Build Individual

```bash
# Build solo frontend
bun run build:front

# Build solo backend
bun run build:back

# Build frontend (alias de build:front)
bun run build
```

### Build Todo

```bash
# Build frontend Y backend
bun run build:all
```

---

## 🧪 Scripts de Testing

### Ejecutar Tests

```bash
# Ejecutar TODOS los tests (backend + frontend)
bun run test

# Tests solo del backend (Jest)
bun run test:back

# Tests solo del frontend
bun run test:front

# Tests en modo watch (backend)
bun run test:watch
```

---

## ✅ Scripts de Calidad

### Linting

```bash
# Lint TODO el proyecto (frontend + backend)
bun run lint

# Lint solo frontend
bun run lint:front

# Lint solo backend
bun run lint:back
```

### Health Checks

```bash
# Health check del backend
bun run health

# Test de conexión a base de datos
bun run db:test
```

---

## 📦 Scripts de Preview

```bash
# Preview del build de producción (frontend)
bun run preview:front
# Alias
bun run serve:front
```

---

## 📋 Resumen de Comandos Comunes

| Acción | Comando |
|--------|---------|
| Desarrollo frontend | `bun run front` |
| Desarrollo backend | `bun run back:dev` |
| Desarrollo completo | 2 terminales: `bun run front` + `bun run back:dev` |
| Ejecutar tests | `bun run test` |
| Build producción | `bun run build:all` |
| Lint todo | `bun run lint` |
| Health check | `bun run health` |

---

## 🔧 Configuración

### Puertos por Defecto

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000

### Variables de Entorno

Asegúrate de tener configurado:
- `.env` en la raíz
- Variables de Supabase configuradas

---

## 💡 Tips

### Desarrollo Local Completo

Para trabajar en desarrollo local necesitas 2 terminales:

```bash
# Terminal 1 - Backend
bun run back:dev

# Terminal 2 - Frontend
bun run front
```

### Pre-Deploy Checklist

```bash
# 1. Lint
bun run lint

# 2. Tests
bun run test

# 3. Build
bun run build:all

# 4. Health check
bun run health
```

### Debug Rápido

```bash
# Verificar backend está corriendo
bun run health

# Verificar conexión a BD
bun run db:test

# Ver logs de tests
bun run test:watch
```

---

## 🆘 Troubleshooting

### "Cannot find module"
```bash
# Reinstalar dependencias
bun install
```

### "Port already in use"
```bash
# Frontend (3000) o Backend (4000) ya están corriendo
# Detén el proceso anterior o cambia el puerto en .env
```

### Tests fallan
```bash
# Asegúrate que el backend esté corriendo
bun run back:dev

# Luego ejecuta tests
bun run test
```

---

_Última actualización: 2026-01-22_
