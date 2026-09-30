# Alcance académico de esta entrega (TFM)

Este repositorio es la versión de **KnowledgeSpace — Frontend** entregada como
Trabajo Fin de Máster. Es una copia con alcance reducido del producto en
desarrollo activo; el repositorio comercial es privado y continúa
evolucionando por separado. Ver también `ALCANCE_TFM.md` del backend.

## Núcleo académico (contribución del TFM)

- Chat con RAG contra la documentación de la empresa (`features/chat`).
- Gestión de documentos y su ingesta al pipeline RAG (`features/documents`).
- Aislamiento multi-tenant en la UI (datos filtrados por empresa según el JWT).
- Panel de "knowledge gaps" — preguntas sin respuesta satisfactoria
  (`features/knowledge-gaps`).
- Tracking de costo por solicitud LLM visible en la UI.

## Explícitamente fuera de alcance de la defensa

- **Widget público embebible**: decisión de comercialización, no una limitación
  técnica no resuelta — así quedó documentado desde el desarrollo original del
  proyecto. En esta entrega no solo se declara fuera de alcance: **su código se
  retiró del repositorio** (el módulo `features/widgets`, su ruta, su entrada en
  el menú y la pestaña "Widgets" del detalle de asistente), junto con el router
  y los endpoints correspondientes en el backend.

  Lo que **sí permanece** es el modelo de datos: la tabla `widgets`, la relación
  `Assistant.widgets` y los campos `widget_id` / `channel` en `feedback` y
  `knowledge_gaps`. No es residuo olvidado, es una dependencia real del núcleo
  académico: el canal de origen (`widget` | `chat`) es lo que permite al módulo
  de Preguntas sin respuesta ponderar de forma distinta las preguntas que
  llegaron desde un sitio público. Retirarlo habría obligado a modificar la
  contribución que se defiende.
- CRUD administrativo de companies/users/notifications: soporte necesario
  para que el multi-tenant funcione, no la contribución de investigación.
- El campo `plan` (`basic|pro|enterprise`) es un modelo de datos ilustrativo
  de tiering multi-tenant; no hay checkout ni cobro real en este código.
- URLs y dominios de infraestructura de producción comercial — los
  `environment.*.ts` de esta entrega apuntan a placeholders, no a servicios
  reales.

## Limitaciones conocidas

- **Sin tests automatizados**: no existen `.spec.ts` en este repositorio.
  Es una limitación real del proyecto, no un recorte de esta entrega —
  se documenta aquí en vez de fabricar cobertura de última hora.
- Sin CI/CD en este repositorio (el pipeline de la infraestructura comercial
  queda fuera de esta entrega).
