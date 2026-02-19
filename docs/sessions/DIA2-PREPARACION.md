# 🚀 DÍA 2 - Preparación y Guía de Inicio

**Objetivo**: Frontend Signup Integration + E2E Tests
**Duración Estimada**: 4-6 horas
**Prerequisitos**: DÍA 1 completado ✅

---

## 📋 Estado Actual (DÍA 1 Completado)

### ✅ Lo que YA está listo
- ✅ Signup endpoint funcional (`POST /api/auth/complete-signup`)
- ✅ Constraint fix aplicado en base de datos
- ✅ Winston logger configurado
- ✅ Transaction Manager implementado (opcional)
- ✅ Tests de backend pasando
- ✅ Documentación completa del backend

### ⏭️ Lo que FALTA (DÍA 2)
- ❌ Frontend signup no integrado con nuevo endpoint
- ❌ Tests E2E no implementados
- ❌ Validaciones frontend incompletas
- ❌ Error handling en UI necesita mejoras
- ❌ No hay tests automatizados de UI

---

## 🎯 Objetivos del DÍA 2

### Objetivo Principal
Integrar el signup refactorizado del backend con el frontend y crear tests E2E completos.

### Objetivos Específicos
1. **Actualizar componente de registro** para usar nuevo endpoint
2. **Mejorar validaciones** en frontend
3. **Implementar error handling** user-friendly
4. **Crear tests E2E** con Playwright
5. **Verificar flujo completo** de signup

### Criterios de Éxito
- ✅ Usuario puede registrarse desde el frontend
- ✅ Organización se crea automáticamente
- ✅ Usuario es redirigido al dashboard
- ✅ Tokens se guardan correctamente
- ✅ Tests E2E cubren casos happy path y errores
- ✅ UI muestra errores claramente

---

## 📂 Archivos a Modificar

### Frontend

#### 1. Componente de Registro
**Ubicación esperada**:
- `/frontend/src/pages/Register.tsx` o
- `/frontend/src/pages/Auth/Register.tsx` o
- `/frontend/src/components/auth/RegisterForm.tsx`

**Acción**: Actualizar para usar `/api/auth/complete-signup`

#### 2. API Client
**Ubicación esperada**:
- `/frontend/src/services/api/authService.ts` o
- `/frontend/src/services/auth.ts`

**Acción**: Agregar método `completeSignup()`

#### 3. Auth Context/Store
**Ubicación esperada**:
- `/frontend/src/contexts/AuthContext.tsx` o
- `/frontend/src/store/authStore.ts`

**Acción**: Manejar signup response y guardar tokens

#### 4. Organization Context
**Ubicación esperada**:
- `/frontend/src/contexts/OrganizationContext.tsx`

**Acción**: Inicializar con organización creada en signup

### Tests

#### 5. E2E Tests (Nuevo)
**Ubicación sugerida**:
- `/frontend/tests/e2e/signup.spec.ts`
- `/frontend/tests/e2e/auth-flow.spec.ts`

**Framework**: Playwright (recomendado) o Cypress

---

## 🔍 Investigación Previa Necesaria

### Paso 1: Encontrar el componente de registro actual

```bash
# Buscar componente de registro
cd /Users/santiagoalaniz/.claude-worktrees/SaasRestaurant/beautiful-ramanujan
find frontend/src -type f -name "*[Rr]egister*"
find frontend/src -type f -name "*[Ss]ignup*"

# Buscar en el código
grep -r "register" frontend/src/pages --include="*.tsx" --include="*.ts"
grep -r "signup" frontend/src/pages --include="*.tsx" --include="*.ts"
```

### Paso 2: Verificar estructura de rutas

```bash
# Ver estructura de páginas
ls -la frontend/src/pages/

# Ver routing
cat frontend/src/App.tsx | grep -A 5 -i "route"
```

### Paso 3: Identificar API service actual

```bash
# Buscar servicios de auth
find frontend/src/services -name "*auth*"
cat frontend/src/services/api/authService.ts
```

### Paso 4: Verificar configuración de tests

```bash
# Ver si hay tests configurados
ls -la frontend/tests/ 2>/dev/null || echo "No tests directory"
cat frontend/package.json | grep -A 5 "test"
cat frontend/playwright.config.ts 2>/dev/null || echo "No Playwright config"
cat frontend/cypress.config.ts 2>/dev/null || echo "No Cypress config"
```

---

## 📝 Tareas del DÍA 2 (Detalladas)

### **DÍA 2.1: Actualizar Componente Register** (90 min)

#### Subtareas:
1. [ ] **Investigar componente actual** (15 min)
   - Ubicar archivo de registro
   - Entender estructura actual
   - Identificar endpoint usado actualmente
   - Ver qué datos se envían

2. [ ] **Actualizar API service** (20 min)
   - Crear/actualizar método `completeSignup()`
   - Usar endpoint correcto: `POST /api/auth/complete-signup`
   - Definir TypeScript types para request/response
   - Agregar error handling

3. [ ] **Modificar componente de registro** (30 min)
   - Agregar campo opcional `organization_name`
   - Usar nuevo método de API
   - Manejar response correctamente
   - Guardar tokens en localStorage/context

4. [ ] **Actualizar validaciones** (15 min)
   - Validar email format
   - Validar password strength (min 6 chars)
   - Validar nombre requerido
   - Agregar feedback visual

5. [ ] **Testing manual** (10 min)
   - Probar registro exitoso
   - Verificar redirección
   - Confirmar tokens guardados
   - Verificar organización creada

#### Ejemplo de Código

**authService.ts**:
```typescript
export interface SignupData {
  user_id?: string;  // Optional - can be generated
  email: string;
  name: string;
  password: string;
  organization_name?: string;
}

export interface SignupResponse {
  success: boolean;
  data: {
    user: {
      user_id: string;
      email: string;
      name: string;
      organization_id: string;
    };
    organization: {
      organization_id: string;
      name: string;
      slug: string;
      owner_user_id: string;
    };
    tokens: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };
    message: string;
  };
}

export const authService = {
  async signup(data: SignupData): Promise<SignupResponse> {
    const response = await apiClient.post('/auth/complete-signup', {
      user_id: crypto.randomUUID(), // Generate UUID
      email: data.email,
      name: data.name,
      password: data.password,
      organization_name: data.organization_name || `${data.name}'s Organization`
    });

    return response.data;
  }
};
```

**Register.tsx**:
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    const response = await authService.signup({
      email,
      name,
      password,
      organization_name: organizationName
    });

    // Save tokens
    localStorage.setItem('access_token', response.data.tokens.access_token);
    localStorage.setItem('refresh_token', response.data.tokens.refresh_token);

    // Update auth context
    setUser(response.data.user);
    setOrganization(response.data.organization);

    // Redirect to dashboard
    navigate('/dashboard');
  } catch (error) {
    setError(error.response?.data?.message || 'Registration failed');
  } finally {
    setLoading(false);
  }
};
```

---

### **DÍA 2.2: Tests E2E con Playwright** (120 min)

#### Subtareas:
1. [ ] **Setup Playwright** (20 min)
   - Instalar Playwright: `npm init playwright@latest`
   - Configurar `playwright.config.ts`
   - Crear estructura de tests
   - Agregar scripts a package.json

2. [ ] **Test: Signup Happy Path** (30 min)
   - Navegar a página de registro
   - Llenar formulario
   - Submit
   - Verificar redirección a dashboard
   - Verificar tokens en localStorage
   - Verificar datos de usuario en UI

3. [ ] **Test: Signup con errores** (30 min)
   - Email inválido → error visible
   - Password muy corto → error visible
   - Email duplicado → error apropiado
   - Campos vacíos → validación

4. [ ] **Test: Flujo completo** (20 min)
   - Signup → Dashboard → Logout → Login
   - Verificar persistencia de sesión
   - Verificar organización activa

5. [ ] **Ejecutar y verificar tests** (20 min)
   - Correr tests en modo headless
   - Correr tests con UI (debug)
   - Fix flaky tests
   - Verificar que todos pasan

#### Ejemplo de Test

**tests/e2e/signup.spec.ts**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Signup Flow', () => {
  test('should successfully register a new user', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/register');

    // Fill form
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.fill('[name="organizationName"]', 'Test Organization');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/dashboard');

    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify tokens in localStorage
    const accessToken = await page.evaluate(() =>
      localStorage.getItem('access_token')
    );
    expect(accessToken).toBeTruthy();

    // Verify user name is displayed
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', 'TestPassword123!');

    await page.click('button[type="submit"]');

    // Error message should be visible
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
  });

  test('should show error for duplicate email', async ({ page }) => {
    // First signup
    await page.goto('/register');
    const email = `duplicate-${Date.now()}@example.com`;

    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('button[aria-label="Logout"]');

    // Try to signup again with same email
    await page.goto('/register');
    await page.fill('[name="name"]', 'Test User 2');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Should show duplicate error
    await expect(page.locator('text=/already exists/i')).toBeVisible();
  });
});
```

---

### **DÍA 2.3: Testing Manual Exhaustivo** (60 min)

#### Checklist de Testing Manual:

**Casos Happy Path**:
- [ ] Registro con todos los campos
- [ ] Registro sin organization_name (usa default)
- [ ] Redirección correcta al dashboard
- [ ] Tokens guardados correctamente
- [ ] Organización visible en UI
- [ ] Navbar muestra nombre de usuario

**Casos de Error**:
- [ ] Email inválido muestra error
- [ ] Password muy corto muestra error
- [ ] Campos requeridos vacíos
- [ ] Email duplicado muestra error apropiado
- [ ] Error de red muestra mensaje claro
- [ ] Backend down muestra error recovery

**UX Testing**:
- [ ] Loading state durante submit
- [ ] Botón deshabilitado durante loading
- [ ] Mensajes de error claros y user-friendly
- [ ] Validación en tiempo real (opcional)
- [ ] Mobile responsive
- [ ] Keyboard navigation funciona

**Edge Cases**:
- [ ] Nombres con caracteres especiales
- [ ] Emails muy largos
- [ ] Organization names con emojis/unicode
- [ ] Copy/paste en campos
- [ ] Browser back button
- [ ] Refresh durante signup

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: CORS errors
**Síntoma**: Error en console sobre CORS
**Solución**:
```javascript
// backend/server.js - Ya debería estar configurado
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Problema 2: 401 Unauthorized
**Síntoma**: Signup falla con 401
**Causa**: Backend usa autenticación en signup endpoint
**Solución**: Verificar que endpoint NO requiere auth

### Problema 3: Organization context no inicializa
**Síntoma**: Organización no aparece en UI
**Solución**: Actualizar OrganizationContext después de signup
```typescript
setCurrentOrganization(response.data.organization);
```

### Problema 4: Tokens no persisten
**Síntoma**: Refresh pierde sesión
**Solución**: Guardar refresh_token y implementar token refresh

### Problema 5: Tests flaky
**Síntoma**: Tests pasan a veces, fallan otras veces
**Solución**:
- Usar `waitForURL` en vez de `timeout`
- Usar data-testid en vez de text selectors
- Limpiar localStorage entre tests

---

## 📊 Criterios de Aceptación DÍA 2

### Funcionalidad ✅
- [ ] Usuario puede registrarse desde frontend
- [ ] Organización se crea automáticamente
- [ ] Tokens se guardan en localStorage
- [ ] Usuario es redirigido al dashboard
- [ ] Organización aparece en navbar/context
- [ ] Logout funciona correctamente

### Tests ✅
- [ ] Mínimo 5 tests E2E implementados
- [ ] Tests cubren happy path
- [ ] Tests cubren casos de error
- [ ] Tests pasan en CI (opcional)
- [ ] Coverage >70% de signup flow

### UX ✅
- [ ] Loading states durante signup
- [ ] Errores mostrados claramente
- [ ] Validaciones en tiempo real
- [ ] Mobile responsive
- [ ] Accesibilidad básica (ARIA labels)

### Documentación ✅
- [ ] Tests documentados (README en tests/)
- [ ] Casos de prueba listados
- [ ] Screenshots de errores (opcional)
- [ ] Video demo del flujo (opcional)

---

## 🚀 Quick Start para DÍA 2

### Paso 1: Verificar backend corriendo
```bash
cd backend
npm run dev
# Verificar en http://localhost:4000/health
```

### Paso 2: Verificar frontend corriendo
```bash
cd frontend
npm run dev
# Verificar en http://localhost:3000
```

### Paso 3: Investigar estructura actual
```bash
# Ver componentes de auth
ls -la frontend/src/pages/
ls -la frontend/src/components/auth/

# Ver servicios
ls -la frontend/src/services/
```

### Paso 4: Empezar con cambios pequeños
1. Primero actualizar API service
2. Luego actualizar componente de registro
3. Testear manualmente
4. Agregar tests E2E
5. Refinar UX

---

## 📚 Recursos Útiles

### Backend Endpoint
- **URL**: `POST http://localhost:4000/api/auth/complete-signup`
- **Doc**: Ver `DIA1.2-REFACTOR-CHANGES.md`
- **Test**: `backend/test-signup-endpoint.js`

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Routing**: React Router (probablemente)
- **State**: TanStack Query + Context
- **Styles**: Tailwind CSS v4

### Testing
- **E2E**: Playwright (recomendado) o Cypress
- **Unit**: Vitest (probablemente)
- **Integration**: React Testing Library

### Documentación DÍA 1
- `DIA1-COMPLETADO.md` - Resumen completo
- `DIA1-RESUMEN-EJECUTIVO.md` - Executive summary
- `DIA1.2-REFACTOR-CHANGES.md` - Cambios del endpoint

---

## ⏭️ Próximos Pasos Después de DÍA 2

Una vez completado DÍA 2, continuar con:
- **DÍA 3**: Orders Testing & Validación
- **DÍA 4**: Orders Frontend + UX
- **DÍA 5**: Monitoring Setup (Sentry + Logging)

---

## 🆘 Si Te Atascas

### Opción 1: Revisar documentación DÍA 1
```bash
cat DIA1-COMPLETADO.md
cat DIA1.2-REFACTOR-CHANGES.md
```

### Opción 2: Testear backend directamente
```bash
node backend/test-signup-endpoint.js
```

### Opción 3: Verificar logs
```bash
tail -f backend/logs/combined.log
```

### Opción 4: Rollback si es necesario
```bash
# Backend
cp backend/routes/auth.backup.js backend/routes/auth.js
```

---

## 📝 Checklist Pre-Inicio DÍA 2

Antes de empezar DÍA 2, verificar:
- [ ] DÍA 1 completado (ver `DIA1-COMPLETADO.md`)
- [ ] Backend corriendo en puerto 4000
- [ ] Frontend corriendo en puerto 3000
- [ ] Test de signup backend passing
- [ ] Base de datos accessible
- [ ] Node modules instalados (frontend + backend)
- [ ] Git worktree limpio (no cambios sin commit)

---

**Estado**: 📝 Lista para DÍA 2
**Próxima sesión**: Frontend Integration + E2E Tests
**Duración estimada**: 4-6 horas
**Última actualización**: 2025-12-04 17:10

---

¡Buena suerte con el DÍA 2! 🚀
