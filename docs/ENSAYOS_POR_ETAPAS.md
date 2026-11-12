# Ensayos por etapas

Disponible en **Control → Registrar medición**, en el modo **Simulador del servidor**.
El registro manual y el editor por etapas se reúnen en este único bloque.
Cada ensayo tiene una configuración guardada que puede volver a ejecutarse.

## Uso

1. Crea o selecciona la ficha del ensayo.
2. Escribe el nombre de la medición encima de la tabla. Encima se indica el
   nombre del ensayo asociado. Los identificadores se mantienen internamente, sin
   mostrarse en las listas y fichas. Un formulario nuevo empieza con una etapa
   al 25 % y 20 segundos de registro; las configuraciones ya guardadas se conservan.
   Cada etapa tiene una consigna del variador y un tiempo estable en segundos.
3. Usa **Añadir etapa** en la última fila de la tabla; puedes eliminar u ordenar
   las etapas con sus botones. El nombre, las consignas y las duraciones se guardan
   automáticamente tras 500 ms sin editar. Los campos incompletos o fuera de límites
   no se envían. Todavía no se crea una medición.
4. Conecta el túnel. **Iniciar medición**, arriba a la derecha del bloque, abre la
   comprobación previa si está apagado. Al confirmar, el servidor valida el ensayo,
   el nombre y los límites antes de encender a cero y aplicar la primera etapa.
   No se recupera una consigna manual anterior. El botón verde cambia en el mismo
   sitio a **Detener medición**, en rojo. Si el túnel ya está encendido en marcha
   manual, se inicia la captura y se aplica la consigna de la primera etapa.
5. La captura empieza inmediatamente al iniciar la secuencia, aunque el flujo
   todavía cambie. El servidor aplica cada consigna y guarda también las transiciones.
   El tiempo indicado en la tabla cuenta desde que se cumple el criterio de estabilidad.
6. Consulta la medición en **Registro**. Lleva el nombre indicado y reúne
   las muestras de todas sus etapas. Los eventos de la medición marcan el inicio
   y el final de cada etapa, con su consigna y tiempo de registro.

En Control, la consigna se configura en la tabla de etapas. El bloque de registro
no repite las lecturas del Dashboard ni incluye una gráfica en directo. El informe
de la última medición se mantiene debajo, junto a Seguridad y Diagnóstico.
La orden `POST /api/tunel/programa/iniciar`
acepta `encender: true` tras la comprobación previa; por defecto es `false` para
conservar el comportamiento de clientes anteriores. Un reintento con la misma
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
  La API también rechaza órdenes manuales de consigna durante el registro.
  El docente mantiene su desconexión forzada.
- Si el servidor se reinicia, el programa queda **Interrumpido** y no se reanuda
  automáticamente. Las muestras ya confirmadas permanecen en la base de datos.
- Si pierde estabilidad, sigue guardando y vuelve a esperar un tramo estable completo.
  Se conservan los tramos estables anteriores. Cada etapa tiene un límite total de
  su duración solicitada más 120 segundos; superarlo interrumpe el programa.
- Un fallo de almacenamiento o de captura detiene el programa. Se conservan las
  muestras confirmadas, incluso si se interrumpe durante la primera transición.

## Límites de esta versión

- De 1 a 15 etapas; consignas del 1 al 100 % y registros de 1 a 3600 segundos.
- Antes de arrancar se comprueba que queda espacio para una medición en el ensayo,
  respetando el límite configurado del servidor.
- El botón de inicio exige configuración guardada, ensayo seleccionado, control
  del túnel y ausencia de bloqueo de seguridad. Espera a que el guardado automático
  termine; un fallo de guardado muestra el error y permite reintentar. La interfaz
  inicia desde el estado preparado o desde una marcha manual ya encendida.
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
propiedad, bloqueo de acciones manuales, cancelación, desconexión docente,
reinicio, fallos de escritura, límites y reintentos de órdenes.
La prueba automatizada ejecuta dos etapas sin navegador y comprueba que ambas
quedan en una sola medición, con muestras de las dos consignas y eventos de fase.

## Análisis del programa guardado

Desde la migración `c901bd278f04`, cada medición nueva guarda una copia del programa
ejecutado con las consignas, duraciones previstas, intervalos de registro y estado
de cada etapa. Editar el borrador del programa no altera esa copia.

En el informe de Control, Registro y Docente aparece **Resultados por etapa**.
En las capturas continuas (programa versión 2), la tabla se llama **Tramos estables por etapa**.
Incluye solo las muestras estables: velocidad media, mínimo, máximo y desviación estándar
muestral (sin resultado cuando hay menos de dos valores válidos). El selector permite
mostrar las gráficas y muestras de una etapa concreta. Los instantes siguen referidos
al inicio de la medición completa.

Las gráficas y el selector de etapa conservan toda la evolución, incluidas las
transiciones. Los resúmenes de la gráfica corresponden a esa selección completa;
las estadísticas de la tabla de etapas corresponden únicamente a sus tramos estables.
Una interrupción deja la etapa activa como parcial y las siguientes como no ejecutadas.

La migración `d730ab816f25` añade `consigna_objetivo` y `flujo_estable` a cada muestra.
Los registros anteriores conservan esos campos a `null`: no se les atribuye una
estabilidad que no se registró. La copia del programa versión 2 conserva el criterio
de estabilidad, el momento de cambio de consigna y los intervalos estables.
Los archivos exportados usan formato 1.2; siguen admitiéndose archivos 1.0 y 1.1.

La migración `e841bc927036` conserva microsegundos en los instantes de captura,
inicio y fin de medición y comienzo de fase en MySQL. Así no se redondean muestras
al otro lado de un cambio de etapa. No recupera la precisión perdida en registros
antiguos. Cada muestra aporta su propia marca de estabilidad; los intervalos del
programador se utilizan para contar el tiempo estable, sin descartar la lectura
que detectó la estabilidad justo antes de abrir el intervalo.

La estabilidad actual es la del simulador: diferencia respecto a la velocidad
objetivo dentro de la tolerancia durante el tiempo configurado en `shared/tunel.json`.
No acredita estabilidad experimental ni turbulencia real. El intervalo de captura
predeterminado es un segundo; no es adquisición de alta frecuencia. XLB es independiente.
El tiempo de una etapa completada puede variar hasta el siguiente ciclo de adquisición.

Las mediciones antiguas se siguen abriendo, pero no se les atribuyen intervalos que
no fueron guardados. Los eventos se conservan en los datos, aunque no se muestran
en el informe.

## Comparación e intercambio de mediciones

En **Registro**, abre un informe y pulsa **Añadir al comparador**. Puedes incluir hasta
cuatro mediciones terminadas, de distintos ensayos o de archivos importados. La selección
se conserva mientras permanezcas en Registro; quitar una curva no borra la medición.
El comparador ofrece velocidad, caudal, consigna, presión dinámica y temperatura sobre
una escala común, tomando el inicio de cada medición como origen temporal.

Los cálculos utilizan las muestras originales. Las gráficas conservan los huecos y
reducen el número de puntos dibujados en capturas largas manteniendo los extremos.
La tabla se pagina en bloques de 100 muestras; la exportación conserva todas.

El formato JSON 1.2 conserva origen, estado, calibración, fechas, programa y datos técnicos.
Sigue leyendo 1.0 y 1.1. Un origen antiguo no documentado se muestra como desconocido y un
valor ausente no se sustituye por cero. Límites de importación: 32 MiB y 100.000 muestras
por archivo, 20 archivos y 250.000 muestras en total dentro del visor.

Después de aplicar `alembic upgrade head` hay que reiniciar el backend para que empiece
a guardar la copia del programa y devuelva los contadores actualizados.
