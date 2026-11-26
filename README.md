# Tunelab

Aplicación web para preparar ensayos del túnel de viento de la EPS, registrar mediciones simuladas, consultar resultados y explorar modelos 3D. Incluye un módulo de Aerodinámica que calcula el flujo alrededor de objetos importados.

La interfaz utiliza React y Vite; el servidor, FastAPI; y los datos se guardan en MySQL. El control del túnel físico y la autenticación institucional todavía no están conectados.

## Qué permite hacer

| Pantalla | Función |
| --- | --- |
| Dashboard | Consultar el estado del simulador, sus variables y la última medición. |
| Ensayos | Crear, editar y seleccionar las fichas de los ensayos del usuario. |
| Control | Solicitar el uso del túnel simulado y registrar una medición con una consigna y una duración. |
| Registro | Consultar informes, gráficas y muestras; importar y exportar mediciones. |
| Inspección | Explorar el modelo del túnel y sus puntos de interés. |
| Aerodinámica | Importar un objeto GLB, elegir una consigna y calcular mapas de velocidad del aire. |
| Docente | Consultar ensayos de distintos usuarios y supervisar la ocupación del túnel. |

## Arranque local en Windows

Con las dependencias instaladas y MySQL configurado, haz doble clic en [iniciar-tunelab.cmd](iniciar-tunelab.cmd) o ejecuta desde esta carpeta:

```powershell
npm start
```

Comprueba MySQL, aplica migraciones antes de iniciar una API nueva y arranca la API y la web en <http://127.0.0.1:5173/>. Reutiliza los procesos de esta instalación. Cerrar el navegador no los detiene.

| Comando | Uso |
| --- | --- |
| `npm start` / `npm run dev` | Arranque completo. |
| `npm run diagnostico` | Comprueba el estado sin arrancar servicios ni modificar la base de datos. |
| `npm run dev:web` | Solo Vite; necesita la API por separado. |
| `npm run build` | Genera la web compilada en `dist/`. |

La instalación inicial y la solución de errores están en [Arranque local](docs/ARRANQUE_LOCAL.md). Los registros se guardan en `logs/`.

## Distribución del proyecto

| Carpeta | Contenido |
| --- | --- |
| `src/` | Páginas, componentes, estilos y comunicación con la API. |
| `backend/app/` | API, simulador del túnel y guardado de datos. |
| `backend/alembic/` | Migraciones de la base de datos. |
| `shared/` | Parámetros del túnel compartidos por la web y el servidor. |
| `scripts/` | Arranque, preparación de MySQL, cálculo XLB y herramientas. |
| `public/` | Modelos GLB y recursos públicos. |
| `tests/`, `backend/tests/` | Pruebas de la web y del servidor. |
| `docs/` | Guías, referencias, notas pendientes y [licencias de terceros](docs/licencias/README.md). |

`src/paginas/` contiene una pantalla por archivo: Dashboard, Inspección, Control, Ensayos, Registro, Docente y Aerodinámica. `App.jsx` elige cuál mostrar. Las pequeñas piezas exclusivas de una pantalla permanecen en su archivo; las piezas compartidas están en `src/components/`. Aerodinámica carga su interfaz desde `src/aerodinamica/` al abrirse.

`src/components/` se organiza por función: `interfaz/` (acceso y menú), `control/` (medición y estado del túnel), `mediciones/` (informes y controles de Registro) y `visor/` (modelo 3D, cámara e iluminación). La lectura y preparación de GLB se comparte en `src/servicios/modelos3d.js`.

`src/logicaPantallas/` coordina la carga y selección de ensayos y mediciones, la importación de archivos, la conexión del túnel y los formularios. Sus funciones empiezan por `use` porque son hooks de React. Los estilos comunes están en `src/styles/`; su [guía](src/styles/README.md) indica qué contiene cada hoja.

`src/servicios/` agrupa operaciones compartidas:

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `api/clienteApi.js`, `api/disponibilidadApi.js` | Peticiones, identidad local y comprobación del servidor. |
| `api/registroApi.js` | Consultas y cambios de ensayos y mediciones, incluidos los accesos de Docente. |
| `api/controlApi.js` | Conexión del túnel, inicio y parada de mediciones y eventos del servidor. |
| `mediciones/adaptarRegistros.js` | Convierte los registros de la API al formato utilizado por las pantallas. |
| `mediciones/analisisMedicion.js` | Estadísticas y preparación de gráficas; lectura de etapas en archivos antiguos. |
| `archivos/` | Importación y exportación de mediciones, ZIP y almacenamiento temporal. |
| `tunel/` | Estado compartido del túnel, sincronización con la API, catálogo de ensayos y magnitudes calculadas. |
| `formato.js`, `modelos3d.js` | Formato de números y fechas; carga y preparación de GLB. |

`api/controlApi.js` envía las peticiones; `tunel/tunelApi.js` mantiene el estado que reciben las pantallas y coordina las respuestas y las órdenes. El simulador está en el backend.

En el servidor, `control_tunel.py` simula la respuesta del túnel y `capturas.py` coordina las mediciones y su guardado. `configuracion_tunel.py` lee los parámetros compartidos y calcula las propiedades del aire. Los trabajos de Aerodinámica se gestionan en `flujo3d_trabajos.py` y ejecutan `scripts/calcular-flujo3d.py` en un proceso independiente.

`node_modules/` y `backend/.venv/` contienen dependencias instaladas. `tmp/evaluacion-xlb/.venv/` contiene el motor activo de Aerodinámica: **no borrar `tmp/` entero**. `dist/`, `logs/` y `output/` guardan compilaciones, registros y resultados auxiliares; no son código propio.

## Configuración y acceso

- **Servidor:** `backend/.env`, a partir de `backend/.env.example`, contiene la conexión a MySQL y las opciones del backend. No subirlo con contraseñas al repositorio.
- **Web:** el `.env` de la raíz es opcional. La dirección local de la API ya está definida por defecto. `.env.example` sirve para configurar otra dirección; en producción se puede usar `.env.production`. Las variables `VITE_` son públicas.
- **Perfiles:** Alumno Demo y Profesor Demo son para desarrollo local. El acceso de producción permanece bloqueado hasta integrar la autenticación universitaria. [Detalles de acceso](docs/ACCESO_Y_AUTENTICACION.md).

El servidor actual simula el túnel; la integración con el equipo físico sigue pendiente. El lanzador utiliza Vite para desarrollo y demostración local: todavía no es un despliegue universitario.

## Cómo se registra una medición

1. Crear o seleccionar un ensayo. El backend debe estar disponible para guardarlo en MySQL.
2. En Control, pulsar **Conectar** para solicitar el uso del simulador. El backend comprueba que no esté ocupado por otra persona.
3. Elegir el ensayo asociado e introducir el nombre de la medición, la consigna (1–100 %) y la duración (1–300 segundos).
4. Iniciar la medición y confirmar las comprobaciones previas cuando se soliciten.
5. El servidor enciende el simulador, aplica la consigna y guarda las muestras durante el tiempo indicado, incluyendo la aceleración inicial. Al terminar, calcula el resumen y apaga el simulador. También se puede detener la medición antes y conservar los datos recogidos.

Cada medición nueva utiliza **una sola consigna y duración**. Los archivos antiguos con etapas siguen pudiendo consultarse. La captura se ejecuta en el backend, por lo que puede continuar al cambiar de pantalla o cerrar el navegador mientras el servidor siga funcionando. Al acabar, la ocupación se libera con **Desconectar**.

WebSocket avisa de cambios de ocupación; las pantallas vuelven a consultar la API. Las lecturas del simulador se actualizan mediante peticiones periódicas.

## Resultados y archivos

Los informes muestran gráficas de velocidad, temperatura y consigna con Chart.js, además del resumen y la tabla de muestras. Se puede descargar una medición en JSON o las mediciones de un ensayo agrupadas en ZIP mediante fflate.

Registro permite importar los JSON exportados y revisarlos en el navegador, sin añadirlos automáticamente a MySQL. Antes de mostrarlos se comprueban su formato, versión, tamaño y datos con Zod y las validaciones de la aplicación.

## Cambiar medidas y parámetros del túnel

El archivo [shared/tunel.json](shared/tunel.json) reúne las dimensiones, los parámetros del simulador y las referencias de Aerodinámica. **Control y Aerodinámica utilizan curvas de consigna–velocidad diferentes:**

| Módulo | Ubicación en el JSON | Puntos de referencia: consigna → velocidad |
| --- | --- | --- |
| Control | `calibracion.velocidad.puntos` | 0 % → 0; 50 % → 5,121; 75 % → 8,18; 100 % → 11,119 m/s. El punto de reposo es supuesto. |
| Aerodinámica | `aerodinamica.mediciones` | 0 % → 0; 25 % → 4; 50 % → 9,2; 75 % → 14,5; 100 % → 19,8 m/s, a partir de las lecturas GUST registradas. |

Ambos módulos interpolan linealmente entre sus puntos. En Aerodinámica, `medicionActiva` selecciona la referencia de temperatura, presión absoluta y humedad; cambiar la consigna modifica la velocidad, manteniendo esas condiciones ambientales. Python calcula la densidad y la viscosidad necesarias para XLB.

Después de editar la configuración, reinicia el backend y recarga la web. Las cámaras y etiquetas del visor están en [ajustesTunel.js](src/components/visor/ajustesTunel.js). Cambiar las dimensiones del JSON no modifica el archivo GLB. La [guía de Aerodinámica](docs/FLUJO_3D.md) amplía los parámetros y sus unidades.

## Aerodinámica

El navegador prepara la geometría estática del GLB con glTF Transform y Three.js en un Web Worker. Centra el objeto y ajusta su tamaño a la sección representada; después envía sus triángulos al servidor. El archivo original no se modifica.

El servidor revisa la geometría con Trimesh y ejecuta XLB con NVIDIA Warp. La interfaz consulta el estado del cálculo y muestra el resultado en tres cortes: vertical, horizontal y transversal. Cada corte puede desplazarse y los mapas comparten una escala de **velocidad en m/s**.

La consigna puede ajustarse entre 0 y 100 %. Al cambiarla se descartan los mapas anteriores; con 0 % no se inicia el cálculo. Este ajuste solo afecta a la simulación. Los mapas representan el último estado calculado y todavía requieren validación experimental y de resolución.

El cálculo necesita una GPU NVIDIA compatible y el entorno Python indicado en `backend/.env`. Consulta [Flujo 3D](docs/FLUJO_3D.md) y la [revisión de licencias](docs/REVISION_LICENCIAS_Y_GRAFICAS.md).

Para el visor se reutilizan React Three Fiber y Drei; para las consultas del frontend, TanStack Query. El backend emplea SQLAlchemy para acceder a MySQL, Alembic para las migraciones y Pydantic para validar los datos.

## Comprobaciones

```powershell
npm run lint
node --experimental-vm-modules --test --test-isolation=none tests/*.test.mjs
npm run build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/arranque-local.Tests.ps1
```

Para las pruebas del servidor, desde `backend/`: `.venv/Scripts/python.exe -m unittest discover -s tests -v`. Utilizan bases temporales, no los ensayos guardados.

Las [cuestiones pendientes y copias de trabajo](docs/COSAS_A_REVISAR.md) y las [tareas del modelo 3D](docs/TAREAS_PENDIENTES.md) se mantienen en `docs/`.
