# Flujo 3D con un objeto importado

## Configuración compartida

Editar [shared/tunel.json](../shared/tunel.json). Es la fuente común de la web, el simulador del servidor y el worker XLB de la web; sustituye al antiguo `calibracion-tunel.json` y a las dimensiones repetidas en código.

| Bloque | Qué se configura |
| --- | --- |
| `geometria.seccionEnsayo` | Longitud, altura y ancho interiores, en **metros**. |
| `geometria.camaraEstabilizacion`, `contraccion`, `difusor` | Datos de la ficha del resto de secciones. Las entradas y salidas compartidas se derivan de la cámara y la sección de ensayo. |
| `ambiente` | Referencias para Control/Registro. Aerodinámica utiliza las lecturas de sección descritas abajo. |
| `calibracion.velocidad.puntos` | Correspondencia entre consigna (%) y velocidad (m/s), ordenada por consigna. Incrementar `calibracion.version` al cambiar esta curva; las capturas guardan esa versión. |
| `calibracion` y `modelo` | Tolerancias y tiempos de estabilidad/parada. |
| `simulador` | Rampa y lecturas sintéticas de temperatura, frecuencia, corriente y RPM. También consigna inicial y botones de consigna rápida. No son mediciones ni datos de placa verificados. |
| `sensor.intervaloCapturaSegundos` | Intervalo objetivo entre capturas del servidor, de 0,1 a 10 s. Incluye el trabajo de adquisición y guardado; no garantiza una frecuencia exacta ni representa un sensor físico. |
| `aerodinamica.mediciones` | Las cinco lecturas de la sección y su consigna (%). La velocidad GUST en m/s define la curva interpolada de Aerodinámica. También se conservan temperatura en °C, presión absoluta en Pa y humedad en %. |
| `aerodinamica.medicionActiva` | Referencia de temperatura, presión y humedad y consigna inicial; actualmente `foto-1`. La consigna puede cambiarse en la web. |
| Resto de `aerodinamica` | Resolución `pasoCm`, número de pasos y límites del motor. Son ajustes numéricos; no son medidas del túnel. |
| `modeloGlb` | Ruta del dibujo del túnel dentro de `public`. |

Para introducir datos del túnel real, editar las medidas interiores en `geometria`, los pares consigna/velocidad de Control en `calibracion.velocidad.puntos` y las lecturas para XLB en `aerodinamica.mediciones`. `ambiente` sigue siendo la referencia de Control. Registrar aquí la procedencia y las incertidumbres; marcar `medido` solo cuando exista una medición y aumentar `calibracion.version` al cambiar la curva.

El recorrido de Aerodinámica es: **JSON → Python → XLB → mapas en la web**. `backend/app/configuracion_tunel.py` calcula densidad, viscosidad y parámetros de malla. `/api/flujo3d/capacidad` los entrega a la web, que los usa para revisar el tamaño del objeto y leer los mapas. El navegador no vuelve a calcular estas propiedades. La firma del caso sigue evitando reutilizar resultados con otra configuración.

Los ajustes de cámara y etiquetas están en `src/components/visor/ajustesTunel.js`. Conservan sus valores anteriores; no son medidas físicas. Este módulo sustituye a `shared/tunel.js`, que mezclaba vistas, validaciones y cálculos duplicados. No se utiliza el multiplicador de velocidad del antiguo deslizador: la consigna seleccionada determina la velocidad mediante los puntos medidos.

Verificación de esta simplificación (09/11/2026): 102 pruebas de JavaScript, 19 de configuración/API/trabajos de flujo en Python, ESLint y compilación correctos. Se compararon malla, límites y propiedades físicas con la configuración anterior. En navegador se comprobaron Dashboard e Inspección, la importación de `ejemplo.glb`, un cálculo real completo y los tres mapas; desplazar el plano horizontal a +1 cm mantuvo los otros dos a 0 cm. No aparecieron errores en la consola. Es una comprobación del software, no una validación experimental de los resultados.

Los valores `frecuenciaMaximaHz`, `corrienteMaximaA` y `rpmMaximas` de `simulador` controlan las lecturas sintéticas del motor. Cambiarlos no permite deducir por sí solo la velocidad del aire: esta sigue dependiendo de la curva de calibración. No se han añadido valores supuestos de potencia nominal, tensión ni curvas del ventilador. Los límites de recursos y las fórmulas del programa siguen en el código.

Inspección utiliza las dimensiones y la velocidad máxima de la configuración. Se conservan aquí los antecedentes retirados del JSON operativo: el manual citado anteriormente indicaba una sección de 0,6 × 0,6 × 1 m y velocidades de 20–25 m/s, mientras la configuración usa 0,7 × 0,7 × 1 m. La discrepancia está pendiente de contrastar; esos valores históricos no se usan para calcular.

El antiguo adaptador, inactivo y excluido de los cálculos, tenía entrada rectangular de 0,8 × 0,8 m, salida circular de diámetro 1,25 m y longitud 0,85 m. El JSON atribuía la cámara y la contracción a documentación técnica, y la envolvente del difusor al CAD; estas atribuciones no constituyen una comprobación de las dimensiones reales. La salida interior del difusor sigue siendo desconocida.

La curva anterior de Control conserva 50 % → 5,121 m/s, 75 % → 8,18 m/s y 100 % → 11,119 m/s, identificadas previamente como lecturas de la aplicación MATLAB; el punto 0 % → 0 m/s era una condición asumida. La consigna es una orden porcentual al variador, no una medida de potencia eléctrica. El cambio solicitado el 17/11/2026 se aplica a Aerodinámica; no sustituye esta curva de Control ni modifica capturas anteriores.

Por ejemplo, cambiar `geometria.seccionEnsayo.anchoM` de `0.7` a `0.5` actualiza el área y los caudales, la entrada del difusor y la salida de la contracción de la ficha, los límites del objeto y la extensión de los mapas. Con `pasoCm: 1`, XLB pasa a una malla **101 × 71 × 51** en orden longitud/altura/ancho. No hay que editar esos nodos manualmente. `pasos` controla la duración numérica; no son segundos ni un criterio de convergencia.

Las dimensiones deben ser múltiplos del paso de malla. La configuración rechaza números inválidos, curvas desordenadas, mallas de más de 2.000.000 de nodos y límites incompatibles. Son controles de recursos, no garantías de precisión. Cambiar la resolución cambia también la representación del objeto y requiere volver a comprobar el resultado. Los máximos efectivos del objeto respetan tanto `objeto.maximoCm` como el espacio disponible en cada eje; el mínimo es `objeto.minimoCeldas × pasoCm`.

**Después de editar:** reiniciar la API cuando no haya capturas, programas o cálculos en curso y recargar la web. Aerodinámica recibe la configuración de la API. Si cambias datos mostrados directamente por Dashboard o Inspección, en desarrollo Vite recarga el JSON; en una instalación compilada hay que ejecutar también `npm run build`. El lanzador reutiliza una API ya abierta: volver a pulsarlo no la reinicia. El cálculo se habilita tras recibir la configuración; la caché y el worker comprueban su firma para no mezclar casos antiguos.

Los valores originales se conservan como configuración inicial. La presión dinámica estimada por el simulador ahora usa la misma densidad de referencia ambiental que la web: `p/(R·T)` si `usarDensidadConstante` es `false`, o `densidadReferenciaKgM3` si es `true`. La temperatura sintética que muestra el simulador sigue siendo una lectura independiente; no modifica automáticamente el ambiente de referencia. `viscosidadDinamicaPaS` tampoco se recalcula al cambiar la temperatura.

Desde el 08/11/2026 XLB convierte a unidades de red las propiedades del aire estimadas a partir de una lectura de `aerodinamica.mediciones`. Ya no usa el Reynolds arbitrario de 100 ni la viscosidad de red fija 0,0056. El usuario confirmó los porcentajes de las cinco lecturas el 17/11/2026. Control/Registro mantienen su curva anterior.

Aerodinámica sigue resolviendo solo la sección de ensayo rectangular. El GLB no es paramétrico: cambiar las dimensiones físicas no reconstruye su malla. Para sustituir el dibujo, guardar otro GLB dentro de `public` y cambiar `modeloGlb`; después revisar las cámaras y etiquetas del visor. La escala visual no modifica los cálculos. El script independiente `scripts/preparar-conducto-tunel.py` sigue siendo una revisión específica del CAD original.

## Lecturas de la sección y unidades físicas

El usuario confirma que velocidad, temperatura, presión y humedad se midieron **dentro de la sección de ensayo**. Se variaba la consigna sin apagar el túnel y se esperaba a que la lectura superior se mantuviera aproximadamente constante. Se conserva GUST como velocidad de referencia, por petición del usuario, y AVERAGE como dato original adicional. No se afirma que GUST sea una media temporal, una media espacial de la sección ni el máximo físico del equipo.

| ID (orden de las fotos adjuntas) | Consigna (%) | GUST (m/s) | AVERAGE (m/s) | OUTDOOR (°C) | ABS (hPa) | Humedad (%) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| foto-1 | 100 | 19,8 | 19,3 | 22,2 | 1007,6 | 56 |
| foto-2 | 75 | 14,5 | 14,0 | 21,9 | 1007,6 | 57 |
| foto-3 | 50 | 9,2 | 9,0 | 21,7 | 1007,5 | 58 |
| foto-4 | 25 | 4,0 | 0,9 | 21,4 | 1007,5 | 60 |
| foto-5 | 0 | 0,0 | 0,0 | 21,2 | 1007,8 | 60 |

La sexta foto muestra los mismos valores que la quinta; no se cuenta como repetición independiente. Se guardan las presiones en Pa (`hPa × 100`). No se utiliza la fecha de la consola como fecha de adquisición. Marca, modelo, intervalos GUST/AVERAGE, calibración y error instrumental no están documentados. No se ha caracterizado la respuesta de la toma de presión en corriente; la lectura ABS se usa como presión de referencia del gas, no como presión dinámica ni como un campo espacial medido.

`aerodinamica.medicionActiva` elige la referencia ambiental y la consigna inicial: por defecto `foto-1` (100 %, 22,2 °C, 1007,6 hPa y 56 % HR). La web permite cambiar la consigna; el servidor interpola linealmente la velocidad entre las dos lecturas vecinas. Por ejemplo, 60 % da 11,32 m/s. Los porcentajes fueron confirmados por el usuario; los valores intermedios son estimaciones, no mediciones adicionales. Se conserva el origen GUST de la curva y no se extrapola fuera del intervalo medido. La función de interpolación ya utilizada en Control se comparte, pero cada módulo mantiene sus propios puntos.

Cambiar la consigna no interpola temperatura, presión ni humedad: se mantienen las de la referencia ambiental, porque estas cinco fotografías no establecen una relación causal con el variador. La viscosidad física permanece igual bajo esas condiciones; se recalculan el tiempo por paso, la viscosidad en unidades de red y el Reynolds del objeto para la velocidad elegida. A 0 % se muestra reposo y no se lanza XLB: no existe un mapa relativo normalizado por una entrada nula.

La API recibe `consigna` tanto al consultar capacidad como al iniciar el trabajo. Cada trabajo conserva sus parámetros, los incorpora a la firma de caché y pasa `--consigna` al proceso XLB, que vuelve a verificar la firma. La respuesta incluye la consigna y las condiciones del aire utilizadas. Cambiar la consigna retira el mapa previo; cada cálculo mantiene una entrada constante. No se han añadido rampas temporales ni se ha cambiado el método Smagorinsky de XLB.

Comprobación del 17/11/2026: pasan 25 pruebas de configuración/API/trabajos en Python y 14 de integración React/configuración en JavaScript, además de ESLint y compilación. En navegador se verificaron reposo, cambio de consigna y retirada del mapa anterior. Con `ejemplo.glb` y 60 %, XLB completó los 6.000 pasos en 29,4 s: entrada 11,32 m/s, viscosidad de red 5,453541439·10⁻⁶ y paso temporal 3,533568905·10⁻⁵ s. Volver a ese caso recuperó sus tres mapas de caché. Son comprobaciones de funcionamiento, no una validación experimental del flujo.

`propiedades_aire()` (Python) calcula las propiedades del aire. El navegador recibe estos valores mediante la API; no conserva una segunda implementación de estas fórmulas. Se utilizan:

```text
T = temperaturaC + 273,15                            [K]
p = presionAbsolutaPa                               [Pa]
e = (HR/100) × f(p/100) × 611,2 × exp(17,62 t/(243,12+t))
f(p_hPa) = 1,0016 + 3,15·10⁻⁶ p_hPa − 0,074/p_hPa
ρ = ((p−e)/287,05 + e/461,5) / T                     [kg/m³]
μ = 1,458·10⁻⁶ × T^(3/2)/(T+110,4)                  [Pa·s]
ν = μ/ρ                                             [m²/s]
dx = pasoCm/100                                     [m]
dt = velocidadRedBase × dx / velocidadMs             [s]
ν_red = ν × dt/dx²
omega = 1/(0,5 + 3ν_red)
```

La densidad corresponde a una mezcla ideal de aire seco y vapor. La presión de vapor y el factor de mejora siguen el anexo 4.B de la [guía WMO de instrumentos, capítulo 4](https://www.weather.gov/media/epz/mesonet/CWOP-WMO8.pdf); se restringe esta implementación a 0–60 °C. La viscosidad usa Sutherland con los coeficientes para aire de [Cambridge, propiedades de fluidos](https://www-mdp.eng.cam.ac.uk/web/library/enginfo/aerothermal_dvd_only/aero/fprops/propsoffluids/node5.html). La humedad interviene en la densidad; **μ usa la aproximación de aire seco**, sin ley de mezcla para la viscosidad. Son estimaciones de propiedades, no medidas de viscosidad ni un modelo térmico del túnel.

La conversión conserva `Re = U·L/ν` entre unidades físicas y de red, siguiendo la [documentación de Musubi](https://geb.inf.tu-dresden.de/doxy/musubi/page/examples/tutorials/tut_06_initial.html) y las [estrategias de escalado de lbmpy](https://pycodegen.walberla.net/docs/lbmpy/1.4/notebooks/05_tutorial_nondimensionalization_and_scaling.html). Se citan como referencias del método; no son dependencias añadidas.

Para `foto-1`: ρ ≈ 1,18179 kg/m³, μ ≈ 1,82391·10⁻⁵ Pa·s y ν ≈ 1,54335·10⁻⁵ m²/s. Con celda de 1 cm y entrada de red 0,04: dt ≈ 2,0202·10⁻⁵ s, ν_red ≈ 3,11788·10⁻⁶ y 6000 pasos representan aproximadamente **0,1212 s físicos**. Un objeto de lado mayor 20 cm tiene Re ≈ 256.584, muy superior al caso docente anterior. Unidades coherentes no implican resolución suficiente: faltan independencia de malla, convergencia temporal y contraste experimental.

Actualización del 16/11/2026: el script utiliza `collision_type="SmagorinskyLESBGK"` de XLB 0.3.1, con el coeficiente predeterminado de la biblioteca, 0,17. Se mantienen las condiciones medidas, la viscosidad molecular, la malla, las condiciones de contorno y los controles de fallo numérico. Smagorinsky añade una aproximación de la turbulencia no resuelta; el coeficiente no está calibrado para este túnel. La entrada sigue siendo uniforme y constante: cinco fotografías no reconstruyen una serie de rachas.

La revisión inicial del mismo día encontró KBC en el código, aunque una descripción anterior mencionaba Smagorinsky. Con KBC, el GLB de ejemplo a 20 cm y `foto-1` activó el control de fallo numérico después del paso 5000. La API informó del error sin entregar un mapa inestable. Ese resultado es anterior al cambio de método y no constituye una prueba del modelo actualmente activo.

Antes de sustituir KBC se probaron doble precisión, inicialización uniforme y una malla más fina sin resolver el fallo del elipsoide. Las pruebas posteriores con Smagorinsky completaron el huevo y la galleta cerrada a 6000 pasos, además de una ejecución del huevo a 24000 pasos y otra a 9000 pasos con celda de 2/3 cm. La web conserva 6000 pasos y celda de 1 cm. Estas comprobaciones respaldan la mejora de estabilidad en esos casos; no demuestran independencia de malla ni precisión experimental. El informe [Revisión final y guía para la memoria](REVISION_FINAL_REFACTORIZACION.md) conserva el historial y los resultados. Se mantiene el rechazo de campos inestables, cuyo mensaje identifica el paso que falla.

La firma de caché incluye las condiciones activas y una versión nueva para Smagorinsky. La respuesta de capacidad contiene las propiedades y condiciones físicas utilizadas; el resultado registra `modelo_colision`, `coeficiente_smagorinsky`, la viscosidad molecular de red, la velocidad de red y Reynolds del lado mayor, además del volumen y los controles numéricos. El volumen se transmite como rapidez relativa y la web lo convierte a **m/s** con la velocidad de entrada del cálculo. Los mapas no representan presión ni temperatura. La web muestra la consigna y su velocidad estimada; las condiciones ambientales siguen en la configuración.

Los archivos de mediciones ya guardadas no se reescriben al editar el JSON. Si faltan magnitudes en un archivo antiguo, su conversión puede estimarlas con la ficha actual; no equivale a recalcular mediciones históricas con su configuración original.

## Uso

1. Arrancar Tunelab con su lanzador habitual y entrar con un perfil válido.
2. Abrir **Aerodinámica** desde la barra lateral. La sección vuelve a estar visible desde el 27/10/2026, con una interfaz simplificada.
3. Importar un GLB estático. Se prepara inicialmente con lado mayor de 20 cm y sin giro adicional; se reduce si la sección configurada exige un tamaño menor. El campo «Tamaño del objeto (cm)» permite cambiar el lado mayor conservando las proporciones; debajo se muestran la longitud, la altura y el ancho resultantes. Los tamaños introducidos se revisan antes de permitir el cálculo, sin corregirlos automáticamente. Cambiar el tamaño retira los mapas anteriores y el siguiente cálculo recibe los triángulos a la nueva escala. Durante el cálculo, el campo está deshabilitado. Cada nueva importación vuelve al tamaño inicial. La consigna permite ajustar la velocidad; la interfaz no ofrece giros ni carga un objeto por defecto. Un aviso indica si la geometría no supera los límites; no se reparan automáticamente las superficies abiertas.
4. Pulsar **Calcular flujo**. El navegador envía únicamente los triángulos orientados y a escala, en centímetros; no las imágenes o materiales del archivo. Durante el proceso, el botón muestra un indicador circular y **Calculando…**, con **Cancelar** disponible. La interfaz no muestra una barra ni el contador de pasos; los errores y avisos de conexión siguen siendo visibles.
5. En **Mapas de flujo** se muestran los tres cortes a la vez: vertical, horizontal y transversal. Cada mapa tiene debajo su propio deslizador de posición en centímetros desde el centro: ancho (Z), altura (Y) y longitud (X), respectivamente. Sus posiciones son independientes. Comparten una escala de velocidad en m/s, fija entre consignas, y la máscara oscura para sólidos y paredes. En pantallas estrechas se apilan.
6. Mover un plano solo vuelve a dibujar ese corte; no mueve los otros, no llama al servidor ni repite el cálculo. Importar otro objeto retira el resultado anterior. Cambiar condiciones en el JSON requiere reiniciar la API, recargar la web y calcular el nuevo caso.

Se conserva la funcionalidad de importación sin conectar al motor. La visualización local no necesita una GPU NVIDIA; el motor configurado en el servidor sí. No se ha instalado un servidor de universidad ni integrado UACloud. El control de acceso sigue siendo el existente en Tunelab: los perfiles demo solo están permitidos en desarrollo local directo.

La sustitución de la interfaz del 27/10/2026 elimina el visor WebGL sin uso y el selector del número de mapas; muestra tres cortes fijos con posiciones independientes y conserva el motor, la API y la validación geométrica. La copia anterior está en `output/archivo-aerodinamica/interfaz-anterior-20261027-185310.zip`. Se ha comprobado en navegador la carga del ejemplo, un cálculo completo (32 s en este equipo), la recuperación de caché, los tres cortes y su desplazamiento, la invalidación al girar y la conservación del resultado al navegar entre secciones. Las 20 pruebas de geometría, validación, campo y mapas, ESLint de los archivos afectados y la compilación pasan. Esto verifica el funcionamiento del software, no la precisión física.

El objeto y los planos se conservan al cambiar de sección dentro de la aplicación. El laboratorio se carga en la primera visita. Antes del cálculo existe una vista previa 3D del objeto con cámara fija; los resultados son cortes 2D de un cálculo tridimensional. Cerrar sesión libera la geometría, los mapas y las consultas pendientes del navegador; un cálculo ya recibido por el servidor sigue sujeto a su límite de tiempo. Recargar la página también vacía la vista local.

## Activación en el servidor

En `backend/.env`, establecer `FLUJO3D_HABILITADO=true`. `FLUJO3D_PYTHON` permite indicar un intérprete distinto; si queda vacío se usa `tmp/evaluacion-xlb/.venv/Scripts/python.exe` en Windows o `bin/python` en Linux. Después se reinicia la API, sin ninguna captura ni programa en curso. A partir de ahí el lanzador normal arranca también esta integración; el proceso pesado se crea solo al calcular y termina después.

Las versiones verificadas son XLB 0.3.1 y Warp 1.10.0. El entorno de cálculo y el fichero `backend/requirements-flujo3d.lock.txt` ya contienen las dependencias usadas. No se mezclan con las dependencias del backend ni se exige instalarlas al alumno. El motor rechaza explícitamente ejecutarse si no encuentra CUDA o las versiones previstas. La velocidad medida en el portátil de desarrollo no garantiza rendimiento en otro servidor.

## Modelo y mapas

- Sección de referencia: 100 × 70 × 70 cm, provisional. Procede del informe preliminar; el manual cita 60 × 60 cm y la discrepancia sigue pendiente de medición.
- Malla uniforme de **101 × 71 × 71 nodos**. Cada unidad geométrica equivale a 1 cm. X es la dirección del flujo, Y la altura y Z el ancho. Los planos verticales muestran X/Y, los horizontales X/Z y los transversales Z/Y. Se desplazan por nodos a intervalos de 1 cm: X entre −50 y +50 cm, Y y Z entre −35 y +35 cm. No hay planos oblicuos ni una nueva simulación en cada corte.
- Método D3Q27/SmagorinskyLESBGK, coeficiente 0,17, FP32, mediante XLB 0.3.1/Warp. Entrada uniforme, salida extrapolada y cuatro paredes inmóviles mediante rebote. El sólido usa rebote a media celda. No se incluyen soporte, contracción, difusor ni ventilador.
- Entrada de red: `0,04`, equivalente a la velocidad GUST de la lectura activa mediante el escalado físico descrito arriba. La viscosidad molecular de red se deriva de las condiciones medidas. Reynolds utiliza el lado mayor de la caja envolvente orientada. La parametrización física no constituye una validación del flujo real.
- Los parámetros proceden de `shared/tunel.json` a través de `backend/app/flujo3d_datos.py`. La malla se deriva de las dimensiones de la sección y de `PASO_CM`: nodos = longitud en cm / paso + 1. El origen se sitúa en menos la mitad de cada dimensión. La voxelización convierte los centímetros a celdas usando ese mismo paso.
- Se parte del estado de reposo del motor y se ejecutan **6000 pasos**. El resultado es una instantánea transitoria. No hay criterio de convergencia ni estudio de independencia de malla: terminar los pasos no significa obtener una solución estacionaria validada.
- Cada 200 pasos se comprueba que los campos son finitos, que la densidad de red permanece entre 0,7 y 1,3 y que la rapidez no supera 0,3. Son controles de fallo numérico, no estimaciones del error físico. Un fallo impide publicar el mapa.
- El servidor entrega `rapidez local / velocidad de entrada`; `leerCampo` multiplica cada valor fluido por `aire.velocidadMs` del trabajo para representarlo en m/s. La escala visual va de 0 a 20 m/s y es común a las tres vistas y a todas las consignas; no se reajusta a cada resultado. Desde 20 m/s se utiliza el rojo del extremo, indicado como `≥ 20` en la leyenda. Este umbral es una elección visual, no un límite físico: los valores calculados superiores a 20 m/s se conservan. Un píxel oscuro es sólido o pared, no velocidad cero. Se muestra la discretización sin añadir corrientes, flechas o estelas artificiales. No se debe deducir arrastre de los colores por sí solos.

Corrección del 23/11/2026: la escala anterior asignaba el mismo color a la entrada para cualquier consigna, porque representaba una razón igual a 1. Ahora, con la curva del JSON, 1 % se representa con una entrada de 0,16 m/s y 100 % con 19,8 m/s. El cambio afecta a la representación, no al método XLB ni a la caché. No añade una validación física de los resultados ni supone que la forma de las estelas deba cambiar en la misma proporción que la velocidad. En consignas bajas, una escala común puede mostrar menos contraste local.

El contrato `xlb-031-smagorinsky-v6-<firma>` sustituye a la versión KBC e incluye una firma de los parámetros efectivos. Conserva el campo escalar completo al acabar, con 509.141 valores en la configuración inicial, de tipo float32 little-endian y orden X/Y/Z (Z varía más rápido). El valor −1 identifica sólidos y paredes. Se envía una sola vez por resultado al navegador en Base64 dentro del JSON: aproximadamente 2,7 MB, y ocupa unos 2 MB una vez decodificado. Se validan formato, tamaño, origen, paso y valores tanto en servidor como en cliente; el límite de bytes del resultado se deriva de la malla configurada y deja 300 kB adicionales para metadatos, sin admitir volúmenes arbitrarios. No se transmite un historial temporal ni los vectores de velocidad. Mover el plano permite explorar esta misma instantánea; no mejora la resolución ni la precisión del modelo. La interfaz comparte este volumen entre tres canvas 2D; al desplazar un plano solo dibuja el canvas correspondiente.

Trimesh convierte la malla cerrada en vóxeles rellenos de paso 1 cm. La revisión rechaza superficies abiertas, orientaciones incoherentes, caras duplicadas/degeneradas y componentes sin volumen positivo. No realiza una reparación automática ni verifica todas las autointersecciones, solapamientos o detalles finos. Las dimensiones exteriores no garantizan que se resuelvan todos los espesores o huecos. Véase la [documentación de voxelización de Trimesh](https://trimesh.org/trimesh.voxel.creation.html).

Desde el 27/10/2026 se admite un mínimo de 2 cm por eje para exploración. Este umbral solo relaja la validación: la separación sigue siendo de 1 cm. Un tamaño de 2 cm queda representado por muy pocas celdas; no supone una mejora de resolución ni una validación de objetos pequeños. Se comprobaron 7 pruebas de validación del frontend y las 3 pruebas `ContratoTests` del backend, además de ESLint y compilación. En la web, el ejemplo con lado mayor de 5 cm se rechazó por tener altura y ancho de 1,94 cm; con lado mayor de 6 cm (6 × 2,33 × 2,33 cm) completó un cálculo real en 14,5 s. En aquella comprobación la suite general se interrumpió. En la revisión posterior del mismo día se identificó el bloqueo en la creación del socket local de asyncio dentro del aislamiento de Windows; fuera de ese aislamiento pasan las 50 pruebas del backend, incluida la suite completa de flujo 3D.

El motor permite resolver el flujo volumétrico alrededor de geometrías diferentes; esta integración concreta conserva limitaciones de resolución, dominio, condiciones de entrada y tiempo simulado. La validación publicada de una biblioteca no valida por sí sola este montaje. Fuente del motor: [XLB](https://github.com/Autodesk/XLB); publicación de referencia: Ataei y Salehipour, *XLB: A differentiable massively parallel lattice Boltzmann library in Python*, Computer Physics Communications 300 (2024), 109187.

## Justificación de la preparación de GLB

Revisión de referencias: 01/11/2026. El método implementado es una extracción de geometría estática con compactación de datos binarios. No es un nuevo algoritmo de compresión ni una simplificación de superficies. Conserva posiciones, índices y transformaciones; descarta la apariencia. Por tanto, la conservación se refiere a la geometría admitida, no al archivo completo ni a su aspecto original.

La referencia normativa es The Khronos 3D Formats Working Group, [glTF 2.0 Specification, versión 2.0.1](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html). Los apartados relevantes de esa edición son 3.5 (escenas y transformaciones), 3.6 (almacenamiento binario, accesores y alineación), 3.7 (geometría), 3.8–3.9 (texturas y materiales) y 4 (contenedor GLB). Esta especificación define cómo interpretar y escribir los datos; no prescribe nuestra política de eliminar la apariencia ni demuestra por sí sola que la implementación sea correcta.

En el código, `optimizarGLB()` llama a `prepararGLB()`. La revisión propia comprueba el subconjunto admitido, los tamaños, los índices, la jerarquía y las extensiones. Se construye una descripción glTF que contiene únicamente posiciones, índices y transformaciones. `WebIO.readJSON()` de glTF Transform lee esa descripción y `WebIO.writeBinary()` genera el GLB ligero; la biblioteca se encarga de los accesores, los atributos intercalados, la alineación y la escritura binaria. Ya no se implementa un empaquetador GLB manual en la aplicación.

Se utilizan `@gltf-transform/core` y `@gltf-transform/extensions`, versión 4.5.1, con `KHRMeshQuantization` para las posiciones cuantizadas admitidas. La referencia práctica es [WebIO](https://gltf-transform.dev/modules/core/classes/WebIO). No se utiliza `prune()` ni se instala el paquete functions. El documento filtrado no referencia imágenes, materiales ni URLs externas, por lo que no se decodifican texturas para descartarlas después.

Después, `importarGLB()` usa el cargador de Three.js para aplicar las transformaciones y obtener los triángulos que necesita el cálculo. En este modelo las texturas no se convierten en rugosidad física ni en condiciones de contorno. Dashboard e Inspección siguen usando el GLB visual completo; este filtrado se aplica exclusivamente a los objetos de Aerodinámica.

La comprobación propia está en `tests/glb-optimizado.test.mjs`: compara exactamente las posiciones finales y dimensiones de casos equivalentes, incluidas jerarquías, instancias y una escala reflejada; comprueba atributos intercalados y posiciones cuantizadas; verifica que el original no cambia y que siguen rechazándose límites e índices inválidos. Esto cubre esos casos, no todos los GLB posibles. El ejemplo de unos 26 MiB reducido a unos 41 KiB era un archivo de prueba construido con texturas incrustadas; no es una tasa de reducción general ni una medición de mejora de XLB. Los límites de 100 MiB y 200.000 triángulos son decisiones operativas, no valores derivados de un paper.

Si se añade reducción de triángulos, la referencia académica candidata es Michael Garland y Paul S. Heckbert, *Surface Simplification Using Quadric Error Metrics*, SIGGRAPH 1997, pp. 209–216 ([publicación y recursos de los autores](https://www.cs.cmu.edu/~garland/quadrics/)). Ese método aproxima superficies trianguladas y cambia la geometría; no está implementado aquí. Adoptarlo exigiría elegir una implementación, revisar su licencia y medir desviación de superficie, dimensiones, cierre, orientación y conservación de detalles relevantes para la voxelización. Un error geométrico pequeño no garantiza por sí solo un error pequeño en el flujo.

Para la memoria del TFG: «Se preparan los objetos GLB con glTF Transform, conservando los datos geométricos que consume la simulación y omitiendo los recursos de apariencia. Se añadieron límites y comprobaciones propios del proyecto. La conservación de la geometría se comprobó mediante pruebas de equivalencia en los casos ensayados».

## Límites de recursos y acceso

El módulo compartido `src/servicios/modelos3d.js` reúne la carga GLB, la preparación de geometría y su validación. Dashboard e Inspección usan `CargadorGLB` con `useLoader`, conservando materiales, texturas y transformaciones. Aerodinámica usa `importarGLB`, que llama a `optimizarGLB` y extrae los triángulos en `importar.worker.js`. Solo esta última ruta descarta la apariencia y aplica las comprobaciones para simular.

La importación admite GLB estáticos de hasta 100 MiB antes de preparar la geometría. `optimizarGLB()` en `src/servicios/modelos3d.js` reutiliza el lector validado para obtener una copia GLB de hasta 20 MiB con posiciones, índices y transformaciones. Se compactan también los atributos intercalados: los bytes de imágenes, normales, UV y otros datos descartados no pasan al cargador de Three.js. Se conservan las coordenadas e índices, sin simplificar, reparar ni cambiar la escala de la malla. Las texturas WebP, AVIF y KTX2 pueden omitirse sin decodificarlas. El proceso se ejecuta en el worker del navegador y no modifica el archivo original. El límite de 100 MiB es un tope operativo de esta versión, no una garantía de rendimiento en todos los equipos. Se mantienen el plazo de revisión de 30 segundos y los límites de piezas y triángulos.

La copia ligera se prepara automáticamente al importar y solo vive en memoria; no se descarga ni se almacena otro GLB en el servidor. Al terminar la importación se cierra el worker y la interfaz conserva los triángulos para la vista previa y el cálculo. Una biblioteca persistente de objetos sería una funcionalidad adicional.

La separación de buffers, vistas y accesores sigue la [especificación glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html). Esta operación reduce los datos necesarios para importar el objeto; no reduce los pasos de XLB ni hace válida una superficie abierta. Draco, Meshopt, esqueletos, morph targets y extensiones geométricas no soportadas siguen rechazándose.

La entrada tiene un máximo de 200.000 triángulos (7,2 MB en el formato de cálculo) y se recibe con límite de tamaño también cuando falta `Content-Length`. Se reserva la plaza del motor antes de leer el cuerpo para evitar varias subidas grandes simultáneas. La recepción tiene un plazo de 20 segundos. El backend comprueba coordenadas finitas, centrado y dimensiones de 2–60 cm por eje antes de crear un proceso.

El worker limita la subdivisión previa de la superficie, el número de piezas y el sólido discretizado. Rechaza un bloqueo frontal en la malla superior al 25 % o más de 50.000 vóxeles sólidos. Son restricciones operativas para esta demostración, no umbrales universales de validez de un túnel ni de precisión CFD.

Solo se ejecuta un trabajo a la vez. Los siguientes reciben un aviso de ocupado; no se acumula una cola sin límite. Se puede cancelar y existe un timeout de 120 segundos, incluyendo la preparación del proceso. La API permanece disponible durante el cálculo. La exclusión entre procesos de servidor la proporciona el bloqueo de instalación ya existente en Tunelab (un único worker de API por instalación).

Los nombres de archivo y comandos no proceden del cliente: se usan directorios temporales internos y argumentos de subprocess sin shell. El servidor elimina los archivos de entrada y salida al finalizar normalmente, cancelar o fallar. Un cierre abrupto del sistema puede dejar una carpeta temporal huérfana. Los resultados se mantienen en memoria como máximo una hora y hasta ocho trabajos finalizados, separados por usuario. La clave incluye versión del modelo con su firma de parámetros, velocidad y todos los bytes de la geometría orientada. Si cambia el JSON sin reiniciar la API, el worker rechaza la firma antigua antes de cargar XLB. La web comprueba los parámetros de capacidad y envía la versión al iniciar el trabajo. Reiniciar la API vacía esta caché. Ningún resultado se registra como medición del túnel.

## Licencias y atribución

Se reutilizan Three.js, Drei, glTF Transform y TanStack Query (MIT), XLB (Apache-2.0), NVIDIA Warp (Apache-2.0 y avisos de sus componentes) y Trimesh (MIT). Sus avisos originales se conservan en [docs/licencias](licencias/README.md). El resto de dependencias conserva sus licencias en el entorno. Deben acompañar a cualquier distribución de esas dependencias. El GLB de ejemplo es una geometría propia generada mediante `scripts/crear-ejemplo-glb.mjs`.

## Comprobaciones

Las pruebas de backend usan SQLite y un worker ficticio, sin la base de datos del laboratorio, para comprobar autenticación, propiedad, rechazo de cuerpos inválidos, exclusión, cancelación, timeout, caché, validación del volumen y eliminación de archivos. Las pruebas de Node verifican lectura GLB, geometría y correspondencia de píxeles. Un campo asimétrico de referencia comprueba cortes desplazados, extremos, sólidos y que los tres planos del visor mantienen los mismos ejes físicos, sin reflejar el mapa. Además se ha ejecutado el worker real con el GLB de ejemplo; las pruebas funcionales no equivalen a validación científica del flujo.

Comprobación desde el navegador el 18/10/2026 en el portátil de desarrollo (RTX 4060 Laptop): el ejemplo de 20 cm, sin giro y entrada 1× terminó en 17,5 s; el mismo archivo con lado mayor original de 30 cm, giro Z de 36° y entrada 1,05× terminó en 22,4 s. Son tiempos comunicados por la API, incluida la preparación, con bibliotecas y kernels ya preparados. Repetir el primer caso recuperó el resultado sin recalcular. También se comprobó la cancelación desde la web, la retirada de mapas al cambiar condiciones y la superposición horizontal en el visor. No son una garantía de tiempo para cualquier GLB o servidor.

Las pruebas de Node que usan módulos virtuales requieren `npm test`. Las específicas de campos y planos se ejecutan con `node --experimental-vm-modules --test tests/flujo3d-campo.test.mjs tests/flujo3d-mapas.test.mjs tests/flujo3d-planos.test.mjs`. Estas últimas comprueban también que cada deslizador modifica únicamente los píxeles de su corte, agrupa eventos en un solo repintado y cancela el repintado pendiente al limpiar la vista.

Con los planos móviles se repitió el ejemplo de 20 cm desde la web: el servidor comunicó 13,2 s para calcular y preparar el volumen. Se probaron 1/2/3 planos, desplazamientos, cambio de orientación con ajuste al límite, ocultación y recuperación del resultado. El registro de la API mantuvo una única petición de cálculo durante toda la exploración. Cambiar el tamaño retiró los planos y volver al caso original recuperó el volumen de caché. Pasaron las 68 pruebas de Node, las 8 pruebas específicas de backend, ESLint y el build. Los tiempos varían con la carga del equipo; este cambio evita recalcular al explorar, no modifica ni acelera el método numérico.

La integración en la navegación principal se comprobó con los perfiles alumno y profesor: importación del ejemplo, cálculo mientras se visitaba Registro, conservación de tres planos y de una posición desplazada al volver de Ensayo, limpieza al cerrar sesión y ausencia de resultados del perfil anterior al volver a entrar. El caso de 20 cm y entrada 1,05× terminó en 33,2 s y posteriormente se recuperó de caché. No hubo errores de aplicación en la consola. Volvieron a pasar las 68 pruebas de Node, ESLint y el build; no se modificó el backend ni el método de cálculo en esta integración.

## Integración React actual (16/11/2026)

`PaginaAerodinamica.jsx` carga `Laboratorio.jsx` bajo demanda con React. El laboratorio contiene el selector de archivo, el estado de importación, la vista previa y los tres cortes. Se eliminan `contenido.html`, `laboratorio.js` y `planos.js`: React sustituye el montaje con `innerHTML`, las búsquedas de elementos y los eventos manuales de esa interfaz.

El worker de importación permanece para que preparar un GLB no bloquee la interfaz. `flujo.js` expone `useFlujo`: TanStack Query consulta la capacidad y el progreso, y envía las órdenes explícitas de iniciar o cancelar. La consulta de progreso se repite cada 800 ms mientras el trabajo no sea terminal. Las órdenes no se reintentan automáticamente. Un cambio de objeto descarta el campo anterior y solicita cancelar el trabajo anterior; una respuesta tardía no se asigna al nuevo objeto.

Cada componente `Plano` mantiene su posición en React y dibuja el corte mediante `campo.js` y `mapas.js`. Se conserva el cálculo original de índices; los valores se convierten a m/s antes de colorearlos con la escala común. No se usa Chart.js para reinterpretar el volumen de XLB. Chart.js se usa para las series temporales de las mediciones, una funcionalidad distinta.

Las pruebas con React y Happy DOM comprueban el montaje, la independencia de los cortes, la limpieza del repintado pendiente, la cancelación antes de recibir el identificador, el cambio de objeto y el rechazo de respuestas antiguas. Se añade una prueba de `calcular-flujo3d.py --help` para detectar imports o constantes rotas sin necesitar CUDA. Los ensayos funcionales no sustituyen la validación física pendiente del caso indicado arriba.

## Organización y mantenimiento

El 20/10/2026 se reunieron los ajustes en una barra superior y el mapa en una única superficie, sin panel lateral. La orientación y los detalles de objeto, cálculo y modelo siguen accesibles mediante desplegables. Se comprobaron los tres planos, desplazamiento y orientación, invalidación de mapas y datos al modificar tamaño, restablecimiento y cálculo real, además de la disposición estrecha y de escritorio. Se mantienen el motor y los controles de validación.

El 19/10/2026 se retiró el visor 3D de la interfaz activa: los mapas son la vista principal y cada corte tiene su orientación y posición junto a él. Se comprobó el ejemplo real (36,4 s en ese arranque), recuperación de caché, 1/2/3 mapas, desplazamiento, ajuste al límite al cambiar orientación, conservación al navegar, invalidación al cambiar tamaño, propuesta de escala y cancelación. La vista estrecha de 390 px no produjo desbordamiento horizontal. Pasaron las 18 pruebas específicas de importación, validación, campos y mapas, ESLint y el build. No se cambió el motor ni el dominio de cálculo.

La implementación activa está en `src/aerodinamica` y el ejemplo en `public/models/aerodinamica/ejemplo.glb`. El motor y la voxelización siguen en `scripts/calcular-flujo3d.py` y `scripts/flujo3d_geometria.py`. La limpieza de prototipos, archivos recuperables y comprobaciones posteriores está en [la revisión de Aerodinámica](REVISION_AERODINAMICA_2026-10-18.md). Las cifras de pruebas y tiempos anteriores son registros históricos de cada comprobación, no el inventario actual de pruebas ni una garantía de rendimiento.

La [revisión del conducto interior](CONDUCTO_TUNEL.md) prepara una geometría provisional de contracción, sección nominal y transición de salida. **Todavía no se utiliza en la web ni amplía el dominio de cálculo.** Registra discrepancias de ventanas/marcos y salida que deben resolverse o idealizarse explícitamente antes de probar el conducto vacío.
