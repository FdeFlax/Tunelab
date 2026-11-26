> Documentación histórica. Desde el 23/11/2026 se usa una consigna y una duración
> por medición. El programador y las rutas descritas aquí se han retirado. Consulta
> [GUARDADO_MEDICIONES.md](GUARDADO_MEDICIONES.md) para el funcionamiento actual.

# Ensayos por etapas

Disponible en **Control → Registrar medición**, en el modo **Simulador del servidor**.
Las mediciones se registran mediante una secuencia de una o varias etapas.
Cada ensayo tiene una configuración guardada que puede volver a ejecutarse.

## Uso

1. Crea o selecciona la ficha del ensayo.
2. Escribe el nombre de la medición encima de la tabla. Encima se indica el
   nombre del ensayo asociado. Los identificadores se mantienen internamente, sin
   mostrarse en las listas y fichas. Un formulario nuevo empieza con una etapa
   al 25 % y 20 segundos de registro; las configuraciones ya guardadas se conservan.
   Cada etapa tiene una consigna del variador y una duración en segundos.
3. Usa **Añadir etapa** en la última fila de la tabla; puedes eliminar u ordenar
   las etapas con sus botones. El nombre, las consignas y las duraciones se guardan
   automáticamente tras 500 ms sin editar. Los campos incompletos o fuera de límites
   no se envían. Todavía no se crea una medición.
4. Conecta el túnel. **Iniciar medición**, arriba a la derecha del bloque, abre la
   comprobación previa si está apagado. Al confirmar, el servidor valida el ensayo,
   el nombre y los límites antes de encender a cero y aplicar la primera etapa.
   No se recupera una consigna manual anterior. El botón verde cambia en el mismo
   sitio a **Detener medición**, en rojo.
5. La captura empieza inmediatamente al iniciar la secuencia, aunque el flujo
   todavía cambie. El servidor aplica cada consigna y guarda también las transiciones.
   La duración cuenta desde que se aplica la consigna, incluyendo la transición.
   Al cumplirse el tiempo se pasa a la siguiente etapa, aunque el flujo siga cambiando.
6. Consulta la medición en **Registro**. Lleva el nombre indicado y reúne
   las muestras de todas sus etapas. Los eventos de la medición marcan el inicio
   y el final de cada etapa, con su consigna y tiempo de registro.

En Control, la consigna se configura en la tabla de etapas. Encima del registro
se muestran la consigna aplicada y la velocidad actual. El informe de la última
medición se mantiene debajo, junto a Seguridad y Diagnóstico.
La orden `POST /api/tunel/programa/iniciar`
acepta `encender: true` tras la comprobación previa; sin esa confirmación no
enciende un túnel apagado. Un reintento con la misma
`clave` no enciende de nuevo ni duplica la medición. Si falla el inicio de la captura,
se apaga el túnel.

El tiempo de medición incluye las transiciones. El servidor conserva las muestras
de la medición y el informe permite consultar su evolución completa.

El **Dashboard** muestra el visor, las lecturas y la última medición. La conexión
y el inicio de mediciones se realizan desde **Control**; el Dashboard no ofrece
botones de conexión, encendido ni ajuste manual de consigna.

## Paradas y continuidad

- Cambiar de página, recargar o cerrar el navegador no detiene la secuencia.
  Al volver con el mismo usuario se recupera su estado desde el servidor.
- **Detener medición** apaga el túnel, conserva la medición parcial
  y omite las etapas restantes.
- Al completar todas las etapas, el túnel se apaga. La conexión continúa reservada
  hasta pulsar **Desconectar**.
- Durante la secuencia se bloquean la edición y el cambio de ensayo.
  Las consignas se aplican exclusivamente desde las etapas del programa.
  El docente mantiene su desconexión forzada.
- Si el servidor se reinicia, el programa queda **Interrumpido** y no se reanuda
  automáticamente. Las muestras ya confirmadas permanecen en la base de datos.
- La estabilidad es un dato de cada muestra. No pausa ni reinicia el contador
  de la etapa y no condiciona su finalización.
- Un fallo de almacenamiento o de captura detiene el programa. Se conservan las
  muestras confirmadas, incluso si se interrumpe durante la primera transición.

## Límites de esta versión

- De 1 a 15 etapas; consignas del 1 al 100 % y registros de 1 a 3600 segundos.
- Antes de arrancar se comprueba que queda espacio para una medición en el ensayo,
  respetando el límite configurado del servidor.
- El botón de inicio exige configuración guardada, ensayo seleccionado, control
  del túnel y ausencia de bloqueo de seguridad. Espera a que el guardado automático
  termine; un fallo de guardado muestra el error y permite reintentar. La interfaz
  solicita el encendido tras la comprobación previa.
  Se bloquea mientras hay otra medición o una operación pendiente. Los nombres de
  medición deben ser únicos dentro del ensayo; un nombre repetido impide iniciar.
- El guardado mantiene las ediciones nuevas mientras termina una petición anterior.
  Al salir de Control se envía el borrador válido pendiente; al volver, la lectura
  espera a los guardados de ese ensayo. Cerrar el navegador antes de recibir la
  confirmación del servidor no garantiza que se conserve el último cambio.
- Adquisición y cambios de fase aproximadamente una vez por segundo. La duración
  efectiva puede superar la solicitada en un intervalo de adquisición más el
  tiempo de procesamiento; no es un programador de tiempo real.
- Repetir un programa crea otra medición única. Las anteriores se conservan.
  Guardar otro borrador sustituye la configuración y el resumen de la última
  ejecución, pero no elimina sus mediciones.
- El modo simulado exclusivamente en el navegador y el equipo físico no ejecutan
  esta programación. La versión actual usa el simulador del servidor.

## Instalación y mantenimiento

La migración `b672af184e03` añade `programas_etapas` y parte de `a813ca17d902`.
Con el backend parado y `DATABASE_URL` apuntando a su base de datos, ejecuta desde
la carpeta `backend`:

```powershell
.venv\Scripts\python.exe -m alembic upgrade head
```

Después reinicia el backend. Se mantienen los comandos habituales del frontend.
En el entorno local de desarrollo esta migración se aplicó el 22/09/2026,
con una copia SQLite previa en `backend/backups/antes_programas_etapas_20260922.db`.

La ejecución reside en `backend/app/programador_etapas.py`, coordinada por el
hilo y el bloqueo del capturador. El editor está en
`src/components/control/RegistroMedicion.jsx`; los estilos están en
`src/styles/control.css`.

Las órdenes de inicio y parada usan una clave de ejecución. Reintentar un inicio
con la misma clave no repite las etapas, y una parada antigua no cancela una
ejecución posterior. La consulta, edición y ejecución se limitan al propietario.

## Comprobación

```powershell
# Desde backend
.venv\Scripts\python.exe -m unittest discover -s tests

# Desde la raíz del proyecto
node --experimental-vm-modules --test --test-isolation=none tests/*.test.mjs
npm run build
```

Las pruebas específicas cubren ejecución sin navegador, una medición con muestras de todas las etapas,
propiedad, bloqueo de edición durante la captura, cancelación, desconexión docente,
reinicio, fallos de escritura, límites y reintentos de órdenes.
La prueba automatizada ejecuta dos etapas sin navegador y comprueba que ambas
quedan en una sola medición, con muestras de las dos consignas y eventos de fase.

## Análisis del programa guardado

Desde la migración `c901bd278f04`, cada medición nueva guarda una copia del programa
ejecutado con las consignas, duraciones previstas, intervalos de registro y estado
de cada etapa. Editar el borrador del programa no altera esa copia.

Desde el 23/11/2026, las mediciones nuevas guardan el programa con `version: 3`.
Cada etapa registra el inicio de su consigna y su final, sin esperas ni intervalos
estables adicionales. La duración solicitada corresponde al tiempo desde el cambio
de consigna. No se modifican las mediciones anteriores ni las tablas de la base de datos.

En Control, Registro y Docente, **Resultados por etapa** resume todas las muestras
de cada etapa: media, mínimo, máximo y desviación muestral (requiere dos valores
válidos). Incluye la transición. La columna **Duración / prevista** compara el
intervalo registrado con el solicitado. El selector de etapa permite consultar
esas mismas muestras en la gráfica y en la tabla.

El capturador toma la muestra antes de cambiar la consigna. Por eso una lectura
exactamente en el límite pertenece a la etapa que termina, sin duplicarse en la
siguiente. Una cancelación deja la etapa activa como parcial y las pendientes sin
ejecutar. Si un ciclo se retrasa, se registra el tiempo real y la siguiente etapa
cuenta su duración completa desde la aplicación de su propia consigna.

Se mantiene la lectura de programas antiguos:

- Versión 1: intervalos de registro separados.
- Versión 2: captura continua con transiciones; **Tramos estables por etapa**
  conserva las estadísticas de muestras estables y los intervalos originales.
- Versión 3: captura continua por duración; las estadísticas incluyen toda la etapa.

Las migraciones anteriores añadieron el programa, la consigna objetivo, la marca
`flujo_estable` y la precisión temporal. Los datos ausentes en registros antiguos
siguen ausentes; no se reconstruyen. La estabilidad sigue siendo la del simulador,
según la tolerancia y el tiempo configurados en `shared/tunel.json`. Puede mostrarse
en las gráficas, pero ya no interviene en la ejecución de las etapas. No acredita
estabilidad experimental ni turbulencia real. XLB es independiente.

Las nuevas ejecuciones pasan directamente a `registrando`. Se reconoce el antiguo
estado `estabilizando` únicamente para recuperar ejecuciones interrumpidas al
reiniciar. La versión 3 no necesita otra migración: utiliza el JSON del programa
ya existente. Después de actualizar el código se debe reiniciar el backend.

## Consulta e intercambio de mediciones

En **Registro**, selecciona una medición guardada o importada para abrir su informe.
Puedes consultar velocidad, caudal, consigna, presión dinámica y temperatura, además
del desglose por etapas y las muestras originales.

Los cálculos y las gráficas utilizan las muestras originales y conservan los huecos.
La tabla se pagina en bloques de 100 muestras; la exportación conserva todas.

El formato JSON 1.3 conserva origen, estado, calibración, fechas, programa y datos técnicos.
Identifica el ensayo por su ID interno; se pueden seguir importando los archivos anteriores.
Admite programas 1, 2 y 3, y sigue leyendo archivos 1.0 y 1.1. Un origen antiguo no documentado se muestra como desconocido y un
valor ausente no se sustituye por cero. Límites de importación: 32 MiB y 100.000 muestras
por archivo, 20 archivos y 250.000 muestras en total dentro del visor.

Después de aplicar `alembic upgrade head` hay que reiniciar el backend para que empiece
a guardar la copia del programa y devuelva los contadores actualizados.
