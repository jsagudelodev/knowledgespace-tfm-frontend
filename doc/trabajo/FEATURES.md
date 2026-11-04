# FEATURES.md

Documento de funcionalidades implementadas en KnowledgeSpace Frontend, a la fecha del 2026-11-03.

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
- **Prettier** para formateo y **ESLint** (`@angular-eslint`). Tests unitarios
  con Vitest: 20 desde el 2026-10-24, sobre los *guards*, los interceptores y la
  expiración del JWT (ver «Pendientes»). Sin tests de componentes ni e2e.
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

Login de usuarios con JWT. No existe registro público en el frontend — el backend sí lo tiene completo (`POST /v1/auth/register`, con validación de cupo de usuarios de la empresa), pero nunca se conectó a ninguna pantalla ni botón.

- **Login**: formulario reactivo (email + contraseña mín. 8 caracteres). Al enviar, obtiene el `access_token`, luego consulta los datos del usuario autenticado y navega al dashboard.
- Manejo de estados de carga y error ("Email o contraseña incorrectos").
- **Backend consumido**: `POST /v1/auth/login` (OAuth2 form-data), `GET /v1/auth/me`.

### 1b. Mi perfil (`/profile`)

Editar el propio nombre y cambiar la propia contraseña — el email, el rol y la empresa los asigna un admin, no el propio usuario. Igual que el registro, **el backend ya tenía esto completo y sin usar** (`PUT /v1/auth/me`, `PUT /v1/auth/change-password`) desde antes de conectarlo (2026-10-25).

- Acceso desde "Mi perfil" en el dropdown del header.
- Formulario de nombre, independiente del de contraseña (actual + nueva + confirmación, con validación cruzada de que las dos últimas coincidan).
- El backend da el motivo exacto de un fallo ("la contraseña actual es incorrecta", "debe ser diferente a la actual") y se muestra tal cual, no un mensaje genérico.
- **Backend consumido**: `GET /v1/auth/me`, `PUT /v1/auth/me`, `PUT /v1/auth/change-password`.

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
- **Selector de empresa activa** (2026-10-25): dropdown en el header, solo para `superadmin`, para ver y administrar los datos de otra empresa sin cambiar de cuenta — indicador ámbar cuando está activo. Hoy solo cambia de contexto Documentos y Asistentes (`X-Company-Context` vía `authInterceptor`, resuelto en el backend por `get_company_context`); el resto de módulos sigue mostrando los datos de la propia empresa del superadmin. De paso se corrigió que el header nunca mostraba el nombre real de la empresa (el signal `selectedCompany` existía pero nadie lo poblaba).

### 4. Usuarios (`/users`)

Administración de los usuarios dentro de una empresa.

- Listado con búsqueda, filtro por rol (superadmin/admin/user) y estado, paginación.
- Alta/edición vía modal.
- **Reseteo de contraseña** desde un modal dedicado.
- Al crear un usuario, se asocia automáticamente a la empresa del usuario logueado.

### 5. Etiquetas — retiradas (2026-11-02)

Había un CRUD de etiquetas (nombre + color) en `/tags`, pero nunca se vincularon a los documentos: crear una no tenía efecto en ninguna parte. Se retiró la pantalla, la ruta y la entrada del menú, simétrico con el backend (router `/api/v1/tags` eliminado; ver `ALCANCE_TFM.md`). La organización de documentos la cubre la categoría (sección 6).

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

- **Cuándo se crea la conversación** (2026-11-01): con el primer mensaje, no al
  abrir el drawer. Antes se creaba en cada carga de página, porque el drawer
  está montado en el layout aunque esté cerrado: el 91 % de las conversaciones
  de la BD (1.985 de 2.181) estaban vacías.
- **Calificar es definitivo**: volver a pulsar el mismo pulgar no hace nada (no
  hay endpoint para borrar un feedback).
- **Dónde vive:** en un panel lateral (*drawer*) que abre el botón **Chat IA** de la cabecera, desde cualquier módulo. La página completa con lista de conversaciones (`ChatShellComponent`, `ChatListComponent`) se retiró por redundante. La ruta `/chat/:id` se conserva para los enlaces a una conversación concreta (por ejemplo, «Ver conversación» desde Feedback), y `/chat` a secas redirige al dashboard (2026-10-24; antes mostraba el layout en blanco).
- **Chat Detail** (panel y `/chat/:id`): burbujas de mensaje usuario/asistente con formato markdown básico (negrita, cursiva, código), indicador de "escribiendo…", selector de **Asistente** activo cuando la empresa tiene más de uno configurado, sugerencias de inicio rápido en el estado vacío.
  - **Fuentes citadas**: cada respuesta lista los documentos consultados con su score de relevancia, permite previsualizar el fragmento exacto usado por el modelo y descargar el documento original (vía URL firmada de S3).
  - **Feedback**: pulgar arriba/abajo por respuesta, con panel de comentario opcional al marcar una respuesta como mejorable (`POST /v1/feedback/`); el estado de feedback ya emitido se restaura al recargar la conversación.
  - **Búsqueda** dentro de los mensajes de la conversación (con resaltado de coincidencias) y **paginación** de mensajes largos.
  - **Streaming** (2026-10-24): la respuesta llega token a token por *Server-Sent Events* (`POST /v1/chat/message/stream`), con un cursor parpadeante al final del texto mientras se sigue escribiendo. `ChatService.sendMessageStream` lee el progreso de descarga de `HttpClient` (no `EventSource`, que solo hace GET) y parsea las líneas SSE a mano, reconstruyendo eventos que puedan llegar partidos entre dos trozos de red. No reduce el tiempo total de la consulta —el RAG hace el mismo trabajo—, reduce la espera hasta el primer token. Copiar, feedback y costo quedan ocultos en la burbuja hasta que la respuesta termina. La ruta síncrona (`sendMessage` / `POST /v1/chat/message`) se conserva sin usarse desde la UI.
- **Estado del panel**: `UiStatusService` centraliza si el drawer está abierto o cerrado. Cada respuesta muestra además su costo en USD.
- **Backend consumido**: `POST /v1/chat/message`, `POST /v1/chat/message/stream`, `GET/POST /v1/conversations`, `GET /v1/messages`, `GET /v1/assistants` (filtrado a activos en cliente), `GET /v1/documents/:id/download`, `POST /v1/feedback/`, `GET /v1/feedback/me`.

### 11. Feedback IA — Analytics (`/feedback`)

Panel de análisis de la calidad de las respuestas del asistente: cómo califican los usuarios las respuestas, distribución, agrupación semántica en temas y gestión de quejas convertidas en preguntas sin respuesta. Visible para cualquier usuario de la empresa: ni la ruta ni la API exigen un rol (solo `/companies`, `/users` y los costos lo exigen). Ver `MANUAL_USUARIO.md`, sección 1. Rediseñado (handoff v2) el 2026-08-15 — reemplaza por completo la versión inicial del 2026-08-14.

- **Header**: selector de **período** (Este mes / 90 días / 12 meses), dropdown de asistente (Todos / por asistente, con cierre al clic exterior y `Escape`) y botón "Exportar comentarios" (CSV).
- **KPI cards** (3, antes 4 — se eliminó "Respuestas calificadas"):
  - *Satisfacción*: rating promedio + estrellas + delta vs período anterior + conteo de calificaciones.
  - *Negativas*: conteo de calificaciones de 1 y 2 estrellas en el período.
  - *En seguimiento*: negativas convertidas en pregunta sin respuesta (antes "Con brecha asociada").
  - Skeleton de carga animado mientras llegan las stats.
- **Columna izquierda**: *Distribución* — barras por estrella (1–5) con color por tier (verde ≥4 / ámbar =3 / rojo ≤2), clicable para filtrar la lista derecha (cambia automáticamente el modo de la columna derecha a "Comentarios" si estaba en "Temas").
- **Columna derecha**, con selector de modo (segmentado Comentarios / Temas):
  - *Modo Comentarios*: tarjetas de feedback — identidad del usuario (o "Anónimo · widget" para feedback de widget embebido), estrellas, fecha, asistente, `# conversación`, comentario; pill "Obsoleto" y aviso `stale-notice` cuando la fuente de la respuesta se reindexó después (`status === 'stale'`); bloque con la **pregunta** del usuario, en todas las calificaciones y resaltada (2026-11-03: antes una negativa decía "No encontré información sobre este tema" sin decir qué tema), y debajo la "Respuesta calificada" (con fuentes y score RAG), visible solo si el rating es ≤ 3; el nombre del asistente va destacado dentro de la línea de fecha; **paginación de 10 en 10** con el botón "Ver 10 más" (2026-11-03: antes se pedía sin límite, el backend cortaba en 50 sin avisar y el filtro por estrellas se aplicaba en el navegador solo sobre esos 50; ahora el filtro va al backend como `rating` y el contador muestra el total del período, "N comentarios · mostrando M"); barra de acciones ("Ver conversación" → `[routerLink]`, "Enviar a preguntas sin respuesta" si rating ≤ 2, pill de estado o de brecha vinculada "Pregunta #N abierta/resuelta").
  - *Modo Temas*: buscador sobre los temas del período, filas expandibles por tema (nombre, tendencia ↑/↓ vs período anterior, % de las quejas, volumen); al expandir: resumen semántico opcional, comentarios de muestra representativos (`ThemeSample`), acción "Enviar tema a preguntas sin respuesta" (conversión en bloque — backend pendiente) y botón "Ver los N comentarios" (aún no navega).
  - Sin avatar ni chips de temas en la columna izquierda (eliminados en v2); sin gráfico de satisfacción semanal (eliminado del layout, campo `weeks` se conserva en el modelo por compatibilidad pero no se renderiza).
- **Modal "Enviar a preguntas sin respuesta"** (antes "Convertir en brecha"): textarea editable con la pregunta original, pre-rellenada desde el feedback individual o desde el nombre del tema; confirmar llama a `POST /v1/feedback/{id}/convert-gap` → crea `KnowledgeGap` y vincula por FK (la variante de conversión de tema en bloque solo cierra el modal — el endpoint de backend aún no existe).
- **Exportar CSV**: descarga vía `GET /v1/feedback/export?period=...&assistant_id=...` (con `ApiService.getBlob()` para mantener headers de auth).
- **Estado del feedback**: `new` → `reviewed` / `converted` / `dismissed` / `stale` (PATCH al cambiar).
- **Backend consumido**: `GET /v1/feedback/`, `GET /v1/feedback/stats`, `GET /v1/feedback/export`, `POST /v1/feedback/{id}/convert-gap`, `PATCH /v1/feedback/{id}/status`.

### 12. Notificaciones (`/notifications`)

Bandeja **personal** de avisos: documentos procesados o fallidos y preguntas sin respuesta detectadas o resueltas. Desde el 2026-11-03 cada notificación es de un usuario: un aviso para administradores se crea como una copia por admin activo, y cada uno marca y borra lo suyo sin afectar a los demás (antes era una fila compartida y marcarla como leída se la quitaba a todos). Implementado el 2026-08-16 conforme al handoff de diseño (`doc/ia-handoff/design_handoff_notificaciones`).

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

- **Chips de filtro** (3): Todas · No leídas · Documentos. "Presupuesto" se quitó el 2026-11-03 (módulo fuera de alcance; su único aviso, de junio, sigue en "Todas") y "Sin respuesta" el 2026-11-04 (el backend ya no emite esos avisos y la migración `d9f1b3c5a7e2` borró los antiguos). Los recuentos se calculan sobre el total (no sobre el filtro activo), en tipografía `IBM Plex Mono`. El backend resuelve cada categoría con una cláusula LIKE (`document%`, `budget%`, `knowledge%`) mediante el endpoint `GET /v1/notifications/counts`.
- **Separadores de día** internos a la tarjeta: `Hoy` / `Ayer` / `Anteriores`, fondo `#fbfcfd`, sin recalcular el estado — es derivado de `created_at`.
- **Fila de notificación**: punto de no leída (5 × 5 px, reserva espacio aunque esté leída para evitar salto), icono de tipo (30 × 30 px, radio 8 px, color del tipo al 10% de opacidad), título, mensaje, tiempo relativo, enlace de acción específico por tipo.
- **Enlace de acción por tipo**:
  - `document_processed / document_failed / document_uploaded` → "Ver documento" → `/documents/:entity_id`
  - `budget_*` → "Ver costos" → `/dashboard` (hasta que exista el módulo de costos)
  - `knowledge_gap_found` → "Resolver" → `/knowledge-gaps/:entity_id` (ruta pendiente)
  - `knowledge_gap_resolved` → "Revisar" → `/knowledge-gaps/:entity_id` (ruta pendiente)
  - `user_invited / user_joined` → "Ver usuarios" → `/users`
- **Click en fila**: marca como leída (actualización optimista en cliente + `PATCH` al servidor) y navega al destino. No hay botón separado de "marcar como leída".
- **Marcar N como leídas** (2026-11-03): solo aparece si hay no leídas y dice cuántas marca ("Marcar 5 como leídas"); al pulsarlo desaparece, y eso confirma que funcionó. Antes quedaba atenuado pero pulsable, y no se sabía si había hecho algo. Subtítulos: admin "Tus avisos de documentos y de preguntas sin respuesta."; user "Avisos sobre tus documentos." (decía "lo que te pidan los administradores", resto de "Pedir documento").
- **Eliminar y seleccionar al estilo Gmail** (2026-11-03/04): una papelera al final de cada fila (aparece al pasar el ratón o con el teclado; siempre visible en pantallas táctiles) borra esa notificación al momento. Para varias: casilla en cada aviso y, arriba de la lista, casilla general (marca o quita todas; estado intermedio si hay algunas) con menú **Todas · Leídas · No leídas · Ninguna**. Con algo elegido aparece "N seleccionadas" con **Marcar como leídas** (solo si alguna sigue sin leer) y **Eliminar**, que pide confirmación si son varias. La selección se limita a lo cargado en pantalla y se vacía al cambiar de pestaña o recargar. Sustituye al botón "Eliminar N leídas" de la primera versión: el menú hace lo mismo con Leídas → Eliminar.
- **Textos más claros** (2026-11-03): sin la píldora del tipo, que repetía el título; los de documento fallido ya no enseñan el error técnico de S3 (`notificationMessage`). Lo mismo en la campana.
- **Paginación**: "Cargar más" al pie de la tarjeta, 25 registros por página. Sin scroll interno (el scroll es el de la página).
- **Skeleton**: 7 filas animadas (`@keyframes sk-pulse`) con la misma forma que una fila real, dentro de la tarjeta.
- **Estado vacío / error**: dentro de la tarjeta, texto centrado. El error incluye botón "Reintentar".
- **Tiempo relativo** (`relativeTime()` en `notification-display.util.ts`): "ahora mismo" / "hace X min" / "hace X h" / "ayer HH:mm" / "DD/MM HH:mm" a partir de 48 h. Se recalcula en cliente; no se cachea el texto.
- **Backend consumido**: `GET /v1/notifications/` (con parámetros `read`, `type`, `skip`, `limit`), `GET /v1/notifications/counts`, `GET /v1/notifications/unread-count`, `PATCH /v1/notifications/{id}/read`, `POST /v1/notifications/read-all`, `DELETE /v1/notifications/{id}`, `POST /v1/notifications/bulk` (`{ids, action: "read" | "delete"}`).

---

## Funcionalidades transversales

- **Autenticación JWT** con interceptor HTTP que inyecta el `Bearer token` automáticamente, validación de expiración en cliente y logout que limpia la sesión.
- **Multi-tenant con roles jerárquicos** (`superadmin` > `admin` > `user`), condicionando qué acciones ve cada usuario en la UI.
- **Permisos por rol** (2026-11-02; el backend los exige con 403, la UI solo oculta):
  - `user`: chat, calificar, Mi perfil, Dashboard y Notificaciones; ver Documentos, Categorías y Asistentes; **subir documentos** y borrar o recategorizar **los suyos** (`AuthService.canManageDocument`).
  - `admin` / `superadmin`, además: crear, editar y borrar asistentes y categorías; gestionar documentos ajenos; Feedback IA y Preguntas sin respuesta (ocultos del menú y con `adminGuard` para el resto), y Usuarios de su empresa.
  - Solo `superadmin`: **Empresas** (`superadminGuard`; el backend exige superadmin en todo `/companies` salvo `/me`). Antes un admin de empresa veía el menú y entraba a una pantalla que solo recibía 403.
  - Antes la cuenta de demo de rol `user` podía borrar cualquier documento, borrar asistentes o indexar respuestas escritas a mano.
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

- ✅ **Auth — edición de perfil propio** (2026-10-25): resuelto, ver sección 1b.
- **Auth — registro público**: no existe ni como página ni en el backend. El
  frontend nunca lo conectó: sin un módulo de presupuesto/límites de gasto (ver
  `ALCANCE_TFM.md`, declarado fuera de alcance), abrir el registro a cualquiera
  dispararía llamadas reales a OpenAI sin control de cuota. El 2026-11-02 se
  eliminó también `POST /v1/auth/register` del backend: era público y tomaba
  `company_id` del cuerpo, así que permitía darse de alta en una empresa ajena.
  Los usuarios los crea un administrador desde Usuarios. No es trabajo
  pendiente, es una decisión de alcance.
  El login conservaba un método `goToRegister()` que apuntaba a una ruta
  inexistente, sin que ninguna plantilla lo invocara; se retiró.
- **Conversaciones (vista admin)**: listado/detalle administrativo de conversaciones (distinto del Chat IA de la sección 10) — no implementado.
- **Notificaciones**: ✅ completado (sección 12, 2026-08-16) — generación automática de eventos en el pipeline de documentos (processed / failed / deleted), listado paginado con 5 chips de filtro, badge en sidebar (grupo Analytics), tiempo relativo preciso, skeleton y estados de error/vacío dentro de la tarjeta.
- **Feedback IA (vista admin)**: implementado, con redición v2 (sección 11). Ruta `/feedback` activa con analytics completo. Pendiente: verificación end-to-end con datos reales en producción; backend de conversión de tema en bloque (`POST /feedback/theme-convert`); `samples`/`trend` en `/stats` para `ThemeCount` cuando el backend no los provee.
- **Knowledge Gaps** (preguntas sin respuesta): ✅ implementado. Las rutas
  `/knowledge-gaps` y `/knowledge-gaps/:id` están registradas en
  `app.routes.ts`, y tanto el feedback (sección 11, "Enviar a preguntas sin
  respuesta") genera y enlaza `KnowledgeGap` correctamente.
  - ✅ **Sin notificaciones** (2026-11-04): "Nueva pregunta sin respuesta" y
    "Pregunta resuelta" las creaba la acción de un admin (convertir, resolver)
    y le llegaban a él mismo; solo llenaban la bandeja. Se retiraron en los dos
    repos, con la pestaña "Sin respuesta" de Notificaciones, y la migración
    `d9f1b3c5a7e2` borró los ya emitidos. Lo pendiente ya lo
    muestra esta pantalla con su contador de abiertas.
  - ✅ **Retirado "Pedir documento"** (2026-11-03): asignaba la pregunta a una
    persona y la dejaba "en curso" sin resolverla, y junto a "Vincular
    documento" confundía. Quedan dos vías: **Vincular documento** y **Escribir
    respuesta** (más **Ignorar**). En cada fila, "Pedir doc" pasa a
    **Responder**, que abre "Escribir respuesta". Simétrico con el backend
    (endpoint `request-document` eliminado). Las preguntas que quedaran
    `in_progress` se tratan como abiertas; los avisos `document_requested` ya
    creados siguen llevando a Subir documento.
  - ✅ **Orden** (2026-11-03): **Más recientes** por defecto y **Más
    consultadas** (antes "Impacto"); se quitó "Antigüedad", que mostraba primero
    las más viejas.
  - ✅ **Un candidato por documento** (2026-11-03): "Vincular documento"
    mostraba el mismo documento repetido, uno por fragmento (agentes_ia.md tres
    veces con 0,78, 0,68 y 0,54). El backend devuelve ahora el mejor fragmento de
    cada documento, hasta tres documentos; el frontend agrupa también al mostrar
    (`candidatesOf`), para las preguntas creadas antes que ya guardaron los
    repetidos.
  - ✅ **Reincidencia real** (2026-11-01): la píldora "reincidente" nunca
    aparecía porque `recurrence_count` no se escribía en ningún sitio. Ahora,
    si una pregunta ya **resuelta** vuelve a llegar como fallo, el gap nuevo
    nace con `recurrence_count` = veces que se resolvió antes y `reopened_at`.
    Las ignoradas no cuentan. Tests en `test_feedback_convert_to_gap.py`.
  - ✅ Se quitó de cada fila el texto "N variantes", que siempre mostraba
    "0 variantes": `variants` no lo llena nada.
  - **Fuera de alcance, invisibles en la UI**: `variants` y `trend` de
    `KnowledgeGap` (pensados para un job en segundo plano que no existe; la
    tendencia nunca se pinta y su peso en la prioridad vale siempre 1,0), y el
    estado `stale` ("Obsoleto") de `Feedback`, que nada asigna. El código que
    los pinta se conserva pero no se muestra porque los datos nunca llegan.
- **Presupuesto/Uso**: configuración de límite mensual de gasto y alertas al 80%/100% — no implementado (el tipo de notificación `budget_*` ya existe en el modelo, a la espera del módulo).
- **Límites de empresa** (`max_users`, `max_documents`, `monthly_message_limit`): se guardan pero no se hacen cumplir; el formulario de Empresas lo dice (2026-11-01).
- ✅ **Asistente guardado en cada mensaje** (2026-11-02, migración `a1c3f5e7b902`): al reabrir una conversación se selecciona el asistente del último mensaje, y el feedback se atribuye al asistente que respondió, no al seleccionado en pantalla. Los mensajes anteriores quedan sin asistente (NULL) y se comportan como antes.
- ✅ **Empresas — selector de contexto** (2026-10-25): resuelto, ver sección 3. Queda pendiente extender `X-Company-Context` a más módulos que Documentos y Asistentes, si hace falta.
- **Widgets**: retirado de esta entrega — ver sección 9 y `ALCANCE_TFM.md`.
- ✅ **404** (2026-10-22): `shared/pages/not-found/`, reutiliza `EmptyStateComponent`. La ruta comodín (`**`) redirige a `/not-found` en vez de a `/auth/login` — antes era indistinguible de una sesión expirada.
- ✅ `adminGuard` quedó enganchado en `app.routes.ts` a las rutas `/companies` y
  `/users`; antes estaba escrito pero sin usar, y el control de acceso admin
  dependía solo de comprobaciones dentro de cada componente.
- ✅ **Streaming del Chat IA** (2026-10-24): resuelto, ver sección 10. La
  variable `wsUrl` que los entornos declaraban para un WebSocket que nunca se
  usó se había retirado antes; el streaming final se hizo con Server-Sent
  Events sobre HTTP, no WebSocket.
- ✅ **Persistencia de `sidebarOpen` y los cuatro grupos colapsables** (2026-10-22): vía `StorageService` (`sessionStorage`), con un `effect()` por señal en `DashboardLayoutComponent`. Sobrevive a cambiar de módulo (cada uno instancia su propia layout); se reinicia al cerrar la pestaña, que es lo esperado para una preferencia de UI, no para datos.
- ✅ **Interceptor global de errores HTTP** (2026-10-22): `core/interceptors/error.interceptor.ts`. 401 fuera del login fuerza `logout()` + redirección (antes solo pasaba si el usuario pulsaba "cerrar sesión"), 403 y errores de servidor (0 o ≥500) muestran un aviso genérico vía `NotificationService`. No toca los 4xx de negocio (404/409/422), que ya tienen su propio mensaje por componente — relanza el error en todos los casos para no romper ese manejo existente.
- ✅ **Loading skeletons en las listas de tabla** (2026-10-22): `shared/components/table-skeleton/`, componente genérico (`[rows]`, `[columns]`) en vez de uno a medida por página. Conectado en categorías, empresas, usuarios y documentos. De paso, se centralizó `@keyframes sk-pulse` en `styles.scss` — estaba duplicado con ligeras variantes en feedback-list, knowledge-gaps-list y notification-list.
- ✅ **Loading skeleton para `assistant-list`** (2026-10-24): `shared/components/card-skeleton/`, con la forma de `.al-card` (avatar circular, dos líneas de texto, insignias) y las mismas medidas que `.al-grid`/`.al-card` para que la cuadrícula no salte de tamaño al pasar del skeleton al contenido real. **No cubre** el dashboard (tarjetas de KPI, otra forma distinta).
- ✅ **ESLint configurado** (2026-10-23): `@angular-eslint` oficial (`ng add @angular-eslint/schematics@21`), con `ng lint` en `package.json`. Primera pasada: 90 avisos. Se resolvieron todos, sin apagar reglas a ciegas:
  - 21 por el *schematic* oficial de migración `ng generate @angular/core:inject` (inyección por constructor → `inject()`), automático y sin riesgo.
  - 2 elementos con interacción real pero sin soporte de teclado, corregidos de verdad (no solo silenciados): la tarjeta de `assistant-list` que navega al hacer clic, y la zona de arrastrar-y-soltar de `assistant-detail` — ambas ganaron `tabindex`, `role="button"` y `(keydown.enter/space)`.
  - El selector de documento candidato en `knowledge-gaps-list` pasó de un `<label>` sin control real (inaccesible de fondo) a un `<input type="radio">` oculto visualmente pero funcional, con foco visible.
  - El toast de `toast-host` ahora también se puede cerrar con teclado.
  - El resto (33 avisos) eran fondos de modal/drawer que cierran al clic-fuera y contenedores que solo detienen la propagación del clic — forzarlos a ser elementos de teclado habría sido peor accesibilidad, no mejor (un lector de pantalla no necesita tabular por un fondo invisible de pantalla completa). Se desactivó la regla línea por línea, con el motivo en un comentario, no un `rules: {}` global.
  - 8 comparaciones `== null`/`!= null` (cubren `null` y `undefined` a la vez en campos opcionales) se dejaron así a propósito, con la opción `allowNullOrUndefined` de la regla — convertirlas a `===` habría cambiado el comportamiento, no solo el estilo.
  - 14 manejadores `error: () => {}` de cargas de fondo no críticas (contador de notificaciones, filtros) se permitieron explícitamente, con la razón documentada en `eslint.config.js`.
  - 4 `*ngIf` del login migrados a `@if`, y 4 `@Output() cancel` renombrados a `cancelled` (nombre de evento nativo del DOM, podía chocar si el componente se usara sobre un elemento nativo).
- ✅ **Primeros tests unitarios** (2026-10-24): de 0 a 20, con Vitest (`@angular/build:unit-test`, ya configurado en `angular.json` pero sin ningún `.spec.ts` hasta ahora). Empezado por lo más crítico, igual que en el backend (umbral y abstención primero): los tres *guards* de ruta (`auth`, `admin`, `guest`), los dos interceptores (`auth`, `error` — el que se construyó el 2026-10-22) y `AuthService.isAuthenticated()` (la lógica de expiración del JWT que usan los *guards*). Verificado con sabotaje deliberado en dos casos: el *guard* de autenticación y la exclusión del login en el interceptor de errores — ambos detectaron la regresión introducida a propósito. **Sigue pendiente:** tests de componentes (servicios de features, formularios) y e2e; esto cubre solo el núcleo de seguridad/acceso, no la aplicación completa.
- ✅ **Soporte de archivos `.md`** (2026-10-24): se podía subir PDF, DOCX y TXT, pero no Markdown — el backend ya tenía un extractor de texto plano (`_extraer_txt`) listo para reutilizar, solo faltaba declarar el tipo como soportado. Se indexa con la sintaxis de marcado incluida (sin parsear Markdown). Actualizado en los tres puntos donde el frontend valida o menciona el tipo: `document-upload` (input + validación de extensión/MIME + mensaje de error), `assistant-detail` (zona de arrastrar-y-soltar) y el texto de onboarding del dashboard.
- ✅ **Vista previa de `.md` en el panel de fragmentos** (2026-10-24): como se indexa el `.md` tal cual, sin parsear, el panel de fragmentos (`ChunksDrawerComponent`, usado tanto en el detalle de un asistente como en el listado de documentos) lo mostraba como texto plano con `#`/`**`/etc. literales. Ahora, si el documento del fragmento termina en `.md`, su texto se convierte a HTML con `marked` y se inserta con `[innerHTML]`. El texto viene de un archivo subido por un usuario, así que antes de insertarse pasa por `DOMPurify.sanitize` y, después, por el propio saneamiento de Angular en `[innerHTML]` (no se usa `bypassSecurityTrustHtml`, que saltaría esa segunda capa) — Markdown admite HTML embebido por defecto, así que sin esto un `.md` con un `<script>` se ejecutaría en el navegador de quien abra el panel. El resto de tipos (PDF/DOCX/TXT) sigue mostrándose como texto plano. Verificado con sabotaje: se quitó temporalmente la llamada a `DOMPurify.sanitize` y los dos tests que comprueban que se elimina un `<script>` y un atributo `onerror` fallaron como se esperaba; restaurado después.
- **Deploy**: el frontend del TFM se sirve desde Vercel (`https://knowledgespace-tfm-frontend.vercel.app`, auto-deploy en cada push a `main` de este repositorio), contra el backend del TFM en Cloud Run (`europe-west1`); CORS gestiona la conexión entre ambos. Guía completa en `knowledgespace-tfm-backend/docs/TFM/DEPLOYMENT.md`. El proyecto de Vercel anterior (`knowledge-space-front-end.vercel.app`, 2026-08-14) pertenece al repositorio comercial.
