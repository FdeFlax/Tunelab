# Cosas a revisar

Última actualización: 4 de noviembre de 2026 (organización de archivos; las revisiones técnicas conservan sus fechas).

Registro de dudas, decisiones provisionales y mejoras pendientes del proyecto. Al encontrar una cuestión nueva, añadir su evidencia, el siguiente paso y qué permitiría darla por resuelta. Marcar una revisión como completada solo cuando exista una comprobación; conservar la conclusión y la fecha.

Las tareas del modelo 3D continúan en [TAREAS_PENDIENTES.md](TAREAS_PENDIENTES.md).

## Revisión de servicios — 04/11/2026

- [ ] **Borrado de la última medición en Control.** La lectura del código muestra que `borrarUlt` en `src/paginas/PaginaControl.jsx` llama a `acciones.eliminarMedicion`, que termina en `src/servicios/tunel/gestorEnsayos.js` y solo modifica el estado del navegador. Ese recorrido no llama al borrado de la API. Revisar su integración con la persistencia y la sincronización del túnel; comprobar después que una medición eliminada no reaparece al recibir otra respuesta ni al recargar. Hallazgo estático, pendiente de prueba del flujo completo. La reorganización de servicios no lo corrige.

## Datos y decisiones actuales

| Asunto | Situación a 22/09/2026 | Cómo debe interpretarse |
| --- | --- | --- |
| Velocidad al 50 % | 5,121 m/s | Medición real, confirmada por el usuario con el túnel vacío y estabilizado. |
| Velocidad al 75 % | 8,180 m/s | Medición real en esas mismas condiciones. |
| Velocidad al 100 % | 11,119 m/s | Máximo observado en las pruebas, sin acreditar el máximo físico del equipo. |
| Tiempo hasta 11,119 m/s | Aproximadamente 6 segundos, según el usuario | Referencia experimental aproximada para ajustar el arranque; todavía no se ha incorporado al modelo. |
| Sección de ensayo | Mantener 70 × 70 cm; área de 0,49 m² | Decisión del usuario para seguir trabajando. La comprobación de las dimensiones físicas queda aplazada. |
| Conexión con el túnel | El controlador del servidor revisado es simulado | Una conexión con la API no acredita una conexión con el equipo físico. |

La actualización de este documento registra estas decisiones. No cambia las fórmulas ni los parámetros ejecutados por la app.

## Revisiones del modelo físico

### F-01. Dimensiones de la sección de ensayo

- [ ] **Aplazado por decisión del usuario.** Confirmar las dimensiones interiores del equipo construido.
- **Evidencia:** el manual escaneado, página 10, indica 0,60 × 0,60 m; el informe preliminar, página 16, indica 0,70 × 0,70 m. El código calcula con 0,70 × 0,70 m.
- **Impacto:** a 11,119 m/s, el caudal sería 4,003 m³/s con 0,36 m² o 5,448 m³/s con 0,49 m², suponiendo que esa velocidad representa la media de la sección.
- **Cierre:** disponer de una medida interior o confirmación del laboratorio y hacer coherentes cálculos, ficha e Inspección. Hasta entonces mantener 70 × 70 cm en los cálculos.

### F-02. Arranque, parada y estabilidad

- [ ] **Prioridad alta.** Ajustar la respuesta temporal a la observación de aproximadamente 6 segundos hasta 11,119 m/s.
- **Estado del código:** ambos modos tienen una rampa de consigna de 20 puntos porcentuales/s. El servidor asigna directamente la velocidad de la curva a la consigna aplicada. El navegador añade retrasos del flujo de 0,8 s y del sensor de 0,4 s, además de ruido.
- **Manual, página 21:** P-03 y P-04 tienen 5,0 s en la columna «Fábrica». Son valores por defecto de aceleración y deceleración; la tabla no registra la configuración actual del equipo. La observación de unos 6 s del usuario sigue siendo la referencia experimental disponible.
- **Comprobación realizada:** en un arranque desde reposo al 100 %, al segundo 5 el servidor muestra 11,119 m/s y el navegador 8,347 m/s. En esa prueba declaran estabilidad a los segundos 9 y 12, respectivamente.
- **Siguiente paso:** confirmar desde qué instante se cuentan los 6 s y registrar una serie de tiempo y velocidad durante el arranque, cambios de consigna y parada. Ajustar la respuesta conjunta del variador, aire y lectura.
- **Criterio:** llegar aproximadamente al valor final en 6 s no equivale a tener una rampa del variador de exactamente 6 s. Tampoco permite deducir cuánto tarda en detenerse. La espera adicional para autorizar una medición es otro parámetro distinto.
- **Cierre:** comparar la curva simulada con registros reales y documentar la tolerancia aceptada, usando el mismo comportamiento en ambos modos.

### F-03. Cobertura y validación de la curva de velocidad

- [ ] **Prioridad alta.** Añadir mediciones, especialmente por debajo del 50 %.
- **Estado actual:** interpolación lineal entre 0 %, 50 %, 75 % y 100 %. El cero es una condición asumida; los otros tres puntos fueron medidos. El tramo entre 0 % y 50 % carece de mediciones interiores.
- **Siguiente paso:** obtener puntos adicionales y repeticiones, anotando condiciones, configuración, fecha y ubicación del Pitot. Reservar algunas mediciones para comprobar el modelo sin utilizarlas para ajustarlo.
- **Cierre:** publicar el error observado en esos puntos independientes, el rango comprobado y la variación entre repeticiones. Los 20–25 m/s del manual y 20–30 m/s del diseño preliminar no justifican sustituir las mediciones reales por esos valores.

### F-04. Corriente eléctrica

- [ ] **Pendiente de datos.** Revisar la regla de 0 a 12 A proporcional a la consigna.
- **Estado actual:** el servidor usa `I = 12 × consigna / 100`; el navegador persigue ese mismo objetivo con un cambio máximo de 0,35 A por actualización de un segundo. Los 12 A figuran como dato no medido.
- **Manual, páginas 20–21:** el variador permite visualizar corriente del motor. P-08 debe ajustarse a la corriente nominal de la placa; no proporciona una corriente nominal específica para el motor instalado. Las cifras de los dibujos de manejo son ejemplos, no una curva de corriente medida del túnel.
- **Valoración:** sirve como señal sintética para probar la interfaz. No representa de forma validada la corriente del motor: faltan carga, características eléctricas y comportamiento del variador. Suavizar la lectura no valida la fórmula.
- **Siguiente paso:** identificar si interesa la corriente del motor o la entrada del variador y obtener lecturas en varios puntos de funcionamiento. Una curva basada en esas lecturas sería una primera mejora útil. No reemplazar automáticamente esta regla por una potencia cúbica: corriente y potencia eléctrica no son equivalentes.
- **Cierre:** usar datos identificados y comprobados; mientras falten, presentar la magnitud como estimada o excluirla de actividades e informes que exijan corriente real.

### F-05. Revoluciones del motor y del ventilador

- [ ] **Pendiente de datos.** Verificar el máximo de 3000 RPM y la correspondencia entre consigna y frecuencia.
- **Estado actual:** ambos modos suponen 50 Hz y 3000 RPM al 100 %, con proporción directa al porcentaje. El informe preliminar incluye una referencia de 1480 RPM, que no identifica por sí sola el equipo finalmente instalado.
- **Manual, página 21:** P-10 muestra 3000 en la columna «Máximo» y 0 en «Fábrica»; el texto indica que debe configurarse según la placa del motor. Esos 3000 describen el límite del parámetro de la tabla, no una medición ni la velocidad nominal acreditada del motor instalado. P-09 muestra 50 (60) Hz como valor de fábrica y también remite a la placa.
- **Valoración:** relacionar RPM y frecuencia es una aproximación defendible si se conoce el motor y la configuración. El máximo de 3000 RPM no está acreditado. En motores de inducción hay deslizamiento respecto a la velocidad síncrona; también debe comprobarse cualquier transmisión entre motor y ventilador.
- **Siguiente paso:** consultar la placa del motor, la configuración del variador y alguna lectura de velocidad. Como referencia, la velocidad síncrona es `120 × frecuencia / número de polos`; no basta con conocer que la red es de 50 Hz.
- **Cierre:** identificar a qué eje corresponden las RPM, calibrar la relación y etiquetar la lectura como calculada cuando no proceda de un sensor.

### F-06. Temperaturas del aire, del motor y del variador

- [ ] **Prioridad media.** Definir qué temperatura representa cada campo.
- **Estado actual:** el servidor calcula `21,2 + 0,035 × consigna`, es decir, hasta 24,7 °C. El navegador se aproxima a `temperatura ambiente + 1,2 + 3,5 × consigna / 100`, con un cambio máximo de 0,12 °C por actualización antes del redondeo. La variable `tempC` interviene en la densidad del aire del modelo local.
- **Manual, página 28:** P00-09 corresponde a la temperatura del radiador interno del variador; P00-20, a la temperatura ambiente interior del equipo. Estas lecturas no representan la temperatura del aire de ensayo ni acreditan una temperatura del motor. La tabla describe los parámetros disponibles, sin aportar una curva de calentamiento para la simulación.
- **Valoración:** estas reglas no constituyen un modelo térmico validado. En el servidor, la temperatura queda ligada a la consigna aplicada sin memoria térmica independiente. El navegador incorpora una subida y bajada gradual, pero su velocidad y amplitud tampoco están medidas.
- **Siguiente paso:** para prácticas aerodinámicas, usar una temperatura del aire conocida o configurable y documentada. Si se incorpora temperatura del motor o del variador, crear variables separadas y modelos de calentamiento/enfriamiento con parámetros contrastados.
- **Cierre:** separar aire, motor y variador; comprobar que presión, densidad, pantallas y registros usan la temperatura correspondiente. No generar alarmas térmicas reales a partir de valores sintéticos.

### F-07. Procedencia de las magnitudes y consistencia entre modos

- [ ] **Prioridad alta.** Unificar el modelo físico y su configuración; comprobar qué datos aparecen en los informes.
- **Evidencia:** los modos comparten la curva de velocidad, pero difieren en dinámica, ruido y tratamiento de temperatura. El servidor guarda presión con densidad fija de 1,204 kg/m³; el adaptador web reconstruye magnitudes con las condiciones por defecto de la ficha. Las opciones `mostrarCorriente` y `mostrarRpm` están desactivadas, pero la tabla común de muestras incluye columnas A y RPM.
- **Siguiente paso:** establecer un cálculo coherente y diferenciar valores medidos, simulados, derivados y supuestos, también al exportar. Conservar la configuración y versión del modelo junto con cada ensayo.
- **Cierre:** el mismo escenario genera resultados coherentes al cambiar de modo y los informes describen correctamente su origen.

### F-08. Significado de «carga aerodinámica» y del caudal

- [ ] **Prioridad media.** Definir qué representa la carga porcentual calculada como `(v / vmax)³ × 100`.
- **Valoración:** la relación cúbica puede servir para una estimación de potencia bajo hipótesis de semejanza; no describe por sí sola una fuerza sobre cualquier objeto. No sustituir el exponente sin decidir primero la magnitud que se desea enseñar.
- **Caudal:** `Q = A × velocidad media` es correcto; con una lectura puntual del Pitot se asume que esta representa la media de la sección. Documentar o comprobar esa hipótesis.
- **Cierre:** dar a cada indicador un nombre, unidades, hipótesis y uso docente claros.

### F-09. Interior del CAD y ampliación del dominio de Aerodinámica

- [ ] **Pendiente; revisión geométrica realizada el 18/10/2026.** Confirmar qué superficies delimitan el aire antes de ampliar la simulación.
- **Evidencia:** la envolvente nominal de la sección mide unos 70 × 70 cm, pero los planos de vidrio del GLB están separados unos 66,745 cm y los marcos son piezas independientes. La transición de salida pasa de sección cuadrada a redondeada con menor área, y presenta un salto de radio de unos 4,011 cm junto a la brida. Son observaciones del CAD, no medidas del equipo real.
- **Trabajo preparado:** extractor reproducible, volumen provisional cerrado, figura y estimaciones de malla. Se conserva la idealización de ensayo de 70 × 70 cm; el resultado está marcado como no apto para cálculo. Alcance y cinco pruebas en [CONDUCTO_TUNEL.md](C:/app/nuevo_tunelviento_app/docs/CONDUCTO_TUNEL.md).
- **Siguiente paso:** confirmar planos interiores o elegir simplificaciones documentadas, definir los puertos de entrada/salida y probar primero el conducto vacío con control de balance de caudal, estabilidad, coste y sensibilidad a la malla.
- **Cierre:** una geometría aceptada y un caso vacío comprobado permiten abordar la integración; no acreditan por sí solos calibración experimental ni simulación del ventilador. La web aún calcula únicamente la sección de ensayo.

## Utilidad docente sin conexión al túnel físico

Propuesta para valorar con el profesorado. Estas funciones todavía no se dan por implementadas. La app ya dispone de inspección 3D, preparación de ensayos, control, registro y revisión docente; pueden servir de base para un laboratorio virtual.

- [ ] **D-01. Práctica guiada de operación.** Preparar un ensayo, elegir consigna, observar el arranque, esperar estabilidad, registrar y justificar la ventana de medida. Evaluar el procedimiento y las decisiones del alumno.
- [ ] **D-02. Práctica de presión, velocidad y caudal.** Pedir una predicción antes de ejecutar varios puntos. Comparar resultados y explicar por qué duplicar la velocidad cuadruplica la presión dinámica y duplica el caudal, manteniendo densidad y sección. La coincidencia con las fórmulas del simulador demuestra comprensión de esas relaciones, no una validación experimental independiente.
- [ ] **D-03. Comparación con ensayos reales guardados.** Incorporar series CSV/Excel o conjuntos preparados por el docente, con unidades y condiciones. Comparar curvas, error y repetibilidad con el simulador. Esto aporta una referencia experimental aunque no haya conexión en directo; la importación actual de archivos de la app no demuestra que se admitan esos formatos.
- [ ] **D-04. Escenarios de diagnóstico.** Añadir, como ejercicios explícitos, un sensor con desplazamiento de cero, ruido o lectura congelada. Pedir al alumno que identifique el problema. Mantenerlos separados del comportamiento normal y distinguir ruido del sensor de turbulencia del flujo.
- [ ] **D-05. Informes reproducibles y evaluación.** Guardar escenario, parámetros, semilla de ruido y versión del modelo; permitir al docente revisar resultados y explicaciones con criterios conocidos. Probar la práctica con alumnos y comprobar si mejora su interpretación de datos y preparación para el laboratorio.

**Orden propuesto:** validar la respuesta básica y aclarar las magnitudes; preparar una práctica completa; incorporar datos reales guardados; después añadir diagnóstico y evaluación. Corriente y temperatura del motor son secundarias si los objetivos docentes son aerodinámica y procedimiento experimental.

**Alcance a comunicar:** el modelo actual aproxima magnitudes globales del túnel. El GLB permite inspección visual, pero no calcula por sí mismo el campo de velocidades, estelas, sustentación ni resistencia de un objeto introducido. Para enseñar esos fenómenos harían falta modelos o datos aerodinámicos adicionales y su validación.

## Referencias y puntos de entrada al código

- [Configuración y calibración compartidas](../shared/tunel.json), que sustituyen al antiguo `calibracion-tunel.json`.
- [Modelo del servidor](C:/app/nuevo_tunelviento_app/backend/app/control_tunel.py).
- El antiguo modelo local `tunelSimulado.js` se retiró; las comparaciones entre dos simuladores de este documento son históricas. La aplicación actual utiliza el modelo del servidor.
- [Ficha y cálculos físicos](C:/app/nuevo_tunelviento_app/src/servicios/tunel/fichaTunel.js).
- [Manual escaneado](C:/Users/choca/OneDrive/Escritorio/UNI/TFG/Manual_Escaneado_Tunel.pdf), páginas 10, 13–16 y 21, revisadas el 22/09/2026.
- [Copia escaneada aportada de nuevo](<C:/Users/choca/OneDrive/Escritorio/UNI/TFG/Manual_Escaneado_Tunel (1).pdf>): 33 páginas sin texto seleccionable, con contenido idéntico al manual anterior, comprobado mediante SHA-256. Revisadas visualmente las páginas 11 y 19–21 y 28 el 22/09/2026. El escaneado se puede leer como imagen; para cifras y tablas se prioriza esa lectura sobre el OCR.
- [Informe preliminar](<C:/Users/choca/OneDrive/Escritorio/UNI/TFG/UAL01_L1_R01_rev0102 (1).pdf>), páginas 16 y 18–19, revisadas el 22/09/2026. Es documentación de diseño, no una certificación del estado actual.
- [DOE: motores y variadores](https://www.energy.gov/sites/default/files/2014/04/f15/amo_motors_sourcebook_web.pdf), referencia de funcionamiento de motores, velocidad síncrona, deslizamiento y carga.
- [DOE: sistemas de ventiladores](https://www.energy.gov/sites/default/files/2014/05/f16/fan_sourcebook.pdf), referencia de relaciones entre velocidad, caudal y potencia bajo las hipótesis correspondientes.
- [NASA: tubo Pitot](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/pitot-static-tube-speedometer/), relación entre presión diferencial, densidad y velocidad.
- [NASA: simulaciones educativas](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bga-simulations/), referencia para prácticas virtuales de aerodinámica; no acredita la eficacia docente de esta app.
- [NASA: ecuación de estado](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/equation-of-state/), relación entre presión absoluta, temperatura absoluta y densidad del aire para el modelo de gas ideal.

## Registro de cambios

- **22/09/2026, ensayos por etapas:** implementada y comprobada la programación de consignas con espera de estabilidad, registro por etapa y apagado automático en el simulador del servidor. Uso y límites en [ENSAYOS_POR_ETAPAS.md](C:/app/nuevo_tunelviento_app/docs/ENSAYOS_POR_ETAPAS.md). Las revisiones físicas de este documento siguen pendientes.

- **22/09/2026:** creado el documento. Registradas la confirmación de las tres velocidades medidas, la observación de arranque en unos 6 segundos y la decisión de mantener provisionalmente 70 × 70 cm. Añadidas revisiones físicas y propuestas docentes; pendientes de implementación y validación.
- **22/09/2026, revisión visual del manual escaneado:** precisada la diferencia entre límites, ajustes de fábrica y configuración real en F-02, F-04 y F-05. Añadida en F-06 la identificación de las temperaturas del variador. Las dudas sobre los valores instalados siguen abiertas.

## Archivos locales y copias

El 04/11/2026 se archivaron **135 archivos auxiliares** en `output/limpieza-20261104/auxiliares.zip`, con rutas originales y SHA-256 en `inventario.json`. Incluye capturas, copias de trabajo, resultados de comprobaciones, logs antiguos y dos diagnósticos históricos. También se retiraron `backend/crear_tablas_dev.py` y `database/schema_mysql.sql`: la creación y actualización de la base de datos se realiza con **Alembic**, que ya utiliza el lanzador. Las bases de datos, las copias de mediciones y las migraciones no se han eliminado.

Se eliminó el módulo sin llamadas `avisosLimite.js` y se integró `optimizarGLB()` en `src/aerodinamica/glb.js`, actualizando su importador y sus pruebas. Sus versiones anteriores están en la misma copia. Se retiró también `public/models/tfg - copia.glb` después de comprobar que era idéntico a `tfg.glb`; el original y el modelo optimizado se conservan. El número de archivos de código propio pasó de 170 a 164.

Se borraron 45 archivos de caché Python del código propio; pueden regenerarse al ejecutarlo. Se conservaron los entornos instalados y la caché de compilación de XLB. La limpieza se comprobó con lint, compilación, 100 pruebas JavaScript y 69 pruebas del backend. Los resultados de las pruebas están en la carpeta de esta limpieza.

Después se eliminó por petición del usuario la carpeta `experimentos`, que contenía una demostración autónoma sin dependencias desde la aplicación. El código propio quedó en 160 archivos. El motor utilizado por la web sigue instalado en `tmp/evaluacion-xlb/.venv`.

`node_modules`, `backend/.venv` y `tmp/evaluacion-xlb/.venv` son dependencias instaladas. Se necesitan para ejecutar esta instalación; sus miles de archivos no forman parte del código desarrollado. El entorno de XLB conserva su ruta actual porque la API lo utiliza. No se debe borrar `tmp` entero.

Las capturas, los registros y los resultados auxiliares se guardan en `tmp`, `logs` y `output`, excluidos de Git. El 28/10/2026 se archivaron las copias antiguas de CSS y del código, las revisiones de PDF, los registros antiguos y algunas capturas en `output/limpieza-archivos-20261028/auxiliares-anteriores.zip`. `inventario.json`, en esa misma carpeta, contiene las rutas originales y las comprobaciones SHA-256. La copia es local: conviene conservarla con las demás copias de seguridad si se cambia de ordenador. Para recuperar un archivo, extraerlo en una carpeta aparte y copiar únicamente la ruta necesaria; no sobrescribir todo el proyecto con versiones antiguas.

El 04/11/2026 se reorganizó la raíz: los scripts de arranque y preparación de MySQL pasaron a `scripts/`, y los documentos de notas a `docs/`. Se retiraron el `.env` con la opción obsoleta `VITE_FUENTE_TUNEL`, la plantilla de producción separada y el acceso de diagnóstico `.cmd`. El diagnóstico se conserva como `npm run diagnostico`. No se alteraron los datos ni las migraciones.
