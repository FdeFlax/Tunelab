# Tunelab

Aplicación docente para preparar ensayos del túnel de viento, utilizar el simulador del servidor, consultar mediciones e inspeccionar modelos 3D. Interfaz con React y Vite; API con FastAPI y datos en MySQL.

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

`src/components/` se organiza por función: `interfaz/` (acceso y menú), `control/` (medición y estado del túnel), `mediciones/` (informes, comparación y controles de Registro) y `visor/` (modelo 3D, cámara e iluminación). La lectura y preparación de GLB se comparte en `src/servicios/modelos3d.js`.

`src/logicaPantallas/` coordina los datos y acciones de las pantallas: carga y selección de ensayos y mediciones, importación de archivos en Registro, conexión del túnel y edición de formularios. Sus funciones empiezan por `use` porque son hooks de React.

`src/servicios/` agrupa operaciones compartidas:

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `api/clienteApi.js`, `api/disponibilidadApi.js` | Peticiones, identidad local y comprobación del servidor. |
| `api/registroApi.js` | Consultas y cambios de ensayos y mediciones, incluidos los accesos de Docente. |
| `api/controlApi.js` | Conexión del túnel, órdenes, programas de etapas y eventos del servidor. |
| `mediciones/adaptarRegistros.js` | Convierte los registros de la API al formato utilizado por las pantallas. |
| `mediciones/analisisMedicion.js` | Estadísticas, etapas y preparación de gráficas. |
| `archivos/` | Importación y exportación de mediciones, ZIP y almacenamiento temporal. |
| `tunel/` | Estado compartido del túnel, sincronización, ficha de parámetros y autoguardado. |
| `formato.js`, `modelos3d.js` | Formato de números y fechas; carga y preparación de GLB. |

`api/controlApi.js` envía las peticiones; `tunel/tunelApi.js` mantiene el estado que reciben las pantallas y coordina las respuestas y las órdenes. El simulador está en el backend.

`node_modules/` y `backend/.venv/` contienen dependencias instaladas. `tmp/evaluacion-xlb/.venv/` contiene el motor activo de Aerodinámica: **no borrar `tmp/` entero**. `dist/`, `logs/` y `output/` guardan compilaciones, registros y resultados auxiliares; no son código propio.

## Configuración y acceso

- **Servidor:** `backend/.env`, a partir de `backend/.env.example`, contiene la conexión a MySQL y las opciones del backend. No subirlo con contraseñas al repositorio.
- **Web:** el `.env` de la raíz es opcional. La dirección local de la API ya está definida por defecto. `.env.example` sirve para configurar otra dirección; en producción se puede usar `.env.production`. Las variables `VITE_` son públicas.
- **Perfiles:** Alumno Demo y Profesor Demo son para desarrollo local. El acceso de producción permanece bloqueado hasta integrar la autenticación universitaria. [Detalles de acceso](docs/ACCESO_Y_AUTENTICACION.md).

El servidor actual simula el túnel; la integración con el equipo físico sigue pendiente. El lanzador utiliza Vite para desarrollo y demostración local: todavía no es un despliegue universitario.

## Cambiar medidas y parámetros del túnel

Editar [shared/tunel.json](shared/tunel.json): contiene dimensiones, referencias de Control, las cinco lecturas de Aerodinámica y ajustes del cálculo. `aerodinamica.medicionActiva` elige la lectura; Python calcula sus propiedades y la web las recibe del servidor. Las cámaras y etiquetas están en [ajustesTunel.js](src/components/visor/ajustesTunel.js). La [guía de configuración](docs/FLUJO_3D.md#configuración-compartida) explica unidades y cómo aplicar los cambios. Cambiar las medidas no reconstruye el GLB ni valida automáticamente la simulación.

## Aerodinámica

Permite importar un GLB y calcular un flujo 3D con XLB/Warp en el servidor. Usa una lectura de velocidad, temperatura, presión y humedad tomada en la sección de ensayo, seleccionable en `aerodinamica.medicionActiva` del JSON. Los resultados se consultan mediante tres mapas de rapidez relativa con posiciones independientes. La simulación utiliza condiciones medidas, pero todavía requiere validación experimental y de resolución.

El cálculo necesita una GPU NVIDIA compatible y el entorno Python indicado en `backend/.env`. Consulta [Flujo 3D](docs/FLUJO_3D.md) y la [revisión de licencias](docs/REVISION_LICENCIAS_Y_GRAFICAS.md).

## Comprobaciones

```powershell
npm run lint
node --experimental-vm-modules --test --test-isolation=none tests/*.test.mjs
npm run build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/arranque-local.Tests.ps1
```

Para las pruebas del servidor, desde `backend/`: `.venv/Scripts/python.exe -m unittest discover -s tests -v`. Utilizan bases temporales, no los ensayos guardados.

Las [cuestiones pendientes y copias de trabajo](docs/COSAS_A_REVISAR.md) y las [tareas del modelo 3D](docs/TAREAS_PENDIENTES.md) se mantienen en `docs/`.
