# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

KnowledgeSpace — Plataforma de Conocimiento Empresarial IA. Frontend Angular 21 SPA con PrimeNG 21 y Material Symbols.

## Commands

```bash
# Serve por entorno
npm start              # local   → localhost:8080  (environment.ts sin reemplazo)
npm run start:dev      # dev     → api-dev.example.com
npm run start:qa       # qa      → api-qa.example.com
npm run start:pdn      # pdn     → api.example.com

# Build por entorno
npm run build          # producción
npm run build:dev      # development (source maps)
npm run build:qa       # qa (optimizado, sin source maps)
npm run build:pdn      # producción (alias explícito)

# Generadores
npx ng generate component features/my-feature/my-component
npx ng generate service core/services/my-service
```

**Consumo del entorno en código** — importar siempre desde `environment.ts`:
```typescript
import { environment } from '../environments/environment';
// Angular reemplaza el archivo según --configuration en build time
```

## Architecture

### Stack
- **Angular 21** — standalone components (no NgModules), signals-first
- **PrimeNG 21** — UI components, no preset theme (styles overridden globally)
- **Material Symbols** — icons loaded via Google Fonts (Outlined + Rounded variants)
- **Inter** — typography via Google Fonts
- **Vitest** — unit test runner (configured via `@angular/build:unit-test`)

### Style System (`src/styles/`)

Three-layer SCSS architecture — components must `@use` from the core, never from `styles.scss`:

```
src/styles/core/
  _colors.scss      ← raw palette only (never use directly in components)
  _variables.scss   ← semantic tokens mapped from colors (the ONLY import for components)
  _mixins.scss      ← layout, motion, button, card, field, scrollbar helpers
```

**Import pattern in component SCSS:**
```scss
@use 'styles/core/variables' as *;
@use 'styles/core/mixins'    as *;
// Never @use 'styles/core/colors' directly in components
```

**Global entry point** (`src/styles.scss`) handles: CSS reset, `:root` custom properties (`var(--color-primary)` etc.), Material Symbols class helpers, PrimeNG button overrides, toast and tooltip global styles.

### Design Tokens (Deep Blue Premium)

- Primary: `$color-primary` → `#2563EB` (navy-500)
- Background: `$bg-app` → `#F8FAFC` (slate-50)
- Sidebar: dark shell (`$navy-900` / `#0F172A`)
- Typography: 4-level hierarchy — title (`$slate-800`), body (`#57657A`), muted (`$slate-400`), on-primary (`#FFF`)
- Spacing base: 4px (`$sp-1` … `$sp-16`)

### Icons

Use Material Symbols, not PrimeIcons. Class names: `.material-symbols-outlined` or `.material-symbols-rounded`. Size helpers: `.icon-xs` (16px) → `.icon-2xl` (40px).

```html
<span class="material-symbols-outlined icon-md">home</span>
```

### TypeScript

Strict mode enabled with `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `strictTemplates` and `strictInjectionParameters`. Target ES2022, `isolatedModules: true`.

### Formatting

Prettier — `printWidth: 100`, `singleQuote: true`, Angular parser for HTML files.

### Asset directories

- `src/assets/icons/` — custom SVG/icon assets
- `src/assets/images/` — image assets
- `public/` — static files served at root (e.g. `favicon.ico`)

## Documentation Rules (OBLIGATORIO al final de cada sesión)

Al terminar cualquier sesión de trabajo en este repositorio, Claude **siempre** debe actualizar estos tres archivos:

### 1. `doc/trabajo/BITACORA.md`

Añadir una entrada nueva al inicio (orden descendente — lo más reciente arriba) con la fecha de hoy. Seguir el formato establecido:

```
## AAAA-MM-DD

**Hecho:**
- ...

**Decisiones / notas:**
- ...

**Pendiente para después:**
- ...

---
```

### 2. `doc/trabajo/FEATURES.md`

- Si se implementó un módulo nuevo: añadir sección numerada con descripción completa de las funcionalidades.
- Si se completó algo que estaba en "Pendientes": mover de la lista de pendientes a la sección correspondiente o actualizar el texto.
- Actualizar la fecha en el encabezado del documento.

### 3. `BACKLOG_FRONTEND.md`

- Si un módulo pasó a estado Completo: cambiar `**Estado:** Pendiente` → `**Estado:** Completo ✅` y marcar cada tarea con ✅.
- Si se agregaron tareas nuevas: añadirlas con ⬜.
- Si se detectaron pendientes nuevos: agregarlos con ⬜.
