# Análisis de la web y del código de Tunelab

Fecha: 9 de septiembre de 2026. Revisión del árbol de trabajo local, incluidos los cambios que ya existían sin confirmar en Git.

Actualización del 04/11/2026: el esquema manual `database/schema_mysql.sql` citado en esta revisión se ha retirado del árbol activo y se conserva en `output/limpieza-20261104/auxiliares.zip`. La instalación utiliza las migraciones de `backend/alembic`.

**Actualización posterior a la auditoría:** se ha contenido el hallazgo 1: producción bloqueada por defecto, demo explícita limitada al equipo local y perfiles definidos por el servidor. La integración real con UACloud sigue pendiente. El resto de este documento conserva los resultados de la revisión original. Ver [configuración y pruebas de acceso](C:/app/nuevo_tunelviento_app/docs/ACCESO_Y_AUTENTICACION.md).

**Segunda actualización:** corregido el apagado durante una captura desde Control (hallazgo 2): parada y apagado comparten el envío de la medición y sus muestras a la API. Se comprobó su recuperación en Registro después de recargar. La captura completa se guarda ahora de forma transaccional en una petición; queda pendiente la idempotencia de reintentos. Ver [cambio y pruebas de guardado](C:/app/nuevo_tunelviento_app/docs/GUARDADO_MEDICIONES.md).

**Conclusión:** el proyecto tiene una base útil para una aplicación de laboratorio y una demostración académica: organiza ensayos, representa el túnel en 3D, simula mediciones y dispone de una API con persistencia. Su principal problema es la coordinación entre navegador, servidor y archivos. Hay fallos reproducidos de conservación de resultados, autenticación de pruebas, inicialización del modo API y representación de datos. No está preparado todavía para un uso compartido fiable ni para conectarlo a hardware real.

No se ha modificado el código funcional. Se han añadido este informe y dos scripts de comprobación aislada. No se han utilizado ni alterado los ensayos de MySQL.

## Alcance y comprobaciones

Se revisaron la estructura de `src`, las seis pantallas, los componentes comunes, el visor 3D, los servicios de simulación y API, la importación y exportación, FastAPI, los modelos de datos, las migraciones, el SQL alternativo, la configuración y la documentación. El inventario de `src` y `backend/app` contiene 49 archivos JS/JSX/CSS/Python y aproximadamente 19.300 líneas, incluidos comentarios y líneas vacías.

| Comprobación | Resultado |
|---|---|
| `npm run build` | Correcto. Aviso por un fragmento JavaScript superior a 500 kB. |
| `npm run lint` | Falla: 4 errores y 4 advertencias. |
| `npm audit --json` | 0 vulnerabilidades notificadas para el árbol npm comprobado. |
| `python -m pip check` | Sin incompatibilidades declaradas. No es un análisis de vulnerabilidades. |
| Servicios JavaScript | 7 casos de fallo reproducidos con módulos reales y red deshabilitada. |
| API FastAPI | 8 casos comprobados por ASGI con SQLite en memoria: 6 deficiencias y 2 controles de acceso que funcionan. |
| Navegador | Acceso de prueba, Dashboard, Inspección, Ensayos, Control, Registro y Docente. Captura simulada, apagado y contraste con la API. Comprobación de escritorio y móvil. |

El frontend se comprobó sirviendo el `dist` generado. El arranque de Vite en desarrollo encontró un error de permisos de proceso (`spawn EPERM`) del entorno; no se considera un fallo demostrado del proyecto. Se utilizó una API temporal que ejecuta las rutas del proyecto con SQLite en memoria y CORS local. MySQL y el backend habitual no estaban escuchando al comenzar.

**Límites:** no se ha probado el hardware, UACloud/eServices, un servidor publicado, las reglas del proxy, certificados, copias de seguridad ni concurrencia real con MySQL. Las observaciones sobre estos entornos se distinguen de los fallos reproducidos. Tampoco se afirma una certificación completa de accesibilidad o seguridad.

## Arquitectura y partes aprovechables

El flujo actual es:

```text
App / perfil local / navegación
  ├─ páginas y componentes React
  ├─ useTunel → servicio singleton simulado o servicio por API
  ├─ clienteApi → FastAPI → SQLAlchemy → MySQL
  ├─ WebSocket → avisos de conexión
  └─ archivos JSON/ZIP → exportación e importación local
```

La separación de carpetas permite entender el proyecto. `useSyncExternalStore` es una base adecuada para conectar React con un servicio externo. La ficha técnica centraliza geometría, calibración, parámetros ambientales y ruido reproducible. El visor se carga de forma diferida, utiliza renderizado bajo demanda en las pantallas revisadas y libera los recursos clonados. El modelo GLB se cargó y se visualizaron sus siete zonas de interés.

La API comprueba pertenencia de ensayos y mediciones y reserva las rutas docentes a ciertos roles. En las pruebas, un alumno recibió 403 al consultar datos docentes y 404 al consultar un ensayo ajeno. Estas comprobaciones son útiles una vez se resuelva la autenticación. Las consultas usan SQLAlchemy; no se observó interpolación de SQL con texto del usuario en las rutas revisadas.

La importación valida formato, versión, tamaño, cantidad de muestras y eventos, números finitos y rangos. Recalcula parte del resumen desde las muestras. La interfaz incluye etiquetas en formularios, confirmaciones de borrado y un procedimiento previo al arranque. Son piezas que conviene conservar.

## Hallazgos prioritarios

P1 indica que debe corregirse antes del uso compartido fiable o porque bloquea una función principal. P2 indica resultados incorrectos o degradación importante. P3 corresponde a mantenimiento y presentación. La prioridad contempla el contexto actual de prototipo; una limitación de producción no implica que hoy exista un equipo físico expuesto.

### 1. P1 — La identidad y el rol los decide el cliente

**Reproducido en la API aislada.** [usuario_actual.py:11](C:/app/nuevo_tunelviento_app/backend/app/usuario_actual.py:11) acepta `X-Usuario-Uacloud` y crea usuarios usando `X-Usuario-Rol`. Sin cabeceras usa `usuario-local`. Una petición con un identificador nuevo y rol `admin` obtuvo acceso a `/api/docente/ensayos`. Para usuarios existentes basta conocer su identificador para suplantar su identidad; cambiar solo la cabecera de rol de un usuario existente no cambia su rol almacenado.

El acceso de pruebas es explícito en la UI, pero el backend no tiene una separación obligatoria entre desarrollo y producción. Ocultar Docente en React o restringir CORS no autentica las peticiones.

**Corrección:** integrar una identidad verificada por el servidor o por un proxy de confianza que elimine cabeceras externas; obtener los roles de esa identidad; devolver 401 si falta autenticación. Mantener los perfiles demo detrás de una configuración exclusiva de desarrollo.

### 2. P1 — Apagar durante una captura no guarda la medición en la API

**Reproducido en navegador y contrastado con la API.** [PaginaControl2.jsx:284](C:/app/nuevo_tunelviento_app/src/pages/PaginaControl2.jsx:284) ejecuta el apagado y la desconexión. La persistencia `guardarFinApi` se llama desde `detenerMed`, pero no desde ese apagado. El servicio conserva un resumen en memoria, lo que da apariencia de éxito.

En la prueba se creó `Auditoria temporal`, se capturaron 25 muestras y se pulsó «Apagar túnel». Control mostró el informe de 25 muestras; `/api/ensayos/1/mediciones` devolvió `[]` y Registro mostró «0 mediciones». Recargar pierde esa captura si no se ha descargado.

**Corrección:** unificar la finalización para parada normal, apagado y liberación docente; hacer explícito el resultado del guardado y mantener una copia recuperable hasta confirmar persistencia.

### 3. P1 — La persistencia puede quedar incompleta y los errores quedan ocultos

**Inspección del flujo y reproducción parcial de API.** [PaginaControl2.jsx:360](C:/app/nuevo_tunelviento_app/src/pages/PaginaControl2.jsx:360) crea la medición, después envía las muestras y después el evento, en peticiones independientes. El backend confirma la primera como `finalizada` antes de recibir muestras. Si falla el segundo paso queda una medición finalizada vacía. El `catch` solo escribe en consola y no ofrece reintento. Tampoco hay una clave de idempotencia para evitar duplicados si se repite una finalización.

La API aceptó una medición finalizada sin muestras y con media 59, máximo 1 y mínimo 50. Esos agregados no se recalculan ni se contrastan en servidor. No es necesario estar midiendo en el controlador para enviarlos.

**Corrección:** una operación transaccional de finalización o un estado provisional con carga idempotente de muestras; validar consistencia, calcular agregados en servidor y mostrar «pendiente de guardar / guardado / error» en la interfaz. [rutas.py:679](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:679).

### 4. P1 — El modo `real` no se inicializa al usarlo desde React

**Reproducido con el servicio real.** [tunelReal.js:88](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelReal.js:88) únicamente registra el suscriptor. `iniciar()` contiene la consulta inicial y los temporizadores, pero no se llama desde `useTunel`, `App` ni otra parte de la aplicación. En cambio, el servicio simulado se inicia al suscribirse.

La prueba se suscribió como hace React: cero peticiones, cero temporizadores y estado permanente `DESCONECTADO`. Por tanto, seleccionar `VITE_FUENTE_TUNEL=real` no habilita el flujo descrito.

**Corrección:** definir un ciclo de vida común de los dos adaptadores, con inicio y limpieza comprobables. Además, el controlador backend actual sigue siendo `ControladorTunelSimulado`: «real» significa adaptador hacia la API, no integración física terminada. [control_tunel.py](C:/app/nuevo_tunelviento_app/backend/app/control_tunel.py).

### 5. P1 — El contrato del modo API pierde objetivos y puede impedir la estabilidad

**Parte reproducida y parte calculada a partir de las funciones.** El estado base inicializa `consignaPct`, `consignaObjetivoPct` y `velocidadObjetivoMs` a cero. El adaptador real actualiza otros campos (`potPct`, `objPotPct`, `objVelMs`). [estadoTunel.js:310](C:/app/nuevo_tunelviento_app/src/servicios/tunel/estadoTunel.js:310) prefiere los primeros con `??`, por lo que conserva sus ceros. La prueba obtuvo objetivos cero al construir un registro con objetivo de 50 % y 5,121 m/s. El caudal y el tiempo de funcionamiento tampoco se actualizan en ese adaptador.

Hay otra divergencia: el backend usa una curva exponencial y el frontend interpolación de puntos medidos. Al 75 %, el backend da aproximadamente 8,077 m/s y el objetivo frontend es 8,18 m/s. Además, el adaptador redondea a una décima antes de comparar: 8,1 frente a 8,18 supera la tolerancia de 0,03 m/s y no llega a estable. Al 25 % también divergen. Esto aparecerá al reparar la inicialización anterior.

**Corrección:** un solo contrato de estado, una calibración compartida y precisión conservada hasta la presentación. Calcular la estabilidad por tiempo transcurrido: actualmente se suma una unidad por respuesta, aunque el sondeo ocurre cada 1.500 ms y puede recibir avisos adicionales.

### 6. P1 — Borrar y sobrescribir no significan lo mismo en Control y Registro

**Confirmado por seguimiento de las llamadas.** [PaginaControl2.jsx:439](C:/app/nuevo_tunelviento_app/src/pages/PaginaControl2.jsx:439) borra mediante `acciones.eliminarMedicion`, que solo cambia memoria. No llama a `borrarMedicionApi`; la medición persistida reaparece en Registro o después de recargar.

La confirmación de sobrescritura quita el duplicado en la lista del simulador, pero la finalización vuelve a crear una fila en el backend. En modo real ni siquiera se utiliza `confirmarSobreesc`. Por el otro lado, borrar desde Registro actualiza sus estados locales, pero deja desactualizada la lista singleton de Ensayos/Control.

**Corrección:** centralizar las mutaciones y sincronizar las vistas tras confirmar el backend. Definir sobrescritura como actualización o reemplazo transaccional de un ID concreto, con reglas consistentes para nombres duplicados.

### 7. P1 — Se puede iniciar una medición sin ensayo asociado

**Reproducido con el simulador y confirmado en la condición de la UI.** [PaginaControl2.jsx:189](C:/app/nuevo_tunelviento_app/src/pages/PaginaControl2.jsx:189) calcula `puedeMed` sin exigir ensayo; el botón tampoco lo exige. El simulador permitió iniciar y detener una medición con `ensayoActivoId=null`. Se produjo un resultado, pero la lista de ensayos siguió vacía. La exportación de Control exige un ensayo y una medición de esa lista.

**Corrección:** exigir una ficha válida tanto en la UI como en el servicio y, en el futuro flujo centralizado, en la API de inicio. [PanelesControl2.jsx:328](C:/app/nuevo_tunelviento_app/src/components/control/PanelesControl2.jsx:328).

### 8. P1 — Exclusión y estado operativo no están preparados para varios procesos

**Inspección; no prueba de concurrencia MySQL.** [rutas.py:254](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:254) lee `uso_tunel`, comprueba y actualiza sin bloqueo de fila ni actualización condicional. En varios procesos, dos peticiones pueden comprobar la misma disponibilidad. En un único proceso los tramos síncronos de esa ruta asíncrona reducen esta intercalación concreta, pero no aportan una garantía de base de datos.

El controlador y las conexiones WebSocket son objetos globales en memoria de cada proceso. Con varios workers, cada uno puede tener un estado operativo distinto y solo avisa a sus propios sockets. El `Lock` del controlador protege únicamente su instancia local. No hay caducidad de reserva ni recuperación automática tras un cierre de navegador; un usuario puede dejar el túnel ocupado incluso cerrando sesión con el motor apagado.

**Corrección:** propiedad transaccional de la reserva, controlador central único y canal de eventos común si se despliega con varios workers. Definir expiración y recuperación de sesión. Antes de hardware, añadir mecanismos de protección independientes del navegador; el aviso `beforeunload` no garantiza una parada física.

### 9. P2 — Códigos y cuotas no se asignan de forma atómica

**Generador reproducido; carrera deducida del código.** [rutas.py:73](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:73) lee todos los códigos y devuelve el máximo más uno. Dos llamadas antes de insertar devuelven el mismo código. La restricción única evita duplicados almacenados, pero una creación concurrente puede terminar en error sin reintento. El coste crece con todos los ensayos y se pueden reutilizar códigos eliminados.

Las cuotas de ensayos y mediciones también usan «contar y después insertar» sin reserva transaccional. Las muestras y eventos no tienen un límite total equivalente en servidor. El límite de 20.000 muestras del importador no protege la API.

**Corrección:** derivar el código de un identificador único asignado atómicamente; aplicar cuotas dentro de transacciones y limitar tamaño de lote, acumulado y paginación de muestras.

### 10. P2 — La protección de una medición activa no coincide con su ciclo de vida

**Reproducido por ASGI.** [rutas.py:451](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:451) bloquea la edición cuando existe una fila `Medicion.en_curso`. Pero las filas solo se crean como finalizadas al acabar y el inicio operativo no las crea ni vincula al ensayo. Se pudo editar una ficha mientras el controlador estaba midiendo.

La liberación docente intenta finalizar esas mismas filas `en_curso`, que normalmente no existen. En modo simulado, Control solo escucha los cambios generales de conexión: no procesa la liberación para finalizar su captura local. En modo API, la sincronización puede poner `medActiva=false` sin consolidar ni guardar las muestras acumuladas.

**Corrección:** registrar una sesión de captura con ensayo, propietario, inicio y estado; usarla en edición, borrado, desconexión y liberación docente. [rutas.py:314](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:314).

### 11. P2 — El cierre de sesión conserva estado del usuario anterior

**Confirmado por inspección.** [App.jsx:267](C:/app/nuevo_tunelviento_app/src/App.jsx:267) borra la identidad, pero no reinicia el singleton ni los archivos importados de Registro. La siguiente carga correcta puede reemplazar los ensayos, pero hasta entonces, o si falla la API, quedan resultados del usuario anterior. `tunelab_registro_archivos_cargados` tampoco está separado por usuario.

Además, el indicador `cancelado` protege la aplicación final del estado, pero `vincularEnsayoApi` se ejecuta antes de comprobarlo. Una carga antigua puede escribir asociaciones bajo la identidad que esté activa cuando termina.

**Corrección:** limpiar el estado de sesión y separar las cachés por identidad; cancelar cargas antiguas antes de cualquier escritura y capturar el usuario al iniciar cada operación.

### 12. P2 — Exportar e importar cambia el contenido y la procedencia

**Reproducido.** [medicionArchivo.js:207](C:/app/nuevo_tunelviento_app/src/servicios/archivos/medicionArchivo.js:207) descarta `caudalM3s`; el resumen y las trazas recalculados tampoco recuperan el caudal. Una medición que lo tenía pierde esa magnitud al volver a importar.

Registro y Docente exportan `fuenteTunel: "mysql"`, y Registro también usa `"archivo"`. El importador solo acepta `simulado` o `real` y sustituye cualquier otro valor por `simulado`. Persistencia y origen de la medida son conceptos distintos. No se conservan de forma completa la ficha/calibración utilizada, precisión, instante original y metadatos de adquisición.

**Corrección:** esquema único versionado que separe origen de captura y origen del documento; conservar magnitudes y metadatos necesarios para reproducir el cálculo. Añadir una comprobación de ida y vuelta del documento. [medicionArchivo.js:650](C:/app/nuevo_tunelviento_app/src/servicios/archivos/medicionArchivo.js:650).

### 13. P2 — La aplicación exporta archivos que ella misma rechaza

**Reproducido.** La exportación no comprueba tamaño ni número de muestras, pero la importación limita a 2 MiB y 20.000 muestras. Un documento de prueba con 10.000 muestras válidas ocupó 2.340.138 bytes con el formato de exportación y fue rechazado. A una muestra por segundo son unas 2 h 47 min, por debajo del límite de duración de 24 horas que valida el formato. La duración real que alcanza 2 MiB depende de las columnas y sus valores.

**Corrección:** límites coherentes en captura, exportación e importación; partición de sesiones largas o formato más compacto. `sessionStorage` tampoco garantiza conservar hasta veinte archivos de 2 MiB: sus errores de cuota se silencian. [medicionArchivo.js:4](C:/app/nuevo_tunelviento_app/src/servicios/archivos/medicionArchivo.js:4), [PaginaRegistro2.jsx:385](C:/app/nuevo_tunelviento_app/src/pages/PaginaRegistro2.jsx:385).

### 14. P2 — Las gráficas muestran un mínimo artificial de cero

**Reproducido en navegador.** [ResumenMedicion.jsx:91](C:/app/nuevo_tunelviento_app/src/components/ResumenMedicion.jsx:91) antepone `{ segundo: 0, valor: 0 }` a las muestras. Los extremos se calculan sobre esa serie ampliada y se presentan como «Min / Max». En la captura a 50 %, todas las muestras de consigna valían 50, pero la gráfica mostró «Min 0.0%»; lo mismo sucedió con la velocidad alrededor de 5,12 m/s.

**Corrección:** calcular los extremos exclusivamente con muestras reales. Si se desea un eje desde cero, modificar la escala del eje sin inventar un punto medido.

### 15. P2 — Ausencia de datos y tiempo real se convierten en valores inventados

**Reproducido para valores nulos; fechas observadas en UI.** Los agregados filtran con `Number.isFinite(Number(valor))`, que admite `null` como cero. Una frecuencia, corriente o RPM no recibida puede aparecer como una lectura real de cero, o reducir una media al mezclarse con datos válidos. [estadoTunel.js:225](C:/app/nuevo_tunelviento_app/src/servicios/tunel/estadoTunel.js:225).

`muestrasApi` reconstruye los instantes con `Date.now()`. El adaptador API descarta el instante recibido y cuenta respuestas; Registro reemplaza los tiempos por `indice + 1`. Se ocultan retrasos, huecos y respuestas fuera de orden. El muestreo por `setInterval` no mantiene por sí solo una adquisición exacta de 1 Hz si el navegador se suspende.

Las fechas del backend se generan en UTC sin zona y el navegador las interpreta como hora local. En la prueba, el ensayo mostraba 18:23 recién creado y 16:23 en Registro. **Corrección:** conservar timestamps con zona y secuencia de adquisición, distinguir `null` de cero y representar explícitamente las muestras que faltan. [PaginaControl2.jsx:145](C:/app/nuevo_tunelviento_app/src/pages/PaginaControl2.jsx:145), [PaginaRegistro2.jsx:183](C:/app/nuevo_tunelviento_app/src/pages/PaginaRegistro2.jsx:183).

### 16. P2 — El campo de nombre acepta una longitud que el servidor rechaza

**Reproducido en la validación API y confirmado en UI.** [PanelesControl2.jsx:347](C:/app/nuevo_tunelviento_app/src/components/control/PanelesControl2.jsx:347) permite 200 caracteres para la medición. La API y el importador permiten 80. Un nombre de 81 caracteres devuelve 422 al guardar; el flujo de Control deja el error en consola.

**Corrección:** compartir el límite de 80, validarlo antes de capturar y mostrar el motivo del rechazo. El backend también debería rechazar nombres compuestos solo por espacios tras normalizarlos.

### 17. P2 — La información técnica visible contradice la ficha de cálculo

**Observado en navegador y código.** [PaginaInspeccion.jsx:132](C:/app/nuevo_tunelviento_app/src/pages/PaginaInspeccion.jsx:132) y la vista general describen una sección de 0,6 × 0,6 m y velocidades de 20–25 m/s. [fichaTunel.js:8](C:/app/nuevo_tunelviento_app/src/servicios/tunel/fichaTunel.js:8) usa 0,7 × 0,7 m y una calibración máxima de 11,119 m/s. El usuario recibe dos caracterizaciones distintas del mismo túnel.

El Dashboard muestra «Desconocido» porque consulta `estadoTunel.fuente`, un campo que no informa el servicio. Además, ante un fallo de consulta de ocupación se muestra «Libre» en Dashboard/Docente, confundiendo estado desconocido con disponibilidad confirmada.

**Corrección:** generar los textos técnicos desde la ficha vigente y diferenciar datos medidos, estimados y desconocidos. Mostrar la fuente efectiva y el error de conexión. Esto revisa coherencia interna; no certifica que las medidas de la ficha sean físicamente correctas. [PaginaDashboard2.jsx:165](C:/app/nuevo_tunelviento_app/src/pages/PaginaDashboard2.jsx:165).

### 18. P2 — En móvil parte del modal queda detrás de la barra lateral

**Reproducido.** Con una anchura aproximada de 390 px, el contenido alcanzó 1.135 px de ancho y apareció desplazamiento horizontal. El modal empezó aproximadamente en x=24, mientras la barra lateral permaneció encima de su parte izquierda, tapando las casillas y texto. Los intentos de marcar las últimas casillas fallaron en esa disposición; funcionaron al volver a escritorio.

La página Control crea un contexto de apilamiento mediante `isolation: isolate`, mientras la barra lateral tiene su propio `z-index`. Un `z-index` alto del modal dentro de su contexto no basta para superar otro contexto superior. [control2.css:1](C:/app/nuevo_tunelviento_app/src/styles/control2.css:1), [control2.css:465](C:/app/nuevo_tunelviento_app/src/styles/control2.css:465), [layout.css:25](C:/app/nuevo_tunelviento_app/src/styles/layout.css:25).

**Corrección:** montar los modales fuera de la página, ajustar el apilamiento y contener el desplazamiento de tablas y rejillas. Verificar 390 px, zoom ampliado y tamaños de escritorio con el modal abierto.

### 19. P2 — La navegación pierde sus nombres accesibles y los diálogos no gestionan el foco

**Nombres vacíos reproducidos en móvil.** [BarraLateral.jsx:48](C:/app/nuevo_tunelviento_app/src/components/BarraLateral.jsx:48) depende del texto visible de cada botón. Al ocultarlo por CSS o colapsar la barra, los iconos tienen `aria-hidden` y no existe `aria-label`: el árbol accesible mostró cinco botones de navegación sin nombre.

Los diálogos declaran `aria-modal`, pero no trasladan y contienen el foco ni lo restauran al cerrarse; al abrir la comprobación el foco seguía en «Encender túnel». El selector de Inspección usa `listbox` sin opciones y navegación de teclado correspondientes. `index.html` declara `lang="en"` aunque la aplicación está en español.

**Corrección:** nombres accesibles estables, estado de navegación actual, un componente común de diálogo con foco y Escape, selector nativo o patrón completo y `lang="es"`.

## Rendimiento, mantenimiento y despliegue

**Carga inicial y 3D.** El build produjo aproximadamente 335,81 kB de JS principal (100,41 kB gzip), 975,84 kB para el visor (263,11 kB gzip) y 130,69 kB de CSS (21,91 kB gzip). El GLB ocupa 7.705.404 bytes, unos 7,35 MiB. El visor ya tiene carga diferida y renderizado bajo demanda; conviene medir antes de optimizar. Los placeholders vacíos no indican el progreso. Un error de carga del modelo depende del límite de errores raíz y puede sustituir toda la aplicación. Añadir recuperación local del visor y evaluar compresión del GLB y texturas con comprobación visual. Las advertencias de Three sobre reloj obsoleto y precisión de shaders observadas no impidieron visualizarlo.

**Escalado del historial.** `App` pide las mediciones de cada ensayo al entrar. Docente descarga las de todos los ensayos y además vuelve a pedir la selección; el listado docente puede consultar usuarios de forma diferida por cada ensayo. Tablas y gráficas renderizan todas las muestras. Con historiales grandes aumentan peticiones, memoria y nodos del DOM. Añadir paginación y resúmenes de servidor; reducir datos para dibujar sin alterar los originales. La API no impone un límite de muestras por medición y los cálculos con `Math.max(...valores)` tienen un límite práctico de argumentos.

**Peticiones y eventos.** `pedirApi` no implementa timeout ni cancelación. Su composición de opciones puede reemplazar todas las cabeceras previamente combinadas si un llamador pasa `opciones.headers`; no se observó un llamador actual que explote ese caso. El WebSocket no se reconecta tras una caída ni verifica identidad u origen. El evento de liberación incluye un identificador de usuario pese al comentario de que no manda datos privados. Algunas vistas pierden frescura hasta remontarse. En modo API pueden solaparse sondeos y volver muestras cuando la captura ya terminó; no hay identificador de captura para rechazarlas.

**Estado de interfaz.** Navegación mediante `useState`, sin URL por pantalla: recargar vuelve al Dashboard y el historial del navegador no representa el flujo. Puede ser aceptable en un prototipo, pero limita enlaces directos y recuperación. Las páginas Registro y Docente repiten conversiones de muestras, estadísticas, fechas y exportación, y no todas aplican los mismos criterios. Hay fallos de respuesta tardía posibles en Docente al cambiar rápidamente de ensayo o medición, porque las cargas no cancelan la selección anterior.

**CSS y componentes.** Se cargan 13 hojas globales con capas de temas y sobrescrituras. La apariencia depende del orden de importación y de la especificidad; esto complica cambios localizados. Hay archivos de más de 600 líneas que mezclan consulta de datos, reglas de negocio, conversiones y presentación. Priorizar extracción de lógica de captura y persistencia antes de una reorganización puramente estética. Después, consolidar variables de tema y estilos por componente.

**Análisis estático.** Los errores son dos reglas de inmutabilidad sobre objetos de Three en `TunnelViewer.jsx` (41 y 49), un `setState` dentro de efecto en `PanelesControl2.jsx:122` y una importación no usada en `estadoTunel.js:4`. Hay tres avisos de dependencias de hooks en Docente y uno en Ensayos. La mutación de objetos externos de Three requiere valorar su integración con React; que ESLint la señale no demuestra por sí sola una avería del visor. Debe resolverse o justificarse de forma acotada, no desactivar las reglas globalmente.

**Pruebas y automatización.** No se encontró una suite de pruebas del producto ni un script `test` o configuración de integración continua en el repositorio revisado. Los scripts de esta auditoría reproducen fallos; que terminen correctamente significa que han confirmado las condiciones, no que el producto supere pruebas de aceptación. La primera suite útil debería cubrir identidad, aislamiento de sesiones, finalización y reintento, desconexión, permisos y exportación/importación.

**Base de datos y documentación.** Alembic y el SQL manual no describen el mismo esquema: el SQL no crea `uso_tunel`, añade tablas que la aplicación no utiliza, usa BIGINT frente a Integer y un enum de eventos frente a texto. Elegir Alembic como fuente de despliegue y retirar o identificar el SQL como histórico. El README contiene marcadores de conflicto de Git y afirma en una sección que no existe backend ni base de datos, contradiciendo la implementación. Tampoco es cierto que actualmente se pueda completar la creación de ensayos y conexión solo con el frontend en modo demo. [README.md:1](C:/app/nuevo_tunelviento_app/README.md:1), [schema_mysql.sql](C:/app/nuevo_tunelviento_app/database/schema_mysql.sql).

**Despliegue bajo subruta.** La configuración no define `base` en Vite; modelo y favicon usan rutas absolutas desde `/`. Si la web se publica bajo `/tunelab/`, hay que configurar explícitamente el prefijo y las rutas de recursos. La URL de API de ejemplo bajo eServices no resuelve por sí sola ese aspecto del frontend.

**Dependencias Python.** El entorno comprobado utiliza FastAPI 0.115.6, Starlette 0.41.3, SQLAlchemy 2.0.36, PyMySQL 1.1.1, Uvicorn 0.34.0, Pydantic 2.13.4 y Alembic 1.14.0. `requirements.txt` fija dependencias directas, pero no todas las transitivas. Starlette 0.41.3 está dentro del intervalo de versiones afectadas por el aviso de denegación de servicio en respuestas de archivo, corregido en 0.49.1. **No se observó uso de `FileResponse` o `StaticFiles` en esta API, por lo que no se afirma que ese ataque sea alcanzable en las rutas actuales.** Revisar actualizaciones compatibles de FastAPI/Starlette y mantener un análisis automatizado de dependencias. [Aviso oficial GHSA-7f5h-v6xp-fcq8](https://github.com/Kludex/starlette/security/advisories/GHSA-7f5h-v6xp-fcq8).

## Orden recomendado de corrección

1. **Conservar resultados:** finalización única, persistencia transaccional/idempotente, errores visibles, recuperación de capturas, ensayo obligatorio y borrado/sobrescritura coherentes.
2. **Asegurar el uso compartido:** autenticación de servidor, aislamiento y limpieza por sesión, reserva atómica y política de recuperación.
3. **Hacer coherente el modo API:** inicialización, contrato de estado, calibración, precisión, tiempos originales y finalización por desconexión.
4. **Restaurar fidelidad de informes:** esquema de archivo único, conservación de caudal y procedencia, valores nulos, mínimos reales y límites compatibles.
5. **Completar la experiencia web:** modal móvil, accesibilidad, estados desconocidos, textos técnicos y fallos de carga del visor.
6. **Preparar mantenimiento y entrega:** lint limpio, pruebas de los flujos anteriores, documentación y migraciones coherentes; después optimizar consultas, tamaño de recursos y CSS con medidas.

Un criterio mínimo de aceptación sería que una captura sobreviva a una recarga tras finalizarla, que un fallo de red permita recuperarla sin duplicados, que ninguna sesión vea datos de la anterior, que la reserva sea exclusiva con peticiones concurrentes y que exportar/importar conserve las mismas magnitudes y procedencia. Para hardware harían falta además pruebas específicas de la capa física, recuperación y protección, fuera del alcance de esta revisión.

## Pruebas de regresión actuales

Los scripts temporales de la auditoría original se retiraron después de documentar sus resultados. Las comprobaciones que protegen las correcciones actuales están dentro de `tests` y `backend/tests`:

```powershell
node --experimental-vm-modules --test --test-isolation=none tests
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

Las pruebas de frontend cubren finalización de capturas, gestión de ensayos, conversión de mediciones y archivos. Las de backend usan SQLite en memoria para comprobar autenticación, permisos y borrado de contenido asociado.

