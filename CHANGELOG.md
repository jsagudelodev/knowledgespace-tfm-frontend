# Registro de cambios

Resumen de lo hecho cada día de trabajo, lo más reciente arriba. No sustituye
al historial de git —cada entrada enlaza al commit real—, sirve para encontrar
rápido *qué pasó cuándo* sin tener que leer los mensajes de commit completos.
Se actualiza al cerrar cada sesión, con lo hecho en los dos repos (regla en
`doc/CLAUDE.md`). Los hashes de commit son del repo donde ocurrió el cambio; hasta
el 2026-11-04 este archivo vivía en el backend y sus entradas citan commits del
backend.

---

## 2026-11-08

### Experimentos (backend)

- **Una carpeta por experimento de la memoria:** `api/experimentos/` pasa de
  un `resultados/` común a `1-fragmentacion/` … `9-embeddings-y-tamano/` y
  `ampliacion/` (EXP-11 y EXP-12, sin número en la memoria). Los 31 resultados
  se movieron con `git mv` (conservan su historial); EXP-13 vive dentro del 5 y
  EXP-14 y EXP-15 dentro del 9. Cada carpeta tiene un `LEEME.md` con la
  pregunta, el resultado y la decisión de sus registros, sacados del propio
  `REGISTRO.md`.
- `REGISTRO.md` abre con la tabla del 1 al 9 enlazando cada carpeta;
  `GUIA_PRUEBAS.md` indica en cada registro su experimento de la memoria.
  Los guiones siguen en la raíz (varios los comparten): los de EXP-13, 14 y 15
  escriben ahora en su carpeta nueva y las ejecuciones nuevas del resto caen en
  `resultados/`. Rutas al día en `CLAUDE.md`, `.gitignore`, `docs/TFM` y tres
  comentarios del código; ningún enlace roto. 289 tests y ruff en verde.

### Memoria (fuera de git)

- Revisión de estilo completa (263 cambios) para que no suene a texto
  generado, correcciones de contenido cotejadas con el repositorio y pies
  «Tabla N.» en las 30 tablas. 60 páginas.

---

## 2026-11-07

### Pulido visto al rehacer las capturas

- **Fragmento citado legible:** `textoFragmento` une las líneas del PDF
  partidas a mitad de frase y cambia las viñetas de uso privado (salían □)
  por «•». Solo presentación; el texto indexado no cambia. 4 tests nuevos
  (`chat-detail.fragmento.spec.ts`): el frontend pasa a 87.
- **Calificar:** el motivo elegido va aparte del comentario (`feedbackMotivo`)
  y se unen al enviar como «Motivo. Comentario»; antes quedaba «No fue
  útilEsperaba…».
- **Plurales:** «1 fuente», «1 consulta», «1 pregunta sin responder/abierta…»
  en Feedback y Sin respuesta.
- **Chat vacío:** muestra el emoji del asistente, como sus mensajes.
- Descartado: el «Abiertas 8» que parecía un recuento erróneo era un 0 con
  barra de la fuente monoespaciada.
- Capturas 09, 21 y 24 rehechas con estos cambios.

### Capturas y manual de usuario

- **Capturas rehechas** (todas menos el login), con el asistente EBIS: 02–18.
  La 16 lleva los correos difuminados y la 17 (Empresas, con el
  superadministrador) los nombres y correos de las empresas reales.
- **Nuevas:** calificar una respuesta (19), Nueva conversación (20),
  sugerencias en el chat (21) y en el formulario del asistente (26), y el
  ciclo completo de una pregunta sin respuesta: enviarla desde Feedback (22),
  escribir la respuesta (23), verificación 0,32 → 0,93 (24) y el chat
  respondiendo con ella (25).
- **Manual:** sugerencias rápidas, Nueva conversación, calificar y un ejemplo
  completo «de no lo sé a conocimiento» en la sección 5.

### Chat: fuentes

- **Fuera el `71%` con color** de la fila de cada documento: se leía como
  confianza en la respuesta, y los cortes verde/ámbar (0,75/0,5) no estaban
  medidos. Los fragmentos se ordenan de mayor a menor similitud, el más
  cercano va destacado y cada uno tiene un tooltip de PrimeNG con la
  similitud en decimal (0,71). Estilo en `styles.scss` (`.fuente-tooltip`),
  porque PrimeNG va sin tema.
- **Fragmento legible:** respeta los saltos de línea del texto indexado y hace
  scroll si es largo; las diapositivas se leían como un bloque corrido.
- **Abstención sin fuentes:** bajo «No encontré información…» ya no aparece
  «Fuentes consultadas» (pasaba cuando algún fragmento superaba el umbral sin
  responder la pregunta). Backend: solo un comentario en `rag_service.py` que
  ata la frase literal a la del front (backend `3644928`).
- Manual de usuario al día con el nuevo bloque de fuentes. Todo lo de este
  apartado: `840b2ac`.
- Con una sola fuente, la cabecera dice «Fuente consultada · 1 fragmento» (antes
  «1 fragmentos»). Una respuesta escrita en Preguntas sin respuesta se llama
  ahora «Respuesta escrita · Preguntas sin respuesta»: el backend la indexa
  como «Respuesta directa (preguntas sin responder)», que no coincidía con el
  módulo, y cambiarlo allí no alcanzaba a las ya indexadas.

### Chat: una conversación por asistente

- **Cada asistente tiene su conversación:** al cambiar se ve la del elegido y,
  al volver, la del anterior sigue intacta (en memoria, hasta recargar).
  Antes los mensajes de los dos quedaban mezclados y el chip resaltado (el
  asistente seleccionado ahora, no quien respondió) llevó a confundir de quién
  era una respuesta. Se probaron y descartaron limpiar al cambiar y un
  separador dentro de la misma conversación.
- **Botón ✎ «Nueva conversación»** en la cabecera del panel, que limpia solo la
  del asistente actual: hasta hoy la única forma de empezar de cero era
  recargar la página. ✎ y los chips se desactivan mientras llega una respuesta.
- Las respuestas llevan el emoji del asistente como avatar, no el robot
  genérico.
- `action-tooltip` (styles.scss) recibe la parte estructural que le faltaba
  por ir PrimeNG sin tema. Front: 83 tests.

### Chat: historial que recibe el modelo (backend)

- **Ya no se mezclan asistentes:** al cambiar de asistente en la misma
  conversación, el nuevo recibía como historial las preguntas y respuestas del
  anterior, de otro espacio de conocimiento. Encontrado revisando el código, no
  observado en una respuesta. Ahora el historial solo lleva los mensajes de ese
  asistente (`historial_del_asistente` en `message_repository.py`).
- **Los 20 más recientes, no los 20 primeros:** se ordenaba de antiguo a nuevo
  con `limit`, así que en conversaciones largas el modelo veía el principio.
  `get_by_conversation` no cambia: sigue pintando la conversación en pantalla.
- `RAG_PIPELINE.md` al día. Backend: 289 tests (3 nuevos en
  `test_historial_del_asistente.py`).

### Preguntas sin respuesta

- La respuesta escrita de una pregunta resuelta respeta sus saltos de línea
  (`white-space: pre-line`); con listas y apartados se leía como un bloque
  corrido. Comprobado con la #40 (Plan Vallejo): 37 saltos guardados. Con
  altura máxima (~12 líneas) y scroll, como el fragmento del chat: una
  respuesta larga estiraba la tarjeta y alejaba la verificación.

### Asistentes

- Cinco avatares más en el formulario (🎓 🏫 📘 💻 📊), 15 en total.

### Memoria

- **Figura 2 (4.1) repetida** con la cuenta de rol usuario: el menú ya no
  muestra «Etiquetas» ni la sección Administración. Con ella, las cuatro
  figuras de la interfaz que usa la memoria están al día. 59 páginas.
  Respaldo previo en `docs/Memoria_TFM_respaldo_2026-11-07.docx` (backend).
- **Portada:** «Trabajo Fin de Máster · KnowledgeSpace · Plataforma
  multiempresa de asistentes conversacionales basados en generación aumentada
  por recuperación, con control y evaluación de alucinaciones · MID · EBIS
  Business Techschool · Autor: Johan Sebastian Agudelo Sierra · Noviembre de
  2026». Sin tutor. Índice actualizado.
- **Anexo 10.1:** credenciales de los dos usuarios de demostración (las puso
  el autor; comprobadas contra el backend local) y fuera los signos ⟨ ⟩. Solo
  queda el marcador del enlace al vídeo.
- La memoria queda en **60 páginas**, el máximo de la guía. Respaldo previo en
  `docs/Memoria_TFM_respaldo_2026-11-07b.docx`.
- **Estilo menos «de IA» en toda la memoria**, sin cambiar datos ni ideas: 127
  sustituciones aplicadas con Word para conservar el formato. Rayas de 114 a 2
  (las de dos celdas vacías de una tabla), «Conviene/Procede…» de 15 a 0,
  «no es X, sino Y» de 12 a 0, «precisamente», «deliberadamente» y «la
  distinción» a 0, «resulta» de 17 a 3. 68 palabras menos; sigue en 60
  páginas. El capítulo 2 no se tocó. Respaldos: `..._2026-11-07c.docx` (antes
  de empezar) y `..._2026-11-07d.docx` (tras el capítulo 5).
- **«Ningún enrutador consulta la base de datos» (3.2 y 4.1) volvía a ser
  falso**: `feedback.py` leía el asistente de un mensaje y `knowledge_gaps.py`
  los nombres de asistente y documento directamente. Backend: las tres
  lecturas pasan a sus repositorios (`MessageRepository.assistant_id_of_company`,
  `AssistantRepository`/`DocumentRepository.get`), sin cambio de
  comportamiento, y un test nuevo (`test_capas_sin_consultas_en_routers.py`)
  falla si un enrutador vuelve a leer o escribir la base directamente, salvo
  `setup.py`; comprobado contra el código anterior. Memoria: la frase nombra
  esa excepción (el arranque inicial) y las cifras pasan de «doce» y
  «diecisiete» a once y dieciséis, que cambiaron al retirar Etiquetas. 6.1 a
  286 pruebas (Aislamiento 57). Corregido de paso un «y que» sobrante que dejó
  la limpieza de estilo. 60 páginas; respaldo `..._2026-11-07e.docx`.
- **Portada:** añadido el tutor, Alberto Ruiz Arteaga. 60 páginas; respaldo
  `..._2026-11-07f.docx`.

### Capturas del manual

- **Todas repetidas** con la interfaz actual (17 de 18), en localhost: la 01
  sin sesión; 03–13, 15, 16 y 18 con la cuenta de administrador de
  demostración; 02 y 14 con la de rol usuario (en la 14, dos casillas marcadas
  para enseñar la selección, sin borrar nada). En la **16 (Usuarios)** la
  columna de correos va difuminada. Queda la **17 (Empresas)**, que solo ve un
  superadministrador y que todavía muestra «Etiquetas» y empresas reales.

---

## 2026-11-05

### Memoria

- **6.1 al día:** 285 pruebas en el servidor (antes decía 266) y una frase con
  las 80 de la interfaz; fila nueva en la tabla, *Manejo de errores, 19*
  (`test_manejo_de_errores.py` 10 y `test_mensaje_documento_fallido.py` 9); la
  tabla suma 285.
- **3.2:** párrafo nuevo sobre el manejador común (503/500, mismo formato, sin
  detalle técnico, traza en el registro) y el interceptor de la interfaz; el
  motivo de un documento fallido se muestra traducido; fuera «una de las
  treinta y cinco pruebas», cifra de cuando había 35.
- Índice actualizado; 59 páginas en Word y en PDF, 24.819 palabras. Respaldo
  previo en `docs/Memoria_TFM_respaldo_2026-11-05.docx` (backend, fuera de git).
- **Figuras 3 y 4 y la de temperatura, repetidas**: las tres mostraban
  «Etiquetas» en el menú, retirada el 2026-11-02, y la de temperatura, además,
  a una cuenta de rol usuario editando un asistente, algo que hoy solo puede
  hacer un administrador. Misma proporción que las anteriores: el maquetado no
  cambia (59 páginas). Respaldo en `Memoria_TFM_respaldo_2026-11-05b.docx`.

### Chat

- **Restos de LaTeX:** los comandos de espaciado (`\,`, `\;`, `\:`, `\ `,
  `\!`, `\quad`) no tienen nombre y se colaban literales: la figura 3 de la
  memoria mostraba `cos \, θ`. Ahora se traducen a un espacio (el negativo
  desaparece). Test: `chat-detail.latex.spec.ts` (3).
- **Fuente «Respuesta directa»:** el chip mostraba un «·» que no se entendía;
  ahora dice «ver texto», y el texto desplegado se titula «Respuesta escrita»
  en vez de «Fragmento null».
- Figura 3 de la memoria y captura 08 rehechas con los dos arreglos. Tests:
  frontend 83.

### Capturas del manual

- **Catorce capturas de `doc/capturas/` repetidas** con la interfaz actual, en
  localhost y con la cuenta de administrador: 03, 04, 05, 06, 07, 08, 09, 10,
  11, 12, 13, 14, 15 y 18. Mismos nombres, así que el manual las toma sin
  cambios. Las de Feedback, Notificaciones y Preguntas sin respuesta enseñan
  lo de estos días (pregunta resaltada, selección al estilo Gmail, botón
  Responder). Pendientes: la 02 (necesita la cuenta de rol usuario) y la 16 y
  la 17 (muestran correos reales).

---

## 2026-11-04

### Notificaciones

- **Selección al estilo Gmail** (`d6d7cd0`): `POST /notifications/bulk`
  (`ids` + `action: read | delete`), con el filtro de propietario en la misma
  consulta: un id ajeno metido en la lista se ignora. Sustituye a `DELETE
  /notifications/read`.
- **Solo avisos de documentos** (`d6d7cd0`). "Nueva pregunta sin respuesta" y
  "Pregunta resuelta" los creaba la acción de un admin (convertir, resolver)
  y le llegaban a él mismo. Se dejan de emitir y de sembrar, se quita
  `create_for_admins`, y la migración de datos `d9f1b3c5a7e2` borra los 22 ya
  emitidos (aplicada en producción).

### Experimentos

- **EXP-14 (modelo de embedding) y EXP-15 (tamaño de fragmento)**
  (`d6d7cd0`), con sus scripts `comparar_embeddings.py` y
  `comparar_tamano_fragmento.py`.
- **El fragmento se guarda completo en los metadatos de Pinecone**
  (`d6d7cd0`, `documents.py`). Hasta hoy se guardaba `chunk[:1000]`: la
  búsqueda encontraba el fragmento por su texto entero, pero el modelo solo
  leía los primeros 1.000 caracteres (10 de 87 fragmentos del corpus de
  evaluación lo superan; la pregunta 26 se abstenía por eso). Afecta a lo que
  se indexe desde hoy: los documentos ya indexados siguen igual hasta
  reindexarlos. Test: `test_texto_completo_en_metadatos.py`.

### Documentación

- **Este CHANGELOG pasa del backend al frontend** y se pone al día desde el
  2026-10-17, con lo hecho en los dos repos. La regla de actualizarlo cada
  día queda en `doc/CLAUDE.md` (nº 4), junto a BITACORA, FEATURES y BACKLOG.
- **Documentos obsoletos eliminados.** Backend: `AWS_S3_IMPLEMENTACION.md`
  (plan ya ejecutado, lo cubre `DEPLOYMENT.md`), `DEVELOPMENT_GUIDE.md`
  (instrucciones para una IA con rutas que ya no existen) y
  `ESTADO_SOFTWARE_ENTREGA.md` (foto del 20 de octubre; lo vigente está en
  `ENTREGA_TFM.md`). Frontend: `doc/ia-handoff/`, los encargos de diseño de
  septiembre, que describían funciones ya retiradas.
- **README de los dos repos corregidos contra el código.** Backend: 14
  modelos (decía 13 tablas), 15 routers (decía 16), el `.venv` en `api/` y el
  nombre KnowledgeSpace. Frontend: fuera `tags/`, con `profile/` y los
  componentes compartidos reales; puerto local 8002 (decía 8080, también en
  `doc/CLAUDE.md`); producción apunta a Cloud Run, no a `api.example.com`;
  añadidos tests, lint, URL de Vercel y enlaces al manual y al CHANGELOG.
- **Manejo de errores, revisado de cara a la evaluación del código.**
  Backend: manejador global (`app/core/error_handlers.py`) — 503 si falla un
  proveedor externo, 500 si no, siempre JSON y sin detalle técnico, que va al
  log; antes un fallo no previsto era un 500 en texto plano. El borrado de
  vectores de Pinecone ya no falla en silencio (`documents.py`). Frontend:
  `avisadoPorElInterceptor` evita avisos dobles, y calificar, descargar un
  documento del chat, eliminar notificaciones y marcar como leídas (en bloque
  y desde la campana) avisan si el backend las rechaza; los errores que se
  ignoran a propósito llevan su motivo comentado. Tests: backend 276 (10
  nuevos), frontend 80 (6 nuevos).
- Cuatro respuestas de `documents.py` (subir, borrar y descargar de S3; listar
  fragmentos de Pinecone) devolvían `str(e)` al cliente: ahora deja el error al
  manejador global. Un test vigila que ningún router vuelva a hacerlo.
- **Un documento fallido ya no muestra el error técnico** (p. ej. el
  `NoSuchKey` de S3). La API traduce `error_message` al responder
  (`app/schemas/mensajes_documento.py`) a qué pasó y qué hacer; el original
  sigue en la base de datos y en el log. Vale también para los que fallaron
  antes. El listado de Documentos lo muestra entero en vez de recortarlo a 70
  caracteres. Tests: backend 285.
- **Documento nuevo `docs/TFM/MANEJO_ERRORES.md`** (backend): principios,
  capas y códigos, excepciones propias, manejador global, chat y streaming,
  procesos en segundo plano, efectos secundarios, interceptor y avisos del
  frontend, un recorrido completo, tests y limitaciones conocidas.
- **MANUAL_USUARIO (anexo 10.1) corregido contra el código.** La tabla de
  roles refleja los permisos por rol del 2026-11-02; fuera Etiquetas; el chat
  responde en streaming (el manual decía que no) y la propia contraseña se
  cambia desde Mi perfil (decía que no existía).

```
tests  backend 263 · frontend 74
```

---

## 2026-11-03

### Preguntas sin respuesta

- **Un candidato por documento** (`630e464`). "Vincular documento" mostraba
  el mismo documento una vez por fragmento (agentes_ia.md tres veces);
  `find_candidates` pide más fragmentos y se queda con el mejor de cada
  documento.

### Notificaciones

- **Por usuario y con borrado** (`630e464`). Los avisos para admins eran una
  fila compartida (`user_id` NULL): marcarla como leída se la quitaba a
  todos. Ahora cada notificación es de un usuario; `DELETE
  /notifications/{id}`. Migración de datos `c4e8a2f6d1b3`, que reparte las
  filas compartidas (aplicada en producción).
- El aviso de documento fallido ya no incluye el error técnico de S3.

### Documentación

- `RAG_PIPELINE.md` y `PINECONE_VECTORES.md` atribuían al chat el fallback de
  namespace asistente → empresa, que solo usa la búsqueda de candidatos.
- Entraron además en `630e464` los resultados de EXP-13 parte B y los
  scripts `juez_compuestas.py` y `responder_compuestas.py`.

```
tests  264
```

---

## 2026-11-02

Prueba de punta a punta de todas las pantallas, y lo que salió de ella.

- **Retira "Pedir documento"** (`842554f`): asignaba la pregunta a una persona
  y la dejaba en curso sin resolverla. Quedan Vincular documento y Escribir
  respuesta. Orden por **más recientes** por defecto.
- **Permisos por rol** (`8fa86c0`): un `user` chatea, califica y gestiona sus
  documentos; asistentes, categorías, documentos ajenos, preguntas sin
  respuesta y el feedback de otros exigen `admin`.
- **Elimina el registro público** (`9074ecd`): dejaba darse de alta en una
  empresa ajena. Los usuarios los crea un admin.
- **Cada mensaje guarda qué asistente respondió** (`6758b39`, migración
  `a1c3f5e7b902`): al reabrir una conversación se elegía otro asistente y el
  feedback se atribuía mal.
- **Retira las etiquetas** (`f822b02`): un CRUD que nunca se vinculó a ningún
  documento.
- **Corrige el 500 al crear o desactivar categorías y empresas**
  (`0a51764`): `is_active` era INTEGER en la BD y Boolean en el modelo.
- **Reincidencia real, textos vacíos rechazados y CSV legible en Excel**
  (`e711564`).
- Documentación al día con la arquitectura implementada (`48da5f7`), estado
  de la entrega (`a1c670a`) y figura del objetivo 4 (`e2141c8`).

---

## 2026-10-28

- **Corrige el 502 al responder a mano una pregunta sin respuesta**
  (`668132b`): Pinecone rechaza metadatos nulos y la respuesta escrita se
  guardaba con `document_id: None`.
- Documentación y diagrama actualizados (`22ba237`, `40810b1`).

---

## 2026-10-26

- **"Agrupadas por similitud semántica" era falso** (`739062b`):
  `convert_to_gap` creaba siempre una fila nueva. Ahora agrupa por texto
  exacto normalizado, por asistente. 6 tests.

---

## 2026-10-25

- **Las reglas contra alucinaciones se aplican siempre** (`87c055c`): el
  `system_prompt` propio de un asistente sustituía el prompt entero, y con él
  la obligación de abstenerse.
- **Soporte de `.md`** (`73f1f02`, `20233df`) y corrección del primer
  documento de un asistente nuevo, que fallaba con "Namespace not found".
- **Documentación centralizada** en `docs/TFM` y material de trabajo separado
  (`0a2651c`).

---

## 2026-10-24

- **Streaming del chat por Server-Sent Events** (`530b3cf`), con la
  corrección de la sesión de base de datos que se cerraba antes de que el
  generador terminara.
- Las llamadas auxiliares (descomposición, reordenado) cronometran su propia
  duración (`d37f828`).

---

## 2026-10-23

- **Alembic** sustituye a los `migrate_*.sql` sueltos (`64b16ab`).
  Excepciones tipadas, verificación multi-tenant centralizada, latencia en
  `cost_tracking.duration_ms` y `ruff` de 295 avisos a 0.

---

## 2026-10-22

- **Documentación corregida contra el código** (`a06f170`):
  `FUNCIONALIDADES.md` citaba como mediciones cifras de los ejercicios de
  práctica.

---

## 2026-10-18 a 2026-10-21

- **Sexta configuración medida: descomposición + híbrida** (`135dd1f`,
  `98ca69e`): mejor hit@3 y MRR de las seis, sin resolver del todo la pérdida
  de cobertura en preguntas compuestas. Parte de la caída de faithfulness era
  ruido del juez de RAGAS.
- **RAG híbrido** (`de0529c`): búsqueda densa + léxica fusionadas por
  posición.
- **Conjunto de evaluación como dataset de Langfuse** (`757c071`).
- **Tercer modo de alucinación** documentado en el 5.4 (`7e77907`).

---

## 2026-10-17

Arranca con una auditoría: ¿qué le falta al sistema para defenderse como
aplicación, al margen de la memoria? Salen tres hallazgos de código y cuatro
de pruebas manuales contra el chat real, con Langfuse de testigo.

### Configurabilidad

- **Los siete parámetros del pipeline pasan a `settings`**
  (`5cec778`). Umbral de relevancia, `top_k`, temperatura, tokens de
  respuesta, número máximo de subpreguntas, candidatos y recorte del
  reordenador: antes eran constantes de módulo —cambiar una exigía editar
  código y redesplegar—, ahora son variables de entorno con la medición que
  respalda cada valor documentada en `.env.example`. 9 tests nuevos.

### Alcance declarado

- **Ocho tablas sin modelo ORM se declaran fuera de alcance**
  (`74a353f`), no como «pendiente de implementar». Dos de ellas
  —`budget_limits`, `quota_alerts`— contienen datos obsoletos de junio de
  2026: `current_monthly_spend` marca 0,00 USD mientras `cost_tracking`
  registra consumo real. Documentado en `ALCANCE_TFM.md` y
  `docs/TFM/MODELO_DATOS.md`.

### Pruebas manuales del chat, con verificación cruzada

Se lanzaron preguntas reales contra la interfaz y se contrastó cada respuesta
contra el texto exacto de los fragmentos recuperados:

- **Un fragmento se mostraba cortado a 300 caracteres** en las fuentes del
  chat. Ante «¿qué son los hiperparámetros?», el fragmento que contenía la
  definición la tenía a partir del carácter 470: quien abriera la fuente para
  comprobar la respuesta veía un texto que no la sustentaba y podía concluir
  que el sistema había inventado. Corregido en `rag_service.py` para enviar
  el fragmento completo.
- **Una alucinación real, documentada como tercer modo**: ante «diferencias
  entre GAN y VAE», el corpus solo trata VAE en profundidad y menciona GAN de
  pasada. El sistema completó la descripción de GAN —generador,
  discriminador, proceso adversarial— con conocimiento de entrenamiento, no
  del contexto. Verificado fragmento a fragmento: ninguno de los cinco
  recuperados contiene esos términos.
- **Verificación cruzada de coste, Langfuse contra `cost_tracking`**: para
  una misma consulta, los tres componentes —generación, *embedding*,
  descomposición— coinciden al último decimal entre los dos sistemas
  ($0,000212 en ambos), confirmado además visualmente por el usuario contra
  las filas de la tabla. Documentado en `docs/TFM/OBSERVABILIDAD.md`.

### Observabilidad

- **Dos observaciones redundantes fuera de Langfuse** (`49fb57f`).
  `descomposicion` y `embedding_consulta` eran *spans* manuales que
  envolvían una llamada que el SDK ya capturaba sola como `OpenAI-generation`
  u `OpenAI-embedding` —Langfuse 4 parchea la clase `openai.OpenAI` para todo
  el proceso al importarse, no envuelve una instancia—. Cada duplicado se
  pagaba dos veces contra la cuota. Una consulta simple pasó de 7
  observaciones a 5; una compuesta, de 11 a 7. Se conservan `recuperacion` y
  `reparto`, que no son redundantes: Pinecone no se auto-instrumenta.
- **La ingesta de documentos podía quedar invisible para Langfuse**
  (`0064f2b`). `EmbeddingService` creaba su cliente con `from openai import
  OpenAI` directo y quedaba trazado solo por un efecto secundario frágil —el
  chat siempre instancia `RAGService` primero, que dispara el parche antes
  de que `EmbeddingService` construya el suyo—. Verificado en un proceso
  limpio reproduciendo el flujo real de `documents.py`: si subir un
  documento era el primer evento de un *worker*, esa llamada no dejaba
  rastro. Corregido pidiendo el cliente al mismo punto que `RAGService`. 2
  tests de regresión, comprobados contra sabotaje.

### Documentación

- `docs/TFM/OBSERVABILIDAD.md` (`6f8ee25`): verificación cruzada de coste,
  explicación del mecanismo de parcheo de Langfuse 4, estado de la ingesta
  actualizado.
- `COMO_ARRANCAR.md` y `rag_factory.py` (`910905c`): cómo elegir
  configuración y activar Langfuse; precisión del matiz del techo de
  cobertura del 50 % con `TOP_K` fijo.
- `ALCANCE_TFM.md` (`31181c8`): las cuatro configuraciones del pipeline,
  los dos niveles de mitigación de alucinaciones, Langfuse, y el recuento
  real de tests (13 archivos, 91 tests).

### Estado al cierre

```
tests           91, en verde
commits de hoy  7
```
