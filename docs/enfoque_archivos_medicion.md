# Nuevo enfoque de Tunelab: mediciones por archivo

Este proyecto ya no usa una base de datos propia para guardar historiales de mediciones.

La idea es separar dos responsabilidades:

| Parte | Responsabilidad |
|---|---|
| Control del tunel | Leer telemetria y enviar comandos al tunel real o al simulador. |
| Conservacion de resultados | Generar archivos de medicion descargables e importables. |

## Flujo principal

```text
1. Ensayo
   El usuario prepara una ficha temporal: nombre, objetivo y descripcion.

2. Control
   La app usa esa ficha para iniciar una medicion.

3. Fin de medicion
   La app genera un resumen y permite descargar un archivo .tunelab.json.

4. Registro
   El usuario puede cargar ese archivo para ver resumen, graficas, eventos y tabla de muestras.
```

## Por que es defendible

Este enfoque reduce complejidad sin perder trazabilidad de la medicion:

- No guarda datos de alumnos en un servidor propio.
- No necesita PostgreSQL ni migraciones para el TFG.
- El archivo exportado es autocontenido.
- El usuario puede guardar el archivo en UACloud, Moodle, USB o carpeta local.
- La app puede volver a interpretar el archivo mas adelante.
- La conexion futura con el tunel real queda separada de la conservacion de resultados.

## Formato del archivo

El archivo generado usa JSON y contiene:

- `formato`: identificador del formato Tunelab.
- `version`: version del formato.
- `ensayo`: nombre, codigo, objetivo, descripcion y fecha.
- `medicion`: nombre, duracion, objetivos y resumen.
- `muestras`: tabla de datos segundo a segundo.
- `eventos`: incidencias o avisos ocurridos durante la medicion.

Ejemplo de nombre:

```text
a-001_barrido-70_2026-06-08.tunelab.json
```

## Tunel real

El simulador sigue existiendo solo como modo de desarrollo y demostracion.

Para conectar el tunel real, la app mantiene la abstraccion `servicioTunel`:

```text
src/servicios/tunel/index.js
```

Actualmente puede elegir entre:

- `tunelSimulado.js`: datos simulados.
- `tunelReal.js`: punto preparado para conectar la fuente real.

La diferencia importante es que conectar el tunel real no obliga a guardar mediciones en base de datos. La captura puede venir del tunel real y aun asi terminar como archivo descargable.

