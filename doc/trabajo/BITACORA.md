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

## 2026-11-03 — Vincular documento: un candidato por documento

**Hecho:**
- En "Vincular documento" la pregunta #33 ofrecía agentes_ia.md tres veces
  (0,78, 0,68 y 0,54): eran tres fragmentos del mismo documento. Ahora sale una
  vez, con su mejor fragmento.
- Backend: `find_candidates` pide más fragmentos (`top_k * 4`) y se queda con el
  primero de cada documento, hasta `top_k` documentos. Test:
  `tests/test_candidatos_por_documento.py`.
- Frontend: `candidatesOf(gap)` agrupa por documento al mostrar y al vincular,
  porque las preguntas ya creadas guardaron los candidatos repetidos. Además la
  lista usaba `track c.document_id` con claves repetidas. Test:
  `knowledge-gaps-list.candidatos.spec.ts`.
- Verificado: frontend 63 tests, lint y build en verde; backend 250 tests.
- "Vincular y reindexar" e "Ignorar" tenían el botón pegado al candidato: 12 px
  de separación.
- Feedback IA: cada tarjeta muestra ahora la **pregunta** del usuario, en todas
  las calificaciones y resaltada. Una negativa decía "No encontré información
  sobre este tema" sin decir qué tema. El backend ya enviaba `question`; solo
  faltaba mostrarla. La respuesta calificada sigue solo en las de ≤ 3 estrellas.
- Feedback IA: el nombre del asistente, destacado dentro de la línea de fecha.
- Feedback IA: lista de 10 en 10 con "Ver 10 más" (10 y no 25: cada tarjeta mide unos 200 px). Antes se pedía sin límite y
  el backend devolvía 50: a partir del 51 la lista se cortaba sin avisar
  mientras las tarjetas de arriba contaban todos, y el filtro por estrellas
  filtraba solo esos 50 en el navegador. Ahora el filtro lo aplica el backend
  (`rating`, ya existía) y el contador dice "N comentarios · mostrando M". Test:
  `feedback-list.paginacion.spec.ts`. Frontend: 65 tests.
- Notificaciones: "Marcar todas como leídas" quedaba atenuado pero pulsable
  cuando ya no había nada que marcar, y no se sabía si había funcionado. Ahora
  solo aparece si hay no leídas, dice cuántas ("Marcar 5 como leídas") y
  desaparece al pulsarlo.
- Notificaciones: fuera el chip "Presupuesto" (módulo fuera de alcance; su
  único aviso, de junio, sigue en "Todas"). Subtítulo del user: decía "lo que te
  pidan los administradores", resto de "Pedir documento".
- Notificaciones **por usuario y con borrado**, en los dos repos. Backend: un
  aviso para admins se crea como una copia por admin activo (antes una fila
  compartida: marcarla leída se la quitaba a todos); `DELETE
  /notifications/{id}` y `DELETE /notifications/read`, solo sobre lo propio;
  migración de datos `c4e8a2f6d1b3` que reparte las filas compartidas; títulos
  "Nueva pregunta sin respuesta" / "Pregunta resuelta" en vez de "Brecha…"; el
  aviso de documento fallido ya no incluye el error técnico. Frontend: papelera
  por fila, "Eliminar N leídas" con confirmación, sin la píldora que repetía el
  título, y títulos y mensajes antiguos traducidos también en la campana.
  Tests: backend 256 (6 nuevos con SQLite en memoria), frontend 70.
- 2026-11-04, **selección al estilo Gmail** en Notificaciones: casilla por
  aviso, casilla general con menú Todas/Leídas/No leídas/Ninguna, y barra
  "N seleccionadas" con Marcar como leídas y Eliminar (confirmación si son
  varias). Backend: `POST /notifications/bulk` (`ids` + `action`), que filtra
  por propietario en la misma consulta; sustituye a `DELETE
  /notifications/read`, que se quitó junto con el botón "Eliminar N leídas".
  Tests: backend 264, frontend 75 (`notification-list.seleccion.spec.ts`).
- 2026-11-04, **fuera los avisos de preguntas sin respuesta**: "Nueva pregunta
  sin respuesta" y "Pregunta resuelta" los creaba la acción de un admin y le
  llegaban a él mismo (en la bandeja del autor, 9 de 11 eran de este tipo).
  Backend: convertir y resolver ya no notifican, `setup` no siembra esos tipos
  y se quitó `create_for_admins`, que no usaba nadie más. Frontend: fuera la
  pestaña "Sin respuesta"; un solo subtítulo para todos. Los 22 avisos
  antiguos (11 nuevas, 11 resueltas) los borra la migración de datos
  `d9f1b3c5a7e2`, para que tampoco salgan en "Todas"; con ellos se quitaron
  del frontend los títulos y acciones que solo servían para ese tipo. Tests:
  backend 263, frontend 74.
- 2026-11-04, **CHANGELOG** pasa del backend a la raíz del frontend, puesto al
  día desde el 2026-10-17, con la regla nº 4 en `doc/CLAUDE.md` para
  actualizarlo cada día.
- 2026-11-04, **documentos obsoletos eliminados**: en el backend
  `AWS_S3_IMPLEMENTACION.md`, `DEVELOPMENT_GUIDE.md` y
  `ESTADO_SOFTWARE_ENTREGA.md`; en el frontend `doc/ia-handoff/` (13 archivos:
  maquetas HTML, README, tres `MODELO_DATOS.md` idénticos, tres `support.js` y
  un `.zip` del proyecto de diseño). Nadie los enlazaba salvo FEATURES, ya
  corregido.
- Corregido en el backend (`RAG_PIPELINE.md`, `PINECONE_VECTORES.md`): decían
  que el chat cae al namespace de empresa; eso solo lo hace la búsqueda de
  candidatos.

**Decisiones / notas:**
- No toca el RAG del chat: solo la búsqueda de candidatos de esta pantalla.
- Probado antes por el autor, con datos reales, el ciclo completo: "que es un
  agente?" sin respuesta en EBIS → feedback → pregunta sin respuesta → respuesta
  escrita → EBIS responde citando "Respuesta directa" (0,73). En Demo responde
  con agentes_ia.md: cada asistente ve solo su conocimiento.

**Pendiente para después:**
- Propuestas sin decidir: mostrar en el panel a qué asistente se añade la
  respuesta, y ocultar el recuadro "·" de fragmento en las respuestas directas.

---

## 2026-11-03 — Preguntas sin respuesta: se retira "Pedir documento"

**Hecho:**
- Retirado "Pedir documento" de Preguntas sin respuesta, en los dos repos. En
  el frontend: la pestaña, el selector de responsable, la nota, la píldora "en
  curso" y `requestDocument()` del servicio. En el backend: el endpoint
  `request-document`, el aviso `document_requested` y su siembra.
- Se mantienen **Vincular documento** y **Escribir respuesta**. En la fila,
  "Pedir doc" pasa a **Responder**, que abre "Escribir respuesta". Sin
  candidatos, el panel abre en "Escribir respuesta".
- Orden: **Más recientes** por defecto y **Más consultadas** como segunda
  opción; se quitó "Antigüedad". El backend acepta `sort=recent|impact`.
- Pie de lista: "15 preguntas en abiertas" → "15 preguntas abiertas".
- Manual de usuario, `FEATURES.md` y `ALCANCE_TFM.md` del backend
  actualizados. `FEATURES.md` decía además que el backend tenía el registro
  público completo; ya no existe desde el 2026-11-02, y se corrigió.
- Verificado: frontend 61 tests, lint y build en verde; backend 247 tests.

**Decisiones / notas:**
- Motivo: el administrador resuelve respondiendo o con un documento; pedírselo
  a otra persona no resolvía nada y se confundía con "Vincular documento".
- Se conservan las columnas `assigned_to`/`requested_at`/`due_at` y la migración
  `b7d2e4f6a813` (aplicada en producción). Una pregunta `in_progress` se trata
  como abierta, para que no quede atascada.
- La memoria del TFM no mencionaba "Pedir documento": no hay que tocarla por
  esto, salvo el número de tests del 6.1 al cerrar el código.

**Pendiente para después:**
- Volver a actualizar el número de tests del apartado 6.1 de la memoria cuando
  se congele el código.

---

## 2026-11-02 — Prueba de cada botón con datos "[PRUEBA TFM]" (crear, editar, borrar)

**Bugs reales encontrados y corregidos:**
- **Crear categorías y empresas daba 500 desde siempre** en este repo:
  `categories.is_active` y `companies.is_active` son INTEGER en la BD y los
  modelos los declaraban `Boolean`. Nuevo tipo `app/db/types.py::IntBoolean`
  (booleano en Python, 0/1 en BD); no se tocó el esquema. Revisadas todas las
  columnas modelo↔BD: solo esas dos. `test_int_boolean.py`.
- **Restablecer contraseña (Usuarios) nunca funcionó y filtraba la contraseña
  a los logs**: el frontend la mandaba como `?new_password=` en la URL y el
  backend la espera en el cuerpo (422). Ahora va en el body.
- **Subir documento (pantalla principal): los selectores de asistente y
  categoría salían vacíos.** La app no usa zone.js y el componente asignaba
  campos planos en callbacks HTTP. Todo lo subido desde ahí quedaba "sin
  asistente", invisible para el chat. Mismo fallo en el **login**: con
  contraseña incorrecta no salía el mensaje. Corregidos con `markForCheck`.
- **Buscador del chat**: rellenaba el mensaje de `<mark>` entre cada letra
  (los marcadores eran caracteres invisibles que se perdieron → `''`). Ahora
  son escapes `/`; `chat-detail.highlight.spec.ts`. El icono del
  botón de buscar no se veía (iba en `[ngClass]`) y abrir la búsqueda no daba
  foco al campo.
- **Chat**: la cabecera "Chat IA" desapareció con el cambio de ayer
  (conversación perezosa) → repuesta. Los asistentes nuevos no aparecían en el
  drawer hasta recargar → se recargan al abrirlo. La fuente "Respuesta
  directa" mostraba un botón de descargar que no hacía nada → oculto.
- **Notificaciones**: la campana y el menú lateral tenían cada uno su
  contador; "Marcar todas como leídas" no movía ninguno. Ahora es un signal
  compartido en `NotificationsService`; `notifications.service.spec.ts`.
- **Preguntas sin respuesta**: al resolver, la lista pasaba a la siguiente sin
  enseñar la verificación y los errores eran silenciosos → avisos con
  "verificada 0.57 → 1.00" y mensaje de error. El enlace directo mostraba
  "Nada pendiente" mientras cargaba. Motivo vacío en ignoradas antiguas.
- **Feedback · Exportar CSV**: sin BOM (Excel rompía tildes) y fecha en UTC sin
  decirlo → BOM + columna `fecha_utc`; `test_feedback_export_csv.py`.
- **Empresas**: un 422 salía como "Error al crear" genérico → ahora dice qué
  campo revisar.

**Verificado de punta a punta:** asistente nuevo con sugerencia rápida → subir
documento → procesado → chat lo responde y lo cita → pulgar arriba/abajo →
feedback → pregunta sin respuesta → vincular documento (verificada 0.57 → 1.00)
/ pedir documento / escribir respuesta (0.89 → 0.90) / ignorar con motivo →
notificaciones → exportar CSV. CRUD completo de categoría, empresa y usuario
(con restablecer contraseña), filtros y buscadores de todas las listas.

**Decisiones / notas para la defensa:**
- La verificación tras **vincular** da ~1.00 por construcción: se indexa la
  pregunta como alias y se verifica con esa misma pregunta. No prueba que el
  documento responda.
- La #2 "resuelta" en junio da 0.00 al reverificar: su vector ya no está.
- ✅ Resuelto el mismo día: los mensajes no guardaban su asistente y calificar
  en una conversación reabierta atribuía el feedback al seleccionado en
  pantalla. Migración `a1c3f5e7b902` (`messages.assistant_id`, NULL permitido,
  `ON DELETE SET NULL`), aplicada con permiso del autor; el feedback toma el
  asistente del mensaje (solo si es de la propia empresa) y el chat selecciona
  el de la conversación al reabrirla. Tests: `test_feedback_asistente_del_mensaje.py`,
  `test_chat_router_stream.py`, `chat-detail.asistente.spec.ts` (sabotaje
  verificado). Backend 222 tests, frontend 55.
- El texto indexado de un .txt mostró "12. 500 pesos" (espacio dentro de la
  cifra) — pendiente de investigar en la extracción.
- Los avisos de herramienta de edición escribieron `` y `﻿` como
  caracteres invisibles literales; se reescribieron como escapes.

**Cierre de la prueba:** borrados los documentos 46/47 (Pinecone limpio, también
el alias de la #36) y el asistente de prueba 5 —el chat lo quitó sin recargar—.
Editar asistente, guardar perfil, abrir notificación desde la campana (los dos
contadores bajan a la vez), cerrar sesión y login con credenciales falsas
("Email o contraseña incorrectos" ya se muestra): verificados.

- ✅ Cabecera tras el login verificada por el autor: con su cuenta (empresa 3)
  muestra "Logit" con punto verde (su propia empresa).
- **Datos de prueba que se conservan a propósito** (decisión del autor), todos
  marcados "[PRUEBA TFM]" o creados en esta prueba: notificaciones 25–31,
  feedbacks 14–17, preguntas sin respuesta #35–#37, conversaciones 2187–2197 y
  el vector `gap-35-answer` en el namespace de Demo.

---

## 2026-11-02 (tarde) — Permisos por rol, probados con la cuenta de usuario normal

**Hallazgo:** con la cuenta de demo de rol `user` el frontend solo ocultaba
Empresas y Usuarios; el backend no frenaba nada más. Podía borrar cualquier
documento, crear/borrar asistentes y categorías, indexar respuestas escritas a
mano en Preguntas sin respuesta y ver/exportar el feedback de todos con nombre.

**Hecho:**
- Regla acordada con el autor: un usuario aporta (chatea, califica, sube y
  gestiona lo suyo); lo que cambia lo que el asistente responde a todos, o
  expone datos de otros, es de admin.
- Backend: `get_current_admin_user` en las escrituras de asistentes y
  categorías, en todo `knowledge_gaps` (dependencia del router) y en las
  lecturas/gestión del feedback ajeno; documentos con "dueño o admin"
  (`_exigir_dueno_o_admin`). `tests/test_permisos_por_rol.py` recorre el árbol
  de dependencias de cada ruta (sabotaje verificado).
- "Pedir documento" ahora avisa al responsable (`document_requested`);
  `tests/test_aviso_documento_solicitado.py`. Migración de datos
  `b7d2e4f6a813` para sembrar el tipo: **pendiente de aplicar** (el permiso
  automático la bloqueó como despliegue); sin ella el aviso no se crea, sin
  romper nada.
- Frontend: menú sin Feedback IA ni Sin respuesta para `user`; `adminGuard` en
  esas rutas y en crear/editar asistente; botones de gestión ocultos según
  `AuthService.isAdmin()` / `canManageDocument()`; la notificación nueva lleva a
  Subir documento.
- Verificado en el navegador con la cuenta de usuario: menú, redirecciones,
  botones (solo sobre su propio documento), subir y borrar uno propio, y 403
  del backend en 10 llamadas de gestión frente a 200 en las de lectura.
- Backend 249 tests, frontend 58; lint y build en verde.

---

## 2026-11-01 — Pulido de Feedback y Preguntas sin respuesta: lo que la UI prometía y nadie llenaba

**Hecho (backend `api/`):**
- **Reincidencia real.** `KnowledgeGap.recurrence_count` y `reopened_at` no
  los escribía ningún sitio, así que la píldora "reincidente" nunca salía.
  Nuevo `FeedbackRepository._contar_resueltos_iguales`: si una pregunta ya
  **resuelta** (mismo texto normalizado, mismo asistente) vuelve a llegar como
  fallo, el gap nuevo nace con `recurrence_count` = resoluciones previas y
  `reopened_at`. Las ignoradas no cuentan. 5 tests nuevos en
  `test_feedback_convert_to_gap.py`.
- **Textos vacíos rechazados en la API.** `KnowledgeGapAnswerRequest.answer_text`
  y `FeedbackConvertGap.question` ahora recortan espacios y exigen
  `min_length=1`; antes solo lo impedía el frontend y una llamada directa
  habría indexado un vector vacío en Pinecone. Nuevo
  `tests/test_schemas_texto_no_vacio.py` (7 casos).
- Suite: 198 → 210 tests, ruff limpio. Verificado por sabotaje: quitar la
  reincidencia o el recorte hace caer 5 tests; restaurado, pasan todos.
- `ALCANCE_TFM.md`: cifra de tests corregida (decía 26 archivos/176 tests → 31/210).

**Hecho (frontend):**
- `knowledge-gaps-list`: el pie decía "Agrupadas por similitud semántica" y
  agrupa por texto exacto → corregido. Quitado de cada fila el "N variantes",
  que mostraba siempre "0 variantes".
- `FEATURES.md`: registro público marcado como decisión de alcance (sin
  control de cuota, abrirlo dispararía gasto real en OpenAI), y sección de
  Knowledge Gaps con lo resuelto y lo que queda fuera.
- 43 tests de Vitest y `ng lint` en verde.

**Prueba de punta a punta en el navegador (Claude in Chrome, local contra la BD real):**
- Recorridas todas las pantallas (Dashboard, Documentos, Etiquetas,
  Categorías, Asistentes, Empresas, Usuarios, Notificaciones, Mi perfil,
  Feedback, Preguntas sin respuesta, Chat IA en drawer y en `/chat/:id`,
  selector de empresa): sin errores de consola ni respuestas 4xx/5xx.
- **Objetivo 4 verificado de punta a punta:** la pregunta del horario de
  soporte (#34, resuelta a mano) ya la responde el chat citando "Respuesta
  directa" al 89 %; calificada con 1 estrella y enviada desde Feedback, nace
  la #35 marcada **reincidente**, con su notificación y enlace profundo.
- **Bug grave corregido — conversaciones vacías:** el drawer del chat está
  montado en el layout aunque esté cerrado, y su `ngOnInit` creaba una
  conversación en cada carga de página. En la BD: **1.985 de 2.181
  conversaciones vacías (91 %)**. Ahora se crea con el primer mensaje
  (`chat-detail.component.ts`, `sendMessage`). Verificado: navegar ya no hace
  ningún `POST /conversations`, y dos mensajes seguidos usan una sola.
- **Selector de empresa tras el login:** `getMyCompany()` llevaba
  `takeUntilDestroyed` y la navegación inmediata al dashboard destruía el
  login y cancelaba la petición; la cabecera quedaba en "KnowledgeSpace" con
  el punto naranja de "viendo otra empresa". Quitado (pendiente de
  verificar con un login real).
- **Textos que prometían lo que no existe**, corregidos: subtítulo "agrupado
  por intención"; "Las variantes ya citan esta fuente"; "Se reejecuta cada
  lunes… se reabre sola" (no hay ningún proceso programado); recomendación
  "el contenido ya existe en X… se reindexa con estas variantes" (un 0,35
  sobre un documento no relacionado); Temas de Feedback decía "No hay temas
  identificados" cuando la agrupación no existe.
- Quitado el botón **"Informe mensual"**, que no tenía ninguna acción.
- **Calificar en el chat ahora es definitivo:** volver a pulsar el pulgar lo
  "desmarcaba" solo en pantalla —la fila seguía en BD— y al recalificar se
  creaba otra fila. No existe endpoint para borrar feedback.
- Feedback: el botón "Enviar a preguntas sin respuesta" se oculta si ya se
  envió (antes un segundo clic daba 409).
- Chat: al abrir "¿Qué estuvo mal?" la hora y el costo quedaban flotando a
  media altura y los botones se desplazaban; corregida la maquetación.
- `ng build --configuration production` pasa; el aviso de presupuesto de
  `chat-detail.component.scss` (18,8 kB / 16 kB) ya existía.

**Auditoría de todo el menú, opción por opción (formularios abiertos y cancelados, sin guardar):**
- Notificaciones: "Ver documento →" llevaba a `/documents/:id`, ruta que no
  existe (404) → ahora a la lista. La campana solo marcaba como leída sin
  navegar → ahora lleva al mismo destino que la página (`notificationAction`
  en `notification-display.util.ts`, compartida).
- Documentos: el menú de categoría quedaba recortado por `overflow: hidden`
  de la tabla y no se podía usar con pocas filas → corregido.
- Subir documento: aviso cuando no se elige asistente. El chat siempre
  consulta el espacio de un asistente y no hay forma de asignar después un
  documento ya subido: sin asistente, ningún chat lo vería.
- Preguntas sin respuesta: más textos sobre "variantes" e "informe mensual"
  que no existen, corregidos.
- Empresas: las columnas "Usuarios"/"Documentos" mostraban los máximos del
  plan, no los totales → renombradas. Ningún límite se aplica
  (`monthly_message_limit` nunca se lee; `max_users` solo en el registro
  público, deshabilitado; `max_documents` nunca) → aviso en el formulario.
- Verificado sin incidencias: Dashboard, filtros de Feedback (periodo,
  asistente, estrellas), Etiquetas y Categorías (validación, crear/editar),
  Asistentes (gestionar, configuración, editar), Usuarios (restablecer
  contraseña, nuevo usuario), Mi perfil (validaciones), selector de empresa,
  menú de perfil, menú lateral plegable.

**Decisiones / notas:**
- Una auditoría completa de ambos módulos encontró campos "fantasma" (modelo
  y UI construidos, nada que los llene): `variants` y `trend` de
  `KnowledgeGap`, y el estado `stale` de `Feedback`. Solo se arregló lo que
  el usuario veía mal o lo que da valor a la defensa (reincidencia = prueba
  de que el ciclo del Objetivo 4 detecta una resolución que no funcionó); lo
  invisible se documenta como fuera de alcance.
- No existe `BACKLOG_FRONTEND.md` en el repo, aunque `doc/CLAUDE.md` lo pide.

**Pendiente para después (decisiones del autor):**
- ✅ **Etiquetas retiradas** (2026-11-02, decisión del autor): eran un CRUD que
  nunca se vinculó a documentos y la categoría ya cubre la organización.
  Frontend: fuera la ruta `/tags`, la entrada del menú, `features/tags/` y
  `tag.model.ts`. Backend: fuera router, repositorio y esquemas; se conserva el
  modelo `Tag` (la tabla tiene 3 filas). Test nuevo
  `test_etiquetas_retiradas.py`, verificado por sabotaje. Backend 209 tests,
  frontend 43, lint y build en verde.
- Notificación antigua "Advertencia de presupuesto" (20-06, era comercial) y
  chip "Presupuesto" visibles, con el módulo fuera de alcance.
- Usuario "Auth Test User" (auth-test@example.com, Admin) visible en la demo.
- Las conversaciones no guardan su asistente: al reabrir una de EBIS sale
  seleccionado Demo. Arreglarlo exige cambio de esquema.
- ✅ Hecho (con confirmación): borradas **1.980 conversaciones vacías** (869 de
  la empresa 3, 1.111 de la 8; del 16-05 al 30-10). Solo las sin mensajes, sin
  referencias en `cost_tracking` ni `knowledge_gaps`, y de más de 1 hora; en
  una transacción que se revertía si el número no coincidía con la simulación.
  Quedan 203 conversaciones, 5 vacías (las de la prueba de hoy) y 0 mensajes
  huérfanos.
- Datos de prueba creados hoy: conversación #2188 con feedback "[PRUEBA TFM]",
  pregunta sin respuesta #35 (reincidente) y su notificación.
- El backend local tarda varios segundos por petición (BD remota); el primer
  mensaje del chat tardó ~15 s.
- CI (tests + lint como compuerta) — propuesto un workflow de GitHub Actions
  por repo, sin tocar el despliegue de Vercel/Cloud Run; pendiente de decisión.
- Fallback silencioso `chunk_id = 0` en `find_candidates` cuando falta
  `chunk_index` en Pinecone (cosmético).

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
- `doc/trabajo/FEATURES.md`: sección 9 reescrita; widget fuera del flujo de valor y de
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
- **Documentación**: `doc/trabajo/FEATURES.md` sección 12 reescrita con tabla de eventos de backend, descripción completa de la página y lista de endpoints. Sección "Pendientes" actualizada.

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
- **Documentación automatizada**: creado `.github/workflows/bitacora.yml` — en cada push a `main` inserta automáticamente una entrada en `doc/trabajo/BITACORA.md` con hash, autor, mensaje y archivos modificados.

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
- Documentación: actualizado `doc/trabajo/FEATURES.md` (sección 10 — Chat IA, transversales, pendientes) y `BACKLOG_FRONTEND.md` (Módulo 5 marcado completo). Creado este archivo (`BITACORA.md`).
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
