# Revisión y limpieza de Aerodinámica — 18/10/2026

## Resultado

La aplicación conserva una sola sección de Aerodinámica: importación GLB, ajuste del objeto, cálculo XLB en el servidor y exploración de uno a tres planos del mismo campo. Los prototipos anteriores ya no forman parte del código publicado. No se ha cambiado el modelo numérico, sus parámetros ni la estructura de datos del cálculo.

La revisión abarca entradas de Vite, archivos públicos, importaciones, estilos, lectura de GLB, recursos del visor, comunicación con la API, gestión de trabajos, voxelización, proceso de cálculo, pruebas, dependencias y documentación. No se desinstalaron programas del equipo ni se modificaron ensayos o mediciones.

## Restos encontrados y tratamiento

| Hallazgo | Cambio |
| --- | --- |
| La antigua página 2D seguía en `public` y Vite la copiaba íntegra a la distribución, aunque no se usara desde la aplicación | Retirados su página, motor, worker, importador SVG, estilos, ejemplo, evaluador y pruebas específicas |
| Había otra entrada HTML de flujo 3D accesible fuera de la navegación principal | Retirados el HTML independiente, su `main.js`, su CSS de página y la segunda entrada de Vite |
| La implementación que sí se usa seguía dentro de `src/pruebas/objeto3d` | Trasladada a `src/aerodinamica`; actualizadas todas las importaciones y pruebas |
| El GLB activo se servía desde la antigua ruta de pruebas | Trasladado a `public/models/aerodinamica/ejemplo.glb`; actualizados carga, descarga, generador y test |
| El evaluador inicial duplicaba parte del cálculo del servidor y tenía sus propios mapas, STL y resultados | Archivados el evaluador y sus resultados; permanece un único proceso de cálculo utilizado por la web |
| Había binarios, GLB de comprobación, capturas y una descarga de referencia Kutta de las pruebas anteriores | Retirados de las carpetas de trabajo y conservados en el archivo recuperable |
| Las licencias y versiones válidas estaban mezcladas con resultados generados | Avisos en [docs/licencias](licencias/README.md); versiones del motor en `backend/requirements-flujo3d.lock.txt` |
| Existían dos listados de versiones; el de `tmp` todavía indicaba Warp 1.18.0 y JAX 0.11.2 | Retirado el listado obsoleto. El listado conservado coincide con las **46 versiones instaladas**, incluidas Warp 1.10.0 y JAX/JAXlib 0.8.2 |
| Quedaban instrucciones para volver con el botón Atrás desde la página independiente, un selector CSS sin uso y nombres referidos a solo dos mapas | Actualizados el texto de acceso y la clase de mapas; eliminados el selector sin uso y la relación de aspecto CSS fija redundante. Cada mapa ya aplica sus dimensiones reales desde JavaScript |
| README mezclaba el uso actual con prototipos y benchmarks iniciales | Reescrito el apartado alrededor de la integración vigente; actualizada la guía técnica sin perder sus límites científicos |

Se retiraron **55 archivos de sus ubicaciones anteriores**: 51 corresponden a prototipos y artefactos archivados; otros cuatro son los tres avisos originales del motor y el listado de versiones, conservados en sus nuevas ubicaciones. El código antiguo retirado suma **1.975 líneas no vacías**, incluyendo pruebas y código de referencia. Los archivos activos trasladados se contabilizan aparte. No se ha utilizado la cantidad de líneas como criterio para borrar código.

## Implementación que queda

El frontend de Aerodinámica tiene **13 archivos**, además de la página React:

- `laboratorio.js` y `contenido.html`: montaje, importación, controles y presentación.
- `glb.js`, `importacion.js` e `importar.worker.js`: validación, lectura de geometría y trabajo fuera del hilo de la interfaz.
- `geometria.js` y `validacion.js`: escala, giro, comprobaciones y propuesta explícita de tamaño compatible.
- `flujo.js`: peticiones, progreso, cancelación y retirada de resultados al cambiar condiciones.
- `campo.js`, `mapas.js` y `planos.js`: lectura del volumen, colores y cortes móviles.
- `visor.js` y `estilo.css`: dibujo 3D y estilos limitados al laboratorio.

En el servidor permanecen `flujo3d_datos.py`, `flujo3d_trabajos.py` y `rutas_flujo3d.py`, junto con `scripts/calcular-flujo3d.py` y `scripts/flujo3d_geometria.py`. Las rutas, el gestor y ambos scripts tienen llamadas activas; no son restos del prototipo retirado.

No se encontraron referencias a OpenFOAM, al motor 2D antiguo ni a las rutas de pruebas en las fuentes activas o en la distribución nueva. Los documentos históricos ajenos a esta integración no se han borrado por mencionar decisiones anteriores.

## Dependencias y recursos que se conservan a propósito

- **Three.js, React Three Fiber y Drei:** Three.js se utiliza en Aerodinámica y las otras dos bibliotecas se utilizan en `TunnelViewer.jsx`, compartido por otras pantallas. Quitarlas rompería la aplicación.
- **Entorno `tmp/evaluacion-xlb/.venv`:** pese al nombre histórico, contiene el motor que ejecuta el servidor. No es basura temporal. Se mantiene para no romper el intérprete ni la configuración existente; la ruta alternativa se configura mediante `FLUJO3D_PYTHON`.
- **Dependencias transitivas de XLB:** el paquete instalado declara, entre otras, JAX, PyVista, Matplotlib y Ruff. No se han desinstalado basándose únicamente en que Tunelab no las importe directamente.
- **Cachés del motor:** se conservan las cachés de compilación y bibliotecas para no provocar una preparación innecesaria en el siguiente cálculo.
- **Pruebas activas:** se mantienen las comprobaciones GLB, geometría, tamaño, campo, colores, orientación física de planos, acceso, cancelación, caché y limpieza del servidor. Solo se retiraron las pruebas de la función 2D retirada.
- **Límites científicos y operativos:** las restricciones de tamaño, resolución y coste, y la indicación de modelo docente, siguen siendo necesarias. La limpieza no convierte el cálculo en una validación experimental del túnel.

La lectura GLB conserva límites y bloqueo de recursos externos. El worker termina al completar, sustituir o agotar el plazo de importación. El visor dibuja a demanda y libera geometrías, materiales, texturas y observador al desmontarse; no dibuja mientras la sección está oculta. La navegación conserva deliberadamente el objeto hasta cerrar sesión o recargar.

El servidor sigue limitando la ejecución a un trabajo simultáneo, con cancelación, timeout y resultados separados por usuario. La geometría temporal se elimina al completar, fallar o cancelar. Un cierre abrupto del sistema puede dejar temporales huérfanos: no se ha añadido una eliminación general de `tmp`, porque allí también está el motor activo.

## Comprobaciones de esta revisión

- **59 pruebas Node correctas**, ejecutadas con `node --experimental-vm-modules --test --test-isolation=none tests/*.test.mjs`. El total anterior incluía 12 pruebas del prototipo 2D retirado.
- **8 pruebas de backend correctas**, ejecutadas con `python -m unittest tests.test_flujo3d -v` desde el entorno de backend. Usan SQLite y un proceso ficticio, sin tocar los ensayos del laboratorio.
- **ESLint correcto.**
- **Compilación de producción correcta.** `dist` contiene una única entrada HTML, los recursos activos y modelos; no contiene `pruebas` ni enlaces al laboratorio retirado.
- **Comprobación real en el navegador:** carga del ejemplo desde su nueva ubicación, revisión GLB y cálculo de 6000 pasos. La API comunicó **18,7 segundos** para el ejemplo de 20 cm y entrada 1× en este equipo. Se mostraron los tres planos y se desplazó el primero a +2 cm. Al visitar Ensayo y volver se conservaron el objeto, el resultado y esa posición. No aparecieron errores en la consola. [Captura de comprobación](../tmp/revision-aerodinamica-2026-10-18.jpg).
- Las 46 versiones fijadas para el motor se contrastaron con los metadatos del entorno instalado, sin diferencias.
- El archivo de recuperación se verificó comparando tamaño y SHA-256 de cada entrada antes de retirar los originales.

La compilación y las pruebas del servidor necesitaron ejecutarse fuera del aislamiento de herramientas: dentro de él aparecieron una denegación al resolver el worker y un bloqueo de la prueba asíncrona. No se cambiaron permisos del proyecto ni servicios para superar esas restricciones.

Sigue apareciendo el aviso previo de Vite sobre el tamaño del módulo compartido de Three.js, unos 716 kB antes de gzip. Es código usado por los visores; no se ha ocultado el aviso ni eliminado la dependencia. Optimizar su entrega sería un trabajo distinto de retirar código obsoleto.

## Recuperación y trazabilidad

Antes de los cambios se creó `output/archivo-aerodinamica/2026-10-18-prototipos.zip`, con **81 archivos**: los prototipos, artefactos y originales de archivos reorganizados o editados. Incluye `MANIFEST.json` con ruta original, tamaño y SHA-256, los avisos de Kutta y del motor, y el script de limpieza utilizado. La copia está excluida de Git y fuera de `public` y `dist`.

SHA-256 del ZIP: `6167B3205C6479CF1922DE8FF91BAB52E05C46E701FFD8F2FE07846E45E5C65A`.

Para recuperar algo, extraer el archivo en una carpeta independiente y elegir las rutas necesarias. No sobrescribir toda la aplicación con esa copia: contiene originales anteriores a esta reorganización. Si se cambia de equipo y se quiere conservar este historial local, copiar también el ZIP; no viajará automáticamente con Git.
