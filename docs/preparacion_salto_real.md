# Preparacion del salto al tunel real

Este documento explica como pasar de la simulacion actual a una conexion real
sin rehacer la interfaz.

## Idea principal

La interfaz no debe saber si los datos vienen de:

- un simulador local
- MATLAB
- una DAQ
- un variador
- un programa puente instalado en el PC del laboratorio

La interfaz solo consume un contrato comun llamado `servicioTunel`.

Archivo clave:

```text
C:\app\nuevo_tunelviento_app\src\servicios\tunel\index.js
```

Ahora ese archivo elige entre:

- `tunelSimulado.js`
- `tunelReal.js`

## Que es `tunelSimulado.js`

Es una fuente falsa para poder disenar, probar y defender la app aunque el tunel
real no este conectado.

Sirve para:

- ver telemetria en Dashboard y Control
- probar botones de encendido, apagado y medicion
- generar muestras de prueba
- descargar archivos `.tunelab.json`
- verificar que Registro sabe leer esos archivos

No debe venderse como conexion real.

## Que es `tunelReal.js`

Es el punto preparado para conectar la app con el tunel fisico.

Actualmente no controla hardware. Devuelve estado de desconexion y deja mensajes
de accion pendiente. Esto es intencionado: evita simular falsamente que ya existe
una conexion real.

Cuando se conozca el mecanismo real de comunicacion, se debe completar este
archivo manteniendo los mismos metodos publicos:

- `obtenerEstado`
- `suscribirse`
- `encenderTunel`
- `apagarTunel`
- `actualizarPotencia`
- `actualizarObjetivos`
- `iniciarMedicion`
- `detenerMedicion`
- `crearEnsayo`

## Contrato minimo del estado

El tunel real deberia entregar, como minimo, estos datos:

```json
{
  "estadoTunel": "READY",
  "conexionDaq": "online",
  "conexionVariador": "online",
  "estadoVariador": "Disponible",
  "permiteControl": true,
  "bloqueoSeguridad": false,
  "medicionActiva": false,
  "potenciaPct": 10,
  "velocidadAireMs": 0,
  "temperaturaC": 21.2,
  "frecuenciaHz": 0,
  "corrienteA": 0,
  "potenciaMotorKw": 0,
  "rpm": 0,
  "tiempoMedicionSeg": 0,
  "tiempoFuncionamientoSeg": 0,
  "alarmas": []
}
```

## Formas posibles de conexion real

### Opcion 1: programa puente local

Un pequeno programa instalado en el PC del tunel lee MATLAB/DAQ/variador y entrega
datos a la app.

Ventajas:

- no obliga a meter hardware dentro de React
- es facil de aislar
- permite mantener la app como interfaz visual

### Opcion 2: API local en el PC del tunel

El PC del laboratorio ejecuta una API local. La app le pide estado y le envia
comandos.

Ventajas:

- contrato claro
- facil de probar con datos falsos
- escalable si mas adelante se centraliza

### Opcion 3: integracion directa con software existente

Solo recomendable si el software del tunel ya ofrece una forma clara y segura de
leer datos y mandar comandos.

## Relacion con los archivos de medicion

La conexion real y el guardado de resultados son cosas separadas.

Aunque el dato venga del tunel fisico, al terminar la medicion la app puede seguir
generando un archivo `.tunelab.json`.

Eso permite:

- reducir backend
- evitar una base de datos propia
- facilitar que el alumno guarde el resultado donde indique la universidad
- volver a abrir la medicion desde Registro

## Que falta para conectar de verdad

1. Confirmar como se puede leer la velocidad real.
2. Confirmar como se manda la potencia al variador.
3. Confirmar si MATLAB debe seguir siendo el intermediario.
4. Definir un protocolo de comunicacion seguro.
5. Completar `tunelReal.js`.
6. Probar primero solo lectura.
7. Probar despues comandos con supervision del laboratorio.

## Frase defendible para el TFG

La aplicacion se ha disenado con una capa de abstraccion del tunel. Durante el
desarrollo se usa un simulador, pero la interfaz no depende de el. La futura
conexion real se concentraria en el adaptador `tunelReal.js`, manteniendo el mismo
contrato de datos y acciones que ya consume el resto de la aplicacion.
