# Especificacion funcional de Control, Ensayos y Mediciones

Base elaborada a partir de:

- [Manual_Escaneado_Tunel.pdf](C:/Users/choca/OneDrive/Escritorio/UNI/TFG/Manual_Escaneado_Tunel.pdf)
- [manual_tunel_word.txt](C:/app/tunelviento_app/manual_tunel_word.txt)

Esta especificacion esta pensada como referencia de trabajo para:

- interfaz de `Control`
- interfaz de `Ensayos`
- interfaz de `Registro`
- exportacion/importacion de archivos de medicion
- futura integracion con MATLAB / DAQ / tunel real

## 1. Lo que el manual respalda de forma clara

El manual deja bastante claro que el software normal de operacion del tunel ofrece estas funciones principales:

- definir `porcentaje de potencia`
- `encender tunel`
- `apagar tunel`
- ver `conexion DAQ`
- `iniciar medicion velocidad`
- `detener medicion velocidad`
- leer `velocidad (m/s)` en tiempo real
- `guardar velocidad` en archivo `.xlsx`

Tambien deja claro que:

- la velocidad se mide con `tubo de Pitot + transductor de presion + DAQ`
- la `turbomaquina` se regula mediante `variador de frecuencia`
- existe `parada de emergencia`
- la velocidad maxima de ensayo esta alrededor de `20 - 25 m/s`
- el valor inicial de potencia en el software de control real es `10%`

## 2. Filosofia recomendada para la app

La app deberia separar tres niveles:

- `Control`
  - operar el tunel en tiempo real
- `Ensayos`
  - preparar la sesion y sus objetivos
- `Registro`
  - consultar archivos de medicion importados por el usuario

Regla importante:

- `Ensayo` = sesion completa
- `Medicion` = captura concreta dentro de un ensayo

Por tanto:

- un `ensayo` puede tener varias `mediciones`
- una `medicion` guarda trazas, resumen e incidencias propias

## 3. Variables de Control

### 3.1 Variables editables por el usuario normal

Estas si tienen respaldo claro en el manual:

- `potencia_pct`
  - tipo: numero
  - unidad: `%`
  - rango: `0 - 100`
  - valor inicial recomendado: `10`
  - significado: porcentaje de potencia aplicado a la turbomaquina

- `orden_encender`
  - tipo: accion
  - significado: arranca el tunel con la potencia indicada

- `orden_apagar`
  - tipo: accion
  - significado: parada controlada del tunel

- `orden_iniciar_medicion`
  - tipo: accion
  - significado: inicia la lectura en tiempo real de velocidad

- `orden_detener_medicion`
  - tipo: accion
  - significado: detiene la actualizacion de velocidad

- `orden_guardar_medicion`
  - tipo: accion
  - significado: guarda los datos recogidos
  - en esta version se exporta como archivo `.tunelab.json` descargable e importable

### 3.2 Variables visibles pero no editables

Estas tienen sentido como lectura de supervision, no como entrada editable normal:

- `estado_tunel`
  - ejemplos: `READY`, `RUNNING`, `ERROR`, `EMERGENCIA`

- `conexion_daq`
  - ejemplos: `online`, `offline`, `error`

- `velocidad_aire_ms`
  - tipo: numero
  - unidad: `m/s`
  - rango fisico recomendado para la UI: `0 - 25`

- `medicion_activa`
  - tipo: booleano

- `tiempo_medicion_seg`
  - tipo: entero
  - unidad: `s`

- `ultima_actualizacion`
  - tipo: fecha/hora

- `estado_variador`
  - tipo: texto

- `parada_emergencia_activa`
  - tipo: booleano

### 3.3 Variables tecnicas de lectura

Estas no aparecen como controles de la interfaz normal del manual, pero pueden tener mucho valor como telemetria tecnica:

- `frecuencia_hz`
- `corriente_a`
- `potencia_motor_kw`
- `rpm`
- `temperatura_equipo_c`
- `errores_modbus`
- `errores_canopen`

Recomendacion:

- dejarlas en `Dashboard tecnico` o `Diagnostico`
- no presentarlas como control editable normal

### 3.4 Variables que no conviene tratar como control principal

Estas no estan respaldadas como control habitual del software real:

- `consigna_velocidad_ms`
  - no aparece en la interfaz principal del manual
  - puede existir en el futuro como control avanzado o automatico, pero no deberia ser base del MVP

- `objetivo_temperatura_c`
  - el manual no la presenta como variable de ensayo editable
  - si la dejas, que sea como referencia academica, no como control real del tunel

## 4. Rango recomendado de variables

### 4.1 Con respaldo claro o muy razonable

- `potencia_pct`
  - minimo: `0`
  - maximo: `100`
  - inicial recomendado: `10`

- `velocidad_aire_ms`
  - minimo visual: `0`
  - maximo recomendado en UI: `25`
  - referencia del manual: `20 - 25 m/s`

- `tiempo_medicion_seg`
  - minimo: `0`
  - maximo: sin limite estricto en software

### 4.2 Rangos de referencia, no de control real

- `objetivo_velocidad_ms`
  - minimo: `0`
  - maximo: `25`
  - uso recomendado: objetivo de ensayo, no consigna real del tunel

- `objetivo_potencia_pct`
  - minimo: `0`
  - maximo: `100`
  - uso recomendado: valor objetivo o de comparacion del ensayo

## 5. Ensayo: definicion recomendada

El manual recomienda mantener un registro de uso con:

- finalidad del ensayo
- fecha
- hora
- incidencias
- conformidad del uso

Por eso el modelo de `Ensayo` deberia guardar como minimo:

- `id`
  - uuid

- `codigo`
  - texto corto, por ejemplo `A-015`

- `nombre`
  - nombre dado por el usuario

- `objetivo`
  - finalidad principal del ensayo

- `descripcion`
  - observaciones iniciales

- `estado`
  - `preparado`
  - `activo`
  - `con_mediciones`
  - `finalizado`
  - `cancelado`

- `creado_en`
- `actualizado_en`

- `usuario_creador`
  - opcional ahora, pero muy recomendable a futuro

- `conformidad`
  - opcional
  - puede ser `pendiente`, `validado`, `rechazado`

- `mediciones`
  - lista de mediciones asociadas

- `eventos`
  - incidencias generales del ensayo

## 6. Medicion: definicion recomendada

Una `medicion` debe representar una captura concreta dentro de un ensayo.

Campos minimos:

- `id`
- `ensayo_id`
- `nombre`
  - ejemplo: `Medicion 01`

- `estado`
  - `preparada`
  - `en_curso`
  - `completada`
  - `interrumpida`
  - `descartada`

- `iniciada_en`
- `finalizada_en`
- `duracion_seg`
- `total_muestras`

- `potencia_consignada_pct`
  - potencia usada durante la medicion

- `objetivo_velocidad_ms`
  - objetivo de ensayo asociado

- `objetivo_potencia_pct`
  - objetivo de ensayo asociado

- `velocidad_media_ms`
- `velocidad_maxima_ms`
- `velocidad_minima_ms`
- `velocidad_estabilidad_ms`
- `porcentaje_velocidad_en_rango`

- `temperatura_media_c`
- `temperatura_maxima_c`
- `temperatura_minima_c`

- `potencia_media_pct`
- `potencia_maxima_pct`
- `potencia_minima_pct`

- `creado_en`
- `actualizado_en`

## 7. Muestras de telemetria

Cada medicion deberia guardar muestras temporales.

Campos recomendados:

- `id`
- `medicion_id`
- `segundo`
- `marca_tiempo`
- `velocidad_ms`
- `temperatura_c`
- `potencia_pct`
- `frecuencia_hz`
- `corriente_a`
- `potencia_motor_kw`
- `rpm`

Estas muestras son las que luego alimentan:

- graficas
- resumen estadistico
- exportaciones

## 8. Eventos e incidencias

El manual insiste en registrar incidencias y estados anormales, y ademas cita errores de comunicacion y alarmas del variador.

Campos recomendados:

- `id`
- `ensayo_id`
- `medicion_id`
- `nivel`
  - `info`
  - `advertencia`
  - `critica`

- `etiqueta`
  - ejemplo: `DAQ`, `Variador`, `Medicion`, `Seguridad`

- `mensaje`
- `ocurrido_en`

Eventos que tienen sentido desde el manual:

- inicio de ensayo
- inicio de medicion
- fin de medicion
- guardado de medicion
- DAQ desconectado
- perdida de comunicacion Modbus
- perdida de comunicacion CANopen
- alarma del variador
- parada de emergencia activada

## 9. Reglas de negocio recomendadas

### 9.1 Ensayos

- siempre puede haber muchos ensayos registrados
- solo uno deberia estar `activo`
- al crear un ensayo nuevo:
  - se crea con estado `preparado`
  - opcionalmente puede activarse

### 9.2 Mediciones

- una medicion solo puede iniciarse si hay un `ensayo activo`
- no deberia iniciarse medicion si:
  - el tunel esta apagado
  - el DAQ esta desconectado
  - hay parada de emergencia

- al detener la medicion:
  - se calculan resumenes
  - se guardan muestras
  - se guardan eventos
  - el estado pasa a `completada`

- si la app se cierra durante una captura:
  - el estado recomendado es `interrumpida`

### 9.3 Guardado

- el guardado principal en esta version debe ser un archivo `.tunelab.json`
- la exportacion a `xlsx` puede quedar como mejora futura si se necesita compatibilidad con hojas de calculo

## 10. Propuesta concreta para la pagina de Control

### 10.1 Bloque Control principal

- `potencia_pct` editable
- `encender tunel`
- `apagar tunel`
- `estado_tunel`
- `estado_variador`

### 10.2 Bloque Medicion

- `iniciar medicion velocidad`
- `detener medicion velocidad`
- `velocidad_aire_ms`
- `tiempo_medicion_seg`
- `conexion_daq`
- `medicion_activa`

### 10.3 Bloque Objetivos de ensayo

- `objetivo_velocidad_ms`
- `objetivo_potencia_pct`

Nota:

- esto si tiene sentido como referencia experimental
- no como control directo del hardware si MATLAB no lo soporta

### 10.4 Bloque Diagnostico tecnico

- `frecuencia_hz`
- `corriente_a`
- `potencia_motor_kw`
- `rpm`
- `temperatura_equipo_c`
- `ultima_actualizacion`

### 10.5 Bloque Alarmas y seguridad

- `avisos activos`
- `parada_emergencia_activa`
- `conexion_daq`
- `eventos recientes`

## 11. Propuesta concreta para Ensayos

La pagina `Ensayos` deberia centrarse en:

- crear un ensayo
- editar nombre / objetivo / descripcion
- activar ensayo
- ver si un ensayo esta listo para ir a control

No deberia ser la pagina principal para ver graficas historicas.

## 12. Propuesta concreta para Registro

La pagina `Registro` deberia centrarse en:

- navegar entre ensayos
- ver sus mediciones
- renombrar sus mediciones
- borrar sus mediciones
- consultar detalle de cada medicion
- exportar resultados en el futuro

## 13. Variables que yo mantendria ya en tu proyecto

### Control

- `potenciaPct`
- `estadoTunel`
- `conexionDaq`
- `medicionActiva`
- `tiempoMedicionSeg`
- `velocidadAireMs`
- `objetivoVelocidadMs`
- `objetivoPotenciaPct`
- `frecuenciaHz`
- `corrienteA`
- `potenciaMotorKw`
- `rpm`
- `estadoVariador`
- `ultimaOrden`
- `horaUltimaOrden`
- `bloqueoSeguridad`

### Ensayos

- `ensayoActivoId`
- `ensayos[]`
- `codigo`
- `nombre`
- `objetivo`
- `descripcion`
- `estado`
- `creado_en`

### Mediciones

- `mediciones[]`
- `duracionSeg`
- `totalMuestras`
- `potenciaConsignadaPct`
- `objetivoVelocidadMs`
- `objetivoPotenciaPct`
- `velocidad.media`
- `velocidad.maxima`
- `velocidad.minima`
- `velocidad.estabilidad`
- `velocidad.porcentajeEnRango`
- `temperatura.media`
- `temperatura.maxima`
- `temperatura.minima`
- `potencia.media`
- `potencia.maxima`
- `potencia.minima`
- `trazas`
- `eventos`

## 14. Variables que yo revisaria o simplificaria

- `modoControl`
  - mantenerlo solo si va a tener una funcion real
  - si no, mejor quitarlo o degradarlo a texto informativo

- `objetivoTemperaturaC`
  - no esta respaldado como variable de control del tunel
  - mejor quitarlo del modelo principal o dejarlo fuera del flujo normal

- `consignaVelocidadMs`
  - no deberia ser control principal mientras no exista control real por velocidad

## 15. Recomendacion final

Para que la app quede coherente con el manual:

- `Control` debe girar sobre `potencia`, `arranque/parada`, `medicion de velocidad`, `DAQ`, `alarmas`
- `Ensayos` debe girar sobre `sesiones`
- `Registro` debe girar sobre `mediciones historicas`
- `Velocidad objetivo` y `Potencia objetivo` pueden quedarse como referencia experimental
- `Temperatura objetivo` no deberia estar en primera linea
- `Consigna de velocidad` no deberia mandar el sistema mientras el manual real no la soporte
