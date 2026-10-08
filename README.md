# KnowledgeSpace — Frontend

Plataforma de Conocimiento Empresarial IA. SPA Angular 21 con diseño **Deep Blue Premium**.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Angular 21 (standalone components, signals) |
| UI Components | PrimeNG 21 (sin preset de tema) |
| Iconos | Material Symbols — Outlined & Rounded (Google Fonts) |
| Tipografía | Inter (Google Fonts, 300–700) |
| Estilos | SCSS — sistema de tokens en tres capas |
| Formatter | Prettier (`printWidth: 100`, `singleQuote: true`) |
| TypeScript | ES2022, strict mode completo |

---

## Comandos

```bash
npm start                # Local   → http://localhost:4200 (environment.ts)
npm run start:dev        # Dev     → api-dev.example.com
npm run start:qa         # QA      → api-qa.example.com
npm run start:pdn        # Prod    → api.example.com

npm run build            # Build producción → dist/
npm run build:dev        # Build development (source maps)
npm run build:qa         # Build QA (optimizado)
npm run build:pdn        # Build producción (alias explícito)
```

**Generadores:**
```bash
npx ng generate component features/<módulo>/<nombre>
npx ng generate service core/services/<nombre>
npx ng generate guard core/guards/<nombre>
```

---

## Arquitectura

### Estructura de carpetas (objetivo)

```
src/
├── app/
│   ├── core/                  # Servicios singleton, guards, interceptors, modelos
│   │   ├── services/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── models/
│   ├── features/              # Módulos de funcionalidad (lazy-loaded)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── chat/
│   │   ├── documents/
│   │   ├── assistants/
│   │   ├── categories/
│   │   ├── tags/
│   │   ├── companies/
│   │   ├── users/
│   │   ├── notifications/
│   │   ├── knowledge-gaps/
│   │   └── feedback/
│   ├── shared/                # Componentes y layouts reutilizables
│   │   ├── components/        # header, empty-state, toast-host
│   │   └── layouts/           # dashboard-layout
│   ├── app.config.ts          # Providers globales (router, HTTP, etc.)
│   ├── app.routes.ts          # Rutas raíz con lazy loading
│   ├── app.ts                 # Root component
│   └── app.html
├── styles/
│   └── core/                  # Sistema de tokens SCSS (ver abajo)
├── assets/
│   ├── icons/                 # SVGs personalizados
│   └── images/
├── styles.scss                # Punto de entrada global de estilos
└── index.html                 # Carga de fuentes (Inter + Material Symbols)
```

### Decisiones de arquitectura Angular

- **Standalone components** — sin NgModules. Cada componente declara sus propias dependencias en `imports[]`.
- **Signals** — estado reactivo con `signal()`, `computed()` y `effect()`. Evitar `BehaviorSubject` para estado local.
- **Lazy loading** — todas las rutas de features se cargan con `loadComponent()` o `loadChildren()`.
- **Providers en `app.config.ts`** — `provideRouter()`, `provideHttpClient()`, `provideAnimationsAsync()` y cualquier proveedor global van aquí, nunca en el componente raíz.

---

## Sistema de estilos (Deep Blue Premium)

### Tres capas SCSS

```
src/styles/core/
├── _colors.scss      ← Paleta cruda — NUNCA importar en componentes
├── _variables.scss   ← Tokens semánticos — única fuente para componentes
└── _mixins.scss      ← Helpers de layout, motion, formularios, scrollbar
```

**Regla de importación en componentes:**
```scss
// ✅ Correcto
@use 'styles/core/variables' as *;
@use 'styles/core/mixins'    as *;

// ❌ Incorrecto — no importar la paleta cruda
@use 'styles/core/colors' as *;
```

### Tokens clave

| Rol | Token SCSS | Valor |
|---|---|---|
| Color primario | `$color-primary` | `#2563EB` |
| Hover primario | `$color-primary-hover` | `#1D4ED8` |
| Fondo app | `$bg-app` | `#F8FAFC` |
| Fondo tarjeta | `$bg-card` | `#FFFFFF` |
| Sidebar bg | `$sidebar-bg` | `#0F172A` |
| Texto título | `$font-title` | `#1E293B` |
| Texto cuerpo | `$font-body` | `#57657A` |
| Texto muted | `$font-muted` | `#94A3B8` |
| Borde layout | `$border-flat` | `#E2E8F0` |

### CSS Custom Properties

Todos los tokens están disponibles también como variables CSS desde `:root` para uso en estilos inline o JS:

```css
var(--color-primary)
var(--bg-app)
var(--font-body)
var(--shadow-md)
var(--radius-lg)
var(--sp-4)         /* 16px */
var(--motion-base)
```

### Mixins de uso frecuente

```scss
@include flex-center;
@include flex-between-center;
@include flex-col(16px);
@include card-surface;         // fondo blanco + borde + radius
@include card-elevated;        // card-surface + sombra
@include field-base;           // input estilizado del sistema
@include btn-base;             // base de botones
@include scrollbar-slim;       // scrollbar de 4px
@include text-ellipsis;
@include transition-fast(background-color, color);
@include focus-ring;
@include badge-style($bg, $text);
```

---

## Iconos

Se usan **Material Symbols** exclusivamente (no PrimeIcons).

```html
<!-- Outlined (por defecto) -->
<span class="material-symbols-outlined">home</span>

<!-- Rounded -->
<span class="material-symbols-rounded icon-lg">settings</span>
```

| Clase | Tamaño |
|---|---|
| `.icon-xs` | 16px |
| `.icon-sm` | 18px |
| `.icon-md` | 20px |
| `.icon-lg` | 24px (por defecto) |
| `.icon-xl` | 32px |
| `.icon-2xl` | 40px |

---

## Componentes PrimeNG

PrimeNG 21 se usa **sin preset de tema**. Los estilos base de componentes comunes (botones, toast, tooltips) están sobreescritos en `src/styles.scss` usando los tokens del sistema.

Al agregar un nuevo componente PrimeNG que requiera estilos globales (p.ej. overlays que se adjuntan al `body`), los overrides deben ir en `src/styles.scss`, no en el SCSS del componente.

---

## TypeScript

Modo strict completo activo:

```json
"strict": true,
"noImplicitOverride": true,
"noImplicitReturns": true,
"noPropertyAccessFromIndexSignature": true,
"strictTemplates": true,
"strictInjectionParameters": true
```

Target `ES2022`, `isolatedModules: true`. Los componentes generados usarán SCSS (`@schematics/angular:component > style: scss`).

---

## Entornos

| Entorno | Script serve | Script build | `environment.ts` activo | `production` flag |
|---|---|---|---|---|
| **local** | `npm start` | `npm run build:dev` | `environment.ts` → `127.0.0.1:8002` | `false` |
| **dev** | `npm run start:dev` | `npm run build:dev` | `environment.development.ts` | `false` |
| **qa** | `npm run start:qa` | `npm run build:qa` | `environment.qa.ts` | `false` |
| **pdn** | `npm run start:pdn` | `npm run build:pdn` | `environment.production.ts` | `true` |

Los archivos viven en `src/environments/`. El consumo en código es siempre desde `environment.ts`:

```typescript
import { environment } from '../environments/environment';

// En local apunta a localhost:8080, en pdn al backend configurado en environment.production.ts
const apiUrl = environment.apiUrl;
```

Angular sustituye automáticamente el archivo según la configuración de build mediante `fileReplacements` en `angular.json`.

---

## Documentación interna

- [`doc/CLAUDE.md`](doc/CLAUDE.md) — guía para Claude Code al trabajar en este repositorio
- [`ALCANCE_TFM.md`](ALCANCE_TFM.md) — alcance académico de esta entrega (TFM)
