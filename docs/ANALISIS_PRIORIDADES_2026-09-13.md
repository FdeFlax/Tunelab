# Necesidades prioritarias de Tunelab

Revisión del 13 de septiembre de 2026 sobre el árbol de trabajo actual, incluidos los cambios anteriores sin confirmar. Este documento actualiza las prioridades de la auditoría del 9 de septiembre; sus hallazgos históricos no deben leerse todos como fallos todavía presentes.

**Conclusión:** la prioridad es completar el ciclo de una medición bajo responsabilidad del servidor: iniciar con ensayo y usuario, adquirir y guardar muestras durante la captura, conservar su identidad al reconectar y finalizar una sola vez. Actualmente la web tiene una base útil para simulación y organización de prácticas, pero el flujo de adquisición todavía depende del navegador. Para usarla en un laboratorio compartido también faltan identidad institucional y una operación del servidor comprobada ante fallos.

El primer paso concreto de implementación debe reparar y comprobar el modo API —inicialización, campos de estado y estabilidad— y utilizarlo para construir una captura persistente en el backend con el simulador existente. Esto permite comprobar la arquitectura antes de incorporar el equipo físico.

**Qué se ha comprobado**

Se siguieron los flujos de acceso, reserva, control, captura, finalización, consulta de informes, importación/exportación y cierre de sesión. Se revisaron los servicios JavaScript, FastAPI, los modelos de datos, la configuración y la documentación previa.

| Comprobación | Resultado actual |
| --- | --- |
| Compilación de producción | Correcta. Visor 3D: 975,84 kB de JavaScript, 263,11 kB comprimido. |
| Pruebas frontend existentes | 17 superadas. |
| Pruebas backend existentes | 15 superadas con SQLite en memoria. |
| ESLint del proyecto | 3 errores y 4 advertencias. |
| Diagnóstico adicional del backend | Inicio sin ensayo, duplicados y agregados incoherentes reproducidos; rollback confirmado ante fallo de escritura. |
| Diagnóstico adicional del frontend | Inicialización, objetivos, tiempos, medias y exportación/importación comprobados con módulos del proyecto. |

Las comprobaciones adicionales no utilizan MySQL ni hardware. No se ha efectuado otra revisión visual completa en navegador, una prueba de carga, una auditoría de vulnerabilidades de dependencias ni una validación de UACloud, del servidor publicado o de las copias de seguridad. Los riesgos de concurrencia que siguen se identifican por inspección; requieren reproducirse en el despliegue objetivo. No se han cambiado funcionalidades en esta revisión.

**Lo que ya está bien y conviene conservar**

- Parada y apagado desde Control comparten la finalización. La captura completa, sus muestras y el evento se guardan mediante una transacción. Inyecté un fallo al insertar muestras: no quedaron nuevas mediciones, muestras ni eventos de esa operación. Es una mejora real.
- La interfaz y ambos adaptadores exigen seleccionar ensayo para iniciar. La comprobación todavía no está en el inicio operativo del servidor.
- Producción bloquea la autenticación de prueba; los perfiles demo están definidos por el servidor y restringidos al acceso local. Las pruebas verifican rechazo de identidades y roles falsos, usuarios inactivos y accesos docentes indebidos. La antigua aceptación de un rol arbitrario no describe el código actual.
- Hay validación de archivos, comprobaciones de pertenencia en la API y pruebas automatizadas. El visor 3D ya se carga de forma diferida.

**Orden recomendado**

| Orden | Necesidad | Motivo |
| --- | --- | --- |
| 1 | Captura y persistencia durante la medición desde el servidor | Evitar que cerrar o recargar la web elimine el trabajo aún no enviado. |
| 2 | Reparar el contrato del modo API | Es el paso previo para probar ese flujo; hoy tiene bloqueos funcionales. |
| 3 | Finalización sin duplicados y resultados coherentes | Un reintento debe conservar una única medición y estadísticas justificadas por sus muestras. |
| 4 | Operación fiable del servidor y control exclusivo | Detectar fallos de base de datos, recuperar el servicio y resolver reservas sin estados contradictorios. |
| 5 | Fidelidad de informes y archivos | Conservar tiempos, valores ausentes, procedencia y calibración. |
| 6 | Identidad institucional y aislamiento de sesiones | Requisito para el uso compartido fuera de la demo local. |
| 7 | Verificación automática y documentación de despliegue | Poder repetir las comprobaciones y arrancar el sistema sin depender de memoria personal. |

El orden expresa el trabajo recomendado ahora. Identidad institucional y control del equipo son requisitos previos al despliegue compartido, aunque puedan desarrollarse en paralelo al ciclo de captura.

**1. La adquisición no sobrevive por sí sola al navegador — prioridad alta**

El simulador del navegador acumula las muestras en memoria. El adaptador API también captura desde un temporizador del navegador; consulta una muestra al servidor y la añade a un array local. La captura se envía completa al finalizar. El controlador Python mantiene estado en memoria y actualiza las lecturas al recibir llamadas; no hay un proceso de adquisición independiente que vaya persistiendo muestras.

Fuentes: [captura API](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelReal.js:178), [envío final](C:/app/nuevo_tunelviento_app/src/servicios/tunel/finalizarCaptura.js:5), [controlador](C:/app/nuevo_tunelviento_app/backend/app/control_tunel.py:45).

Además, en la API aislada fue posible conectar, encender e iniciar sin crear ningún ensayo. El inicio devolvió HTTP 200 y `midiendo: true`, con cero ensayos y cero mediciones en la base de datos. La ruta no recibe un ensayo ni crea una medición `en_curso`. Las protecciones que buscan ese estado en la base no representan esta captura operativa. [Inicio del servidor](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:246).

**Cambio necesario:** al iniciar, validar ensayo y propietario, crear una captura con ID estable y estado persistido, y hacer que el backend adquiera y confirme muestras progresivamente. Cada muestra necesita secuencia e instante originales. Al abrir otra vez la web, recuperar esa captura y su progreso. Definir expresamente qué sucede ante cierre del navegador, caída del proceso o fallo de almacenamiento; no deben confundirse con una finalización correcta.

El límite actual de 20.000 muestras del envío final también exige una política: a una muestra por segundo son unas 5 h 33 min. El capturador no aplica ese límite y una captura mayor puede ser rechazada entera al terminar.

**2. El modo API todavía no está listo para sostener ese flujo — prioridad alta**

La suscripción que utiliza `useTunel` no llama a `iniciar()` del adaptador real. No hay otra llamada a ese método en `src`. Al reproducir la suscripción obtuve cero consultas y cero temporizadores. [Suscripción](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelReal.js:82), [inicio pendiente](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelReal.js:372), [hook](C:/app/nuevo_tunelviento_app/src/servicios/tunel/useTunel.js:4).

Hay dos problemas adicionales que aparecerán al resolver el primero:

- El adaptador actualiza `objPotPct` y `objVelMs`, mientras que el registro prefiere otros campos inicializados a cero. Con objetivo 50 % y 5,121 m/s, la construcción del registro devuelve objetivos cero. [Estado recibido](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelReal.js:267), [registro](C:/app/nuevo_tunelviento_app/src/servicios/tunel/estadoTunel.js:295).
- Backend y frontend utilizan curvas distintas. Al 75 %, el backend converge a 8,077 m/s; el frontend espera 8,18. El adaptador redondea la lectura a 8,1 antes de comparar: la diferencia de 0,08 supera la tolerancia de 0,03. La condición de estabilidad puede no alcanzarse. Además cuenta respuestas en vez de tiempo transcurrido.

**Cambio necesario:** definir un único contrato de estado y calibración, inicializar y limpiar los adaptadores de forma explícita, y calcular estabilidad con tiempo y precisión adecuados. El modo denominado `real` utiliza hoy un controlador Python simulado; su nombre no acredita integración con el túnel físico.

**3. La transacción final funciona, pero faltan identidad y validación de la captura — prioridad alta**

Envié dos veces exactamente el mismo cuerpo: se crearon dos mediciones diferentes, IDs 1 y 2, ambas con HTTP 200. Una respuesta perdida después del commit puede provocar esta situación al reintentar. La prueba existente de detener y luego apagar evita un segundo envío desde esa secuencia de interfaz; no demuestra idempotencia de la API.

También se aceptó una muestra de 5 m/s junto con media 59, mínimo 50 y máximo 1. Una lista con un elemento que solo contenía el instante, sin valores medidos, también fue aceptada. No es lo mismo tener una lista no vacía que tener datos útiles.

Fuentes: [finalización](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:686), [campos de entrada](C:/app/nuevo_tunelviento_app/backend/app/datos_api.py:33), [muestra](C:/app/nuevo_tunelviento_app/backend/app/datos_api.py:90).

**Cambio necesario:** ID único de captura y finalización repetible que devuelva la misma medición; calcular agregados a partir de las muestras aceptadas, validar tiempos y canales obligatorios y distinguir capturas completas, parciales y fallidas. Al mover la adquisición al servidor, finalizar debe cerrar esa captura existente.

**4. La fiabilidad del servidor necesita un procedimiento comprobado — alta antes del laboratorio**

`/api/salud` devuelve siempre `ok` sin consultar la base de datos. Sirve para saber que el proceso responde, pero no acredita que se pueda guardar una práctica. [Salud](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:76).

El controlador y la lista WebSocket viven en cada proceso. Añadir varios workers generaría controladores y conexiones independientes. La reserva se realiza leyendo `UsoTunel` y actualizándolo sin una reclamación condicional o bloqueo de fila: no debe asumirse exclusión robusta entre procesos. Al reiniciar, el estado del controlador se pierde mientras la reserva puede seguir en la base de datos. [Reserva](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:283), [WebSocket](C:/app/nuevo_tunelviento_app/backend/app/websocket_tunel.py:4).

El apagado libera la reserva inmediatamente aunque el modelo simula una rampa de descenso. Las órdenes cambian el controlador antes de confirmar el evento en SQL: si falla el commit, la orden puede haberse ejecutado pese a devolver error. Una transacción SQL no revierte una orden al variador. La exclusión identifica al usuario, no una sesión de control concreta.

**Cambio necesario:** un único propietario del controlador, reserva atómica, reconciliación al arrancar, registro de órdenes y confirmaciones, y estados claros cuando no se conoce el estado físico. Añadir comprobación de disponibilidad para guardar, supervisión del proceso, alertas útiles y copias de MySQL con una restauración ensayada. No encontré automatización de despliegue o restauración en los archivos revisados; puede existir fuera del repositorio y debe verificarse allí.

La política de parada y pérdida de enlace debe acordarse y probarse con el responsable del laboratorio antes del hardware. La reconexión de la web no debe ejecutar órdenes antiguas automáticamente.

**5. Los informes y archivos no conservan fielmente toda la información — prioridad alta para resultados experimentales**

Casos reproducidos:

| Entrada | Resultado actual | Resultado necesario |
| --- | --- | --- |
| Dos muestras separadas 10 segundos | Se reconstruyen en segundos 1 y 2 | Conservar la separación temporal original. |
| Frecuencia `null` y 20 Hz | Media de 10 Hz | Media de 20 Hz sobre el único valor disponible; indicar ausencia. |
| Exportación desde Registro con fuente `mysql` | Al importar pasa a `simulado` | Separar procedencia de almacenamiento y tipo de adquisición. |
| Muestra exportada con caudal 2,45 m³/s | El campo desaparece al importar | Conservar el dato y su condición de medido o calculado. |
| JSON de 10.000 muestras generado con el formato del exportador | 2.279.962 bytes; el importador lo rechaza | Exportaciones compatibles con los límites de importación. |

Fuentes: [conversión de API](C:/app/nuevo_tunelviento_app/src/servicios/mediciones/medicionDesdeApi.js:14), [exportación](C:/app/nuevo_tunelviento_app/src/servicios/archivos/medicionArchivo.js:408), [importación](C:/app/nuevo_tunelviento_app/src/servicios/archivos/medicionArchivo.js:526).

El envío final reconstruye instantes desde la hora de finalización. No persiste presión, caudal, fuente ni versión de calibración; el esquema de muestras tampoco contiene esos campos. Después la presión y el caudal se calculan de nuevo. No se puede asegurar que representen exactamente lo mostrado durante la captura. Los campos de inicio y fin existen en la tabla de mediciones pero no se rellenan en esta finalización. [Modelo](C:/app/nuevo_tunelviento_app/backend/app/tablas.py:64).

La ficha usa sección de 0,7 × 0,7 m y máximo calibrado de 11,119 m/s, mientras Inspección presenta 0,6 × 0,6 m y 20–25 m/s. Debe contrastarse la información con la documentación validada del laboratorio y distinguir dimensiones actuales de referencias históricas. No he determinado aquí cuál es la especificación física correcta.

**Cambio necesario:** conservar datos originales y metadatos suficientes para reproducir cálculos, redondear solo al presentar, mantener ausencias como ausencias y probar el recorrido captura → base de datos → informe → archivo → importación.

**6. Acceso compartido, sesión y coherencia entre pantallas — alta antes de publicar**

UACloud/eServices está pendiente. El bloqueo actual de producción es intencional; resolverlo habilitando la demo en un servidor compartido eliminaría la protección añadida. [Estado del acceso](C:/app/nuevo_tunelviento_app/docs/ACCESO_Y_AUTENTICACION.md:5).

Cerrar sesión borra la identidad, pero no reinicia el servicio singleton ni limpia los archivos importados, guardados bajo una clave común de `sessionStorage`. Otro usuario en la misma pestaña puede heredar ese contenido; los ensayos en memoria permanecen hasta que finaliza una nueva carga, o más tiempo si falla. Las respuestas antiguas también pueden escribir vínculos de ensayo antes de comprobar la cancelación. Son riesgos de aislamiento del estado local; no demuestran acceso a datos ajenos a través de los permisos de la API.

Fuentes: [carga y cambio de usuario](C:/app/nuevo_tunelviento_app/src/App.jsx:197), [logout](C:/app/nuevo_tunelviento_app/src/App.jsx:267), [almacenamiento común](C:/app/nuevo_tunelviento_app/src/servicios/archivos/registroAlmacenamiento.js:1).

Control elimina mediciones a través del servicio local, sin invocar el borrado de la API: un elemento puede desaparecer allí y seguir en Registro. La liberación docente y las conexiones WebSocket requieren pruebas de reconexión y captura activa; el cliente no tiene reconexión WebSocket automática.

**Cambio necesario:** identidad y roles verificados por servidor, cierre de sesión que reinicie y cancele el estado asociado al usuario, y mutaciones confirmadas por la API que actualicen todas las pantallas. Probar dos usuarios y dos pestañas, con respuestas tardías y fallos de red.

**7. Mantenimiento y presentación — después del núcleo funcional**

ESLint detecta dos errores de inmutabilidad en `TunnelViewer.jsx` y uno de actualización de estado en un efecto de `PanelesControl2.jsx`; hay cuatro advertencias de dependencias de hooks. Son fallos del control estático actual, no tres caídas de aplicación demostradas. Hay que revisar cómo se integra Three.js con esas reglas y corregir los efectos donde proceda.

El README mantiene marcadores de conflicto desde su primera línea. Las instrucciones de arranque deben ser únicas y distinguir desarrollo de despliegue. Durante el diagnóstico, importar el backend desde la raíz hizo que su configuración leyera el `.env` del frontend y rechazara `VITE_FUENTE_TUNEL`; el arranque depende del directorio de trabajo. [Configuración](C:/app/nuevo_tunelviento_app/backend/app/configuracion.py:38).

Conviene añadir un comando de pruebas del proyecto y comprobaciones automáticas antes de integrar cambios. Las 32 pruebas que pasan no cubrían los casos recién reproducidos. La optimización del modelo 3D, otra ronda de CSS o reducir líneas no resolverían los problemas de conservación y fidelidad detectados.

**Trabajo concreto que haría a continuación**

1. Reparar inicialización, contrato de estado y calibración del modo API; probar arranque, estabilidad, inicio y parada con el simulador del backend.
2. Crear el ciclo persistente de captura: ensayo obligatorio en servidor, ID único, muestras con secuencia e instante y guardado progresivo; finalizar esa misma captura sin duplicarla.
3. Verificar recarga y cierre del navegador, pérdida de respuesta, reinicio de servidor y fallo de base de datos. Conservar lo ya confirmado y mostrar explícitamente capturas interrumpidas; documentar el máximo de datos en tránsito que puede perderse.
4. Corregir los errores de informes y archivos, completar aislamiento de sesiones y preparar identidad institucional y despliegue verificable antes de uso compartido.

La primera entrega útil sería poder iniciar una captura de prueba, recargar la página y recuperar desde el servidor la misma medición y sus muestras confirmadas. Después debe probarse que repetir la finalización devuelve el mismo ID y que un error de base de datos jamás se presenta como guardado correcto.

**Cómo repetir las comprobaciones**

Actualización del 04/11/2026: los dos scripts de diagnóstico de esta auditoría se han archivado en `output/limpieza-20261104/auxiliares.zip`, dentro de `docs/auditoria_2026-09-13/`. Documentaban defectos de septiembre y no forman parte de las pruebas actuales. Los comandos de abajo que los nombran requieren extraer antes esa copia en una carpeta de revisión.

Desde `C:\app\nuevo_tunelviento_app`:

```powershell
npm run lint
npm run build
node --experimental-vm-modules --test --test-isolation=none tests/*.test.mjs
& .\backend\.venv\Scripts\python.exe docs/auditoria_2026-09-13/comprobar_backend.py
node --experimental-vm-modules docs/auditoria_2026-09-13/comprobar_frontend.mjs
```

Las pruebas backend existentes se ejecutan desde `C:\app\nuevo_tunelviento_app\backend` con `& .\.venv\Scripts\python.exe -m unittest discover -s tests`.

Los dos scripts nuevos son diagnósticos del comportamiento observado: varias aserciones verifican la presencia de los defectos para documentarlos. No deben incorporarse como criterios de aceptación que obliguen a conservar esos defectos. Al corregirlos, sustituir esas comprobaciones por pruebas del comportamiento esperado. El diagnóstico backend configura SQLite en memoria y sustituye el controlador; el de frontend no realiza llamadas de red.
