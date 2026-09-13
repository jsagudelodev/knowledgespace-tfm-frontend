# Handoff: Módulo de Preguntas sin respuesta — KnowledgeSpace

## Overview

Pantalla donde un administrador convierte las consultas que el asistente no supo responder en conocimiento indexado y comprobado. Vive en el menú lateral bajo **Analytics → Preguntas sin respuesta** y lee de la tabla `knowledge_gaps`.

Es el módulo que genera el valor central del producto: sin él, el cliente sabe que su asistente falla pero no qué hacer al respecto. La pantalla no es un informe de quejas, es **una cola de trabajo con prueba de que el trabajo funcionó**.

Cuatro decisiones de diseño gobiernan el módulo. Implementarlas mal lo convierte en una lista que nadie usa:

1. **Se trabaja sobre intenciones, no sobre preguntas.** Seis formas de preguntar lo mismo son un solo trabajo. La agrupación por similitud semántica es la razón de que la cola sea manejable: 143 consultas del mes se reducen a ~10 intenciones abiertas.
2. **Tres causas, no dos.** El caso más frecuente no es "falta el documento": es que **el documento existe y el índice no lo recupera**. Si la interfaz solo ofrece "escribir respuesta" y "pedir documento", el usuario tapa fallos de recuperación creando una base de conocimiento paralela. La acción **Vincular a documento existente** es la primera y la recomendada por defecto cuando hay candidatos.
3. **Resolver no es cerrar: es demostrar que ahora responde.** Al resolver se reejecutan las variantes contra el índice y se registra el score antes/después. Una resolución sin verificación es una promesa sin comprobar, y es lo que hace que las preguntas vuelvan.
4. **Un clic para lo normal.** Al abrir una pregunta el panel ya propone la acción correcta y la deja lista; las otras dos opciones quedan plegadas detrás de "Otra opción". La acción rápida en la fila resuelve sin abrir el panel.

## About the Design Files

Los archivos de este paquete son **referencias de diseño creadas en HTML** — prototipos que muestran la apariencia y el comportamiento previstos, no código de producción para copiar tal cual.

La tarea es **recrear estos diseños en el entorno existente del código destino** (React, Vue, etc.) usando sus patrones y librerías establecidos. Si aún no existe un frontend, elegir el framework más apropiado e implementar allí.

El prototipo usa estilos en línea y datos de ejemplo embebidos (20 preguntas: 10 abiertas, 6 resueltas, 4 ignoradas). En producción todo dato viene del backend; los datos del prototipo definen la *forma* de la respuesta esperada y los casos que la interfaz debe saber representar.

## Fidelity

**Alta fidelidad (hifi).** Colores, tipografía, espaciado y estados finales. Reconstruir fiel al pixel con las librerías del codebase. Todos los valores exactos están en "Design Tokens".

## Nomenclatura

Esta sección no es opcional: la mitad del valor percibido del módulo está en que el usuario entienda qué está viendo sin formación previa.

- `knowledge_gaps` se presenta al usuario como **"Preguntas sin respuesta"**. Nunca "brechas", "gaps" ni "vacíos" en la interfaz.
- El campo `gap_type` (`hard` / `soft`) **nunca se muestra crudo**. Se traduce:
  - `hard` → **"falta contenido"** (rojo). Ningún chunk pasa el umbral: el documento no existe.
  - `soft` → **"no se encuentra"** (ámbar). Hay contenido cercano pero por debajo del umbral: probable fallo de recuperación.
- El score de similitud (`0.41`) solo aparece **junto a un documento candidato**, donde significa algo. Nunca como cifra suelta en cabeceras: el usuario no sabe si 0.41 es bueno.
- El impacto calculado no se muestra como número. Se presenta como **"prioridad alta / media / baja"**.
- Textos en español, tercera persona, sin signos de exclamación ni emoji.

## Screens / Views

### Pantalla única: Preguntas sin respuesta

**Ruta sugerida:** `/analytics/knowledge-gaps`
**Breadcrumb:** `analytics / preguntas sin respuesta`
**Sidebar activo:** grupo "Analytics" → "Preguntas sin respuesta"

#### Layout general

Sección: `padding: 28px 26px 44px; max-width: 1440px; display: flex; flex-direction: column; gap: 18px`. Fondo de página `#f7f8fa`.

Orden vertical:
1. Encabezado + botón "Informe mensual"
2. Línea de resumen (una sola línea de texto, no tarjetas)
3. Barra de control: pestañas de estado · buscador · orden
4. Dos columnas: lista (izquierda) + panel de resolución (derecha, `position: sticky`)

#### 1. Encabezado

`display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap`.

- H1 "Preguntas sin respuesta" — 24px/650, `letter-spacing: -0.02em`
- Subtítulo — 13px, `#667085`: "Lo que tus usuarios preguntaron y la documentación no pudo responder, agrupado por intención."
- Derecha: botón primario "Informe mensual" — `padding: 8px 14px; border-radius: 8px; background: #2563eb; color: #fff; font-size: 12.5px; font-weight: 500`, hover `#1d4ed8`.

No hay segundo botón. "Umbrales de detección" se evaluó y se movió a Ajustes: es configuración, no trabajo.

#### 2. Línea de resumen

`display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: #667085`. Cada cifra en `font-size: 15px; font-weight: 600; color: #101828`, con su etiqueta al lado en el color base, y `·` como separador entre pares.

Cuatro datos, todos derivados de la consulta, nunca hardcodeados:
- **N preguntas sin responder** — recuento de abiertas
- **N consultas afectadas este mes** — suma de `volume` de las abiertas
- **N resueltas en agosto** — recuento de resueltas en el periodo
- **NN% de las consultas encuentran fuente** — cobertura

Esto sustituye a cuatro tarjetas de KPI. Con tarjetas, la lista —que es el trabajo— quedaba por debajo del pliegue. Una línea da el mismo dato en 40px.

#### 3. Barra de control

`display: flex; align-items: center; gap: 8px; flex-wrap: wrap; row-gap: 10px`.

**Pestañas de estado** (izquierda): `Abiertas` · `Resueltas` · `Ignoradas`, cada una con su recuento dentro del chip.
- Chip: `display: flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 99px; font-size: 12.5px; cursor: pointer`
- Inactivo: `border: 1px solid #e3e6eb; background: #fff; color: #475467`
- Activo: `border: 1px solid #2563eb; background: #eff6ff; color: #1d4ed8; font-weight: 500`
- Recuento: `'IBM Plex Mono', monospace; font-size: 11px`, `#b6bcc7` inactivo / `#60a5fa` activo

**Buscador** (derecha): `width: 230px; padding: 7px 11px; border: 1px solid #e3e6eb; border-radius: 8px; font-size: 12.5px`, focus `border-color: #2563eb`. Placeholder "Buscar pregunta, asistente o canal". Busca en el texto de la pregunta, el origen y **el texto de todas las variantes** — un usuario recuerda cómo lo preguntó un cliente, no cómo lo tituló el sistema.

**Orden**: etiqueta "Ordenar por" (12px, `#98a2b3`) + conmutador segmentado `Impacto` / `Antigüedad` en `background: #edeff3; padding: 3px; border-radius: 9px`; opción activa `background: #fff` con `box-shadow: 0 1px 2px rgba(16,24,40,0.08)`.

#### 4a. Lista (columna izquierda)

Contenedor: `flex: 1 1 460px; min-width: 0; background: #fff; border: 1px solid #e8eaee; border-radius: 11px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); overflow: hidden; display: flex; flex-direction: column`.

Área de scroll interna: `flex: 1; min-height: 0; max-height: 540px; overflow-y: auto`. El scroll es interno **porque el panel derecho es sticky**: si la página entera scrollease, la acción se iría de pantalla.

**Fila:** `display: flex; align-items: center; gap: 13px; padding: 14px 20px 14px 0; border-bottom: 1px solid #f1f2f5; cursor: pointer`. Seleccionada: `background: #f5f8ff` + riel izquierdo de 3px `#2563eb` (`border-radius: 0 3px 3px 0`); no seleccionada: riel `transparent` para que el texto no se desplace. Hover `#f8fafc`.

Cuerpo (`flex: 1; min-width: 0`, columna, `gap: 6px`):
- **Línea de título** (`display: flex; align-items: center; gap: 9px`): píldora de tipo → píldoras de estado → texto de la pregunta (13.5px/550, truncado con elipsis en una línea).
- **Línea de contexto** — 11.5px, `#98a2b3`, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`: `N variantes · Canal · Asistente · tendencia · antigüedad`. Solo estos cinco. Es una línea que trunca: cualquier dato añadido aquí se amputa en columnas estrechas.

Columna derecha (columna, `align-items: flex-end; gap: 6px; white-space: nowrap`):
- Volumen: cifra 19px/650 `letter-spacing: -0.025em` + "consultas" 11px `#98a2b3`
- Píldora de prioridad (ver tabla de píldoras)
- Botón de acción rápida, solo en abiertas y solo si no está en curso

**Píldoras de la fila**, todas `padding: 2px 8px; border-radius: 99px; font-size: 10.5px; font-weight: 600; flex: 0 0 auto; white-space: nowrap`:

| Píldora | Cuándo | Fondo | Texto |
|---|---|---|---|
| falta contenido | `gap_type = hard` | `#fef2f2` | `#b42318` |
| no se encuentra | `gap_type = soft` | `#fffbeb` | `#b45309` |
| reincidente | se resolvió y volvió a fallar | `#fff1f2` | `#be123c` |
| en curso | documento solicitado, pendiente | `#eff6ff` | `#1d4ed8` |
| prioridad alta (≥70) | impacto calculado | `#eff6ff` | `#1d4ed8` |
| prioridad media (40–69) | impacto calculado | `#f4f5f7` | `#475467` |
| prioridad baja (<40) | impacto calculado | `#fafbfc` | `#98a2b3` |

La píldora de prioridad usa `'IBM Plex Mono', monospace; font-size: 10.5px; font-weight: 500`.

**Pie de la lista:** `padding: 10px 20px; border-top: 1px solid #f1f2f5; background: #fbfcfd; font-size: 11.5px; color: #98a2b3`. Izquierda: "N preguntas en abiertas" (+ " que coinciden con la búsqueda" si hay filtro de texto). Derecha: "Agrupadas por similitud semántica".

**Estado vacío:** `padding: 46px 20px; text-align: center; font-size: 13px; color: #98a2b3`, dentro de la tarjeta. Texto distinto según el caso: "Nada pendiente en este estado." sin búsqueda, "Ninguna pregunta coincide con la búsqueda." con búsqueda.

#### 4b. Panel de resolución (columna derecha)

`flex: 1 1 340px; min-width: 300px; max-width: 420px; position: sticky; top: 14px`, misma tarjeta que la lista.

**Cabecera** — `padding: 18px 20px 15px; border-bottom: 1px solid #eceef2`, columna `gap: 9px`:
- Fila de meta: píldora de tipo + `#39 · abierta` en mono 10.5px `#98a2b3` (el estado en español: abierta / resuelta / ignorada)
- Pregunta canónica — 15px/600, `line-height: 1.45`, `text-wrap: pretty`
- "**24** preguntas de **9** personas" + tendencia — 11.5px `#667085`, cifras en 600 `#101828`
- Antigüedad + enlace "Ver conversación" alineado a la derecha (12px `#2563eb`)
- Si está **en curso**: aviso `background: #eff6ff; border: 1px solid #dbe6fe`, punto de 6px `#2563eb`, texto 12px `#1e40af`
- Si es **reincidente**: aviso `background: #fff1f2; border: 1px solid #fecdd3`, título 12px/600 `#be123c` + explicación 12px `#9f5060` de por qué volvió

**Cómo se preguntó** — `padding: 15px 20px; border-bottom: 1px solid #eceef2`. Título de sección en 10.5px/600, `letter-spacing: 0.09em`, mayúsculas, `#98a2b3`. Cada variante: recuento `11×` en mono 11px `#b6bcc7` + texto literal 12.5px. Es la evidencia; se muestran las 3 primeras por volumen.

**Lo mejor que encontró el índice** — misma estructura. Cada candidato: nombre truncado + score en mono 11px `#b42318`. Si no hay ninguno: "Ningún chunk pasó el umbral: falta el documento." en `#b42318`. **Este bloque se oculta cuando el modo activo es Vincular documento**, porque entonces los mismos candidatos aparecen abajo como opciones seleccionables y verlos dos veces confunde.

**Zona de resolución** (solo si la pregunta está abierta) — `padding: 15px 20px 18px`, columna `gap: 12px`:

1. **Recomendación en prosa** + enlace "Otra opción" a la derecha. El texto nombra la acción y su razón:
   - con candidatos: "Recomendado: el contenido ya existe en «nombre». Vincúlalo y se reindexa con estas variantes."
   - sin candidatos: "Recomendado: ningún documento pasa el umbral. Pide el documento a quien lo tenga."
2. **Selector de modo**, plegado por defecto: `Vincular documento` / `Escribir respuesta` / `Pedir documento` en segmentado `background: #edeff3`. Se despliega con "Otra opción".
3. **Cuerpo del modo activo** (ver "Modos de resolución").

**Panel de una pregunta cerrada** — sin zona de resolución. En su lugar:
- Bloque de cierre: `background: #f0fdf4; border: 1px solid #bbf7d0`, título 12.5px/600 `#15803d` + nota `#3f7350` explicando **con qué** se resolvió.
- Si es ignorada: el bloque indica el motivo y añade "No cuenta como vacío de conocimiento en el informe mensual: la plataforma no debía responderla."
- **Bloque de verificación** (ver siguiente sección).

## Modos de resolución

### Vincular documento (por defecto cuando hay candidatos)

Lista de radios, uno por candidato: `display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 9px; border: 1px solid`; seleccionado `#2563eb` con `background: #f5f8ff`, resto `#eceef2` sobre `#fff`. El radio es un círculo de 14px con `border: 4px solid #2563eb` al seleccionar. Score de cada uno en mono 11px `#b45309`.

Acciones: **"Vincular y reindexar"** (primario) + **"Ignorar"** (secundario). Nota al pie: "Al reindexar se reejecutan las variantes y se registra el score resultante."

Efecto: la pregunta pasa a resuelta con `resolved_document_id`, las variantes se registran como alias del chunk, se dispara la reejecución.

### Escribir respuesta

Textarea para la respuesta, que se indexa como chunk propio. **Requiere gobierno**: autor, fecha y revisión. Un chunk escrito a mano sin autor ni caducidad es deuda que reaparece como contenido obsoleto meses después. Registrar `answered_by` y `answer_reviewed_at`.

### Pedir documento

Selector de responsable (`display: flex; justify-content: space-between; padding: 9px 12px; border: 1px solid #dfe3ea; border-radius: 9px`) + textarea de nota.

Acción **"Solicitar documento"**. **No resuelve la pregunta**: la deja **en curso**, sigue apareciendo en Abiertas con su píldora azul y su aviso. Vence a los 3 días laborables; si no llega el documento, vuelve a la cola limpia. Marcar como resuelta al solicitar es el error clásico: la cola se vacía sin que nada se haya arreglado.

### Ignorar (con motivo obligatorio)

"Ignorar" no cierra directamente: despliega un bloque `background: #fafbfc; border: 1px solid #eceef2` con la pregunta "¿Por qué se ignora? El motivo decide si cuenta como vacío de conocimiento en el informe." y tres opciones en chips pequeños: **Fuera de alcance** · **Puntual, no se repite** · **Duplicada**. Confirmar con botón oscuro `#344054` + Cancelar.

Sin motivo, el informe mensual mezcla "no podemos responder" (fallo del producto) con "no debemos responder" (pregunta fuera de dominio), y la cobertura queda mal calculada.

## Verificación post-resolución

El bloque que convierte el módulo en algo defendible ante un cliente. En toda pregunta resuelta: `margin: 0 20px 18px; padding: 14px; border-radius: 10px; border: 1px solid #e8eaee`.

- Título de sección "VERIFICACIÓN"
- **antes** → **después**: dos cifras en mono 13px/600 con una flecha `→` en `#c7ccd4`. Antes siempre en `#b42318`; después en `#15803d` si pasa el umbral, `#b45309` si no.
- Píldora de resultado a la derecha: "Verificada" (`#ecfdf5`/`#067647`) o "Bajo umbral" (`#fffbeb`/`#b45309`)
- Explicación en 12.5px `#475467`, distinta en cada caso: si pasó, que las variantes ya citan la fuente; si no, que la respuesta se publicó pero el índice aún no la recupera bien.
- Pie en mono 11px `#b6bcc7`: "reejecutada hace 3 h · 6 variantes"
- Nota: "Se reejecuta cada lunes. Si vuelve a caer bajo el umbral, la pregunta se reabre sola."

**El caso "Bajo umbral" debe ser representable y visible.** Es la prueba de honestidad del producto: publicar una respuesta no garantiza que el índice la recupere. Ocultarlo hace que el cliente lo descubra solo, en producción.

## Priorización

El orden por defecto no es por volumen. Es un impacto calculado:

```
raw     = volume × peso_canal × peso_tendencia
impacto = round(100 × raw / max(raw de todas))
```

- **Peso de canal**: widget público `1.4`, chat interno `1.0`. Una pregunta fallida en el widget público es un prospecto perdido; en el chat interno es tiempo de un empleado. No valen igual.
- **Peso de tendencia**: creciendo `1.35`, estable `1.0`, decayendo `0.6`. Un pico que ya pasó no merece trabajo.

El número no se muestra: se traduce a prioridad alta (≥70) / media (40–69) / baja (<40). Los pesos deben ser configurables por empresa, no constantes en el código.

"Antigüedad" ordena por días desde la apertura, para no dejar cronificarse las de bajo volumen.

## Interactions & Behavior

**El panel sigue siempre a la lista.** Regla única que evita el peor error de una vista maestro-detalle: mostrar el detalle de algo que ya no está en la lista.
- Cambiar de pestaña → selecciona la primera de la nueva lista, con su modo recomendado
- Buscar → mantiene la selección si sigue visible; si no, salta a la primera
- Resolver desde la fila → avanza a la siguiente pendiente (se está despachando una cola)
- Si no queda ninguna → panel vacío y estado vacío en la lista

**Acción rápida en la fila** (`padding: 5px 10px; border-radius: 7px; border: 1px solid #dfe3ea; font-size: 11.5px; color: #2563eb`, hover `border-color: #2563eb; background: #f5f8ff`). Debe llamar a `stopPropagation`: la fila entera también es clicable.
- **"Vincular"** (hay candidatos): resuelve con el mejor candidato y avanza. Un clic.
- **"Pedir doc"** (sin candidatos): **no resuelve** — abre el panel en modo Pedir documento, donde hay que elegir responsable. Una acción que asigna trabajo a otra persona nunca se ejecuta a ciegas.
- Desaparece de la fila mientras la pregunta esté en curso, para no solicitar dos veces.

**Modo por defecto al seleccionar**: `Vincular documento` si hay candidatos, `Pedir documento` si no. Las opciones se repliegan en cada cambio de selección.

**Enlaces salientes:**
- "Ver conversación" → conversación donde se preguntó, con retorno etiquetado "← Preguntas sin respuesta" (el retorno debe volver al origen real, no siempre a Feedback)
- Desde Feedback y desde Notificaciones se entra **a la pregunta concreta ya seleccionada**, en su pestaña correcta. Aterrizar en la lista completa obliga a buscar lo que se acaba de leer.

**Volumen alto.** Con cientos de preguntas por mes, paginar la lista de 25 en 25 dentro del área de scroll. La combinación pestaña + búsqueda + orden por impacto es lo que hace el volumen manejable: nunca se trabaja sobre 143, se trabaja sobre las 5 primeras.

**Accesibilidad.** Fila y botón de acción rápida son elementos interactivos reales, navegables con teclado. La selección no se señala solo con el fondo: también con el riel de color. Ninguna información depende únicamente del color de una píldora — todas llevan texto.

## State Management

| Estado | Tipo | Por defecto | Efecto |
|---|---|---|---|
| `gapTab` | string | `"Abiertas"` | Filtro de estado |
| `gapSort` | string | `"Impacto"` | Orden |
| `gapQuery` | string | `""` | Busca en pregunta, origen y variantes |
| `gapSel` | id | primera de la lista | Pregunta del panel |
| `resMode` | string | recomendado | Modo de resolución activo |
| `showModes` | bool | `false` | Selector de modo desplegado |
| `linkSel` | int | `0` | Candidato elegido |
| `requested` | mapa | `{}` | Preguntas en curso y su nota |
| `ignoring` | bool | `false` | Bloque de motivo abierto |
| `ignoreReason` | string | `"Fuera de alcance"` | Motivo elegido |
| `gapStatus` | mapa | `{}` | Superposición optimista del estado |

Prioridad, prioridad-etiqueta, agrupado y recuentos son **derivados**, no estado.

## API Endpoints

- `GET /api/knowledge-gaps?status=&sort=&q=&cursor=` — lista paginada con las intenciones agrupadas, sus variantes (top 3), candidatos del índice con score, tendencia y estado.
- `GET /api/knowledge-gaps/summary?period=` — los cuatro datos de la línea de resumen y los recuentos por pestaña.
- `GET /api/knowledge-gaps/:id` — detalle: todas las variantes, candidatos, historial y verificación.
- `POST /api/knowledge-gaps/:id/link` — `{document_id, chunk_id}`. Vincula, registra alias, dispara reejecución.
- `POST /api/knowledge-gaps/:id/answer` — `{answer_text}`. Indexa como chunk con autor y fecha.
- `POST /api/knowledge-gaps/:id/request-document` — `{assignee_id, note, due_days}`. Pasa a en curso.
- `POST /api/knowledge-gaps/:id/ignore` — `{reason}`. Motivo obligatorio.
- `POST /api/knowledge-gaps/:id/verify` — reejecuta las variantes y devuelve score antes/después.

## Cambios de base de datos requeridos

La tabla `knowledge_gaps` actual (`id`, `company_id`, `assistant_id`, `widget_id`, `conversation_id`, `user_id`, `question_text`, `rag_score`, `sources_count`, `status`, `answer_text`, `resolved_by`, `resolved_at`, `created_at`) **no soporta lo que esta pantalla promete**. Falta:

1. **`group_id`** UUID nullable, indexado — la agrupación por intención. Sin esto no hay "24 preguntas, 6 variantes" y la pantalla vuelve a ser una lista de 143 filas sueltas. Es el cambio imprescindible: es la premisa del módulo. Alternativa sin columna: calcular la agrupación en un job por similitud de embeddings y materializarla en una tabla `knowledge_gap_groups` (recomendado, permite recalcular sin tocar los registros originales).
2. **`resolved_document_id`** UUID nullable, FK a `documents` — con qué documento se resolvió. Sin esto no se distingue "vinculé contenido existente" de "escribí una respuesta nueva", que es la distinción central del módulo y el dato que alimenta el informe.
3. **Verificación**: `verify_score_before`, `verify_score_after` (Float), `verified_at`, `verify_passed` (Boolean). Sin estos campos el bloque de verificación no existe, y sin verificación el módulo no puede demostrar que sirvió.
4. **`status` ampliado** con `in_progress` (documento solicitado), más `assigned_to`, `requested_at`, `due_at`. Hoy solo hay abierta/resuelta/ignorada, así que pedir un documento no tiene dónde registrarse.
5. **`ignore_reason`** String(30) nullable — `out_of_scope` / `one_off` / `duplicate`. Es lo que permite excluir del cálculo de cobertura lo que la plataforma no debía responder.
6. **`recurrence_count`** Integer default 0 y `reopened_at` — para la píldora "reincidente" y para el aviso individual de notificaciones.
7. **Índices**: `(company_id, status, created_at DESC)` y `(group_id)`. La lista y los recuentos son las consultas más frecuentes de la pantalla.

**Jobs necesarios:**
- **Agrupación** (continuo o cada hora): asigna `group_id` por similitud de embeddings al detectar una pregunta nueva.
- **Reverificación semanal** (lunes): reejecuta las variantes de las resueltas; si el score cae bajo umbral, incrementa `recurrence_count`, reabre y emite notificación individual.
- **Vencimiento de solicitudes** (diario): las `in_progress` pasadas de `due_at` vuelven a `open`.

## Design Tokens

**Colores**

| Uso | Valor |
|---|---|
| Fondo de página | `#f7f8fa` |
| Superficie de tarjeta | `#ffffff` |
| Fila seleccionada | `#f5f8ff` |
| Hover de fila | `#f8fafc` |
| Pie de lista | `#fbfcfd` |
| Bloque neutro (motivo, candidatos) | `#fafbfc` |
| Borde de tarjeta | `#e8eaee` |
| Borde de control | `#e3e6eb` / `#dfe3ea` |
| Divisor de fila | `#f1f2f5` / `#eceef2` |
| Fondo de segmentado | `#edeff3` |
| Título | `#101828` |
| Texto secundario | `#344054` / `#475467` |
| Texto atenuado | `#667085` |
| Texto de etiqueta | `#98a2b3` |
| Texto muy tenue | `#b6bcc7` / `#c7ccd4` |
| Primario | `#2563eb` (hover `#1d4ed8`, activo `#60a5fa`) |
| Éxito | `#15803d` / `#067647` · fondo `#f0fdf4` / `#ecfdf5` · borde `#bbf7d0` |
| Advertencia | `#b45309` · fondo `#fffbeb` |
| Error | `#b42318` / `#ef4444` · fondo `#fef2f2` · borde `#fecaca` |
| Reincidencia | `#be123c` / `#9f5060` · fondo `#fff1f2` · borde `#fecdd3` |
| En curso | `#1e40af` / `#1d4ed8` · fondo `#eff6ff` · borde `#dbe6fe` |
| Botón oscuro (ignorar) | `#344054` (hover `#1f2937`) |

**Tipografía**

- Interfaz: `-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif`
- Cifras, scores, recuentos, ids: `'IBM Plex Mono', monospace` (Google Fonts, 400 y 500)
- Escala: 24px/650 (H1) · 19px/650 (volumen de fila) · 15px/600 (pregunta del panel, cifras del resumen) · 13.5px/550 (pregunta de fila) · 13px (subtítulo, resumen, textarea) · 12.5px (mensajes, botones, chips, variantes) · 12px (enlaces, recomendación) · 11.5px (contexto, notas) · 11px (mono: recuentos, scores) · 10.5px (píldoras, títulos de sección)
- Títulos de sección: 10.5px/600, `letter-spacing: 0.09em`, mayúsculas, `#98a2b3`
- `text-wrap: pretty` en todo texto de párrafo
- `letter-spacing: -0.02em` en H1, `-0.025em` en cifras grandes

**Espaciado** — 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 26, 28, 44 px. Fila `padding: 14px 20px 14px 0`; secciones del panel `padding: 15px 20px`; cabecera del panel `18px 20px 15px`.

**Radios** — 7px (chips pequeños, opción de segmentado) · 8px (botones) · 9px (candidatos, avisos, inputs) · 10px (bloques internos) · 11px (tarjetas) · 99px (píldoras, chips de pestaña, radios)

**Sombras** — tarjeta `0 1px 2px rgba(16,24,40,0.04)` · opción activa de segmentado `0 1px 2px rgba(16,24,40,0.08)`

**Tamaños** — riel de selección 3px · radio de candidato 14px · punto de aviso 6px · buscador 230px · lista `max-height: 540px` · panel `min-width: 300px; max-width: 420px`; sticky `top: 14px`

## Lo que se quitó a propósito

Cada uno se evaluó y se descartó. No reintroducir sin motivo nuevo:

- **Cuatro tarjetas de KPI arriba.** Empujaban la lista —el trabajo— por debajo del pliegue. Sustituidas por la línea de resumen.
- **"Cobertura por categoría" y "Documentos que nadie cita"** al pie. Son analítica, no trabajo pendiente; su sitio es Analytics. "Documentos sin citas" solo gana valor aquí si se cruza: documento sin citas + pregunta abierta del mismo tema = fallo de recuperación, no de contenido.
- **Botón "Umbrales de detección"** en la cabecera. Es configuración: va en Ajustes.
- **Orden por volumen** como tercera opción. El volumen sin canal ni tendencia lleva a trabajar en lo que más ruido hace, no en lo que más cuesta.
- **"impacto 63" como cifra visible.** Competía con el volumen y nadie sabía cuál mandaba. Es prioridad alta/media/baja.
- **El score suelto en la cabecera del panel.** 0.41 no significa nada sin un documento al lado.
- **Fusionar preguntas duplicadas** y **atajos de teclado J/K/Enter.** Añaden conceptos sin devolver claridad al volumen actual. Reconsiderar si el cliente supera ~50 abiertas simultáneas.
- **Los tres modos de resolución siempre visibles.** Obligaban a elegir entre tres cosas parecidas antes de entender el caso. Ahora hay una recomendación con su razón, y las otras dos detrás de "Otra opción".

## Assets

Ninguno. No hay imágenes ni iconos: los indicadores son píldoras, puntos y rieles CSS; la flecha es `→`; el radio de candidato es un círculo con borde. Si el codebase tiene librería de iconos, puede añadirse uno por tipo de píldora manteniendo tamaño y color.

Fuente: **IBM Plex Mono** (400, 500) desde Google Fonts. La tipografía de interfaz es la del sistema.

## Files

- `KnowledgeSpace Pages.dc.html` — prototipo completo. La pantalla es el bloque bajo `isGaps` en la plantilla; su lógica está en `gapVals()`, y los datos de ejemplo en la constante `GAPS`.
- `MODELO_DATOS.md` — modelo de datos del backend, versión 12.1 (13/08/2026). `knowledge_gaps` está en la sección 2.10.

Para verlo: abrir el HTML y navegar a **Analytics → Preguntas sin respuesta**. Recorrido recomendado, que es también el de demo:

1. Pregunta #39, "no se encuentra" → **Vincular documento**: el contenido existía y no se recuperaba.
2. Pregunta #44, "falta contenido" → **Pedir doc**: pasa a en curso, no a resuelta.
3. Pestaña Resueltas, #40 → verificación 0.48 → 0.84, **Verificada**.
4. Pestaña Resueltas, #32 → verificación 0.51 → 0.66, **Bajo umbral**: publicar respuesta no arregló la recuperación.
5. Pregunta #36, **reincidente** → se resolvió y volvió.
6. Ignoradas, #24 "¿Quién ganó la liga?" → fuera de alcance, no un vacío.

El prototipo incluye Analytics, Feedback, Costos, Notificaciones, Banco de pruebas y el chat con citas — contexto útil, fuera del alcance de este handoff. El **Banco de pruebas** es su continuación natural: las preguntas resueltas entran allí y se reejecutan cada semana.
