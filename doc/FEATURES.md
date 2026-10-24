# FEATURES.md

Documento de funcionalidades implementadas en KnowledgeSpace Frontend, a la fecha del 2026-08-16.

## Descripción general del producto

**KnowledgeSpace** es una plataforma SaaS B2B de **Conocimiento Empresarial con IA** (basada en RAG — Retrieval Augmented Generation). El flujo de valor central es:

1. Una empresa cliente sube sus documentos (PDF, DOCX, TXT) a la plataforma.
2. Los documentos se procesan e indexan de forma asíncrona en el backend.
3. Se configuran **Asistentes de IA** (agentes conversacionales) sobre ese conocimiento indexado, cada uno con su propio prompt de sistema, modelo LLM y personalidad.
4. El equipo de la empresa consulta ese conocimiento desde el **Chat IA** interno, con respuestas generadas por RAG y trazabilidad de fuentes.

> En el producto comercial los asistentes también se exponen al público mediante
> widgets de chat embebibles. Esa parte queda fuera de esta entrega académica
> (ver `ALCANCE_TFM.md` y la sección 9).

Es una plataforma **multi-tenant** (multiempresa) con roles jerárquicos (`superadmin` > `admin` > `user`) y planes de suscripción con límites (usuarios, documentos, mensajes mensuales).

### Stack técnico

- **Angular 21** — standalone components (sin NgModules), enfoque signals-first.
- **PrimeNG 21** — componentes UI, sin tema preestablecido (estilos sobreescritos globalmente).
- **Material Symbols** + tipografía **Inter** (Google Fonts).
- **RxJS 7.8**, **TypeScript 5.9** en modo estricto.
- **Prettier** para formateo. `vitest` figura como dependencia de desarrollo,
  pero **no hay ningún archivo `.spec.ts` en el repositorio**: no existe
  cobertura de tests. Ver `ALCANCE_TFM.md`.
- Sistema de diseño propio "Deep Blue Premium" (`#2563EB` primario, sidebar oscuro `#0F172A`), arquitectura SCSS en 3 capas.
- Multi-entorno: local, development, qa, production (cada uno con su propio `apiUrl`).

### Patrón arquitectónico común

La mayoría de los módulos de negocio siguen la misma receta:
- `CrudService<T>` — clase abstracta genérica (`list`, `getById`, `create`, `update`, `remove`) sobre un `ApiService` central que envuelve `HttpClient`.
- Página `*-list` — tabla con búsqueda debounced, filtros por signals/computed, paginación en cliente, modal embebido de crear/editar y confirmación de borrado.
- Página `*-form` — formulario reactivo reutilizado en modo crear/editar, comunicado con la lista vía eventos `saved` / `cancel`.

---

## Módulos funcionales

### 1. Autenticación (`/auth`)

Login de usuarios con JWT. No existe registro público (el botón "crear cuenta" navega a una ruta `/auth/register` aún no implementada).

- **Login**: formulario reactivo (email + contraseña mín. 8 caracteres). Al enviar, obtiene el `access_token`, luego consulta los datos del usuario autenticado y navega al dashboard.
- Manejo de estados de carga y error ("Email o contraseña incorrectos").
- **Backend consumido**: `POST /v1/auth/login` (OAuth2 form-data), `GET /v1/auth/me`.

### 2. Dashboard (`/dashboard`)

Página de inicio con tres métricas agregadas de la empresa: documentos
(totales / completados / en proceso), usuarios totales y mensajes totales.
Incluye un estado vacío/onboarding cuando la empresa aún no tiene documentos
cargados.

Se alimenta de `GET /v1/dashboard/metrics`, que agrega las cifras filtrando por
el `company_id` del usuario autenticado. "En proceso" agrupa los documentos en `pending` y
`processing`; el total incluye los `failed`, para que cuadre con lo que se ve
en `/documents`. Los mensajes se cuentan por join con `conversations`, que es
lo que garantiza el aislamiento multi-tenant, porque la tabla `messages` no
tiene `company_id`.

**No muestra conversaciones ni actividad reciente**, y es deliberado: abrir el
chat crea una conversación aunque no se pregunte nada, así que el recuento no
medía uso real y el listado de actividad se llenaba de conversaciones vacías.
Por el mismo motivo, el paso "Abre el Chat IA" del onboarding se marca como
completado según los mensajes, no según las conversaciones.

### 3. Empresas (`/companies`)

Gestión multi-tenant de las empresas clientes del SaaS (visibilidad orientada a `superadmin`).

- Listado con búsqueda, filtros por plan (basic/pro/enterprise) y estado (activa/inactiva), paginación.
- Alta y edición vía modal embebido.
- Campos de negocio: nombre, email, teléfono, dirección, plan, `max_users`, `max_documents`, `monthly_message_limit`, activo/inactivo.

### 4. Usuarios (`/users`)

Administración de los usuarios dentro de una empresa.

- Listado con búsqueda, filtro por rol (superadmin/admin/user) y estado, paginación.
- Alta/edición vía modal.
- **Reseteo de contraseña** desde un modal dedicado.
- Al crear un usuario, se asocia automáticamente a la empresa del usuario logueado.

### 5. Etiquetas — Tags (`/tags`)

Catálogo simple de etiquetas (nombre + color) usadas para clasificar contenido. CRUD completo vía modal.

### 6. Categorías (`/categories`)

Catálogo de categorías para organizar documentos: nombre, descripción, color, icono, orden y estado activo/inactivo. Listado con búsqueda, filtro por estado, paginación, y CRUD vía modal.

### 7. Documentos (`/documents`)

Núcleo de la ingesta de conocimiento: subida, procesamiento asíncrono, categorización, descarga y borrado de los documentos que alimentan a los asistentes.

- **Subida** (`/documents/upload`): drag & drop o selector, multi-archivo, valida tipo (PDF/DOCX/TXT) y tamaño máximo (10 MB), permite asociar categoría y asistente antes de subir, muestra barra de progreso individual y global.
- **Listado**: búsqueda por nombre, filtro por estado (`pending` / `processing` / `completed` / `failed`) y categoría, cambio de categoría inline con actualización optimista, descarga vía URL firmada, reintento de procesamiento fallido, borrado con confirmación.
- **Almacenamiento en S3**: el frontend no sube el binario directamente a S3 ni conoce el bucket; el archivo se envía al backend (`multipart/form-data`) y es el backend quien lo persiste en S3. El frontend solo:
  - Sube el `File` con `POST /v1/documents/upload` (campos `file`, `category_id`, `assistant_id`), reportando progreso real vía `HttpEvent`/`reportProgress`.
  - Para descargar, pide `GET /v1/documents/:id/download`, que responde `{ url, filename }` — una **URL prefirmada de S3 con expiración corta** (no una URL pública fija). El componente crea un `<a>` temporal con `href = url` y `download = filename` y dispara el click, delegando la descarga real al navegador contra S3.
  - El modelo `Document` guarda metadatos del archivo (`filename`, `original_filename`, `file_size`, `mime_type`, `page_count`, `chunk_count`) pero nunca la ruta/clave de S3 ni credenciales — esas quedan encapsuladas en el backend.
  - Cada solicitud de descarga genera una nueva URL firmada bajo demanda (botón "descargar" en el listado), no se cachean ni reutilizan enlaces.

### 8. Asistentes de IA (`/assistants`)

El corazón de la propuesta de valor: creación de agentes de IA tipo RAG configurables por empresa.

- **Listado**: búsqueda, filtro por estado activo/inactivo, paginación.
- **Formulario** (crear/editar): nombre, descripción, prompt de sistema, selección de modelo (`gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`), avatar (selector de emoji). La temperatura se muestra bloqueada en 0: no es configurable, y el backend usa siempre `RAG_TEMPERATURA`.
- **Detalle** (`/assistants/:id`), con pestañas:
  - *Documentos*: subida drag & drop de archivos asociados directamente al asistente, con validación, progreso, **polling automático cada 3s** del estado de procesamiento hasta completar o fallar, reintento, descarga y borrado.
  - *Info*: datos generales del asistente.

### 9. Widgets de chat embebibles — fuera de esta entrega

El módulo de gestión de widgets (`/widgets`) **no forma parte de la entrega
académica**: su interfaz, sus rutas y sus endpoints REST se retiraron de este
repositorio. Ver `ALCANCE_TFM.md` para el criterio.

Lo que sí permanece es el **modelo de datos**: la tabla `widgets`, la relación
`Assistant.widgets` y los campos `widget_id` / `channel` en `feedback` y
`knowledge_gaps`. No es residuo: el canal de origen (`widget` | `chat`) es lo
que permite al módulo de Preguntas sin respuesta (sección 13) ponderar de forma
distinta las preguntas llegadas desde un sitio público.

### 10. Chat IA (`/chat`)

Interfaz conversacional interna: el equipo de la empresa consulta su propia
documentación indexada en lenguaje natural, con respuestas generadas por RAG y
trazabilidad de fuentes.

- **Chat Shell** (`/chat`): layout de dos columnas (lista de conversaciones + panel principal). Pantalla de bienvenida con accesos rápidos cuando no hay una conversación activa.
- **Chat List**: historial de conversaciones del usuario, resaltando la conversación activa, con acceso directo al dashboard y creación de nuevas conversaciones.
- **Chat Detail** (`/chat/:id`): burbujas de mensaje usuario/asistente con formato markdown básico (negrita, cursiva, código), indicador de "escribiendo…", selector de **Asistente** activo cuando la empresa tiene más de uno configurado, sugerencias de inicio rápido en el estado vacío.
  - **Fuentes citadas**: cada respuesta lista los documentos consultados con su score de relevancia, permite previsualizar el fragmento exacto usado por el modelo y descargar el documento original (vía URL firmada de S3).
  - **Feedback**: pulgar arriba/abajo por respuesta, con panel de comentario opcional al marcar una respuesta como mejorable (`POST /v1/feedback/`); el estado de feedback ya emitido se restaura al recargar la conversación.
  - **Búsqueda** dentro de los mensajes de la conversación (con resaltado de coincidencias) y **paginación** de mensajes largos.
  - Sin streaming: la respuesta llega completa en una sola petición a `POST /v1/chat/message` (no hay SSE/WebSocket token-por-token).
- **Chat flotante**: además de la página completa, un botón "Chat IA" en el header (visible en cualquier módulo) abre el mismo `ChatDetailComponent` como **drawer lateral** superpuesto (`UiStatusService` centraliza el estado abierto/cerrado), para consultar el asistente sin abandonar la pantalla actual.
- **Backend consumido**: `POST /v1/chat/message`, `GET/POST /v1/conversations`, `GET /v1/messages`, `GET /v1/assistants` (filtrado a activos en cliente), `GET /v1/documents/:id/download`, `POST /v1/feedback/`, `GET /v1/feedback/me`.

### 11. Feedback IA — Analytics (`/feedback`)

Panel de análisis de la calidad de las respuestas del asistente: cómo califican los usuarios las respuestas, distribución, agrupación semántica en temas y gestión de quejas convertidas en preguntas sin respuesta. Solo visible para roles `admin` / `superadmin`. Rediseñado (handoff v2) el 2026-08-15 — reemplaza por completo la versión inicial del 2026-08-14.

- **Header**: selector de **período** (Este mes / 90 días / 12 meses), dropdown de asistente (Todos / por asistente, con cierre al clic exterior y `Escape`) y botón "Exportar comentarios" (CSV).
- **KPI cards** (3, antes 4 — se eliminó "Respuestas calificadas"):
  - *Satisfacción*: rating promedio + estrellas + delta vs período anterior + conteo de calificaciones.
  - *Negativas*: conteo de calificaciones de 1 y 2 estrellas en el período.
  - *En seguimiento*: negativas convertidas en pregunta sin respuesta (antes "Con brecha asociada").
  - Skeleton de carga animado mientras llegan las stats.
- **Columna izquierda**: *Distribución* — barras por estrella (1–5) con color por tier (verde ≥4 / ámbar =3 / rojo ≤2), clicable para filtrar la lista derecha (cambia automáticamente el modo de la columna derecha a "Comentarios" si estaba en "Temas").
- **Columna derecha**, con selector de modo (segmentado Comentarios / Temas):
  - *Modo Comentarios*: tarjetas de feedback — identidad del usuario (o "Anónimo · widget" para feedback de widget embebido), estrellas, fecha, asistente, `# conversación`, comentario; pill "Obsoleto" y aviso `stale-notice` cuando la fuente de la respuesta se reindexó después (`status === 'stale'`); bloque de "Respuesta calificada" (con fuentes y score RAG) visible solo si el rating es ≤ 3; barra de acciones ("Ver conversación" → `[routerLink]`, "Enviar a preguntas sin respuesta" si rating ≤ 2, pill de estado o de brecha vinculada "Pregunta #N abierta/resuelta").
  - *Modo Temas*: buscador sobre los temas del período, filas expandibles por tema (nombre, tendencia ↑/↓ vs período anterior, % de las quejas, volumen); al expandir: resumen semántico opcional, comentarios de muestra representativos (`ThemeSample`), acción "Enviar tema a preguntas sin respuesta" (conversión en bloque — backend pendiente) y botón "Ver los N comentarios" (aún no navega).
  - Sin avatar ni chips de temas en la columna izquierda (eliminados en v2); sin gráfico de satisfacción semanal (eliminado del layout, campo `weeks` se conserva en el modelo por compatibilidad pero no se renderiza).
- **Modal "Enviar a preguntas sin respuesta"** (antes "Convertir en brecha"): textarea editable con la pregunta original, pre-rellenada desde el feedback individual o desde el nombre del tema; confirmar llama a `POST /v1/feedback/{id}/convert-gap` → crea `KnowledgeGap` y vincula por FK (la variante de conversión de tema en bloque solo cierra el modal — el endpoint de backend aún no existe).
- **Exportar CSV**: descarga vía `GET /v1/feedback/export?period=...&assistant_id=...` (con `ApiService.getBlob()` para mantener headers de auth).
- **Estado del feedback**: `new` → `reviewed` / `converted` / `dismissed` / `stale` (PATCH al cambiar).
- **Backend consumido**: `GET /v1/feedback/`, `GET /v1/feedback/stats`, `GET /v1/feedback/export`, `POST /v1/feedback/{id}/convert-gap`, `PATCH /v1/feedback/{id}/status`.

### 12. Notificaciones (`/notifications`)

Bandeja de avisos internos de empresa: documentos procesados o fallidos, alertas de presupuesto y preguntas sin respuesta detectadas. Implementado el 2026-08-16 conforme al handoff de diseño (`doc/ia-handoff/design_handoff_notificaciones`).

#### Generación de eventos (backend)

Los eventos se emiten automáticamente desde el router de documentos (`api/app/routers/v1/documents.py`) mediante la función `_notificar_documento()`, que envuelve la creación en un `try/except` para que un fallo de notificación nunca interrumpa el flujo principal:

| Evento | Cuándo se emite | Destinatario |
|---|---|---|
| `document_processed` | Pipeline RAG completado con éxito | Autor del documento |
| `document_failed` | Pipeline RAG falla (extracción, embedding o Pinecone) | Autor del documento |
| `document_deleted` | Un usuario distinto al autor borra el documento | Autor original |

Cada notificación guarda `entity_type = 'document'` y `entity_id = document_id`, lo que permite construir el enlace "Ver documento → `/documents/:id`" en el frontend.

#### Badge en el sidebar

`DashboardLayoutComponent` inyecta `NotificationsService` y llama a `getUnreadCount()` al inicializar, mostrando el contador junto al ítem **Notificaciones** (dentro del grupo **Analytics** en el menú lateral). En modo colapsado aparece como punto azul; en modo expandido como píldora numérica.

#### Página de notificaciones (`NotificationListComponent`)

Diseño high-fidelity conforme al handoff: `max-width: 1000px`, `padding: 28px 26px 44px`, tarjeta contenedora única sin padding con filas que llegan a los bordes.

- **Chips de filtro** (5): Todas · No leídas · Documentos · Presupuesto · Sin respuesta. Los recuentos se calculan sobre el total (no sobre el filtro activo), en tipografía `IBM Plex Mono`. El backend resuelve cada categoría con una cláusula LIKE (`document%`, `budget%`, `knowledge%`) mediante el endpoint `GET /v1/notifications/counts`.
- **Separadores de día** internos a la tarjeta: `Hoy` / `Ayer` / `Anteriores`, fondo `#fbfcfd`, sin recalcular el estado — es derivado de `created_at`.
- **Fila de notificación**: punto de no leída (5 × 5 px, reserva espacio aunque esté leída para evitar salto), icono de tipo (30 × 30 px, radio 8 px, color del tipo al 10% de opacidad), título + píldora de tipo, mensaje, tiempo relativo, enlace de acción específico por tipo.
- **Enlace de acción por tipo**:
  - `document_processed / document_failed / document_uploaded` → "Ver documento" → `/documents/:entity_id`
  - `budget_*` → "Ver costos" → `/dashboard` (hasta que exista el módulo de costos)
  - `knowledge_gap_found` → "Resolver" → `/knowledge-gaps/:entity_id` (ruta pendiente)
  - `knowledge_gap_resolved` → "Revisar" → `/knowledge-gaps/:entity_id` (ruta pendiente)
  - `user_invited / user_joined` → "Ver usuarios" → `/users`
- **Click en fila**: marca como leída (actualización optimista en cliente + `PATCH` al servidor) y navega al destino. No hay botón separado de "marcar como leída".
- **Marcar todas como leídas**: aplica sobre el filtro activo. Si el filtro es "No leídas", la lista queda vacía tras la acción.
- **Paginación**: "Cargar más" al pie de la tarjeta, 25 registros por página. Sin scroll interno (el scroll es el de la página).
- **Skeleton**: 7 filas animadas (`@keyframes sk-pulse`) con la misma forma que una fila real, dentro de la tarjeta.
- **Estado vacío / error**: dentro de la tarjeta, texto centrado. El error incluye botón "Reintentar".
- **Tiempo relativo** (`relativeTime()` en `notification-display.util.ts`): "ahora mismo" / "hace X min" / "hace X h" / "ayer HH:mm" / "DD/MM HH:mm" a partir de 48 h. Se recalcula en cliente; no se cachea el texto.
- **Backend consumido**: `GET /v1/notifications/` (con parámetros `read`, `type`, `skip`, `limit`), `GET /v1/notifications/counts`, `GET /v1/notifications/unread-count`, `PATCH /v1/notifications/{id}/read`, `POST /v1/notifications/read-all`.

---

## Funcionalidades transversales

- **Autenticación JWT** con interceptor HTTP que inyecta el `Bearer token` automáticamente, validación de expiración en cliente y logout que limpia la sesión.
- **Multi-tenant con roles jerárquicos** (`superadmin` > `admin` > `user`), condicionando qué acciones ve cada usuario en la UI.
- **Subida de archivos con progreso real**, reutilizada en la subida de documentos y en la pestaña de documentos del detalle de asistente.
- **Descarga de documentos vía URL firmada** (almacenamiento S3).
- **Polling de estado de procesamiento** de documentos mientras estén `pending`/`processing`.
- **Actualización optimista** al cambiar la categoría de un documento desde el listado (revierte si falla la petición).
- **Sistema de notificaciones toast** centralizado (éxito / error / info) — distinto del módulo de notificaciones persistentes de la sección 12.
- **Notificaciones persistentes de empresa** (sección 12): badge de no leídas sincronizado entre header y sidebar, polling cada 45s.
- **Sidebar colapsable**: botón ☰ en el header alterna el sidebar entre expandido y modo icon-only (`DashboardLayoutComponent.sidebarOpen`), persistido solo en memoria (se reinicia a expandido en cada navegación entre módulos, ya que cada uno instancia su propio `DashboardLayoutComponent`).
- **Chat IA flotante**: drawer accesible desde el header en cualquier módulo (ver sección 10), estado centralizado en `UiStatusService`.

## Pendientes / deuda técnica conocida

Resumen de lo no implementado aún:

- **Auth**: registro (`/auth/register`) y edición de perfil/cambio de contraseña
  propio (`/profile-settings`) no existen como ruta ni como página. El login
  conservaba un método `goToRegister()` que apuntaba a esa ruta inexistente,
  sin que ninguna plantilla lo invocara; se retiró.
- **Conversaciones (vista admin)**: listado/detalle administrativo de conversaciones (distinto del Chat IA de la sección 10) — no implementado.
- **Notificaciones**: ✅ completado (sección 12, 2026-08-16) — generación automática de eventos en el pipeline de documentos (processed / failed / deleted), listado paginado con 5 chips de filtro, badge en sidebar (grupo Analytics), tiempo relativo preciso, skeleton y estados de error/vacío dentro de la tarjeta.
- **Feedback IA (vista admin)**: implementado, con redición v2 (sección 11). Ruta `/feedback` activa con analytics completo. Pendiente: verificación end-to-end con datos reales en producción; backend de conversión de tema en bloque (`POST /feedback/theme-convert`); `samples`/`trend` en `/stats` para `ThemeCount` cuando el backend no los provee.
- **Knowledge Gaps** (preguntas sin respuesta): ✅ implementado. Las rutas
  `/knowledge-gaps` y `/knowledge-gaps/:id` están registradas en
  `app.routes.ts`, y tanto el feedback (sección 11, "Enviar a preguntas sin
  respuesta") como las notificaciones (sección 12, tipos
  `knowledge_gap_found` / `knowledge_gap_resolved`) generan y enlazan
  `KnowledgeGap` correctamente.
- **Presupuesto/Uso**: configuración de límite mensual de gasto y alertas al 80%/100% — no implementado (el tipo de notificación `budget_*` ya existe en el modelo, a la espera del módulo).
- **Empresas**: `AuthService.selectedCompany` expone la empresa activa (mostrada en el header) pero no hay UI de selector para que `superadmin` cambie de contexto — sigue sin implementar.
- **Widgets**: retirado de esta entrega — ver sección 9 y `ALCANCE_TFM.md`.
- ✅ **404** (2026-10-22): `shared/pages/not-found/`, reutiliza `EmptyStateComponent`. La ruta comodín (`**`) redirige a `/not-found` en vez de a `/auth/login` — antes era indistinguible de una sesión expirada.
- ✅ `adminGuard` quedó enganchado en `app.routes.ts` a las rutas `/companies` y
  `/users`; antes estaba escrito pero sin usar, y el control de acceso admin
  dependía solo de comprobaciones dentro de cada componente.
- **Streaming del Chat IA**: el chat quedó implementado sobre HTTP síncrono, no
  WebSocket. Sigue siendo una mejora candidata para UX de streaming
  token-por-token. La variable `wsUrl` que los entornos declaraban para ese fin
  se retiró: apuntaba a un endpoint que el backend no expone.
- ✅ **Persistencia de `sidebarOpen` y los cuatro grupos colapsables** (2026-10-22): vía `StorageService` (`sessionStorage`), con un `effect()` por señal en `DashboardLayoutComponent`. Sobrevive a cambiar de módulo (cada uno instancia su propia layout); se reinicia al cerrar la pestaña, que es lo esperado para una preferencia de UI, no para datos.
- ✅ **Interceptor global de errores HTTP** (2026-10-22): `core/interceptors/error.interceptor.ts`. 401 fuera del login fuerza `logout()` + redirección (antes solo pasaba si el usuario pulsaba "cerrar sesión"), 403 y errores de servidor (0 o ≥500) muestran un aviso genérico vía `NotificationService`. No toca los 4xx de negocio (404/409/422), que ya tienen su propio mensaje por componente — relanza el error en todos los casos para no romper ese manejo existente.
- ✅ **Loading skeletons en las listas de tabla** (2026-10-22): `shared/components/table-skeleton/`, componente genérico (`[rows]`, `[columns]`) en vez de uno a medida por página. Conectado en etiquetas, categorías, empresas, usuarios y documentos. De paso, se centralizó `@keyframes sk-pulse` en `styles.scss` — estaba duplicado con ligeras variantes en feedback-list, knowledge-gaps-list y notification-list. **No cubre** `assistant-list` (tarjetas en cuadrícula, no tabla — necesitaría una forma de skeleton distinta) ni el dashboard (tarjetas de KPI).
- ✅ **ESLint configurado** (2026-10-23): `@angular-eslint` oficial (`ng add @angular-eslint/schematics@21`), con `ng lint` en `package.json`. Primera pasada: 90 avisos. Se resolvieron todos, sin apagar reglas a ciegas:
  - 21 por el *schematic* oficial de migración `ng generate @angular/core:inject` (inyección por constructor → `inject()`), automático y sin riesgo.
  - 2 elementos con interacción real pero sin soporte de teclado, corregidos de verdad (no solo silenciados): la tarjeta de `assistant-list` que navega al hacer clic, y la zona de arrastrar-y-soltar de `assistant-detail` — ambas ganaron `tabindex`, `role="button"` y `(keydown.enter/space)`.
  - El selector de documento candidato en `knowledge-gaps-list` pasó de un `<label>` sin control real (inaccesible de fondo) a un `<input type="radio">` oculto visualmente pero funcional, con foco visible.
  - El toast de `toast-host` ahora también se puede cerrar con teclado.
  - El resto (33 avisos) eran fondos de modal/drawer que cierran al clic-fuera y contenedores que solo detienen la propagación del clic — forzarlos a ser elementos de teclado habría sido peor accesibilidad, no mejor (un lector de pantalla no necesita tabular por un fondo invisible de pantalla completa). Se desactivó la regla línea por línea, con el motivo en un comentario, no un `rules: {}` global.
  - 8 comparaciones `== null`/`!= null` (cubren `null` y `undefined` a la vez en campos opcionales) se dejaron así a propósito, con la opción `allowNullOrUndefined` de la regla — convertirlas a `===` habría cambiado el comportamiento, no solo el estilo.
  - 14 manejadores `error: () => {}` de cargas de fondo no críticas (contador de notificaciones, filtros) se permitieron explícitamente, con la razón documentada en `eslint.config.js`.
  - 4 `*ngIf` del login migrados a `@if`, y 4 `@Output() cancel` renombrados a `cancelled` (nombre de evento nativo del DOM, podía chocar si el componente se usara sobre un elemento nativo).
- Deuda técnica adicional: sin tests unitarios ni e2e.
- **Deploy**: el frontend se sirve desde Vercel (`https://knowledge-space-front-end.vercel.app/`, auto-deploy en cada push a `main`), desacoplado del backend en Cloud Run — CORS gestiona la conexión entre ambos (ver `doc/BITACORA.md`, 2026-08-14).
