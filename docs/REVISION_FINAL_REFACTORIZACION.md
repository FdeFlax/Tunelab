# Revisión final de Tunelab y guía para la memoria

Fecha de comprobación: 16 de noviembre de 2026.

Tunelab integra la representación 3D de un túnel de viento, la preparación de ensayos, un simulador de operación y el registro de mediciones. También permite estudiar objetos GLB mediante un cálculo aerodinámico experimental con XLB. La revisión conserva la distribución visual y las funciones existentes y comprueba las bibliotecas incorporadas en la refactorización.

Las pruebas automáticas y los recorridos de la refactorización descritos aquí terminaron correctamente. **En aquella revisión, el cálculo KBC del elipsoide original de 20 cm a 19,8 m/s seguía siendo numéricamente inestable.** Se mantuvo el rechazo de ese resultado. La actualización posterior a Smagorinsky se documenta al final; todavía no existe validación experimental de los mapas.

## Bibliotecas y responsabilidades

| Biblioteca o tecnología | Uso actual | Parte específica que conserva Tunelab |
| --- | --- | --- |
| React y Vite | Componentes, estados, montaje de la interfaz, desarrollo y compilación. | Pantallas, formularios, navegación y reglas de interacción. |
| Three.js y React Three Fiber | Escena WebGL, mallas, materiales y representación 3D mediante React. | Modelo del túnel, posiciones de las etiquetas y vistas elegidas para cada componente. |
| Drei 10.7.9 | `Html` coloca etiquetas HTML en coordenadas 3D; `OrbitControls` permite manejar la cámara; `Bounds` proporciona encuadre y transiciones. | Selección de la parte del túnel, información didáctica, límites de cámara y atajos de teclado. |
| Chart.js 4.6.1 y chartjs-plugin-annotation 3.1.0 | Gráficas, escalas, tooltips y bandas o marcas de las etapas. | Preparación de series, separación de datos ausentes, estadísticas y significado de la estabilidad. |
| fflate 0.8.3 | Escritura de archivos ZIP y codificación UTF-8. | Selección de las mediciones y creación de sus documentos JSON. El ZIP actual usa `level: 0`: empaqueta sin comprimir. |
| glTF Transform 4.5.1 | Lectura de una descripción glTF filtrada y escritura del GLB preparado con `WebIO`. | Revisión del subconjunto admitido y selección de posiciones, índices y transformaciones necesarias para el flujo. |
| Zod 4.6.7 | Validación de campos de archivos de mediciones importados. | Límites, versiones de archivo y restricciones específicas de ensayos y etapas. |
| TanStack Query 5.107.1 | Consultas de detalle de mediciones, consulta de capacidad y seguimiento de trabajos XLB. | Identidad del usuario, órdenes explícitas, cancelación y correspondencia entre objeto y resultado. No gestiona todos los estados de la aplicación. |
| FastAPI y Pydantic | Endpoints HTTP, documentación de la API y validación de datos en Python. | Permisos, reglas de los ensayos, operaciones del túnel y comprobaciones de configuración. |
| SQLAlchemy, MySQL y Alembic | Acceso a las tablas, persistencia y evolución del esquema. | Relación entre usuarios, ensayos, mediciones, muestras y eventos. |
| XLB 0.3.1, NVIDIA Warp 1.10.0 y NumPy | Cálculo LBM en la GPU y manejo de matrices. | Preparación del caso, condiciones de contorno, conversiones, controles numéricos y entrega del volumen. |
| Trimesh | Lectura y análisis de geometría en Python y conversión de superficies cerradas a vóxeles. | Restricciones de geometría, bloqueo de la sección y límites de recursos. |

No se ha añadido ninguna dependencia en esta revisión final. Las versiones de las bibliotecas de interfaz están fijadas en `package.json`. Las licencias y avisos se recogen en `REVISION_LICENCIAS_Y_GRAFICAS.md`, `inventario_licencias.json` y `docs/licencias`.

## Qué se simplificó en la refactorización

Las etiquetas antes requerían proyectar coordenadas 3D y actualizar elementos HTML manualmente. Ahora `Html` realiza esa tarea. La aplicación sigue indicando la posición de cada etiqueta y qué ocurre al pulsarla.

Las transiciones y el encuadre utilizan `Bounds`, y los controles de cámara se integran con `OrbitControls` de Drei. Tunelab conserva la elección de vistas y el comportamiento de selección. La vista previa de Aerodinámica mantiene el giro con ratón deshabilitado y muestra la dirección del viento mediante `ArrowHelper` de Three.js.

Las gráficas antes se construían con trazados SVG propios. Ahora Chart.js dibuja las series y los tooltips. Se conservan los cálculos de medias, mínimos, máximos y separación de tramos sin datos. No se ha recuperado la antigua reducción manual de puntos.

La escritura manual de cabeceras ZIP y CRC se sustituyó por fflate. En GLB se delegó la escritura binaria a glTF Transform, manteniendo las validaciones del subconjunto permitido. Esta preparación no equivale a un algoritmo nuevo de compresión ni a una simplificación geométrica: se eliminan atributos de apariencia innecesarios para el cálculo.

La interfaz de Aerodinámica se encuentra en `src/aerodinamica/Laboratorio.jsx`. React sustituye al montaje mediante `innerHTML`, a las búsquedas de elementos y a sus eventos manuales. Cada componente `Plano` tiene su propia posición. `campo.js` y `mapas.js` conservan la interpretación y el dibujo del volumen.

## Correcciones concretas de esta revisión

1. **Consultas de detalle:** `useDetalleMedicion` entrega la señal de cancelación de TanStack Query a las funciones de `registroApi.js`, que la transmiten a las peticiones de muestras y eventos. Al cambiar de selección o limpiar la caché no quedan esas peticiones innecesariamente activas. Un error del detalle del servidor tampoco se muestra al consultar un archivo importado.
2. **Exportación conjunta:** se adapta la llamada de `useRegistro.js` para que `Array.map` no entregue su índice como segundo argumento a la función de carga, que ahora admite una señal de cancelación. Este problema apareció durante la comprobación y quedó corregido antes de repetir la descarga ZIP.
3. **Mensajes de importación:** Zod informa en español de fechas incorrectas y del campo de estabilidad inválido. La comprobación de GLB distingue un archivo vacío o incompleto de otro que supera el límite de tamaño.
4. **Legibilidad:** el ajuste de posición de un corte se expresa en tres pasos: acotar la posición, elegir la celda y obtener la coordenada. Se conserva el resultado y la independencia de los planos.
5. **Diagnóstico de XLB:** el error identifica el paso que falla. El registro del servidor conserva los extremos de densidad, rapidez y viscosidad de red. No se recomienda cambiar una velocidad medida simplemente para conseguir que aparezca un mapa.
6. **Cambio de objeto:** al importar otro GLB se retiran tanto el campo anterior como su aviso de error. Antes el mensaje del cálculo fallido podía permanecer junto a la vista previa del nuevo objeto. Se ha comprobado la recuperación mediante una importación válida y la visualización de sus mapas.

No se han cambiado las medidas del JSON, las reglas del simulador, las condiciones de contorno ni el método de colisión KBC. Los experimentos numéricos permanecen en `tmp`, fuera del código entregable.

## Cómo funciona actualmente la aplicación

`src/main.jsx` monta React y el proveedor de TanStack Query. `src/App.jsx` coordina la navegación y el perfil local. Las páginas utilizan componentes compartidos y servicios de acceso a la API.

El navegador envía peticiones HTTP al backend. `clienteApi.js` centraliza la dirección de la API y la identidad del perfil de demostración. Las consultas de detalle incluyen el usuario, la vista y la medición en su clave de caché. Cambiar de identidad o cerrar sesión limpia esa caché.

El navegador no accede directamente a MySQL. El backend valida las peticiones, comprueba los permisos y realiza las operaciones mediante SQLAlchemy. Los perfiles Alumno Demo y Profesor Demo permiten demostrar el sistema en local. **No constituyen una integración real con UACloud ni un sistema de autenticación listo para producción.**

El simulador de operación se ejecuta en Python, en `backend/app/control_tunel.py`. Relaciona la consigna con la velocidad mediante los puntos de calibración del JSON, aplica la rampa y genera las lecturas utilizadas por la interfaz. El control de etapas y la adquisición se ejecutan en el servidor. En una medición por etapas se registran también las transiciones; el tiempo solicitado para cada etapa corresponde al tramo estable.

`src/servicios/tunel/tunelApi.js` consulta el estado periódicamente, con un intervalo de un segundo. El WebSocket de `controlApi.js` comunica cambios de conexión y ocupación. Las gráficas de mediciones y el cálculo XLB son recorridos diferentes: XLB no sustituye al simulador de Control ni proporciona automáticamente sus lecturas.

Para incorporar el túnel físico faltan el enlace con sus dispositivos, la adquisición real y la validación de las órdenes y medidas. El botón Conectar del modo simulado comprueba el flujo de reserva y uso de la aplicación; no acredita una conexión con un variador físico.

## Recorrido de un cálculo aerodinámico

1. El usuario importa un GLB. Un Web Worker prepara la geometría para evitar que ese trabajo se ejecute en el hilo de la interfaz.
2. La aplicación conserva una vista previa y prepara el objeto con un lado mayor de 20 cm, sin giro adicional; solo lo reduce si los límites de la sección lo exigen. Los antiguos controles de tamaño, giro y velocidad siguen retirados por decisión previa del proyecto.
3. El navegador envía los triángulos en centímetros. El servidor comprueba sus límites y reserva un trabajo de cálculo.
4. El servidor inicia `scripts/calcular-flujo3d.py` en el entorno que contiene XLB y Warp. Trimesh comprueba y voxeliza el sólido. No se ejecuta XLB en el ordenador del visitante de la web.
5. XLB calcula con D3Q27, colisión KBC, precisión FP32 y backend Warp en una GPU CUDA. La entrada tiene velocidad uniforme; la salida usa extrapolación; las paredes y el objeto tienen condiciones de rebote sin deslizamiento. La llamada al stepper y el intercambio de buffers se corresponden con la implementación de XLB instalada.
6. Cada 200 pasos se comprueban finitud, densidad y rapidez. Si fallan, el trabajo termina con error y no se publica el mapa.
7. Al completar los pasos se obtiene la rapidez relativa a la entrada. El volumen se envía como float32 little-endian codificado en Base64. Los sólidos se marcan con −1.
8. La web obtiene los cortes vertical, horizontal y transversal del mismo volumen. Mover un corte solo cambia el dibujo de ese plano y no vuelve a ejecutar XLB.

La consulta de progreso usa TanStack Query cada 800 ms mientras el trabajo está activo. Las órdenes de inicio no se reintentan automáticamente. Cambiar el objeto invalida el campo y solicita cancelar el cálculo anterior. Cambiar de página conserva el laboratorio montado para poder volver al trabajo en curso. Al cerrar sesión se desmonta la interfaz; un trabajo ya aceptado por el servidor puede continuar hasta terminar o alcanzar su límite de 120 segundos. No se ha añadido una garantía de cancelación del proceso remoto al cerrar la pestaña.

## Investigación del fallo de XLB

Se realizaron cálculos reales en una NVIDIA GeForce RTX 4060 Laptop, con 8 GB de memoria. La referencia conserva la lectura `foto-1`: 19,8 m/s, 22,2 °C, 100760 Pa y 56 % de humedad relativa. La velocidad procede de GUST, por decisión del proyecto; no se presenta como una media espacial o temporal validada.

Las conversiones producen aproximadamente:

| Magnitud | Valor |
| --- | ---: |
| Densidad del aire | 1,18179 kg/m³ |
| Viscosidad dinámica estimada | 1,82391 × 10⁻⁵ Pa·s |
| Viscosidad cinemática estimada | 1,54335 × 10⁻⁵ m²/s |
| Paso espacial original | 0,01 m |
| Velocidad de entrada de red | 0,04 |
| Tiempo físico por paso | 2,0202 × 10⁻⁵ s |
| Viscosidad de red | 3,11788 × 10⁻⁶ |
| Relajación `tau = 0.5 + 3ν_red` | 0,50000935 |
| Reynolds basado en 20 cm | 256584 aproximadamente |
| Tiempo físico de 6000 pasos | 0,1212 s aproximadamente |

Se conserva `dt = U_red × dx / U_física` y `ν_red = ν_física × dt / dx²`. Estas conversiones mantienen Reynolds. La presión y la temperatura se utilizan para estimar propiedades del aire; los mapas publicados representan rapidez, no un campo de presión o temperatura.

| Prueba ejecutada | Resultado observado | Decisión |
| --- | --- | --- |
| Elipsoide original 20 × 7,78 × 7,78 cm; malla 101 × 71 × 71; 6000 pasos | Valores no finitos en la comprobación del paso 5200. | Caso no admitido como resultado válido. |
| Mismo caso con FP64 | Rapidez de red máxima 0,316 en el paso 5000; supera el límite existente de 0,3. | No incorporar doble precisión. |
| Mismo caso inicializado con flujo uniforme | Valores no finitos en el paso 4000. | No cambiar la inicialización. |
| Malla 151 × 106 × 106, celda de 2/3 cm y 9000 pasos previstos para conservar el tiempo físico | Rapidez máxima 0,450 en el paso 3600. | No incorporar ese refinamiento. No constituye un estudio de convergencia. |
| Elipsoide de 10 × 3,89 × 3,89 cm con condiciones originales | Completa 6000 pasos; 11,06 s en la ejecución directa registrada. | Caso de comprobación de ejecución. |
| Elipsoide de 20 × 3,89 × 3,89 cm con condiciones originales | Completa 6000 pasos; 10,97 s en la ejecución directa. También genera los tres mapas desde la web. | Caso de comprobación de ejecución y visualización. |
| Elipsoide original con viscosidad de red artificial 0,0056, solo como contraste | Completa 6000 pasos; Reynolds baja a 142,9. | No adoptar: altera el caso físico. |

Los tiempos anteriores son observaciones de estas ejecuciones, con los recursos disponibles en ese momento. No son una garantía de rendimiento.

El caso inestable combina Reynolds elevado, muy pocas celdas sobre la superficie y una relajación próxima a 0,5. Las pruebas son compatibles con una limitación numérica del caso y de su discretización. **No se ha aislado una causa única ni obtenido una corrección sencilla fiable.** La doble precisión y un refinamiento moderado no lo resuelven. Tampoco se ha encontrado un error de conversión de unidades o de intercambio de buffers que justifique alterar las medidas.

Se mantiene el funcionamiento actual y sus controles. No se añade un cierre de turbulencia ni se incrementa artificialmente la viscosidad. No hay un rango general validado de tamaños o velocidades: que un objeto cumpla los límites geométricos no garantiza estabilidad, y que termine el cálculo tampoco garantiza precisión física. Los dos casos completados son ejemplos concretos; no permiten afirmar que todos los objetos menores de 20 cm funcionen.

Para la memoria es defendible presentar Aerodinámica como una integración experimental de una biblioteca científica con geometrías importadas. La reproducción cuantitativa del túnel exige caracterizar la entrada, confirmar dimensiones, estudiar independencia de malla y duración, y contrastar resultados con mediciones. El artículo de XLB valida la biblioteca en sus casos de estudio, no esta configuración concreta de Tunelab.

## Pruebas y resultados

### Pruebas automáticas

| Comprobación final | Resultado |
| --- | --- |
| `npm test` | 114 pruebas superadas, 0 fallos; las 106 iniciales más 8 comprobaciones nuevas. |
| `python -B -m unittest discover -s tests`, desde `backend` | 73 pruebas superadas, 0 fallos. |
| `npm run lint` | Correcto. |
| `npm run build` | Correcto; mantiene el aviso de paquetes compilados de más de 500 kB. |

Las ocho comprobaciones nuevas cubren cancelación de detalles al cambiar de medición, respuesta tardía, aislamiento por usuario, limpieza de caché, retirada de errores al pasar a archivos locales, mensajes de importación, fin del polling y retirada del aviso del cálculo anterior al cargar otro GLB. Algunas pruebas reúnen varios escenarios relacionados.

Las pruebas existentes comprueban ZIP y UTF-8, límites y transformaciones GLB, propiedades físicas y configuración, geometrías y resultados inválidos, independencia de planos, datos ausentes, capturas, etapas, permisos, exclusión de trabajos, cancelación y tiempos máximos. Las pruebas de backend usan bases temporales SQLite y procesos de prueba donde corresponde; los cálculos GPU de la tabla anterior son ejecuciones adicionales del motor real.

Los registros están en `tmp/revision-frontend-final.log`, `tmp/revision-backend-final.log`, `tmp/revision-lint-final.log` y `tmp/revision-build-final.log`. Continúan los avisos de obsolescencia de `datetime.utcnow()` en el backend. No han causado fallos y no se ha extendido esta revisión a una migración de fechas.

### Comprobaciones en el navegador

| Recorrido | Resultado |
| --- | --- |
| Alumno, creación de ensayo y asociación | Creado «Revisión bibliotecas 16-11» con el perfil Alumno Demo. |
| Conectar al simulador y configurar etapas | Guardado automático de dos etapas, con consignas 25 % y 50 %. |
| Arranque y ejecución completa | Comprobación previa, arranque, transición y registro. «Revisión dos etapas»: 21 s de duración declarada y 23 muestras. |
| Detener una medición | «Revisión detenida»: primera etapa parcial, segunda sin ejecutar, 24 s declarados y 24 muestras conservadas. |
| Registro y detalle | Ambas mediciones se recuperan desde el servidor. |
| Gráficas | Velocidad, temperatura y consigna; unidades, bandas de estabilidad, cambios de etapa y consulta por teclado. Tooltip con puntero comprobado también en la página de prueba de series largas. |
| Comparación | Dos mediciones reales del simulador, 47 valores válidos en la comparación de velocidad. |
| Descarga y reimportación JSON | Se recuperan nombre, etapas, duración y 24 muestras de la medición detenida. |
| ZIP del ensayo | Descargado y abierto con `zipfile`: CRC correcto, ficha y dos JSON con 24 y 23 muestras. |
| Docente | El profesor ve el ensayo del alumno y su detalle de 23 muestras. |
| Cierre y cambio de sesión | Tras salir del perfil profesor y entrar como alumno, aparecen el ensayo y las mediciones del alumno; no permanece la ficha del profesor ni su acceso a Docente. |
| Ocupación entre sesiones | Profesor muestra «Túnel ocupado» y Conectar deshabilitado mientras el alumno lo reserva. Se libera al desconectar el alumno. |
| Modelo 3D | Carga en Dashboard e Inspección, siete etiquetas, selección de sección y turbomáquina, cambio de cámara, giro, zoom, teclado y regreso a la vista inicial. Los valores límite de distancia se han revisado en código; no se ha medido experimentalmente cada extremo. |
| Aerodinámica | Importación mediante worker, vista previa fija con flecha, cálculo real del objeto estrecho y tres mapas, conservados al cambiar de página. |
| Cortes | Vertical −1 cm, horizontal +1 cm y transversal +1 cm, con controles independientes. La correspondencia numérica de píxeles también tiene prueba automática. |
| GLB incorrecto | Rechazado sin bloquear la página. Se puede importar a continuación un archivo válido. |
| Cancelación XLB | Orden de cancelar aceptada, retorno al estado disponible y posibilidad de iniciar otra vez. |
| Fallo XLB en la web | El caso original finaliza con el mensaje del paso 5200, sin publicar un mapa, y permite volver a calcular. |

Las dos mediciones de comprobación y el ensayo permanecen identificados con «Revisión» para poder revisarlos. Son datos del simulador, no del túnel físico. La reimportación JSON se almacena como archivo local de la aplicación y no crea otra medición en MySQL.

### Rendimiento observado

Una página temporal que monta el componente real `GraficaMedicion` comparó cuatro series de 100000 valores cada una, con un dato ausente por serie. El primer montaje tardó aproximadamente 275 ms y el segundo 246 ms, medidos hasta el siguiente frame después del montaje de React. Es una medida orientativa del equipo local, no un benchmark de producción. El contador de instancias de Chart.js pasó de una a cero al desmontar y se mantuvo en una al sustituir la gráfica. Funcionaron la consulta final por teclado y el tooltip con puntero.

No se ha añadido reducción de puntos: no se observó un problema que la justificase en esta prueba. La página temporal se conserva en `tmp/graficas-revision.html` para repetirla. Las pruebas automáticas también comprueban que una serie de 54001 muestras conserva sus extremos y valores consultables.

### Pendiente de validación

No se ha probado hardware del túnel, adquisición física, integración UACloud, despliegue multiusuario en producción, todos los navegadores o dispositivos, ni ejecución GPU en otros equipos. No se ha realizado un estudio de convergencia de XLB ni una comparación con campos de velocidad medidos. Tampoco se ha certificado el comportamiento de cualquier GLB: siguen excluidos, entre otros, esqueletos y compresión Draco/Meshopt en el recorrido de Aerodinámica.

## Recuperación del estado previo

Antes de editar se comprobó Git y se guardaron los 178 archivos presentes versionados o no ignorados, además de la lista de tres archivos ya eliminados, el diff y la referencia HEAD. Se verificaron CRC y SHA-256 de la copia:

`output/copias/antes-revision-20261116-184327.zip`

Es una copia del proyecto y del estado de cambios previo a esta revisión. No incluye dependencias, secretos `.env`, cachés ni una copia de MySQL. No se han reiniciado los cambios del usuario ni creado un commit.

## Referencias para redactar la memoria

- [Drei Html](https://drei.docs.pmnd.rs/misc/html): etiquetas HTML ligadas al espacio 3D.
- [Drei Bounds](https://drei.docs.pmnd.rs/staging/bounds): encuadre y transición de cámara mediante la biblioteca.
- [Chart.js](https://www.chartjs.org/docs/latest/) y [anotaciones](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html): representación de series y bandas.
- [TanStack Query y cancelación](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation): entrega del `AbortSignal` a las peticiones.
- [fflate](https://github.com/101arrowz/fflate): generación ZIP.
- [glTF Transform WebIO](https://gltf-transform.dev/modules/core/classes/WebIO): lectura y escritura de GLB en el navegador.
- [Zod](https://zod.dev/basics) y [Pydantic](https://docs.pydantic.dev/latest/concepts/models/): validación declarativa.
- Ataei, M. y Salehipour, H. (2024). [XLB: A differentiable massively parallel lattice Boltzmann library in Python](https://doi.org/10.1016/j.cpc.2024.109187), Computer Physics Communications 300, 109187. [Texto de los autores](https://arxiv.org/abs/2311.16080).
- [Implementación oficial del stepper de XLB 0.3.1](https://github.com/Autodesk/XLB/blob/v0.3.1/xlb/operator/stepper/nse_stepper.py): referencia del motor efectivamente utilizado, incluida la implementación Warp. El artículo de 2024 describe la biblioteca basada en JAX; la versión instalada incorpora Warp.

En la memoria conviene explicar qué necesidad resuelve cada biblioteca y qué integración aporta el proyecto. La aportación incluye el modelo del túnel, la interfaz, la organización de ensayos y mediciones, los permisos, las reglas de operación, el tratamiento de geometrías y la comunicación de resultados. No se atribuye al proyecto la implementación de Chart.js, los controles de Drei o el método físico de XLB.

## Pruebas posteriores con el huevo y la galleta (16/11/2026)

Estas pruebas son independientes de la refactorización anterior. **La alternativa Smagorinsky se probó primero mediante copias temporales del script. Posteriormente, el usuario autorizó su incorporación a la web, descrita en el apartado siguiente.**

Se revisaron `gal-b-fried-egg-5383.glb` y `gal-b-cookie-5379.glb`, proporcionados desde Descargas. La geometría usada en las pruebas se obtuvo ejecutando las mismas funciones `importarGLB` y `geometriaAjustada` del frontend, a 20 cm de lado mayor y sin giro.

- Huevo: 9610 triángulos, sólido cerrado, dimensiones 20 × 3,40597 × 19,29263 cm. KBC reproduce valores NaN al comprobar el paso 2000.
- Galleta original: 10383 triángulos y 573 bordes abiertos distribuidos en seis contornos. Trimesh confirma el mismo defecto antes y después del procesamiento del frontend.
- Galleta cerrada: se rellenaron los seis contornos con las operaciones de Blender, se triangularon las caras añadidas y se recalcularon las normales. La copia tiene 10944 triángulos, cero bordes abiertos y cuatro componentes de volumen positivo; conserva las dimensiones exteriores. No se sobrescribió el original. El relleno incorpora superficies que no existían y debe entenderse como una preparación geométrica, no como recuperación de una geometría física conocida.

La copia está en `output/aerodinamica-modelos/gal-b-cookie-5379-cerrada.glb`. El archivo `revision-cierre.json` y la imagen `revision-geometria-galleta.png`, en esa misma carpeta, registran la reparación.

Se probó `SmagorinskyLESBGK`, ya implementado en XLB 0.3.1, con su coeficiente predeterminado 0,17. Es un cambio de modelo: añade una aproximación de la turbulencia no resuelta. El coeficiente no está calibrado para este túnel. Se mantuvieron las medidas de foto-1, la viscosidad molecular derivada de ellas, D3Q27, FP32, las condiciones de contorno y las comprobaciones de fallo numérico.

| Geometría y configuración | Resultado |
| --- | --- |
| Huevo, KBC, celda de 1 cm | NaN en el control del paso 2000. |
| Huevo, Smagorinsky, celda de 1 cm | Completa 6000 pasos; 10,04 s en esta ejecución. |
| Huevo, Smagorinsky, celda de 2/3 cm | Completa 9000 pasos; 34,19 s. Conserva el tiempo físico de la prueba anterior y Reynolds. |
| Huevo, Smagorinsky, celda de 1 cm, ejecución prolongada | Completa 24000 pasos; 27,44 s. |
| Galleta cerrada, KBC, celda de 1 cm | NaN en el control del paso 2800. |
| Galleta cerrada, Smagorinsky, celda de 1 cm | Completa 6000 pasos; 10,05 s. |

Una prueba inicial de celda de 0,5 cm no llegó a ejecutarse porque excedía el límite de dos millones de nodos de la configuración; se conservó ese límite. La comparación posterior usa 151 × 106 × 106 nodos.

La comparación entre las dos mallas del huevo, al mismo tiempo físico y en 58859 puntos coincidentes que son fluido en ambas, da una diferencia absoluta media de rapidez relativa de 0,04935 y percentil 95 de 0,19573. **No se ha demostrado independencia de malla, convergencia temporal ni precisión experimental.** Terminar estas ejecuciones respalda la alternativa como candidata para mejorar la estabilidad, no como validación del gemelo digital.

Reproducción: `tmp/diagnosticar-glb-usuario.mjs`, `tmp/cerrar-galleta-blender.py` y `tmp/probar-ajustes-flujo.py`. Registros: `tmp/huevo-les.log`, `tmp/huevo-les-fina.log`, `tmp/huevo-les-larga.log`, `tmp/galleta-cerrada-kbc.log` y `tmp/galleta-cerrada-les.log`. Los resultados experimentales están identificados como tales y no se introducen en la caché de la aplicación.

Referencias de esta alternativa: [modelos disponibles en XLB](https://autodesk.github.io/XLB/), [Smagorinsky (1963)](https://doi.org/10/bhd6ks) y [relleno de huecos de Blender](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/mesh/cleanup.html#fill-holes). Estas referencias justifican los métodos empleados, no los resultados de esta configuración concreta.

## Incorporación de Smagorinsky a la web (16/11/2026)

Tras la autorización del usuario se activó `collision_type="SmagorinskyLESBGK"` en `scripts/calcular-flujo3d.py`. Se usa el coeficiente predeterminado 0,17 de XLB 0.3.1 y se registran el nombre de la clase utilizada y su coeficiente real como `modelo_colision` y `coeficiente_smagorinsky` en cada resultado.

`backend/app/flujo3d_datos.py` identifica ahora el cálculo como `xlb-031-smagorinsky-v6-<firma>`. Esto separa los resultados de los anteriores de KBC y mantiene la comprobación de correspondencia entre la API, el proceso de cálculo y la web. Se reinició únicamente la API local, con el túnel apagado y sin mediciones ni cálculos activos, y se recargó la página.

No se modificaron las lecturas de `shared/tunel.json`, la viscosidad molecular, la malla de 1 cm, los 6000 pasos, las condiciones de contorno ni los umbrales de fallo. La reparación de la galleta se entrega como archivo separado: la web sigue rechazando el original abierto y no repara automáticamente los GLB.

Validación de la integración:

- Las 12 pruebas de `test_flujo3d.py` y las 9 de `test_configuracion_tunel.py` pasan. Se añadió una comprobación que rechaza un resultado con la firma anterior de KBC. Se usó `unittest` desde `backend`; el módulo de configuración requiere descubrimiento con `-s tests` por su importación del auxiliar `test_flujo3d`.
- Pasan las 11 pruebas de campo, planos y ciclo de cálculo React seleccionadas para este cambio.
- Desde la web, el huevo original y la galleta cerrada completan 6000 pasos y muestran los tres mapas. La API confirma `SmagorinskyLESBGK`, coeficiente 0,17 y contrato v6 en ambos. Los tiempos del proceso fueron 9,34 y 9,30 segundos, respectivamente.
- Evidencias en `output/revision-smagorinsky/`: `huevo-web.png`, `galleta-web.png` y `resultados-web.json` (metadatos sin el campo volumétrico).

La comprobación verifica la ejecución del software en esos casos. Continúan pendientes la independencia de malla, la convergencia temporal y la validación frente a medidas del túnel real.
