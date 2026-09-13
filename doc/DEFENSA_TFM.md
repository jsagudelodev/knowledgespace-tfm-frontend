# Defensa del TFM — Preguntas y respuestas

Documento de preparación para la defensa oral, con las decisiones de arquitectura de KnowledgeSpace y su justificación técnica. Todo lo escrito aquí está verificado contra el código real del backend (`KnowledgeSpace/api`) a fecha de 2026-09-08, no es una descripción genérica de RAG.

---

## 1. Por qué escogiste RAG (y no fine-tuning, ni un LLM "pelado")

El problema del proyecto no es "generar texto que suene bien" — es responder preguntas sobre la documentación *específica* de cada empresa cliente, con la certeza de que la respuesta viene de ahí y no del conocimiento general del modelo. Tres razones concretas descartaron el fine-tuning y motivaron RAG:

1. **La documentación cambia constantemente y es multi-tenant.** Cada empresa (`company_id`) sube y borra documentos todo el tiempo. Con fine-tuning, cada cambio de contenido implicaría reentrenar un modelo — carísimo e inviable con decenas de empresas cliente, cada una con su propio corpus. Con RAG, subir un PDF nuevo lo hace consultable en minutos (pipeline de `documents.py`: extracción → chunking → embeddings → upsert a Pinecone), sin tocar el modelo.
2. **Necesitas poder decir "no sé" y citar la fuente.** Un modelo fine-tuneado mezcla lo aprendido con su conocimiento base de forma opaca — no hay manera de auditar de dónde salió una respuesta. RAG separa recuperación de generación: cada respuesta viene acompañada de `sources` (`document_id`, nombre, score) — trazabilidad que un modelo fine-tuneado no puede dar.
3. **Multi-tenancy sin duplicar modelos.** Un solo LLM (`gpt-4o-mini`) sirve a todas las empresas; lo que cambia por empresa/asistente es el *contexto recuperado*, aislado por namespace de Pinecone (`company-{id}` / `company-{id}-assistant-{id}`). Mantener un modelo fine-tuneado por cliente sería inviable en costo y en operación.

RAG además es lo que hace posible el módulo de **Preguntas sin respuesta** (`knowledge_gaps`): poder distinguir "no hay documento" (`gap_type = hard`) de "el documento existe pero no se recupera bien" (`gap_type = soft`) solo tiene sentido si la recuperación es una etapa separada y observable — con fine-tuning esa distinción no existe.

---

## 2. Por qué esos embeddings (`text-embedding-3-small`, 1536 dimensiones)

Configurado en `app/core/config.py` (`OPENAI_EMBEDDING_MODEL`), usado en `EmbeddingService`. Tres criterios, en orden de peso real en las decisiones del proyecto:

- **Costo.** `text-embedding-3-small` cuesta `$0.00002` por cada 1.000 tokens — el más barato de los modelos de embeddings de calidad aceptable de OpenAI (`text-embedding-3-large` cuesta ~6.5× más). Con el módulo de Cost Tracking ya instrumentado, esto es literalmente medible: cada subida de PDF registra sus tokens de embedding y su costo real en `cost_tracking`.
- **Mismo proveedor que el LLM.** Un solo API key, un solo SDK (`openai`), un solo presupuesto de rate-limit — reduce superficie de integración. Con un proyecto de un TFM y sin equipo de infraestructura, esa simplicidad importa tanto como el costo.
- **Tamaño del vector (1536).** Vectores más pequeños que `text-embedding-3-large` (3072) significan menos almacenamiento y búsquedas ANN más rápidas en Pinecone, con una pérdida de calidad semántica que en la práctica no se nota para el caso de uso (preguntas y respuestas sobre documentación empresarial, no búsqueda de matices literarios).
- **Soporta batch nativo.** La API acepta hasta 2048 textos por llamada — `EmbeddingService.generar_embeddings_batch()` aprovecha esto subiendo hasta 100 chunks por request en vez de uno por uno. Para un documento de 50 chunks eso es 1 llamada en vez de 50: la optimización de eficiencia de recursos más directa del pipeline de ingesta.

---

## 3. Por qué Pinecone y no pgvector

Ya tienes PostgreSQL (Supabase) para todo lo relacional — la pregunta que un corrector va a hacer es exactamente "¿por qué no pgvector y consolidas en una sola base de datos?". Respuesta honesta con trade-offs, no solo ventajas:

**A favor de Pinecone (por qué se eligió):**
- **Serverless de verdad.** No hay que tunear HNSW/IVFFlat, ni reindexar al crecer el volumen — relevante para un proyecto académico sin tiempo dedicado a operar infraestructura de base de datos vectorial.
- **Namespaces como aislamiento multi-tenant nativo.** `PineconeService.construir_namespace(company_id, assistant_id)` da aislamiento por empresa *y* por espacio/asistente sin una sola línea de lógica de filtrado — la alternativa en pgvector sería una columna `company_id`/`assistant_id` con un `WHERE` en cada query, funcionalmente equivalente pero manual y con más superficie de error (de hecho, el fallback cruzado entre espacios que corregimos esta sesión en `RAGService` habría sido un `WHERE` mal puesto en el mundo pgvector — el bug es posible en ambos, pero Pinecone lo hace explícito por diseño).
- **Escala independiente del resto del sistema.** El tráfico de búsqueda semántica no compite por recursos con las consultas transaccionales normales de la aplicación (usuarios, documentos, conversaciones).

**En contra (limitaciones reales, que hay que poder nombrar en la defensa):**
- **Dos sistemas de datos, sin transacción distribuida.** Un documento puede quedar `completed` en Postgres pero fallar su `upsert` a Pinecone (o viceversa) sin mecanismo automático de reconciliación — es una inconsistencia posible que el sistema no repara solo.
- **Dependencia y costo de un servicio externo adicional** — pgvector no tendría este costo marginal por ser una extensión de la misma base de datos que ya se paga.
- **Latencia de red extra** por ser un hop adicional fuera de la base de datos principal.

La elección fue consciente de estos trade-offs: para el volumen y la escala de un TFM, la simplicidad operativa de Pinecone pesó más que la consolidación que ofrecería pgvector.

---

## 4. Cómo se solucionan (mitigan) las alucinaciones

No hay una sola técnica — es una cadena de cinco controles, cada uno cerrando una vía distinta de alucinación:

1. **Prompt restrictivo explícito** (`DEFAULT_SYSTEM_PROMPT`, `rag_service.py`): *"USA SOLO la información del contexto. NUNCA uses conocimiento externo o datos de entrenamiento"* + instrucción de decir textualmente que no encontró información si el contexto no alcanza, en vez de improvisar.
2. **Umbral de relevancia antes de generar** (`RELEVANCE_THRESHOLD = 0.30`): los chunks recuperados con similitud coseno por debajo del umbral se descartan *antes* de construir el contexto — el LLM nunca ve evidencia débil como si fuera fuerte.
3. **Aislamiento estricto por espacio** (corregido esta sesión, `rag_service.py`): antes, un asistente sin resultados propios caía a un namespace compartido de toda la empresa, pudiendo citar contenido de un espacio distinto — una alucinación "con fuente equivocada". Hoy cada asistente busca únicamente en su propio namespace.
4. **Citación de fuentes verificable** (`sources` en cada respuesta: `document_id`, nombre, score): convierte la respuesta en algo auditable por el usuario, no en un "confía en mí".
5. **Cierre del ciclo con Preguntas sin respuesta y verificación**: cuando el sistema no encuentra buena evidencia, en vez de dejar que el LLM rellene el vacío, la pregunta se registra como `knowledge_gap` (`hard` si no hay ningún chunk relevante, `soft` si hay chunks pero bajo el umbral). Al resolverla, `_auto_verify()` reejecuta la pregunta contra el índice y dejar registrado si la respuesta ahora sí se recupera (`verify_passed`) — es la prueba de que el hueco de contenido, y no el LLM, era la causa del problema.

Límite honesto: estos controles reducen la alucinación por *falta de evidencia*, pero no eliminan la posibilidad de que el LLM malinterprete evidencia correcta (alucinación por síntesis incorrecta de un contexto válido) — ver limitaciones (§7).

---

## 5. Cómo se evalúa la calidad

Tres mecanismos, del más automático al más manual:

- **Score de similitud por interacción** (`rag_score`): cada vez que un mensaje recibe feedback, se recalcula el mejor score de similitud contra el índice (`feedback_repository.py`) y queda guardado junto a la calificación humana — permite cruzar "el usuario lo calificó mal" con "¿el índice realmente no tenía buena evidencia, o el LLM interpretó mal buena evidencia?".
- **Feedback humano explícito** (1–5 estrellas por respuesta, módulo Feedback): las calificaciones bajas (≤2) pueden convertirse en un `knowledge_gap` con un clic, cerrando el ciclo entre "esto salió mal" y "esto queda registrado como trabajo pendiente".
- **Verificación automática post-resolución** (`_auto_verify`, agregado esta sesión): al resolver una pregunta sin respuesta, el sistema reejecuta automáticamente las variantes contra el índice y registra el score antes/después (`verify_score_before` → `verify_score_after`). Si no supera el umbral (`VERIFY_THRESHOLD = 0.70`), queda marcado como "bajo umbral" en vez de "resuelto" a ciegas — es una evaluación offline automatizada de si el fix realmente funcionó, no una suposición.
- **Cobertura como métrica de sistema**: `% de las consultas encuentran fuente`, calculado en el resumen de Preguntas sin respuesta — un KPI agregado de calidad de recuperación a nivel de toda la empresa.

**Limitación a reconocer en la defensa:** no hay un harness de evaluación offline con un dataset de referencia (tipo RAGAS, o un conjunto de preguntas doradas con respuesta esperada) ni métricas de generación (faithfulness, answer relevancy) calculadas automáticamente. La evaluación de hoy es: similitud de recuperación (medible y automática) + calificación humana (real pero no sistemática) + verificación puntual al resolver. Es una evaluación funcional, no una evaluación de NLG formal — nómbralo así, no lo escondas.

---

## 6. Qué resultados obtuviste

Aquí no voy a inventar cifras que no se han medido — sería lo peor que le puedes llevar a un corrector (una cifra que no resiste la pregunta "¿cómo la mediste?"). Lo que sí puedo dejar es exactamente **qué está instrumentado hoy para que saques los números reales antes de la defensa**, y qué resultados *funcionales* (no numéricos) ya están demostrados:

### Resultados funcionales verificados (demostrables en vivo)
- Pipeline completo PDF → chunking → embeddings → Pinecone → recuperación → generación → respuesta con fuentes, funcionando de punta a punta.
- Aislamiento multi-tenant por empresa y por espacio/asistente, verificado con tests automatizados (`tests/test_pinecone_namespace.py`).
- Ciclo de detección → resolución → verificación de vacíos de conocimiento, funcionando con reejecución automática contra el índice.
- Registro de costo real en USD por cada llamada al LLM y a embeddings, verificado contra la base de datos en producción.

### Números que sí puedes reportar — sácalos de tu propia base de datos
Con el módulo de Cost Tracking ya funcionando, estas consultas te dan cifras reales y defendibles:

```sql
-- Costo total y tokens del período de pruebas
SELECT operation, COUNT(*) AS llamadas, SUM(input_tokens + output_tokens) AS tokens,
       SUM(total_cost) AS costo_usd, AVG(total_cost) AS costo_promedio_usd
FROM cost_tracking
WHERE created_at >= '2026-09-01'
GROUP BY operation;
```

O directamente por API: `GET /api/v1/cost-tracking/summary?days=30` y `GET /api/v1/cost-tracking/daily-trend?days=30`.

**Recomendación concreta:** antes de la defensa, arma un set de 15-20 preguntas reales sobre un documento de prueba, corre cada una por el chat, y reporta: costo promedio por pregunta, tokens promedio, y cuántas de las 15-20 obtuvieron una fuente con score ≥ 0.70 vs. cuántas cayeron en "no encontré información". Eso es un resultado real, pequeño pero honesto, y mucho más defendible que una cifra de "accuracy" sin metodología detrás.

---

## 7. Qué limitaciones tiene el sistema

Nombrar las limitaciones con precisión es más defendible que no mencionarlas — un corrector que las descubre por su cuenta pesa más en contra que una limitación reconocida y justificada.

1. **La agrupación semántica de preguntas por intención no existe todavía.** El diseño de Preguntas sin respuesta asume que "143 consultas se agrupan en ~10 intenciones", pero el job de agrupación por similitud de embeddings está pendiente — hoy cada pregunta es un registro 1:1, no agrupado.
2. **Sin reverificación semanal automática ni vencimiento de solicitudes.** Ambos jobs de fondo están diseñados (documentados en `BACKLOG_BACKEND.md`) pero no implementados — la verificación post-resolución es automática al resolver, pero no se repite sola si el contenido se reindexa después y el score cae.
3. **Detección de vacíos de conocimiento no es automática desde el chat en vivo.** Hoy un `knowledge_gap` solo se crea manualmente al convertir un feedback negativo — el sistema no detecta y registra por sí solo cada vez que el LLM responde "no encontré información".
4. **Sin consistencia transaccional entre Postgres y Pinecone** (ver §3) — un fallo a mitad del pipeline de ingesta puede dejar metadata y vectores desincronizados sin que nada lo detecte automáticamente.
5. **Umbrales globales, no configurables por empresa.** `RELEVANCE_THRESHOLD` y `VERIFY_THRESHOLD` son constantes en el código — un cliente con documentación muy técnica podría necesitar un umbral distinto al de uno con documentación conversacional, y hoy no se puede ajustar sin tocar código.
6. **Sin caché de embeddings ni rate limiting.** Preguntas idénticas o muy similares repetidas por distintos usuarios recalculan el embedding de la consulta cada vez — coste evitable no aprovechado.
7. **Sin harness de evaluación de generación formal** (ver §5) — la calidad se mide por proxy (similitud de recuperación + feedback humano), no por métricas de NLG estandarizadas.
8. **El widget público embebido está fuera de alcance a propósito** — es una decisión de producto (funcionalidad de comercialización, no parte del alcance académico de este TFM), no una limitación técnica no resuelta. Vale la pena decir esto explícitamente si surge en la defensa, para que no se confunda con algo que "falta terminar".
9. **Cobertura de tests automatizados es de lógica pura, no de integración end-to-end.** Los 17 tests de `pytest` verifican funciones aisladas (cálculo de costo, namespaces, construcción de contexto, cortes de fecha) — no hay tests de integración que levanten la API completa contra una base de datos de prueba.

---

*Documento generado el 2026-09-08 a partir de una revisión directa del código en `KnowledgeSpace/api` — no es una descripción teórica genérica de RAG, cada afirmación aquí tiene un archivo y una línea detrás si hace falta mostrarla en la defensa.*
