# Revisión de repeticiones y código sin uso

Fecha: 11 de septiembre de 2026. Revisión del árbol de trabajo actual, con los cambios anteriores de autenticación y guardado de capturas. No se ha modificado el código de la aplicación durante este análisis.

**Actualización tras la sexta limpieza:** [medicionArchivo.js](C:/app/nuevo_tunelviento_app/src/servicios/archivos/medicionArchivo.js) deja de construir internamente archivos ZIP y pasa esa responsabilidad a [zipSinCompresion.js](C:/app/nuevo_tunelviento_app/src/servicios/archivos/zipSinCompresion.js), reduciéndose de 617 a 522 líneas. [PaginaRegistro2.jsx](C:/app/nuevo_tunelviento_app/src/pages/PaginaRegistro2.jsx) usa [registroAlmacenamiento.js](C:/app/nuevo_tunelviento_app/src/servicios/archivos/registroAlmacenamiento.js) para conservar y agrupar archivos importados. Las 17 pruebas de los flujos de medición, archivos y ensayos pasan, igual que el lint de los archivos modificados y la compilación.

**Actualización tras la quinta limpieza:** [formato.js](C:/app/nuevo_tunelviento_app/src/servicios/formato.js) concentra ahora los cálculos de media y redondeo que repetían el estado del túnel, la importación/exportación de archivos y el adaptador de mediciones de la API. Los tres servicios continúan produciendo los mismos resúmenes; las 15 pruebas de mediciones, capturas y ensayos pasan, igual que el lint de los cuatro archivos afectados. El JavaScript compilado baja de 332,21 a 331,97 kB.

**Actualización tras la cuarta limpieza:** las cuatro rutas que eliminaban ensayos o mediciones pasan por dos funciones comunes en [rutas.py](C:/app/nuevo_tunelviento_app/backend/app/rutas.py). La comprobación de permisos y el mensaje de auditoría se mantienen en cada ruta; únicamente se comparte el borrado de muestras, eventos y mediciones asociadas. `rutas.py` baja de 894 a 890 líneas netas y se añade una prueba que crea una medición con muestra, borra su ensayo y comprueba que no quedan registros vinculados. Las 13 pruebas del backend y la compilación de la web pasan.

**Actualización tras la tercera limpieza:** la creación, carga, activación, edición y borrado de ensayos, junto con el renombrado y borrado de mediciones, están ahora en [gestorEnsayos.js](C:/app/nuevo_tunelviento_app/src/servicios/tunel/gestorEnsayos.js). [tunelSimulado.js](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelSimulado.js) conserva sus mensajes, eventos y recuperación del primer ensayo disponible; [tunelReal.js](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelReal.js) conserva sus mensajes de operación y su selección original cuando el ensayo activo ya no existe.

Esta extracción reduce **42 líneas netas de código de aplicación**: los dos modos pasan de 1.433 a 1.195 líneas y el gestor común aporta 196 líneas, para un total actual de 1.391. Se añadieron tres pruebas en [gestorEnsayos.test.mjs](C:/app/nuevo_tunelviento_app/tests/gestorEnsayos.test.mjs) para el resumen de la medición visible, la recuperación distinta de ambos modos y el borrado inexistente en simulación. También pasan las seis pruebas de finalización de capturas y la compilación. El lint no encuentra errores en estos tres servicios; el proyecto mantiene tres errores previos en el visor 3D y el panel de control.

**Actualización tras la segunda limpieza:** Registro y Docente comparten ahora la conversión de respuestas de la API en [medicionDesdeApi.js](C:/app/nuevo_tunelviento_app/src/servicios/mediciones/medicionDesdeApi.js), junto con las utilidades de redondeo y fecha/hora de [formato.js](C:/app/nuevo_tunelviento_app/src/servicios/formato.js). Se conservan los identificadores, formatos de fecha, eventos y campos propios de cada pantalla, incluidos frecuencia, corriente y RPM en Registro.

Esta segunda intervención elimina **109 líneas netas de código de aplicación**, contando los dos servicios nuevos: Registro pasa de 864 a 728 líneas y Docente de 633 a 537; los servicios compartidos suman 123. Entre ambas limpiezas se han reducido **603 líneas**: JavaScript/React queda en 9.177 líneas y el total revisado en 18.848. Las pruebas y documentos se cuentan aparte.

Se compararon 600 resultados completos con las implementaciones anteriores mediante entradas variadas, sin diferencias en los datos obtenidos. Se añadieron cinco pruebas de conversión en [medicionDesdeApi.test.mjs](C:/app/nuevo_tunelviento_app/tests/medicionDesdeApi.test.mjs). Pasan las 23 pruebas ejecutadas: cinco de conversión, seis de finalización de capturas y doce de autenticación. La compilación pasa con el aviso previo de tamaño del visor. El lint de los cuatro archivos de aplicación intervenidos no tiene errores y mantiene tres advertencias previas de dependencias de hooks en Docente. El analizador no detecta módulos desconectados, variables locales sin uso ni exportaciones sin consumidores y sin uso interno.

Queda margen para consolidar más capas de estilos, pero las secciones numeradas siguientes conservan el diagnóstico histórico y sus referencias anteriores a las limpiezas.

**Actualización tras la primera limpieza:** se han retirado los bloques sin uso identificados en las secciones 2, 3 y 4, sus propiedades e importaciones obsoletas, y separaciones vacías repetidas en los diez archivos editados. La reducción real es de **494 líneas**: JavaScript/React pasa de 9.780 a 9.286 líneas y el total de código revisado pasa de 19.451 a 18.957. El contenido posterior conserva el diagnóstico anterior y sus números de línea originales.

La comprobación posterior no encuentra variables locales sin uso ni exportaciones sin consumidores y sin uso interno según el analizador de esta revisión. La compilación y las 18 pruebas existentes pasan. El lint baja de cuatro a tres errores; quedan los dos avisos de inmutabilidad tratados como error en el visor, el error de estado en un efecto de Control y las cuatro advertencias de dependencias de hooks. Esta limpieza no incorpora cambios funcionales en estilos, simulación, autenticación o persistencia. Las duplicaciones que requieren reorganizar lógica y la consolidación de CSS siguen pendientes.

Hay código que se puede retirar y lógica que conviene compartir. La primera limpieza puede centrarse en unas 330 líneas de declaraciones y cálculos sin efecto en la aplicación actual, antes de abordar CSS o reorganizar los servicios. Esta cifra describe bloques identificados, no una reducción neta ya aplicada ni una promesa de rendimiento.

## 1. Tamaño real del código

Se han contado las líneas físicas, incluidos comentarios y espacios, de `src` y `backend/app`. No se incluyen dependencias, compilación, pruebas, documentación, recursos binarios ni copias de respaldo.

| Parte | Archivos | Líneas | Líneas vacías |
|---|---:|---:|---:|
| JavaScript y React | 28 | 9.780 | 1.216 |
| CSS | 12 | 8.037 | 1.152 |
| Backend Python | 10 | 1.634 | 311 |
| **Total** | **50** | **19.451** | **2.679** |

Los estilos representan aproximadamente el 41 % del total. `lab-light-theme.css` tiene 1.944 líneas; `componentes.css`, 1.150; y `control2.css`, 1.022. En JavaScript destacan Registro, con 970 líneas, y los servicios simulado y real, con 789 y 644 respectivamente.

Se detectaron 319 líneas vacías consecutivas que sobran si se deja como máximo una entre bloques. Quitarlas mejora el formato, pero no reduce la complejidad ni acelera la aplicación. Esta cifra se solapa con los bloques prescindibles: no debe sumarse íntegramente a su ahorro.

Los 28 módulos JS/JSX están conectados al punto de entrada `src/main.jsx` por importaciones estáticas o dinámicas. No hay una página completa que pueda declararse abandonada por estar fuera de ese recorrido.

## 2. Componentes que ya no se utilizan: 170 líneas

Se comprobó tanto el uso en JSX como las importaciones, exportaciones y referencias internas. Son siete componentes sin consumidores y uno que solo usa una cabecera abandonada.

| Componente | Ubicación | Líneas de su declaración |
|---|---|---:|
| `CabeceraControl2` | [PanelesControl2.jsx:74](C:/app/nuevo_tunelviento_app/src/components/control/PanelesControl2.jsx:74) | 35 |
| `Indicador`, usado únicamente por esa cabecera | [PanelesControl2.jsx:25](C:/app/nuevo_tunelviento_app/src/components/control/PanelesControl2.jsx:25) | 14 |
| `PanelRangosOperacionControl2` | [PanelesControl2.jsx:433](C:/app/nuevo_tunelviento_app/src/components/control/PanelesControl2.jsx:433) | 34 |
| `TarjetaResumenMedicion` | [ResumenMedicion.jsx:194](C:/app/nuevo_tunelviento_app/src/components/ResumenMedicion.jsx:194) | 9 |
| `TarjetaDatoDocente` | [PaginaDocente.jsx:36](C:/app/nuevo_tunelviento_app/src/pages/PaginaDocente.jsx:36) | 9 |
| `TablaMuestrasDocente` | [PaginaDocente.jsx:164](C:/app/nuevo_tunelviento_app/src/pages/PaginaDocente.jsx:164) | 26 |
| `MetricaRegistro2` | [PaginaRegistro2.jsx:128](C:/app/nuevo_tunelviento_app/src/pages/PaginaRegistro2.jsx:128) | 9 |
| `TablaMuestras` | [PaginaRegistro2.jsx:275](C:/app/nuevo_tunelviento_app/src/pages/PaginaRegistro2.jsx:275) | 34 |

La tabla vigente es `TablaMuestrasComun`, dentro de `InformeMedicionComun`. Eliminar las dos tablas antiguas no elimina la tabla del informe. Tampoco se debe quitar `GraficaMedicion`: aunque nadie la importa desde otro archivo, sí se utiliza dentro de su módulo.

## 3. Cálculos que se ejecutan pero cuyo resultado se ignora: 99 líneas

`InformeMedicionComun` ya no recibe ni lee la propiedad `tarjetas`: su firma está en [ResumenMedicion.jsx:380](C:/app/nuevo_tunelviento_app/src/components/ResumenMedicion.jsx:380). Sin embargo, las tres pantallas siguen preparándola:

| Generador sin consumidor final | Ubicación | Líneas |
|---|---|---:|
| `tarjetas(resumen)` | [PaginaControl2.jsx:92](C:/app/nuevo_tunelviento_app/src/pages/PaginaControl2.jsx:92) | 51 |
| `crearTarjetasResumen(medicion)` | [PaginaRegistro2.jsx:89](C:/app/nuevo_tunelviento_app/src/pages/PaginaRegistro2.jsx:89) | 38 |
| `tarjetasDetalleMedicion(detalle)` | [PaginaDocente.jsx:153](C:/app/nuevo_tunelviento_app/src/pages/PaginaDocente.jsx:153) | 10 |

Se pueden retirar estos generadores, sus llamadas y el paso de la propiedad por `RecapMedicionControl2`. El informe actual utiliza directamente `medicion`, sus muestras y trazas, por lo que conservaría la información que hoy muestra.

También hay propiedades ignoradas en [App.jsx:304](C:/app/nuevo_tunelviento_app/src/App.jsx:304): se pasa `usuarioActual` a Control y Registro y `onAbrirControl` a Registro, aunque esas funciones de página no reciben parámetros. Es una limpieza pequeña, útil para aclarar su interfaz.

## 4. Utilidades, constantes y alias sin consumidores

Confirmados en la aplicación y en las pruebas revisadas:

- `apiDisponible()` de [clienteApi.js:80](C:/app/nuevo_tunelviento_app/src/servicios/api/clienteApi.js:80), 5 líneas. Registro tiene una variable local con ese mismo nombre; no es una llamada a esta función.
- `guardarEventoApi()` de [medicionesApi.js:36](C:/app/nuevo_tunelviento_app/src/servicios/api/medicionesApi.js:36), 6 líneas. Quedó sin llamadas después de que la finalización dejase de enviar un evento duplicado. Eso no demuestra que deba borrarse también el endpoint del backend.
- `TAMANO_MAXIMO_ARCHIVO_MB` en [PaginaRegistro2.jsx:39](C:/app/nuevo_tunelviento_app/src/pages/PaginaRegistro2.jsx:39). Al retirarla también queda prescindible su importación de `LIMITE_TAMANO_ARCHIVO_MEDICION_BYTES`; la validación real de tamaño dentro del servicio de archivos se conserva.
- `FRECUENCIA_NOMINAL_SIMULADA_HZ`, `RAMPA_VARIADOR_SIMULADA_S` y `RPM_MAXIMAS_SIMULADAS`, en [estadoTunel.js:30](C:/app/nuevo_tunelviento_app/src/servicios/tunel/estadoTunel.js:30).
- La importación de `calcularVelocidadPorConsigna` en [estadoTunel.js:4](C:/app/nuevo_tunelviento_app/src/servicios/tunel/estadoTunel.js:4).

En `fichaTunel.js` hay otras 46 líneas de declaraciones exportadas sin consumidores actuales: `calcularAreaCircular`, `calcularDuracionRampaSubidaS`, `calcularDuracionRampaBajadaS`, los alias `calcularVelocidadPorPotencia` y `calcularPotenciaPorVelocidad`, `calcularPresionDinamicaPitotPa`, `calcularSeccionContraccion` y `calcularCaudalPorConsigna`. Empiezan en [fichaTunel.js:200](C:/app/nuevo_tunelviento_app/src/servicios/tunel/fichaTunel.js:200). Se pueden retirar si se quiere mantener únicamente la funcionalidad actualmente conectada; su posible valor para desarrollos futuros no equivale a uso actual.

Hay exportaciones que solo se usan dentro de su propio archivo. Eso permitiría acortar la interfaz pública, pero **no borrar su implementación**. Por ejemplo, `validarFichaTunel` se ejecuta al final del archivo para comprobar la configuración; `ErrorApi` se utiliza al fallar una petición; y las funciones de construcción de documentos se usan al descargar.

## 5. Duplicaciones que conviene unificar

### Conversión de mediciones de la API

[PaginaRegistro2.jsx:173](C:/app/nuevo_tunelviento_app/src/pages/PaginaRegistro2.jsx:173) y [PaginaDocente.jsx:82](C:/app/nuevo_tunelviento_app/src/pages/PaginaDocente.jsx:82) convierten las mismas respuestas en muestras, estadísticas, trazas y eventos. Conviene extraer un adaptador compartido a un servicio.

Las versiones tienen diferencias que deben conservarse o resolverse expresamente: Registro incorpora frecuencia, corriente y RPM; Docente no. Los identificadores, formatos de fecha y representación de eventos también difieren. Copiar sin más la versión más corta perdería información. `App.jsx` mantiene además una conversión resumida para recuperar ensayos, que no carga las muestras completas; no debe sustituirse por otra que añada descargas innecesarias.

### Gestión local de ensayos en los dos modos

[tunelSimulado.js:448](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelSimulado.js:448) y [tunelReal.js:441](C:/app/nuevo_tunelviento_app/src/servicios/tunel/tunelReal.js:441) repiten creación, activación, carga, actualización y borrado de ensayos, además de renombrado y borrado de mediciones. Ya comparten operaciones de listas en `estadoTunel.js`, pero todavía duplican bastante coordinación del estado.

La mejora sería compartir la gestión de ensayos y conservar separados la simulación física y el envío de órdenes a la API. Sus contratos no son idénticos: cambian retornos, eventos y la elección del ensayo activo cuando el anterior desaparece. Requiere pruebas de ambos modos; no es un bloque que pueda borrarse directamente.

### Borrado en el backend

Las rutas de alumno y docente repiten las operaciones de eliminación de eventos, muestras y mediciones: [rutas.py:488](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:488), [rutas.py:624](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:624), [rutas.py:654](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:654) y [rutas.py:759](C:/app/nuevo_tunelviento_app/backend/app/rutas.py:759).

Se puede extraer la operación común de borrado. Deben mantenerse las comprobaciones de pertenencia y rol, los mensajes de auditoría y las respuestas actuales. Que dos rutas borren datos parecidos no significa que deban tener los mismos permisos.

### Funciones pequeñas y flujo de pantalla

Hay copias de `calcularMedia`, `redondear` y formateadores de fecha/hora. El análisis estructural encontró cuatro grupos de cuerpos idénticos de al menos cuatro líneas, además de variantes cortas y equivalencias con otros nombres de variables. Una utilidad compartida evita corregir el mismo cálculo en varias pantallas.

Hay que mantener el tratamiento actual de entradas: algunas versiones de `redondear` convierten valores y sustituyen vacíos por cero; otras exigen un número. Tampoco son intercambiables sin comprobarlo `limitar` y `limitarValor`. Reducir líneas cambiando `||` por `??` indiscriminadamente puede cambiar el significado de cero o cadena vacía.

En `App.jsx` se repiten la construcción del Dashboard y parte de la selección de pantalla/título. Una configuración pequeña de páginas o una función común puede reducir esa repetición. Es una prioridad menor que retirar código muerto.

## 6. CSS: gran margen, con comprobación visual

Se analizaron 1.120 bloques de reglas. Hay 92 grupos con el mismo texto de selector y contexto de reglas envolventes repetido. No son 92 copias que se puedan eliminar automáticamente: normalmente tienen declaraciones distintas que se complementan o sobrescriben.

Ejemplos concretos:

- [global.css:1](C:/app/nuevo_tunelviento_app/src/styles/global.css:1) define 16 variables de tema que [lab-theme.css:2](C:/app/nuevo_tunelviento_app/src/styles/lab-theme.css:2) redefine después. Ambos se cargan siempre desde `main.jsx`. Puede haber una sola definición de los valores vigentes del tema oscuro.
- `.cont2potencia` se define en `control2.css` en las líneas 152 y 630 y vuelve a ajustarse en `lab-theme.css:219`. El tamaño y aspecto efectivos quedan repartidos entre tres bloques.
- `.appblanca .grafmedsvg` aparece en [lab-light-theme.css:811](C:/app/nuevo_tunelviento_app/src/styles/lab-light-theme.css:811), vuelve a cambiar el fondo en la línea 845 y otra vez en la 1054. Al consolidarlo hay que conservar también propiedades como la altura mínima, que solo aparecen en la primera regla.
- `.docusotunelactivo` cambia sucesivamente borde y fondo en `docente.css:211`, `:445` y `:599`.
- Hay estilos de las antiguas lecturas de Control, como `.cont2lecturas`, `.cont2lecturasmaniobra` y `.cont2lectura`, sin referencias en el JS/JSX actual. La pantalla usa ahora una tabla con otras clases. Algunos aparecen agrupados con selectores todavía vigentes: debe retirarse solo la parte obsoleta.

La búsqueda preliminar señala **209 bloques que contienen alguna clase sin coincidencia literal en JS/JSX**. Es una lista de candidatos, no de reglas demostradas como muertas. Por ejemplo, `app-content--inspeccion` sí se genera concatenando el nombre de página en `App.jsx`, aunque no aparezca como cadena completa. También existen variantes dinámicas para colores y niveles de alarma.

Para limpiar CSS conservando el aspecto hay que comparar las seis pantallas, ambos temas, escritorio/móvil y estados como modales, selección, carga y error. La mayor reducción puede estar aquí, pero no hay una cifra fiable de ahorro neto sin realizar esa comprobación.

## 7. Archivos largos que no conviene recortar a ciegas

- `_rescate_css_20260709-081207` contiene 12 copias de estilos, con 5.549 líneas. No forman parte del código servido por la aplicación. Archivarlas ordena el repositorio; borrarlas elimina copias de recuperación y no acelera la web.
- `node_modules`, `dist`, `package-lock.json`, migraciones y recursos 3D cumplen funciones distintas al código escrito a mano. No deben acortarse manualmente para reducir el contador.
- El ZIP implementado en `medicionArchivo.js` sí se utiliza al descargar un ensayo. Cambiarlo por una dependencia reduciría código propio, pero no necesariamente el tamaño total ni el mantenimiento.
- Los ajustes del visor 3D están documentados en `TAREAS_PENDIENTES.md` como correcciones necesarias del modelo actual. Su longitud no los convierte en código sobrante.
- El escaneo de importaciones Python de `backend/app` no encontró nombres importados sin uso local. Las funciones de rutas se invocan a través de FastAPI y los modelos a través de sus registros; no deben marcarse como muertos por no tener llamadas explícitas.

## 8. Por qué el lint no detectaba varios casos

[eslint.config.js:30](C:/app/nuevo_tunelviento_app/eslint.config.js:30) permite variables sin uso que empiecen por mayúscula o `_`. Eso oculta componentes React y constantes abandonadas.

No basta con quitar esa excepción: la configuración actual no marca por sí sola todos los usos JSX para `no-unused-vars`. En esta auditoría se añadió al analizador temporal el reconocimiento de componentes utilizados en JSX para evitar señalar falsamente importaciones como `App`, `Canvas` o `Power`. Además, se revisaron los consumidores de exportaciones y la propiedad ignorada `tarjetas`, que un aviso normal de variables no detecta.

La configuración permanente debería reconocer usos JSX y después exigir la comprobación de nombres en mayúscula. Un análisis de exportaciones puede complementar el lint para prevenir nuevos restos.

## 9. Orden recomendado y comprobaciones realizadas

1. Retirar los ocho componentes muertos, los tres generadores de tarjetas sin consumidor y las utilidades/constantes sin uso. Es el primer cambio más fácil de revisar: alrededor de 330 líneas de bloques actuales, más pequeñas conexiones y estilos exclusivos.
2. Corregir la detección de código sin uso para que no se vuelva a acumular.
3. Compartir la conversión de mediciones entre Registro y Docente, conservando todos los campos.
4. Limpiar y consolidar estilos por pantalla, con comparación visual de temas y estados.
5. Compartir la gestión local de ensayos y las operaciones de borrado del backend, conservando sus controles y diferencias.

No se ha realizado ninguna de estas eliminaciones durante este análisis. La reducción neta debe medirse sobre cada cambio y las pruebas deben ejecutarse después de aplicarlo. Mover una función a otro archivo, por sí solo, no reduce el total.

Comprobaciones del estado actual:

| Comprobación | Resultado |
|---|---|
| Compilación de producción | Correcta; aviso de tamaño del módulo del visor 3D. |
| Pruebas de finalización de capturas | 6 de 6 correctas. |
| Pruebas de autenticación con SQLite en memoria | 12 de 12 correctas. |
| Lint habitual | 4 errores y 4 advertencias ya presentes: dos de inmutabilidad del visor, uno de estado en un efecto, una importación sin uso y cuatro dependencias de hooks. |

Las pruebas existentes cubren autenticación y guardado; no demuestran equivalencia visual ni cubren todos los comportamientos de una futura refactorización. No se ha probado hardware ni modificado MySQL.

El análisis se puede repetir con `node tmp/auditoria_redundancias_20260911/analizar.mjs`. Los resultados estructurados están en [resultados.json](C:/app/nuevo_tunelviento_app/tmp/auditoria_redundancias_20260911/resultados.json). El script usa analizadores ya instalados; no incorpora dependencias nuevas.
