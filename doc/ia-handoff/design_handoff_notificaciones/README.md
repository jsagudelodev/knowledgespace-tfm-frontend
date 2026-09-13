# Handoff: Módulo de Notificaciones — KnowledgeSpace

## Overview

Bandeja de avisos de la empresa: documentos procesados o fallidos, consumo de presupuesto, preguntas sin respuesta y actividad de usuarios. Vive en el menú lateral bajo **Analytics → Notificaciones** y lee de la tabla `notifications`.

La pantalla tiene un único trabajo: **decir qué pasó y llevar al sitio donde se arregla**. Cada fila es un enlace a su destino real, no un texto informativo. Si una notificación no puede llevar a ninguna parte, no debería existir.

Dos decisiones de diseño que conviene entender antes de implementar, porque son la razón de que el módulo sea útil y no ruido:

1. **Agregación por defecto para preguntas sin respuesta.** Con 143 consultas fallidas al mes, una notificación por pregunta convierte la bandeja en basura y nadie la abre. Se envía **un resumen semanal** ("3 preguntas nuevas sin respuesta esta semana · 74 consultas afectadas"). Solo se emite un aviso individual cuando cruza un umbral que justifica interrumpir a alguien: volumen alto en poco tiempo, o **reincidencia** (una pregunta que se resolvió y volvió a fallar). Esta regla es el módulo; si se implementa una notificación por evento, el módulo pierde su valor.
2. **Orden estrictamente cronológico con separadores de día.** La lista se ordena por antigüedad antes de renderizar, y la primera fila de cada grupo lleva un separador `Hoy` / `Ayer` / `Anteriores`. Saber dónde acaba lo de hoy es lo que evita releer toda la bandeja.

## About the Design Files

Los archivos de este paquete son **referencias de diseño creadas en HTML** — prototipos que muestran la apariencia y el comportamiento previstos, no código de producción para copiar tal cual.

La tarea es **recrear estos diseños en el entorno existente del código destino** (React, Vue, etc.) usando sus patrones y librerías establecidos. Si aún no existe un frontend, elegir el framework más apropiado e implementar allí.

El prototipo usa estilos en línea y datos de ejemplo embebidos. En producción todo dato viene del backend; los datos del prototipo solo definen la *forma* de la respuesta esperada.

## Fidelity

**Alta fidelidad (hifi).** Colores, tipografía, espaciado y estados finales. Reconstruir fiel al pixel con las librerías del codebase. Todos los valores exactos están en "Design Tokens".

## Nomenclatura

- `knowledge_gaps` se presenta al usuario como **"Preguntas sin respuesta"**. No usar "brechas" ni "gaps" en ningún texto de interfaz.
- Los valores de `notification_types.name` (`document_processed`, `budget_warning`…) nunca se muestran crudos: se traducen con el catálogo de etiquetas de la sección "Tipos y etiquetas".
- Los textos de las notificaciones se escriben en español, en tercera persona y sin signos de exclamación. Nunca "¡Atención!" ni "Oops".

## Screens / Views

### Pantalla única: Notificaciones

**Propósito:** un administrador entra, ve qué requiere su atención hoy y sale hacia el sitio donde se resuelve.

**Ruta sugerida:** `/analytics/notifications`
**Breadcrumb del header:** `analytics / notificaciones`
**Ítem activo del sidebar:** grupo "Analytics" → "Notificaciones"
**Contador del sidebar:** número de no leídas, junto al ítem del menú.

#### Layout general

Contenedor de sección: `padding: 28px 26px 44px; max-width: 1000px; display: flex; flex-direction: column; gap: 18px`. Fondo de página `#f7f8fa`.

`max-width: 1000px` es deliberado y más estrecho que el resto de las pantallas del producto (1320–1440px): es una lista de texto, y una línea de 1400px se lee mal. No ensancharlo.

Orden vertical:
1. Encabezado con la acción "Marcar todas como leídas"
2. Fila de chips de filtro
3. Tarjeta única con la lista

No hay columna lateral, ni KPIs, ni gráficos. Se evaluaron y se descartaron (ver "Lo que se quitó a propósito").

#### 1. Encabezado

`display: flex; align-items: flex-end; gap: 16px`.

Izquierda (`flex: 1`, columna, `gap: 3px`):
- H1 "Notificaciones" — 24px/650, `letter-spacing: -0.02em`
- Subtítulo — 13px, `#667085`: "Documentos, presupuesto y preguntas sin respuesta de tu empresa."

Derecha: botón secundario **"Marcar todas como leídas"** — `padding: 8px 14px; border-radius: 8px; border: 1px solid #e3e6eb; background: #fff; font-size: 12.5px; font-weight: 500; color: #344054`, hover `background: #f7f8fa`.

El botón se mantiene visible aunque no haya no leídas (deshabilitarlo produce un salto de estado que confunde más de lo que informa). Si se prefiere, atenuar a `color: #98a2b3` cuando el contador sea 0.

#### 2. Chips de filtro

`display: flex; align-items: center; gap: 8px; flex-wrap: wrap`.

Cinco chips, en este orden: **Todas · No leídas · Documentos · Presupuesto · Sin respuesta**.

Cada chip: `display: flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 99px; font-size: 12.5px; cursor: pointer`.
- Inactivo: `border: 1px solid #e3e6eb; background: #fff; color: #475467`
- Activo: `border: 1px solid #2563eb; background: #eff6ff; color: #1d4ed8; font-weight: 500`

Cada chip lleva su recuento a la derecha del texto, dentro del mismo chip: `font-family: 'IBM Plex Mono', monospace; font-size: 11px`, color `#b6bcc7` inactivo / `#60a5fa` activo.

Los recuentos se calculan **sobre el total, no sobre el filtro activo** — son constantes al navegar, que es lo que permite usarlos para decidir dónde mirar.

Correspondencia de filtros con `notification_types.name`:

| Chip | Criterio |
|---|---|
| Todas | sin filtro |
| No leídas | `read_at IS NULL` |
| Documentos | `name LIKE 'document%'` |
| Presupuesto | `name LIKE 'budget%'` |
| Sin respuesta | `name LIKE 'knowledge%'` |

#### 3. Lista

Tarjeta contenedora: `background: #fff; border: 1px solid #e8eaee; border-radius: 11px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); overflow: hidden`. Sin padding propio: las filas llegan a los bordes.

**Separador de día.** Antes de la primera fila de cada grupo: `padding: 11px 20px 9px; background: #fbfcfd; border-bottom: 1px solid #f1f2f5; font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #98a2b3`. Textos: `Hoy` (menos de 24 h), `Ayer` (24–48 h), `Anteriores`.

**Fila.** `display: flex; align-items: flex-start; gap: 13px; padding: 15px 20px 15px 14px; border-bottom: 1px solid #f1f2f5; cursor: pointer`. Fondo `#fff` si leída, `#fcfdff` si no. Hover `#f8fafc`. Toda la fila es clicable, no solo el enlace de acción.

De izquierda a derecha:

1. **Punto de no leída** — `width: 5px; height: 5px; margin-top: 7px; border-radius: 99px; background: #2563eb`; `transparent` si está leída (se conserva el espacio para que el texto no baile).
2. **Icono de tipo** — `width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600`, con el fondo tenue y el color del tipo (tabla siguiente). Contiene **la primera letra de la etiqueta del tipo**. Si el codebase tiene librería de iconos, sustituir la letra por el icono manteniendo caja y color.
3. **Cuerpo** (`flex: 1; min-width: 0`, columna, `gap: 3px`):
   - Fila de título: título + píldora de tipo, `gap: 9px`. Título 13.5px, `color: #101828`, peso 600 si no leída / 500 si leída. Píldora: `padding: 2px 8px; border-radius: 99px; font-size: 10.5px; font-weight: 500`, con fondo tenue y color del tipo.
   - Mensaje — 12.5px, `#667085`, `line-height: 1.5`, `text-wrap: pretty`.
4. **Columna derecha** (columna, `align-items: flex-end; gap: 6px; white-space: nowrap`):
   - Tiempo relativo — `'IBM Plex Mono', monospace; font-size: 11px; color: #98a2b3`
   - Enlace de acción — 12px, peso 500, `#2563eb`, con `→` al final y subrayado en hover. El texto del enlace es específico del tipo ("Ver documento", "Ver costos", "Resolver", "Revisar", "Ver la lista"), nunca genérico tipo "Ver detalle".

**Estado vacío.** `padding: 46px 20px; text-align: center; font-size: 13px; color: #98a2b3` — "No hay notificaciones en este filtro." Dentro de la tarjeta, no en toda la página.

**Volumen.** Con muchas notificaciones, paginar de 25 en 25 con "Cargar más" al pie de la tarjeta; no scroll interno (a diferencia de Preguntas sin respuesta, aquí no hay panel lateral que deba quedar fijo, así que el scroll natural de la página funciona mejor).

## Tipos y etiquetas

Catálogo de `notification_types` con su presentación. La primera letra de la etiqueta es la que va en el icono.

| `name` | Etiqueta visible | Color | Fondo | Destino al hacer clic |
|---|---|---|---|---|
| `document_processed` | Documento listo | `#10b981` | `#ecfdf5` | ficha del documento |
| `document_failed` | Error de documento | `#ef4444` | `#fef2f2` | ficha del documento, con el motivo del error |
| `document_uploaded` | Documento subido | `#3b82f6` | `#eff6ff` | ficha del documento |
| `budget_warning` | Advertencia de presupuesto | `#f59e0b` | `#fffbeb` | pantalla de Costos |
| `knowledge_gap_found` | Pregunta sin respuesta | `#8b5cf6` | `#f5f3ff` | lista de preguntas, o la pregunta concreta |
| `knowledge_gap_resolved` | Pregunta resuelta | `#10b981` | `#ecfdf5` | la pregunta, con su verificación |
| `user_invited` | Usuario invitado | `#3b82f6` | `#eff6ff` | pantalla de Usuarios |
| `system_alert` | Alerta del sistema | `#ef4444` | `#fef2f2` | según `data` |

**Regla de coherencia crítica:** si el mensaje cita una pregunta o un documento concreto, el destino debe ser **ese mismo** registro. Un clic que aterriza en algo distinto de lo que se acaba de leer destruye exactamente la confianza que el producto vende. Verificar en pruebas que `data.gap_id` corresponde a la pregunta citada en el texto.

## Interactions & Behavior

**Clic en la fila.** Marca como leída y navega al destino, en ese orden. Un solo clic hace las dos cosas: no hay botón separado de "marcar como leída" por fila.

**Marcar todas como leídas.** Marca todas las **actualmente visibles bajo el filtro activo**, no toda la tabla. Si el filtro es "No leídas", la lista queda vacía y muestra el estado vacío.

**Filtros.** Cambian solo la lista; no alteran el orden ni los recuentos de los chips.

**Sin reordenar por leídas.** Una notificación leída se queda en su posición cronológica. Mover filas al leerlas hace perder el sitio.

**Sin marcado automático al ver.** Solo se marca por clic explícito o por "Marcar todas". Marcar al hacer scroll vacía la bandeja sin que el usuario decida.

**Tiempos relativos.** "hace 8 min", "hace 1 h", "ayer 19:04", y fecha `DD/MM HH:mm` a partir de 48 h. Recalcular en cliente; no cachear el texto.

**Carga.** Esqueletos con la forma de la fila (7 filas), dentro de la tarjeta. Sin spinner de página completa.

**Error.** Mensaje en línea dentro de la tarjeta.

**Accesibilidad.** La fila es un elemento interactivo real (`button` o `a`), navegable con teclado y con `aria-label` que incluya título y estado de lectura. El punto azul no es la única señal de no leída: el peso del título también cambia.

## State Management

| Estado | Tipo | Por defecto | Efecto |
|---|---|---|---|
| `filter` | string | `"Todas"` | Filtra la lista; no afecta a los recuentos de los chips |
| `read` | mapa `{id: bool}` | `{}` | Superposición optimista sobre `read_at` del servidor |

El agrupado por día es derivado, no estado: se calcula recorriendo la lista ya ordenada y comparando el día de cada fila con el de la anterior.

## API Endpoints

- `GET /api/notifications?filter=&cursor=` — lista paginada, ordenada por `created_at DESC`, con el tipo ya resuelto (`name`, etiqueta, color) y el `data` de destino.
- `GET /api/notifications/counts` — recuentos por filtro y total de no leídas, en una sola respuesta (los usa el sidebar y los chips).
- `POST /api/notifications/:id/read` — marca una.
- `POST /api/notifications/read-all` — acepta el filtro activo como parámetro.

## Cambios de base de datos requeridos

Tabla `notifications` actual: `id`, `company_id`, `user_id`, `notification_type_id`, `title`, `message`, `data` (JSON), `read_at`, `created_at`. Cubre lista, filtros y estado de lectura. Falta:

1. **Índice `(user_id, read_at)`** y **`(company_id, created_at DESC)`** para el contador de no leídas y la paginación. Sin ellos el badge del sidebar se vuelve la consulta más cara de la aplicación.
2. **`group_key`** String(80) nullable, indexado. Es lo que permite la agregación: todas las preguntas nuevas de la semana comparten `gap_digest:2026-W33` y se colapsan en un solo registro que se va actualizando. Sin esta columna no hay resumen semanal, y sin resumen semanal la bandeja se satura.
3. **`data` con contrato fijo por tipo**, no libre: `{document_id}` para documentos, `{gap_id}` para preguntas, `{period}` para presupuesto, `{count, affected}` para el resumen. Documentarlo y validarlo al insertar; el frontend construye la navegación desde ahí.
4. **`severity`** String(10), default `'info'`: `info` / `warning` / `critical`. Es el criterio para decidir qué se agrega y qué se emite individualmente, y más adelante qué se envía por correo.

Todos son columnas nuevas nullable o índices; ninguno rompe lo existente.

**Job de agregación (semanal, lunes).** Cuenta las preguntas sin respuesta creadas en la semana y sus consultas afectadas, e inserta o actualiza el registro con `group_key = 'gap_digest:<ISO week>'`. Si en la semana no hubo ninguna, no emite nada: una notificación que dice "0 novedades" enseña a ignorar la bandeja.

**Emisión individual (excepción).** Solo en dos casos, ambos con `severity = 'warning'`: pregunta con volumen alto en menos de 48 h (umbral configurable, sugerido 20 consultas), y pregunta **reincidente** — la reverificación semanal la devolvió por debajo del umbral después de haberse resuelto.

**Retención.** 90 días de notificaciones leídas; las no leídas no se borran. Purga por job, no en caliente.

## Design Tokens

**Colores**

| Uso | Valor |
|---|---|
| Fondo de página | `#f7f8fa` |
| Superficie de tarjeta | `#ffffff` |
| Fila no leída | `#fcfdff` |
| Hover de fila | `#f8fafc` |
| Separador de día | `#fbfcfd` |
| Borde de tarjeta | `#e8eaee` |
| Borde de control | `#e3e6eb` |
| Divisor de fila | `#f1f2f5` |
| Título | `#101828` |
| Texto secundario | `#344054` / `#475467` |
| Texto atenuado | `#667085` |
| Texto de etiqueta | `#98a2b3` |
| Texto muy tenue | `#b6bcc7` |
| Primario / enlaces | `#2563eb` (hover `#1d4ed8`, recuento activo `#60a5fa`) |
| Chip activo | fondo `#eff6ff` · borde `#2563eb` · texto `#1d4ed8` |

Los colores por tipo están en la tabla de "Tipos y etiquetas".

**Tipografía**

- Interfaz: `-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif`
- Tiempos y recuentos: `'IBM Plex Mono', monospace` (Google Fonts, 400 y 500)
- Escala: 24px/650 (H1) · 13.5px/500–600 (título de fila) · 13px (subtítulo) · 12.5px (mensaje, chips, botón) · 12px (enlace de acción) · 11px (tiempo, recuentos, separador de día) · 10.5px (píldora de tipo)
- `text-wrap: pretty` en el mensaje
- Separador de día: peso 600, `letter-spacing: 0.07em`, mayúsculas

**Espaciado** — 3, 6, 7, 8, 9, 11, 13, 14, 15, 18, 20, 26, 28, 44 px. Fila `padding: 15px 20px 15px 14px`; secciones `gap: 18px`; chips `gap: 8px`.

**Radios** — 8px (botón, icono de tipo) · 11px (tarjeta) · 99px (chips, píldoras, punto)

**Sombras** — tarjeta `0 1px 2px rgba(16,24,40,0.04)`

**Tamaños** — icono de tipo 30×30 · punto de no leída 5×5

## Lo que se quitó a propósito

Cada uno de estos se evaluó y se descartó. No reintroducir sin un motivo nuevo:

- **Una notificación por cada pregunta sin respuesta.** Es la decisión central del módulo. Con el volumen real (143 consultas fallidas al mes) satura la bandeja y el usuario deja de abrirla, con lo que se pierden también las notificaciones que sí importan. Sustituida por resumen semanal + excepciones por umbral.
- **Campana con desplegable en el header.** Duplica esta pantalla en dos sitios con dos comportamientos de lectura distintos. Si se añade, debe ser un atajo de 3 filas + "Ver todas", nunca una segunda bandeja.
- **KPIs arriba** (total, no leídas, por tipo). Los recuentos ya están en los chips; una fila de tarjetas repite el dato y empuja la lista hacia abajo.
- **Preferencias de notificación por tipo.** Es configuración: va en Ajustes, con el catálogo `notification_types` como fuente. Ponerla aquí mezcla leer con configurar.
- **Silenciar / archivar por fila.** Dos verbos más que compiten con "leída" sin resolver nada distinto.
- **Agrupar por asistente.** Con este volumen no aporta; el filtro por tipo es el eje útil.
- **Reordenar poniendo las no leídas arriba.** Rompe la cronología, que es la única estructura que la lista necesita.

### Ampliación futura: resumen por correo

La notificación solo funciona si el responsable entra en la plataforma. El resumen semanal por correo es lo que lo trae de vuelta, y es la extensión natural de `group_key` + `severity`: mismo contenido del resumen, un enlace por línea. Requiere tabla de preferencias (`user_id`, `channel`, `severity_min`, `frequency`) y un job de envío. Enviar solo si hay algo que contar.

## Assets

Ninguno. No hay imágenes: el icono de tipo es la primera letra de su etiqueta sobre un cuadrado redondeado, la flecha del enlace es `→` y los indicadores son puntos y píldoras CSS. Si el codebase tiene librería de iconos, sustituir la letra manteniendo caja de 30×30, radio 8px y los colores de la tabla de tipos.

Fuente: **IBM Plex Mono** (400, 500) desde Google Fonts. La tipografía de interfaz es la del sistema.

## Files

- `KnowledgeSpace Pages.dc.html` — prototipo completo. La pantalla de Notificaciones es el bloque bajo `isNotifications` en la plantilla; su lógica está en el bloque de `visibleNotifs` / `notifFilters` dentro de `renderVals()`, el catálogo de tipos en la constante `TYPES` y los datos de ejemplo en `NOTIFS`.
- `MODELO_DATOS.md` — modelo de datos del backend, versión 12.1 (13/08/2026). Las tablas `notifications` y `notification_types` están en la sección 2.11.

Para verlo: abrir el HTML y navegar a **Analytics → Notificaciones**. Probar los cinco filtros, "Marcar todas como leídas" y el clic en cada tipo de fila para comprobar los destinos.

El prototipo incluye además Analytics, Feedback, Costos, Preguntas sin respuesta, Banco de pruebas y el chat con citas ancladas — contexto útil, fuera del alcance de este handoff.
