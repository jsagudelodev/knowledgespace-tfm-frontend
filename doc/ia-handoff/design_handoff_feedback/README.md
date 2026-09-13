# Handoff: Módulo de Feedback — KnowledgeSpace

## Overview

Página de administración que muestra cómo califican los usuarios las respuestas del asistente RAG, y convierte el feedback negativo en trabajo accionable (una pregunta sin respuesta) en lugar de dejarlo como una lista muerta.

Vive en el menú lateral bajo **Analytics → Feedback**. Lee de la tabla `feedback` (ver "Cambios de base de datos requeridos").

La página responde tres preguntas del cliente, en este orden:
1. ¿Cómo va la satisfacción y hacia dónde se mueve?
2. ¿De qué se quejan exactamente?
3. ¿Qué hago con cada queja?

Una decisión de diseño que conviene entender antes de implementar: **la página tiene dos modos de lectura**. *Comentarios* para volúmenes bajos (se leen uno por uno) y *Temas* para volúmenes altos (nadie lee 8.000 comentarios; se leen grupos). El conmutador está sobre la lista.

El módulo pasó por varias rondas de recorte deliberado. La sección "Lo que se quitó a propósito" documenta qué se eliminó y por qué; no volver a añadirlo sin un motivo nuevo.

## About the Design Files

Los archivos de este paquete son **referencias de diseño creadas en HTML** — prototipos que muestran la apariencia y el comportamiento previstos, no código de producción para copiar tal cual.

La tarea es **recrear estos diseños en el entorno existente del código destino** (React, Vue, etc.) usando sus patrones y librerías establecidos. Si aún no existe un frontend, elegir el framework más apropiado e implementar allí.

El prototipo usa estilos en línea y datos de ejemplo embebidos. En producción todo dato viene del backend; los datos del prototipo solo definen la *forma* de la respuesta esperada.

## Fidelity

**Alta fidelidad (hifi).** Colores, tipografía, espaciado y estados finales. Reconstruir fiel al pixel con las librerías del codebase. Todos los valores exactos están en "Design Tokens".

## Nomenclatura

El módulo que en base de datos se llama `knowledge_gaps` se presenta al usuario como **"Preguntas sin respuesta"**. No usar "brechas" ni "gaps" en ningún texto de interfaz. El botón de conversión dice "Enviar a preguntas sin respuesta".

## Screens / Views

### Pantalla única: Feedback

**Propósito:** un administrador revisa la satisfacción del asistente, filtra por período y por asistente, entiende de qué se quejan los usuarios y decide qué hacer.

**Ruta sugerida:** `/analytics/feedback`
**Breadcrumb del header:** `analytics / feedback`
**Ítem activo del sidebar:** grupo "Analytics" → "Feedback"

#### Layout general

Contenedor de sección: `padding: 28px 26px 44px; max-width: 1440px; display: flex; flex-direction: column; gap: 18px`. Fondo de página `#f7f8fa`.

Orden vertical:
1. Encabezado con filtros
2. Fila de 3 KPIs
3. Cuerpo de dos columnas

El cuerpo es `display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start`:
- Columna izquierda `flex: 1 1 300px; min-width: 280px; max-width: 340px` — contiene una sola tarjeta
- Columna derecha `flex: 1 1 520px; min-width: 0`, apilada con `gap: 12px`

Por debajo de ~1120px la izquierda pasa a ancho completo. Por debajo de 900px los KPIs pasan a `repeat(2, 1fr)`. No hay más breakpoints.

#### 1. Encabezado

`display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap`

- **Bloque de título** (`flex: 1; min-width: 260px`, columna, `gap: 3px`):
  - H1 "Feedback" — 24px / peso 650 / `letter-spacing: -0.02em` / `#0f172a`
  - Subtítulo "Cómo califican tus usuarios las respuestas del asistente, y qué hacer con eso." — 13px / `#667085`
- **Selector de período** — grupo segmentado: `Este mes` (por defecto) · `90 días` · `12 meses`
- **Selector de asistente** — **desplegable**, no segmentado (ver nota de jerarquía abajo)
- **Botón "Exportar comentarios"** — primario

**Nota de jerarquía:** el período es segmentado y el asistente es un desplegable a propósito. Tres controles segmentados en la misma pantalla (período, asistente, modo de lista) se leen como si fueran del mismo nivel, y no lo son: los dos de arriba filtran datos, el de abajo cambia de vista. Mantener esa diferencia.

Estilo de grupo segmentado (se repite en toda la app):
- Contenedor: `display: flex; gap: 4px; padding: 3px; border-radius: 9px; background: #edeff3`
- Segmento inactivo: `padding: 6px 12px; border-radius: 7px; font-size: 12.5px; color: #667085; cursor: pointer`
- Segmento activo: `background: #fff; color: #0f172a; font-weight: 500; box-shadow: 0 1px 2px rgba(16,24,40,0.08)`

Desplegable de asistente:
- Disparador: `display: flex; align-items: center; gap: 9px; padding: 8px 12px; border-radius: 8px; border: 1px solid #e3e6eb; background: #fff; font-size: 12.5px; color: #344054; white-space: nowrap`. Hover `#f7f8fa`. Contenido: etiqueta "Asistente" en `#98a2b3`, valor actual en color normal, y `▾` en `#b6bcc7` a 10px.
- Menú: `position: absolute; top: 100%; right: 0; margin-top: 5px; min-width: 168px; padding: 5px; border-radius: 10px; border: 1px solid #e3e6eb; background: #fff; box-shadow: 0 12px 28px rgba(15,23,42,0.12); z-index: 20`
- Ítem: `padding: 7px 10px; border-radius: 7px; font-size: 12.5px`, con `✓` a la derecha (`#2563eb`, o transparente si no es el activo). Activo: `background: #f5f8ff; color: #0f172a; font-weight: 500`. Inactivo: `color: #475467`.
- Opciones: `Todos` (por defecto) + un ítem por asistente activo de la empresa.
- Debe cerrarse al hacer clic fuera y con `Escape` (el prototipo solo implementa el toggle).

Botón primario: `padding: 8px 14px; border-radius: 8px; background: #2563eb; color: #fff; font-size: 12.5px; font-weight: 500`. Hover `#1d4ed8`.

#### 2. Fila de KPIs

`display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px`

Tarjeta estándar: `background: #fff; border: 1px solid #e8eaee; border-radius: 11px; padding: 16px 18px; display: flex; flex-direction: column; gap: 9px; box-shadow: 0 1px 2px rgba(16,24,40,0.04)`

Etiqueta: 11.5px / peso 600 / `letter-spacing: 0.06em` / mayúsculas / `#98a2b3`.
Cifra: 30px / peso 650 / `letter-spacing: -0.03em` / `line-height: 1`.
Nota: 11.5px / `#667085`.

| # | Etiqueta | Valor | Nota | Cálculo |
|---|---|---|---|---|
| 1 | SATISFACCIÓN | promedio 1 decimal + estrellas del redondeo | `−0.1 vs. período anterior · 275.652 calificaciones` | media de `rating` en el filtro |
| 2 | NEGATIVAS | entero | `1 y 2 estrellas en 12 meses` | `count(rating <= 2)` |
| 3 | EN SEGUIMIENTO | entero | `negativas convertidas en tarea` | `count(knowledge_gap_id is not null)` |

Detalles:
- Estrellas del KPI 1: 14px, `#b45309`, `letter-spacing: 0.06em`, `★` llenas y `☆` vacías hasta cinco.
- **El delta se colorea por signo**: `#067647` cuando empieza con `+`, `#b42318` cuando empieza con `−`. Peso 600. Nunca fijar el color en la plantilla.
- El texto del delta es "vs. julio" con período "Este mes" y "vs. período anterior" en los demás.
- Las notas cambian de redacción con el período ("del mes" / "de los últimos 90 días" / "de los últimos 12 meses").

#### 3. Columna izquierda — "Distribución"

Tarjeta estándar con `padding: 18px 20px; gap: 13px`. Es la única tarjeta de esta columna.

- Cabecera: título "Distribución" (14.5px / 600) y pista a la derecha (11.5px / `#98a2b3`), en `justify-content: space-between; align-items: baseline`. La pista cambia con el modo: "clic para filtrar" en Comentarios, **"clic para ver comentarios"** en Temas.
- Cinco filas de 5 a 1 estrella: `display: flex; align-items: center; gap: 10px; padding: 5px 7px; margin: 0 -7px; border-radius: 7px; cursor: pointer`
  - Estrellas: ancho 52px, 12px, `#b45309`, `letter-spacing: 0.05em`
  - Barra: `flex: 1; height: 8px; border-radius: 99px; background: #eef1f6`; relleno `count / maxCount * 100%`, color `#0f9b6c` (4–5★), `#c9ccd3` (3★), `#e07a72` (1–2★)
  - Conteo: ancho 30px, derecha, mono 11.5px `#667085`, con separador de miles
  - Hover `#fafbfc`; seleccionada `#f5f8ff`
- Clic filtra la lista por esa calificación; clic de nuevo lo quita (toggle).
- **En modo Temas, el clic además devuelve la vista a modo Comentarios.** Sin esto el clic no produce ningún efecto visible, porque la lista de comentarios no está en pantalla — era un fallo real del prototipo anterior.

#### 4. Columna derecha — barra de control

`display: flex; align-items: center; gap: 10px; flex-wrap: wrap`

- Conmutador segmentado `Comentarios` / `Temas`
- Separador vertical: `width: 1px; height: 18px; background: #e3e6eb`
- Recuento, 13px `#475467`:
  - Modo Comentarios: `"{n} comentarios recientes"`, o `"{n} comentarios recientes de {r} estrellas"` con filtro. Singular correcto ("1 comentario reciente", "de 1 estrella").
  - Modo Temas: `"5 temas · 48.017 comentarios negativos de los últimos 12 meses"`
- Chip "Quitar filtro ×" cuando hay filtro por calificación: `padding: 4px 10px; border-radius: 99px; border: 1px solid #e3e6eb; background: #fff; font-size: 11.5px; color: #475467`
- A la derecha, etiqueta de orden 12px `#98a2b3`: "Ordenado por más reciente" (Comentarios) / "Ordenado por volumen" (Temas)

Nota deliberada: en modo Comentarios la lista muestra los comentarios **recientes**, no las N calificaciones del período; el texto lo dice para no contradecir el KPI.

#### 5. Modo Comentarios — tarjeta de comentario

Contenedor: tarjeta estándar sin padding, `overflow: hidden`. Cuatro zonas, dos de ellas condicionales.

**a) Cabecera** — `display: flex; align-items: flex-start; gap: 12px; padding: 15px 18px 13px`

- Línea de identidad (`gap: 10px; flex-wrap: wrap`): nombre 13px/600 · estrellas 13px coloreadas por calificación (`#059669` 4–5★, `#b45309` 3★, `#dc2626` 1–2★) · metadatos mono 10.5px `#b6bcc7` con formato `hoy 18:42 · EBIS · conv #318`
- Comentario 13.5px / `line-height: 1.6` / `#1f2937` / `text-wrap: pretty`
- Sin comentario: "Sin comentario", 13px `#98a2b3`, cursiva
- Feedback del widget: nombre "Anónimo · widget"

No hay avatar. Se quitó por decorativo: las estrellas ya dan el tono y el nombre está al lado.

**b) Respuesta calificada** — **solo si `rating <= 3`**

`margin: 0 18px; padding: 11px 13px; border-radius: 9px; background: #fafbfc; border: 1px solid #eff1f4; display: flex; flex-direction: column; gap: 5px`

- Etiqueta "RESPUESTA CALIFICADA" — 10.5px / 600 / `letter-spacing: 0.09em` / mayúsculas / `#98a2b3`
- Texto 12.5px / `line-height: 1.55` / `#475467`, truncado a ~240 caracteres
- Pie mono 10.5px `#98a2b3`, `margin-top: 3px`: `2 fuentes · score 0.89`

En las calificaciones positivas se omite: nadie necesita auditar por qué funcionó una respuesta, y así esas tarjetas quedan en una línea. En las negativas es imprescindible — sin la respuesta y su score a la vista, el administrador no puede juzgar la queja.

**c) Aviso de obsoleto** (condicional) — `margin: 11px 18px 0; padding: 9px 12px; border-radius: 9px; background: #f4f5f7; display: flex; align-items: center; gap: 9px`. Punto 6px `#98a2b3` + texto 12px `#667085`: "La fuente de esta respuesta se reindexó después. La queja puede estar resuelta."

Se muestra cuando el documento fuente del mensaje se reindexó o reemplazó **después** de la fecha del feedback. No mostrarlo si la pregunta sin respuesta vinculada sigue abierta: se contradiría con la píldora de estado.

**d) Barra de acciones** — `display: flex; align-items: center; gap: 9px; padding: 12px 18px 14px`

- Secundario "Ver conversación": `padding: 7px 12px; border-radius: 8px; border: 1px solid #e3e6eb; font-size: 12px; font-weight: 500; color: #344054`. Hover `#f7f8fa`
- **Solo si `rating <= 2`**, "Enviar a preguntas sin respuesta": `border: 1px solid #ddd6fe; background: #f6f4ff; color: #6d28d9`. Hover `#efeaff`
- Espaciador `flex: 1`
- Píldora de estado 11.5px, `padding: 3px 9px; border-radius: 99px`:
  - "Pregunta #41 abierta" → `background: #f6f4ff; color: #6d28d9`
  - "Pregunta #28 resuelta" → `background: #ecfdf5; color: #067647`
  - "Sin acción" / "Obsoleto" → `background: #f4f5f7; color: #98a2b3`

**Estado vacío:** tarjeta con `padding: 46px 20px; text-align: center; font-size: 13px; color: #98a2b3` — "No hay calificaciones con este filtro."

#### 6. Modo Temas — buscador y lista de temas

**Buscador** (fila superior de la columna): `display: flex; align-items: center; gap: 10px; padding: 10px 13px; border: 1px solid #dfe3ea; border-radius: 10px; background: #fff`. Placeholder 13px `#98a2b3`: "Buscar en 275.652 comentarios…". A la derecha, el período activo en mono 10.5px `#c3c8d1`.

Búsqueda full-text sobre `comment`; sin ella la vista es inútil a este volumen.

**Fila de tema** — tarjeta estándar, cabecera clicable: `display: flex; align-items: center; gap: 14px; padding: 15px 18px; cursor: pointer`. Hover `#fafbfc`.

Cuatro datos y ni uno más:

- Chevron `›` 15px `#b6bcc7`, `transform: rotate(90deg)` al abrir, `transition: transform 140ms`
- Bloque central (`flex: 1`, columna, `gap: 5px`):
  - Nombre del tema 14px / peso 600 / `letter-spacing: -0.01em` + chip de tendencia
  - Chip de tendencia: `padding: 2px 8px; border-radius: 99px; font-size: 10.5px; font-weight: 600`. **Subir es malo aquí**: `+14%` → `background: #fef2f2; color: #b42318`; `−6%` → `background: #ecfdf5; color: #067647`
  - Debajo: `29% de las quejas` en 11.5px `#98a2b3`
- Bloque derecho: volumen en 17px / peso 650 / `letter-spacing: -0.02em` + la palabra "comentarios" en 11.5px `#98a2b3`

**Cuerpo desplegado** — `border-top: 1px solid #f1f2f5; background: #fbfcfd; padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 12px`

- Resumen del patrón 12.5px / `line-height: 1.6` / `#475467`. Es lo que convierte un grupo en un diagnóstico; no omitirlo.
- Tres comentarios reales: `padding: 10px 12px; border-radius: 9px; background: #fff; border: 1px solid #eceef2; display: flex; align-items: flex-start; gap: 10px` — estrellas 11px con el color por calificación, texto 12.5px `#1f2937`, metadatos mono 10.5px `#b6bcc7`
- Acciones: "Enviar tema a preguntas sin respuesta" (violeta) a la izquierda y "Ver los 14.136 comentarios →" (12px `#2563eb`) a la derecha

Solo un tema abierto a la vez.

**Regla dura:** la suma de los temas debe ser exactamente el KPI "Negativas", en todos los períodos y con todos los filtros de asistente. El último tema absorbe el resto del redondeo; nunca redondear cada tema por separado.

## Interactions & Behavior

**Filtro de período.** Recalcula todo: KPIs, distribución, temas, buscador y las notas de texto ("del mes" / "de los últimos 90 días" / "de los últimos 12 meses").

**Filtro de asistente.** Igual: los tres KPIs, la distribución, los temas y la lista. Deben salir de **una sola consulta agregada**; si vienen de sitios distintos acaban contradiciéndose.

**Filtro por calificación.** Solo afecta a la lista de comentarios. Los KPIs no cambian: describen el período, no la selección. Desde modo Temas, además devuelve la vista a Comentarios.

**Conmutador Comentarios / Temas.** Cambia la lista, la etiqueta de orden y la pista de la distribución. No altera los filtros activos.

**Enviar a preguntas sin respuesta.** Diálogo de confirmación con la pregunta del usuario prellenada y editable. Al confirmar: crea el registro en `knowledge_gaps`, guarda `feedback.knowledge_gap_id`, pone `status = 'converted'`, y la píldora pasa a "Pregunta #N abierta" sin recargar. Desde un tema, la acción es en bloque sobre todos sus comentarios.

**Ver conversación.** Navega a `/conversations/:id` con ancla al mensaje calificado.

**Exportar comentarios.** CSV respetando período y asistente (no el filtro por calificación): fecha, usuario, asistente, calificación, comentario, id de conversación, estado.

**Hover.** Todo elemento clicable tiene hover; ninguna transición pasa de 140 ms.

**Carga.** Esqueletos con la forma de cada tarjeta (bloques `#eef1f6` con el radio correcto). KPIs y lista cargan por separado; nada de spinner a pantalla completa.

**Error.** Mensaje en línea dentro de la tarjeta afectada, no en toda la página.

## State Management

| Estado | Tipo | Por defecto | Efecto |
|---|---|---|---|
| `period` | `"Este mes"` \| `"90 días"` \| `"12 meses"` | `"Este mes"` | Refetch de agregados y lista |
| `assistantFilter` | `"Todos"` \| id | `"Todos"` | Refetch de agregados y lista |
| `assistOpen` | boolean | `false` | Abre el desplegable de asistente |
| `mode` | `"Comentarios"` \| `"Temas"` | `"Comentarios"` | Cambia la lista, el orden y la pista |
| `ratingFilter` | `1..5` \| `null` | `null` | Filtra solo la lista |
| `openTheme` | id \| `null` | primer tema | Acordeón, uno a la vez |
| `list` | array | — | Paginado por cursor, `created_at` desc |
| `stats` | objeto | — | `{avg, delta, total, negatives, withGap, dist[5], themes[]}` |
| `convertingId` | id \| `null` | `null` | Diálogo de conversión |

**Endpoints**

- `GET /api/feedback?period=&assistant_id=&rating=&cursor=` — lista paginada **por cursor**, no por offset. Cada elemento trae el mensaje calificado (contenido truncado, nº de fuentes, score) y la conversación, para evitar N+1.
- `GET /api/feedback/stats?period=&assistant_id=` — KPIs y distribución en **una sola respuesta**.
- `GET /api/feedback/themes?period=&assistant_id=` — temas con volumen, share, tendencia, resumen y 3 muestras.
- `POST /api/feedback/:id/convert-gap` — crea la pregunta sin respuesta y devuelve el feedback actualizado.
- `GET /api/feedback/export?period=&assistant_id=` — CSV.

## Cambios de base de datos requeridos

Tabla `feedback` actual: `id`, `company_id`, `user_id`, `assistant_id`, `message_id`, `rating`, `comment`, `created_at`. Cubre CSAT, distribución, filtro por asistente y lista. Falta:

1. **`user_id` a nullable** y **`widget_id` String(36) nullable, indexado**. Sin esto el widget público no puede calificar, que es donde más volumen hay. Mismo patrón que `knowledge_gaps.widget_id`.
2. **`status`** String(20), default `'new'`: `new` / `reviewed` / `converted` / `dismissed` / `stale`. Alimenta la píldora y el aviso de obsoleto.
3. **`knowledge_gap_id`** Integer FK → `knowledge_gaps`, nullable, SET NULL. Da el KPI "En seguimiento" y el enlace desde la tarjeta.
4. **Índice único `(message_id, user_id)`** para no calificar dos veces el mismo mensaje. Índice en `created_at` para las agregaciones.

Todos son columnas nuevas nullable o relajaciones; ninguno rompe lo existente.

**Para escalar** (la razón del modo Temas): tabla resumen diaria `feedback_daily(company_id, assistant_id, fecha, count, avg, dist[5], negatives)` refrescada por job. Los KPIs y la distribución leen de ahí y nunca recorren la tabla grande.

**Para los temas**: job nocturno que clasifique los comentarios negativos nuevos y guarde `feedback.theme_id` (+ tabla `feedback_themes` con nombre, resumen y tendencia). Agrupar decenas de miles de comentarios con embeddings en cada carga de página no es viable.

**Obsolescencia (`status = 'stale'`)**: job que compare `feedback.created_at` con la fecha de reindexado de los documentos citados en `messages.sources`; si la fuente cambió después, marcar obsoleto y sacarlo de la cola.

**Retención**: conservar todo indefinidamente en agregados; 24 meses de comentarios en texto es razonable. Al ejercer derecho de supresión, borrar `comment` y conservar `rating` (anónimo), para no romper las series históricas.

## Design Tokens

**Colores**

| Uso | Valor |
|---|---|
| Fondo de página | `#f7f8fa` |
| Superficie de tarjeta | `#ffffff` |
| Superficie sutil | `#fafbfc` / `#fbfcfd` |
| Superficie seleccionada | `#f5f8ff` |
| Superficie neutra (avisos) | `#f4f5f7` |
| Borde de tarjeta | `#e8eaee` |
| Borde de control | `#e3e6eb` / `#dfe3ea` |
| Borde interior sutil | `#eceef2` / `#eff1f4` / `#f1f2f5` |
| Pista de barra | `#eef1f6` |
| Texto principal | `#0f172a` |
| Texto de cuerpo | `#1f2937` |
| Texto secundario | `#475467` / `#344054` |
| Texto atenuado | `#667085` |
| Texto de etiqueta | `#98a2b3` |
| Texto muy tenue | `#b6bcc7` / `#c3c8d1` |
| Primario | `#2563eb` (hover `#1d4ed8`) |
| Positivo (texto) | `#067647` · fondo `#ecfdf5` |
| Advertencia | `#b45309` |
| Negativo | `#b42318` / `#dc2626` · fondo `#fef2f2` |
| Acento de "preguntas sin respuesta" | `#6d28d9` · fondo `#f6f4ff` · borde `#ddd6fe` · hover `#efeaff` |

**Colores de datos** (deliberadamente menos saturados que los de estado, para que las barras no dominen la página):

| Uso | Valor |
|---|---|
| 4–5★ | `#0f9b6c` |
| 3★ | `#c9ccd3` |
| 1–2★ | `#e07a72` |

**Tipografía**

- Interfaz: `-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif`
- Datos y metadatos: `'IBM Plex Mono', monospace` (Google Fonts, 400 y 500)
- Escala: 24px/650 (H1) · 17px/650 (volumen de tema) · 14.5px/600 (título de tarjeta) · 14px/600 (nombre de tema) · 13.5px (comentario) · 13px/600 (nombre de usuario) · 12.5px (cuerpo secundario, botones) · 11.5px (etiquetas, notas) · 10.5px (mono, mayúsculas)
- Cifras de KPI: 30px/650, `letter-spacing: -0.03em`, `line-height: 1`
- Mayúsculas: peso 600, `letter-spacing: 0.06em` (KPI) o `0.09em` (dentro de tarjeta)
- Interlineado: 1.6 en comentarios, 1.55 en texto secundario
- `text-wrap: pretty` en todo párrafo
- Miles con separador local (`es-CO`): `275.652`

**Espaciado** — 3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 18, 20, 26, 28, 44 px. Los tres pilares: `gap: 14px` entre tarjetas, `18px` entre secciones, `padding: 15–18px 18–20px` dentro de tarjeta.

**Radios** — 7px (segmento, fila hover, ítem de menú) · 8px (botones, disparador del desplegable) · 9px (bloques anidados, contenedor segmentado) · 10px (buscador, muestras, menú) · 11px (tarjetas) · 99px (barras, chips, píldoras)

**Sombras** — tarjeta `0 1px 2px rgba(16,24,40,0.04)` · segmento activo `0 1px 2px rgba(16,24,40,0.08)` · menú desplegable `0 12px 28px rgba(15,23,42,0.12)` · modal `0 24px 60px rgba(15,23,42,0.24)`

**Alturas** — barra de distribución 8px

## Lo que se quitó a propósito

Cada uno de estos existió en una versión anterior y se eliminó tras revisarlo. No reintroducir sin un motivo nuevo:

- **KPI "Respuestas calificadas" (18%).** Es un dato sobre la muestra, no sobre el producto; nadie decide nada con él.
- **Banda "Qué hizo el usuario después de responder"** (señal implícita: copió / abrió la fuente / reformuló / se fue). Conceptualmente valiosa — cubre el 100% del uso, no solo el 18% que califica — pero requiere una tabla de eventos nueva y saturaba la página. Queda documentada abajo como ampliación futura.
- **Tarjeta de chips "Temas en las quejas"** en la columna izquierda: duplicaba el modo Temas a otra escala, lo que se leía como error.
- **Gráfico de tendencia semanal.** Las seis barras quedaban casi idénticas (4.1, 4.0, 4.0, 3.9…): una tarjeta entera para no decir nada. El delta del KPI de satisfacción cubre esa información.
- **Minigráficos en las filas de tema.** Sin eje ni escala eran decorativos; el chip de porcentaje ya da la tendencia.
- **Promedio por tema** (`2.1 ★`): todos los temas negativos rondan 2, así que no distinguía nada.
- **Reparto por asistente en la fila de tema** (`EBIS 71% · VCD 29%`): ya existe el filtro de asistente arriba.
- **Contador "sin revisar" y acción "Marcar N como revisados"**: un flujo de bandeja paralelo que nadie pidió y que competía con la píldora de estado.
- **Avatar de iniciales en la tarjeta de comentario**: decorativo.

### Ampliación futura: señal implícita

Si más adelante se quiere recuperar (es la métrica menos sesgada de todo el módulo), necesita una tabla de eventos ligera:

```
message_events
  id, message_id FK, company_id FK, assistant_id FK,
  event_type  -- 'copied' | 'source_opened' | 'reformulated' | 'abandoned'
  created_at
```

`reformulated` se infiere en el backend: mensaje de usuario nuevo, semánticamente similar al anterior, dentro de una ventana corta. `abandoned` es el desenlace por defecto cuando no llega ningún otro evento en N minutos. Los otros dos los emite el frontend del chat. Presentarla como una barra apilada de una sola línea, no como tarjeta con leyenda.

## Assets

Ninguno. No hay imágenes ni iconos: las estrellas son `★` y `☆`, el chevron es `›`, la marca de selección es `✓`, y los indicadores son puntos y píldoras CSS. Si el codebase tiene librería de iconos, sustituirlos manteniendo tamaño y color.

Fuente: **IBM Plex Mono** (400, 500) desde Google Fonts. La tipografía de interfaz es la del sistema.

## Files

- `KnowledgeSpace Pages.dc.html` — prototipo completo. La página de Feedback es el bloque bajo `isFeedback` en la plantilla; su lógica está en el método `fbVals()`, y los datos de ejemplo en las constantes `FEEDBACK` (comentarios), `THEMES` (temas) y los objetos `STATS` / `STATS_HV` dentro de `fbVals`.
- `MODELO_DATOS.md` — modelo de datos del backend, versión 12.1 (13/08/2026). La tabla `feedback` está en la sección 2.10.

Para verlo: abrir el HTML y navegar a **Analytics → Feedback**. Probar los dos modos y los tres períodos.

El prototipo incluye además el shell de navegación, Analytics, Notificaciones, Costos, Preguntas sin respuesta y el chat con citas ancladas — contexto útil, fuera del alcance de este handoff.
