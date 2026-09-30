# BITÁCORA.md

Registro diario de avances en KnowledgeSpace (backend `api/` + frontend `KnowledgeSpace_FrontEnd/`). Una entrada por día de trabajo, orden cronológico descendente (lo más reciente arriba).

Formato de cada entrada:

```
## AAAA-MM-DD

**Hecho:**
- ...

**Decisiones / notas:**
- ...

**Pendiente para después:**
- ...
```

---

## 2026-09-30 — El Dashboard estaba roto: endpoint inexistente

**Hecho (backend `api/`):**
- **Creado `GET /api/v1/dashboard/metrics`**, que no existía. El frontend lo
  llamaba desde `dashboard.service.ts` desde siempre y el backend respondía
  **404**: `main.py` registraba 15 routers y ninguno era `dashboard`.
  Nuevos `app/routers/v1/dashboard.py` y `app/schemas/dashboard.py`, con el
  filtrado por `company_id` del JWT como el resto de routers.
- Decisiones del endpoint: `processing` agrupa `pending` + `processing` (para
  quien mira el panel, ambos significan "todavía no puedo consultarlo");
  `total` incluye los `failed` para que cuadre con la lista de `/documents`;
  los mensajes se cuentan por join con `conversations`, que es lo que garantiza
  el aislamiento multi-tenant, porque `messages` no tiene `company_id`; la
  actividad reciente ordena por `coalesce(updated_at, created_at)` porque
  `updated_at` es NULL hasta la primera modificación.
- **Nuevo test** `tests/test_dashboard_metrics.py` (4 casos sobre
  `_metricas_de_documentos`, lógica pura, mismo estilo que los existentes).
  Suite: 17 → 21 tests, todos pasando.

**Hecho (frontend):**
- **Corregido el manejo de error del Dashboard**, que era la razón de que el
  fallo fuera invisible: `error: () => { this.loading.set(false); }` se tragaba
  el error sin asignar el signal `error`, que además no se renderizaba en
  ninguna parte de la plantilla. Como todo el contenido vive dentro de
  `@if (!loading() && metrics())`, un fallo dejaba ambas condiciones en falso y
  **la página quedaba en blanco**: solo el título y el "Bienvenido, {nombre}".
  Ahora hay estado de error con botón "Reintentar", y `load()` es reutilizable.

**Decisiones / notas:**
- Verificado contra la base real: empresa 8 ve sus 12 documentos y 2 usuarios;
  empresa 3 ve 0 documentos y 4 usuarios. El aislamiento multi-tenant funciona.
- Los 0 documentos de la empresa 3 (Logit) **no son un fallo**: los 12
  documentos indexados pertenecen todos a la empresa 8 (KnowledgeSpace Demo).
- Gravedad: `/dashboard` es la pantalla de aterrizaje tras el login — cuatro
  sitios redirigen ahí (`login.component.ts:50`, `guest.guard.ts:13`,
  `admin.guard.ts:14` y el chat al cerrarse). Era lo primero que habría visto
  un tribunal.

**Pendiente para después:**
- **865 de las 937 conversaciones de la empresa 3 no tienen ningún mensaje**
  (y la empresa 8 tiene 1.042 conversaciones con 168 mensajes). Son restos de
  pruebas. El panel de actividad reciente muestra diez "Chat IA" vacías
  seguidas, que es justo lo que se vería en una demo en vivo. Conviene
  limpiarlas antes de la defensa.
- El resto de módulos no tiene estado de error visible; el Dashboard es el
  único corregido. Sigue sin haber interceptor global de errores HTTP.

---

## 2026-09-29 — Recorte de alcance para el TFM: retirada del widget y limpieza de código muerto

**Hecho (frontend):**
- **Módulo de widgets retirado por completo** (~2.200 líneas): `features/widgets/`
  con sus páginas list/form/detail, su servicio y sus rutas; la ruta `widgets`
  de `app.routes.ts`; la entrada del sidebar en `dashboard-layout.component.html`;
  y el modelo huérfano `core/models/widget.model.ts`.
- **Pestaña "Widgets" del detalle de asistente** eliminada: botón, contenido,
  estilo `&--widget`, el método `loadWidgets()` y `getAssistantWidgets()` de
  `assistant.service.ts`. También el contador de widgets de las tarjetas del
  listado de asistentes y la fila "Widgets" de la pestaña de configuración.
- **Componente compartido `shared/components/select/` eliminado** (72 líneas):
  su selector `app-select` no aparecía en ninguna plantilla ni lo importaba
  ningún archivo.
- **`wsUrl` retirado de los cuatro `environment.*.ts`**: estaba declarado en
  todos y usado en ninguno, apuntando a un endpoint WebSocket que el backend no
  expone. El chat es HTTP síncrono.
- **`adminGuard` enganchado** a las rutas `/companies` y `/users` en
  `app.routes.ts`. Estaba escrito y exportado, pero su única aparición en el
  repositorio era su propia definición.
- **`goToRegister()` eliminado** de `login.component.ts`: navegaba a
  `/auth/register`, ruta que no existe, y ninguna plantilla lo invocaba.
- **Notificaciones de presupuesto sin acción**: `entityAction()` devolvía
  `{ text: 'Ver costos', commands: ['/dashboard'] }`, pero el dashboard solo
  muestra documentos, usuarios, conversaciones y mensajes. El costo por
  respuesta se ve en el chat (`message.cost_usd`). Ahora devuelve `null`.

**Hecho (backend `api/`):**
- Eliminados `routers/v1/widgets.py`, `repositories/widget_repository.py` y
  `schemas/widget.py`, el registro del router en `main.py` y el endpoint
  `GET /assistants/{id}/widgets`. Quedan 57 rutas, ninguna con "widget".

**Hecho (documentación):**
- `ALCANCE_TFM.md` de ambos repos: el widget pasa de "fuera de alcance" a
  "código retirado", con la justificación de por qué el modelo permanece.
- `doc/FEATURES.md`: sección 9 reescrita; widget fuera del flujo de valor y de
  las transversales; corregida la afirmación de que `/knowledge-gaps` no estaba
  registrada (lo está); eliminada la remisión a `BACKLOG_FRONTEND.md`, que no
  existe en este repositorio; corregido "Vitest como test runner" — la
  dependencia está en `package.json` pero no hay ningún `.spec.ts`.
- `README.md`: el árbol de estructura listaba `features/widgets/`, y bajo
  `shared/` listaba `pipes/` y `directives/`, que no existen.
- `CLAUDE.md` del backend: eliminada la instrucción de activar un `venv` que no
  existe, y añadida la explicación de por qué el `cd api` no es opcional
  (resuelve `sys.path` **y** el directorio de trabajo del que `config.py` carga
  el `.env` por ruta relativa).

**Decisiones / notas:**
- **El modelo de datos del widget se conserva a propósito**: tabla `widgets`,
  relación `Assistant.widgets`, el `widget_count` que bloquea borrar un
  asistente con widgets vinculados, y los campos `widget_id` / `channel` en
  `feedback` y `knowledge_gaps`. El canal de origen (`widget` | `chat`) es lo
  que permite a Preguntas sin respuesta ponderar distinto lo que llega de un
  sitio público — retirarlo habría obligado a modificar la contribución que se
  defiende.
- **El corte se hizo simétrico en frontend y backend.** Un backend que expone
  endpoints sin consumidor se lee como "frontend incompleto", no como alcance
  recortado a propósito.
- **Notificaciones se evaluó y se descartó como candidato a recorte.** No
  aparece en el núcleo académico, pero el backend las emite desde el pipeline de
  documentos (`documents.py:144,158,291`), desde `feedback.py:166` y desde
  `knowledge_gaps.py:90` — los tres son contribución. Cortarlo obligaba a tocar
  el núcleo o a crear la asimetría que se quería evitar.
- `server.js` y el `Dockerfile` del frontend **no** son residuo pese a que el
  despliegue actual es Vercel: el Dockerfile copia `dist/knowledge-space/browser`
  a `./public`, que es justo el directorio desde el que sirve `server.js`.
- Las credenciales `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` de `api/.env`
  (`admin@test.com` / `test123`) **ya no son válidas**: el login devuelve 401.
  Los 6 usuarios de la base conservan hashes en el formato antiguo
  (`sha256_crypt`), que migrarán a bcrypt en su primer login correcto.

**Pendiente para después:**
- Decidir qué hacer con `doc/ia-handoff/` (932 KB, 13 archivos trackeados,
  incluido un `.zip`): son maquetas de diseño intermedias, no código ni material
  de defensa.
- `objetos.csv` en la raíz del frontend no tiene relación con el proyecto y no
  está en `.gitignore`.
- `docs/practica-tfm/sebas/` en el backend contiene un único archivo, copia de
  ejercicio de otra persona.
- `docs/tutorials/GLOSARIO_RAG.md` sigue sin commitear.
- Nada de esta sesión está commiteado; ambos repos siguen en `main`.

---

## 2026-08-16 — Módulo Notificaciones (handoff completo) + fix httpx backend

**Hecho (backend `api/`):**
- **Fix de dependencia crítica en Cloud Build**: `httpx==0.25.2` → `httpx>=0.27,<1.0` en `requirements.txt`. `pinecone==9.1.0` requiere `httpx>=0.27`; el pin exacto impedía el build de Docker. Rango elegido compatible con `openai==2.53.0` (`>=0.23,<1`).
- **Confirmación del estado del backend de Feedback** (sin cambios): `schemas/feedback.py`, `repositories/feedback_repository.py` y `routers/v1/feedback.py` ya estaban completos (period filtering, enriched response, KPIs, convert-gap). La causa del Cloud Build fallido era exclusivamente `httpx`.
- **Módulo Notificaciones — nuevos endpoints**:
  - `GET /v1/notifications/counts` → `{ todas, unread, documents, budget, knowledge_gap }`. Cuenta por prefijo de tipo (`document%`, `budget%`, `knowledge%`) en una sola sesión de BD; lo usan los chips del frontend y el badge del sidebar.
  - `list_notifications()` actualizado: filtro `type` pasa de igualdad exacta a `LIKE '{prefix}%'`, compatible con la nueva categorización por prefijo.
  - `_notificar_documento()` en `routers/v1/documents.py` (ya existía): emite `document_processed` / `document_failed` / `document_deleted` automáticamente desde el pipeline RAG en background — verificado que guarda `entity_type='document'` y `entity_id=document_id` para que el frontend construya el enlace correcto.

**Hecho (frontend `KnowledgeSpace_FrontEnd/`):**
- **Módulo Notificaciones — rediseño completo (handoff `doc/ia-handoff/design_handoff_notificaciones`)**, alta fidelidad:
  - `index.html`: añadida **IBM Plex Mono** (400/500) desde Google Fonts — requerida para tiempos y contadores.
  - `core/models/notification.model.ts`: añadida interfaz `NotificationCounts { todas, unread, documents, budget, knowledge_gap }`.
  - `features/notifications/services/notifications.service.ts`: añadido método `getCounts()` → `GET /v1/notifications/counts`.
  - `notification-display.util.ts`: `relativeTime()` reescrito al formato del handoff: "ahora mismo" / "hace X min" / "hace X h" / "ayer HH:mm" / "DD/MM HH:mm" a partir de 48 h. (Antes usaba unidades plurales genéricas.)
  - `notification-list.component.ts` (reescritura):
    - Tipo `FilterMode` expandido a 5 valores: `all | unread | documents | budget | knowledge_gap`.
    - `counts` signal con carga independiente vía `getCounts()`.
    - `load()` mapea filtro → parámetros de API: `read: false` para no leídas; `type: 'document'|'budget'|'knowledge'` para las categorías (el backend usa LIKE).
    - `rowClick()`: marca leída optimistamente + decrementa `counts.unread` + navega.
    - `entityAction()`: enlace y texto específico por tipo — "Ver documento" / "Ver costos" / "Resolver" / "Revisar" / "Ver la lista" / "Ver usuarios".
    - Paginación de 25 registros con `hasMore` / `loadMore()`.
    - Señales de error con reintentar, skeleton de 7 filas.
  - `notification-list.component.html` (reescritura):
    - Layout: header con subtítulo + botón "Marcar todas como leídas"; 5 chips con `chip-count` en IBM Plex Mono; tarjeta contenedora única (sin padding propio, filas al borde); separadores de día internos; filas como `<button>` (accesible con teclado); punto de no leída (5×5 px, reserva espacio aunque esté leída); icono de tipo 30×30; título + píldora de tipo; mensaje; tiempo + enlace de acción.
    - `max-width: 1000px` (antes 760px), `padding: 28px 26px 44px`.
    - Estados: skeleton 7 filas, error con "Reintentar", vacío — todos dentro de la tarjeta.
  - `notification-list.component.scss` (reescritura):
    - Tokens handoff aplicados directamente donde no coinciden con las variables SCSS del sistema (fondos #fbfcfd, #fcfdff, #f8fafc; separadores #f1f2f5; card border #e8eaee).
    - Animación `sk-pulse` para skeleton; chips en pilldora redondeada 99px; `.notif-row` como botón full-width sin borde.
  - `shared/layouts/dashboard-layout/dashboard-layout.component.ts`: inyectado `NotificationsService`; signal `notifUnreadCount` cargado con `getUnreadCount()` en el constructor.
  - `shared/layouts/dashboard-layout/dashboard-layout.component.html`: Notificaciones movida del grupo **Plataforma** al grupo **Analytics**; badge numérico en modo expandido / punto azul en modo colapsado.
  - `shared/layouts/dashboard-layout/dashboard-layout.component.scss`: añadido `.sidebar-badge` y `.sidebar-badge--dot`.
- **Documentación**: `doc/FEATURES.md` sección 12 reescrita con tabla de eventos de backend, descripción completa de la página y lista de endpoints. Sección "Pendientes" actualizada.

**Decisiones / notas:**
- El tipo `document_uploaded` existe en el seed de `notification_types` pero el router de documentos nunca lo emite — notificar que inició el procesamiento y luego que terminó sería redundante con el polling de estado que ya tiene `assistant-detail`.
- `NotificationsService` se inyecta desde la layout (feature → shared), lo que crea una dependencia cruzada leve. La alternativa sería un servicio en `core/` que centralice el conteo, pero la actual es suficiente para MVP.
- El badge del sidebar no se actualiza al marcar notificaciones como leídas desde la página de notificaciones (son instancias separadas del servicio). El contador se refresca en el siguiente ciclo de navegación o reload. Aceptable para MVP.
- Commit y push del fix de `httpx` ya hecho; Cloud Build re-disparado automáticamente desde GitHub.

**Pendiente para después:**
- Verificar Cloud Build exitoso y backend desplegado en Cloud Run.
- Verificar `/notifications` y `/feedback` end-to-end en producción con datos reales.
- Registrar rutas `/knowledge-gaps` y `/knowledge-gaps/:id` — hoy son enlaces muertos desde notificaciones y feedback.
- Backend: `samples` y `trend_pct` en `GET /feedback/stats` → `ThemeCount` (actualmente retorna `[]` y `null`).
- Backend: `POST /feedback/theme-convert` (conversión en bloque de un tema a pregunta sin respuesta).

---

## 2026-08-15

**Hecho:**
- **Módulo Feedback IA — segunda iteración de diseño (handoff v2)**:
  - KPIs reducidos de 4 a 3: eliminado "Respuestas calificadas"; quedan Satisfacción + delta, Negativas y En seguimiento. Grid CSS cambiado a `repeat(3, 1fr)`.
  - Eliminada la "Banda de señal implícita" de la UI (movida a ampliación futura); el campo `signal_band` se conserva en backend schema por compatibilidad.
  - Eliminado el avatar de las tarjetas de comentario.
  - Eliminados los chips de temas de la columna izquierda; solo queda la distribución de estrellas.
  - Selector de asistente cambiado de segmentado a **dropdown con cierre al clic exterior** (`@HostListener('document:click')` + `ElementRef`).
  - Bloque de respuesta del asistente visible **solo para rating ≤ 3** (`isNegOrNeutral()`).
  - Clic en distribución (modo Temas) cambia automáticamente a modo Comentarios antes de aplicar el filtro.
  - **Aviso de obsoleto** (`stale-notice`) en tarjetas con `status === 'stale'`.
  - Etiqueta de brecha: "Pregunta #N abierta/resuelta" según `knowledge_gap_status`.
  - Eliminado el gráfico semanal del layout.
- **Reescritura completa de los tres archivos del componente `feedback-list`** (fidelidad alta con handoff v2, verificado visualmente):
  - `feedback-list.component.ts`: signals para dropdown, modo, búsqueda de temas, accordion; `computed()` para lista filtrada, opciones de asistente, label contador con sufijo de período. Requests independientes (no forkJoin) para stats y lista. `openTheme` se inicializa al primer tema tras cargar stats. `convertingTheme` signal para conversión de tema en bloque. Asistentes cargados desde `AssistantService` (activos de la empresa, no solo los que aparecen en feedback). Dropdown cierra con clic exterior y con Escape.
  - `feedback-list.component.html`: header completo fiel al handoff; skeleton loading (bloques `#eef1f6` con radio correcto) para KPIs, distribución y lista; "Anónimo · widget" cuando `widget_id` presente; botón "Enviar a preguntas sin respuesta" para `rating <= 2` sin restricción de status; botón "Enviar tema a preguntas sin respuesta" en accordion de temas; modal dual (feedback individual o tema). Errores inline por sección.
  - `feedback-list.component.scss`: skeletons animados (`.kpi-skeleton`, `.dist-skeleton`, `.comment-skeleton`); todos los tokens de color, radio y sombra del handoff.
- **`core/models/feedback.model.ts`**: añadido `FeedbackPeriod`, `SignalBand`; `ThemeCount` extendido con `trend?`, `summary?`, `samples?`; nueva interfaz `ThemeSample`.
- Eliminado `.github/workflows/bitacora.yml` y directorio `.github/` (causaba re-deploys en Vercel con errores de build).
- Nota: commit `449a90c` del usuario incluye también el módulo de **Notificaciones** implementado en paralelo.

**Decisiones / notas:**
- `SignalBand` retorna ceros desde el backend; no se renderiza en la UI en esta versión.
- `ThemeCount.samples` es opcional: si el backend no los devuelve, el bloque de ejemplos no se muestra.
- Colores de distribución son paleta de datos (#0f9b6c / #c9ccd3 / #e07a72), distintos de los semánticos del sistema.
- Conversión de tema en bloque abre el modal correctamente; el backend call está pendiente de implementación en el router.

**Pendiente para después:**
- Commit y despliegue del **backend** (Cloud Run) con `period` filtering y nuevos endpoints.
- Verificar `/feedback` end-to-end en navegador con datos reales.
- Backend: implementar `samples` y `trend` en `/stats` para `ThemeCount`; endpoint `/feedback/themes` separado si se necesita lazy loading.
- Backend: endpoint `POST /feedback/theme-convert` para conversión en bloque desde modo Temas.

---


## 2026-08-14

**Hecho:**
- Despliegue del frontend en **Vercel** (tras fallos repetidos en Cloud Run para el frontend Angular): proyecto conectado desde GitHub (`jsagudelodev/KnowledgeSpace_FrontEnd`), build `npm run build`, output dir `dist/knowledge-space/browser`. URL de producción: `https://knowledge-space-front-end.vercel.app/`. Auto-deploy activo en cada push a `main`. Dominio personalizado vinculable sin redeploy.
- **Fix de CORS**: tras el despliegue en Vercel el login bloqueaba con `Access-Control-Allow-Origin`. Solucionado agregando `https://knowledge-space-front-end.vercel.app` a la variable de entorno `ALLOWED_ORIGINS` del servicio `knowspace-api` en Cloud Run.
- **Módulo Feedback IA — backend** (reescritura completa en `api/`):
  - `feedback.py` model: añadidos `widget_id`, `status` (`new|reviewed|converted|dismissed`), `knowledge_gap_id` FK con `SET NULL`, `UniqueConstraint(message_id, user_id)`, índice en `created_at`.
  - `schemas/feedback.py`: tipo literal `FeedbackStatus`, `FeedbackCreate`, `FeedbackUpdate`, `FeedbackConvertGap`, `FeedbackResponse` enriquecido (con `conversation_id`, `sources_count`, `rag_score`, `user_full_name`), `WeekStats`, `ThemeCount`, `FeedbackStats` con 4 KPIs.
  - `repositories/feedback_repository.py`: `get_by_company()` con filtros, `get_stats()` (KPIs mensuales + delta vs mes anterior + distribución + últimas 6 semanas + themes), `convert_to_gap()` (crea `KnowledgeGap` y vincula), `get_export_csv()`. Sin `dateutil` — aritmética stdlib pura.
  - `routers/v1/feedback.py`: `GET /`, `GET /stats`, `GET /export` → CSV, `POST /{id}/convert-gap`, `PATCH /{id}/status`.
  - Migración SQL aplicada en Supabase.
- **Módulo Feedback IA — frontend** (diseño completo desde design handoff en `doc/ia-handoff/`):
  - `core/models/feedback.model.ts`: modelos `FeedbackResponse`, `FeedbackStats`, `WeekStats`, `ThemeCount`, tipo `FeedbackStatus`.
  - `features/chat/services/feedback.service.ts`: `getAll`, `getStats`, `updateStatus`, `convertToGap`, `exportCsv` (vía `api.getBlob()`).
  - `feedback-list.component`: layout dos columnas — header con selector segmentado de asistente + exportar CSV; 4 KPI cards (satisfacción + delta, % calificadas, negativas, con brecha); izquierda: distribución filtrable, chips de temas, gráfico semanal; derecha: tarjetas de comentario con avatar, rating, respuesta calificada, acciones (ver conversación, convertir en brecha, pill de estado). Modal "convertir en brecha" con textarea editable.
- **Documentación automatizada**: creado `.github/workflows/bitacora.yml` — en cada push a `main` inserta automáticamente una entrada en `doc/BITACORA.md` con hash, autor, mensaje y archivos modificados.

**Decisiones / notas:**
- `dateutil` no está en `requirements.txt`; se usó `datetime` stdlib para calcular el mes anterior y las semanas de corte.
- `RouterLink` debe importarse explícitamente en el componente standalone (no viene de `CommonModule`).
- `api.getBlob()` incluye headers de auth internamente — no es necesario acceder a `apiUrl` privada.
- El backend sigue en Cloud Run; el frontend migró a Vercel. Ambos permanecen desacoplados: el CORS gestiona la conexión.

**Pendiente para después:**
- Commit y despliegue del backend (Cloud Run) con el módulo Feedback reescrito.
- Verificar `/feedback` end-to-end en navegador con datos reales.
- Ruta `/conversations` (listado admin) aún sin implementar en el frontend.

---

## 2026-08-09

**Hecho:**
- Módulo **Chat IA** completo en el frontend, portado desde `trainiq-frontend` como base y adaptado al backend real de KnowledgeSpace:
  - Modelos `conversation.model.ts` / `message.model.ts` / `feedback.model.ts` (adaptados: sin `chunk_id`/`page` en `Source`, sin `company_id`/`user_id` en los payloads de creación — el backend los deriva del JWT).
  - `ChatService` y `FeedbackService` (`features/chat/services/`).
  - `ChatShellComponent`, `ChatListComponent`, `ChatDetailComponent` (`features/chat/pages/`) con: burbujas de mensaje, selector de asistente activo, fuentes citadas con preview/descarga, feedback (👍/👎 + comentario), búsqueda y paginación de mensajes.
  - Ruta `/chat` registrada en `app.routes.ts`.
- **Chat flotante**: botón "Chat IA" en el header (visible en todos los módulos) que abre el mismo `ChatDetailComponent` como drawer lateral, vía `UiStatusService` (ya existía el servicio, solo faltaba conectarlo). Se corrigió un bug heredado de TrainIQ: el botón de cerrar (X) dentro del chat en modo drawer no hacía nada; ahora cierra el drawer correctamente.
- **Toggle de sidebar**: el signal `sidebarOpen`/`toggleSidebar()` de `DashboardLayoutComponent` existía pero no estaba conectado a ningún botón. Se agregó el botón ☰ en el header (`HeaderComponent`, `@Output() sidebarToggle`) para expandir/colapsar el sidebar.
- Verificación end-to-end en navegador con datos reales: creación de conversación, respuesta RAG grounded en Pinecone con fuentes citadas y score de relevancia, apertura/cierre del drawer desde distintas páginas, colapso del sidebar.
- Documentación: actualizado `doc/FEATURES.md` (sección 10 — Chat IA, transversales, pendientes) y `BACKLOG_FRONTEND.md` (Módulo 5 marcado completo). Creado este archivo (`BITACORA.md`).
- **Limpieza de código / centralización en el sistema de diseño**, a raíz de una revisión general del frontend:
  - Eliminados colores hex hardcodeados que duplicaban tokens ya existentes: `#fff` → `$font-on-primary` (paginador activo en `document-list` y `assistant-detail`) o `$bg-card` (thumb del toggle en `category-form`); `#eff6ff`/`#2563eb`/`#93c5fd` → `$color-primary-light`/`$color-primary`/`$navy-250` (hover del botón de descarga en `document-list`).
  - Reemplazados dos `box-shadow: rgba(0,0,0,...)` sueltos en `chat-detail.component.scss` por `$shadow-xs`/`$shadow-md` (todo el resto del código ya usaba los tokens `$shadow-*`, solo el chat portado de TrainIQ tenía valores sueltos).
  - Quitado el bloque de alias SCSS locales (`$brand`, `$gray-50`...`$gray-900`) que traían `chat-list.component.scss` y `chat-detail.component.scss` desde TrainIQ — creaban un mini-sistema de nombres paralelo al oficial. Reemplazados todos los usos por los tokens canónicos (`$color-primary`, `$slate-500`, `$font-title`, `$border-flat`, etc.).
  - `StorageService.getItem`/`setItem` ahora son genéricos (`<T>`) en vez de `any`; ajustados los 5 call-sites (`auth.service.ts`, `auth.interceptor.ts`) para pasar el tipo explícito.
  - Verificado visualmente en navegador que el chat no cambió de aspecto tras el refactor de tokens.
  - Centralizado `@keyframes spin` (antes copiado y pegado, idéntico, en 15 archivos `.scss` distintos: asistentes, categorías, chat, empresas, dashboard, documentos, tags, widgets) en un único bloque en `src/styles.scss`; cada componente solo conserva su regla `.spinner { animation: spin ...; }`. Verificado que compila y que el spinner de `/documents` sigue animando igual.
  - Creado `EmptyStateComponent` compartido (`shared/components/empty-state/`, inputs `icon`/`title`/`subtitle`/`size: 'sm'|'md'|'lg'`, `<ng-content>` para el botón de acción) para reemplazar el "sin resultados" duplicado en 6 páginas: `category-list`, `company-list`, `tag-list`, `user-list`, `chat-list`, `chat-detail` (solo el bloque de "sin resultados de búsqueda", no el estado de bienvenida con sugerencias, que es un componente propio del chat). De paso corrigió un bug visual en `user-list`: el ícono del estado vacío usaba `icon-sm` (18px) en vez de la clase que le daba 3rem, se veía diminuto comparado con las otras listas.
  - Build limpio. Verificado visualmente en navegador: categorías, etiquetas y usuarios — el estado vacío por búsqueda sin resultados se ve y funciona igual (o mejor, en el caso de usuarios) que antes.

**Hecho (backend `api/`):**
- **Limpieza general de código** — core, routers, services, repositories y models refactorizados para legibilidad y escalabilidad.
- **Seguridad corregida:**
  - Migrado hashing de `sha256_crypt` a `bcrypt` (`passlib[bcrypt]`); usuarios con hash antiguo se migran automáticamente al siguiente login (`deprecated="auto"`).
  - `"null"` eliminado de `ALLOWED_ORIGINS` en `config.py`.
  - `reset_password` enviaba la contraseña nueva como query param (URL visible en logs); migrado a body (`AdminPasswordReset`).
- **`pdf_service.py` reescrito** — cascada de tres parsers: `pymupdf` (principal, C nativo, PDFs complejos/escaneados) → `pdfplumber` (fallback, tablas/columnas) → `PyPDF2` (último recurso). Antes solo existía PyPDF2.
- **`requirements.txt` alineado con TrainIQ** — añadidos: `pymupdf>=1.23.0`, `pdfplumber>=0.10.0`, `tiktoken==0.13.0`, `httpx==0.25.2`, `python-json-logger==2.0.7`; todos instalados en el venv.
- **`database.py`** — migrado de `declarative_base()` (deprecated) a `class Base(DeclarativeBase): pass`; añadido `pool_pre_ping=True` para resiliencia con Supabase (corta conexiones idle).
- **`main.py`** — reemplazado `@app.on_event("startup")` por `@asynccontextmanager lifespan`.
- **Documentación técnica creada** en `docs/`:
  - `RAG_PIPELINE.md` — pipeline de ingesta y consulta con diagramas ASCII, parámetros, archivos involucrados.
  - `PINECONE_VECTORES.md` — arquitectura vectorial: índice, namespaces, formato de IDs, scores de similitud, lifecycle.
- **Deploy GCP Cloud Run** configurado:
  - `api/Dockerfile` multi-stage (builder con gcc/libffi; runtime con solo libpq5; usuario no-root).
  - `deploy.sh` en la raíz — 3 pasos: build → deploy → URL del servicio.
  - `api/.env.example` actualizado con todas las variables actuales.

**Decisiones / notas:**
- El chat NO tiene streaming (SSE/WebSocket): el backend responde síncrono en `POST /v1/chat/message`. `wsUrl` sigue sin usarse.
- `FeedbackService.getMine()` no tiene endpoint dedicado en el backend (`/feedback/mine?message_ids=`); se resolvió trayendo `/v1/feedback/me` completo y filtrando en cliente.
- El drawer de chat y la página completa de chat son dos instancias distintas de `ChatDetailComponent` (una montada directamente en `DashboardLayoutComponent`, otra vía ruta `/chat/:id`); cada una mantiene su propia conversación en memoria.

**Pendiente para después:**
- Persistir `sidebarOpen` (hoy se reinicia a expandido al navegar entre módulos, porque cada uno instancia su propio `DashboardLayoutComponent`).
- Evaluar si vale la pena el streaming de respuestas del chat.
- Verificar visualmente `company-list` (código idéntico al de categorías/etiquetas, bajo riesgo) y las dos variantes de chat (`chat-list` size="sm", `chat-detail` "sin resultados" size="lg") con el `EmptyStateComponent` — quedó a medias porque otro proceso estaba tocando `app.routes.ts`/`feedback.*` en paralelo y el hot-reload interrumpía las pruebas en el navegador.
- Queda un mensaje de prueba ("hola test empty state") enviado a una conversación de chat (id 1242) para forzar el estado "sin resultados" — falta confirmar si se envió y, si es así, borrar esa conversación de prueba (mismo criterio que las limpiezas anteriores de conversaciones de test).
- Candidato ya identificado y explícitamente pospuesto por decisión propia: `SearchInputComponent` compartido (7 páginas con buscador duplicado, cada una con su propio `Subject`+`debounceTime` en el `.ts`). Ver también `BACKLOG_FRONTEND.md`.
