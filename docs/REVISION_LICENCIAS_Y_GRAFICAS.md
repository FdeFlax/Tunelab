# Revisión de licencias y gráficas de Tunelab

Fecha de revisión: 3 de noviembre de 2026. Inventario actualizado el 4 de noviembre tras retirar Drei y 42 dependencias asociadas; las versiones restantes no han cambiado.

## Resultado

No se ha identificado en las licencias principales revisadas una prohibición de utilizar estas bibliotecas en un TFG o en una aplicación docente. Esto no equivale a certificar que cualquier paquete de entrega o despliegue ya cumple todas sus obligaciones: hay que conservar los avisos correspondientes, comprobar los recursos de terceros y revisar qué se redistribuye realmente.

El uso de bibliotecas debe reconocerse en la memoria. Su licencia permite utilizarlas bajo determinadas condiciones; no acredita la autoría del alumno, la validez científica de una simulación ni el cumplimiento de las normas académicas de la universidad.

## Alcance y evidencias

Se han inventariado todas las entradas de `package-lock.json` y las distribuciones de los dos entornos Python utilizados por el proyecto, sin instalar ni actualizar dependencias:

| Conjunto | Registros | Alcance |
| --- | ---: | --- |
| NPM | 197 | Dependencias directas y transitivas; incluye desarrollo y binarios opcionales de otras plataformas. 166 presentes en este equipo. |
| API Python | 28 | Distribuciones instaladas en `backend/.venv`, incluido pip. |
| Cálculo XLB | 47 | Distribuciones instaladas en `tmp/evaluacion-xlb/.venv`, incluido pip. |

Son registros de paquetes, no archivos de código escritos para Tunelab; algunos se repiten entre entornos o variantes de plataforma. Las versiones y los avisos localizados están en [inventario_licencias.json](inventario_licencias.json). El campo `licencia` conserva los metadatos originales: un valor vacío no demuestra ausencia de licencia. Se contrastaron manualmente los casos indicados más abajo.

El inventario se puede regenerar desde la raíz:

```powershell
.\backend\.venv\Scripts\python.exe scripts/inventario-licencias.py
```

La revisión combina metadatos completos con lectura de los avisos principales y de los casos especiales. No es una auditoría línea por línea de todo el código de terceros ni un análisis completo de los componentes de cada binario. Tampoco examina las instalaciones del sistema operativo o archivos descargados fuera del proyecto. Las rutas de avisos del JSON permiten ampliar la revisión sin ejecutar las bibliotecas.

## Interfaz y herramientas de desarrollo

| Biblioteca directa | Versión resuelta | Licencia comprobada |
| --- | --- | --- |
| React / React DOM | 19.2.4 | MIT |
| Three.js | 0.183.2 | MIT |
| React Three Fiber | 9.5.0 | MIT; ver aviso del repositorio de esa versión |
| Lucide React | 1.22.0 | ISC y aviso MIT de iconos procedentes de Feather |
| Vite | 8.0.0 | MIT; su archivo incluye avisos adicionales |
| Plugin React de Vite | 6.0.1 | MIT |
| ESLint / @eslint/js | 9.39.4 | MIT |
| eslint-plugin-react-hooks | 7.0.1 | MIT |
| eslint-plugin-react-refresh | 0.5.2 | MIT |
| @types/react / @types/react-dom | 19.2.14 / 19.2.3 | MIT |
| globals | 17.4.0 | MIT |

En el lock aparecen además licencias Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Python-2.0, MPL-2.0 y CC-BY-4.0. No se ha encontrado GPL o AGPL en los campos de licencia de los paquetes NPM; esta comprobación no sustituye revisar avisos de componentes incorporados en sus binarios.

Casos concretos:

- **Lightning CSS 1.32.0 y sus variantes nativas: MPL-2.0.** Son herramientas de desarrollo. La MPL opera a nivel de archivos cubiertos, no impone automáticamente su licencia a toda la aplicación. Si se redistribuye el componente, hay que conservar avisos y facilitar el código fuente correspondiente según sus condiciones; también las modificaciones a esos archivos si existen. [FAQ oficial de Mozilla](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).
- **caniuse-lite 1.0.30001779: CC-BY-4.0.** Datos de compatibilidad utilizados durante el desarrollo. Si se redistribuyen, hay que dar crédito, enlazar la licencia e indicar cambios. No se deduce que el CSS generado tenga esa licencia. [Condiciones oficiales](https://creativecommons.org/licenses/by/4.0/).
- **Lucide:** conservar el archivo completo, que incluye ISC y MIT. No basta con describir todos sus iconos como MIT o borrar la atribución a Feather.
- En seis paquetes instalados no se encontró un archivo de aviso independiente en la raíz: `@react-three/fiber`, `@rolldown/binding-win32-x64-msvc`, `esrecurse`, `imurmurhash`, `keyv` y `natural-compare`. Algunos tienen avisos en README o en otros archivos. Antes de empaquetarlos hay que recuperar los avisos de la versión concreta y comprobar cuáles se incluyen en el resultado final. La MIT de Fiber 9.5.0 se contrastó con [su licencia oficial](https://github.com/pmndrs/react-three-fiber/blob/v9.5.0/LICENSE).

## Servidor y cálculo

| Componente | Versión instalada | Licencia principal / observación |
| --- | --- | --- |
| FastAPI | 0.115.6 | MIT; comprobada en el archivo de licencia y clasificadores |
| Uvicorn / Starlette | 0.34.0 / 0.41.3 | BSD-3-Clause |
| SQLAlchemy / Alembic | 2.0.36 / 1.14.0 | MIT |
| PyMySQL | 1.1.1 | MIT |
| python-dotenv | 1.0.1 | BSD-3-Clause |
| pydantic-settings | 2.7.1 | MIT |
| Pydantic | 2.13.4 en API; 2.14.1 en XLB | MIT |
| cryptography | 49.0.0 | Apache-2.0 OR BSD-3-Clause; conservar los avisos incorporados |
| XLB | 0.3.1 | Apache-2.0 |
| NVIDIA Warp | 1.10.0 | Apache-2.0 para Warp; distinguir CUDA y controladores |
| Trimesh | 5.1.1 | MIT |
| JAX / jaxlib | 0.8.2 | Apache-2.0; binarios y componentes adicionales requieren sus avisos |
| NumPy | 2.5.4 | BSD y otros avisos; detalle del runtime GCC más abajo |
| SciPy | 1.18.1 | BSD y avisos de componentes incluidos |
| Matplotlib | 3.11.2 | Licencia propia basada en PSF y avisos históricos/componentes |
| PyVista / VTK | 0.49.1 / 9.7.1 | MIT / BSD; revisar componentes del binario que se distribuya |
| Pillow | 13.0.0 | MIT-CMU y dependencias incorporadas |

El inventario incluye el resto de dependencias de ambos entornos. `annotated-types`, `colorama`, `markdown-it-py` y `mdurl` tienen algunos metadatos vacíos, pero disponen de avisos: MIT, BSD, MIT y MIT respectivamente. `python-dateutil` conserva las condiciones Apache y BSD aplicables a sus distintas contribuciones; el texto genérico «Dual License» no permite eliminar uno de los avisos sin revisar su alcance.

### Casos que no conviene simplificar como «todo es MIT»

1. **Certifi es MPL-2.0.** Además, `ml_dtypes`, aunque tiene licencia principal Apache-2.0, incorpora `LICENSE.eigen` bajo MPL-2.0. Deben conservarse sus avisos y atender las obligaciones de distribución de los archivos cubiertos. La misma distinción entre licencia principal y componentes vale para otros wheels.
2. **El wheel instalado de NumPy incluye runtime de GCC** con `GPL-3.0-or-later WITH GCC-exception-3.1`, indicado en su `LICENSE.txt`. La excepción permite determinados usos del runtime con programas de otras licencias; no significa que todo NumPy o la web se vuelvan GPL. Hay que conservar la excepción junto con el aviso y comprobar sus condiciones al redistribuir esos binarios. [Texto oficial de la excepción](https://www.gnu.org/licenses/gcc-exception-3.1.html).
3. **XLB y Warp son de código abierto; CUDA no debe confundirse con ellos.** El código activo utiliza Warp/CUDA. El toolkit, las bibliotecas redistribuibles y el controlador tienen sus propios términos; no se ha determinado aquí qué versión de cada componente del sistema se empaquetaría. Para una entrega, es preferible declarar los requisitos de instalación y revisar por separado cualquier binario NVIDIA incluido. [Acuerdo oficial de CUDA](https://docs.nvidia.com/cuda/eula/index.html).
4. **MySQL es un servicio externo a los paquetes Python.** El cliente usado aquí es PyMySQL MIT. Oracle ofrece MySQL bajo un modelo dual; distribuir MySQL dentro de un instalador requiere revisar sus condiciones específicas. No se concluye que haya que comprar una licencia para este TFG ni que usar una base de datos imponga automáticamente GPL a la web. [Información de Oracle sobre distribución](https://www.mysql.com/about/legal/licensing/oem/).
5. **OpenFOAM no forma parte del motor activo revisado.** Su utilización histórica no permite atribuir su licencia a XLB. Si se entrega una copia del prototipo antiguo o sus binarios, habrá que revisarla aparte.

## Obligaciones y pendientes para una entrega

- **MIT, ISC y BSD:** conservar los textos, copyright y condiciones correspondientes en las copias redistribuidas. No basta con citar una biblioteca en la memoria y retirar su licencia del software distribuido. [MIT oficial](https://opensource.org/license/mit).
- **Apache-2.0:** incluir la licencia, conservar avisos relevantes y `NOTICE` cuando exista, e identificar modificaciones a archivos de terceros si se realizan. [Sección 4 de Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
- [docs/licencias](licencias/README.md) conserva cuatro avisos, pero **no es un dossier completo de toda la aplicación**. El aviso de XLB es una cabecera breve; hay que acompañarlo del texto completo de Apache-2.0 en una distribución. Se conserva una copia en [Apache-2.0.txt](licencias/Apache-2.0.txt) procedente de la distribución instalada de JAX.
- El JSON generado es un inventario, no sustituye los textos legales. Antes de publicar una build se debe generar un archivo de avisos con los componentes realmente incluidos en el JavaScript y los binarios que se entreguen. Los seis paquetes indicados requieren verificar dónde obtener sus avisos completos. No se ha afirmado que falten todos en sus distribuciones: la búsqueda automática de NPM se limita a la raíz de cada paquete.
- **GLB:** la licencia de Three.js o XLB no concede derechos sobre modelos descargados. El ejemplo cuenta con un generador propio en `scripts/crear-ejemplo-glb.mjs`; no se ha acreditado en esta revisión la titularidad de los modelos `tfg.glb`, su copia y `tuneloptimizado.glb`, ni de los archivos que importe cada usuario. Conservar autor, origen y licencia de cualquier recurso ajeno que vaya a entregarse.
- No se ha encontrado una licencia general del código propio en la raíz. `private: true` en `package.json` evita publicar accidentalmente el paquete en NPM; no es una licencia. Elegir las condiciones del código propio con el tutor o la universidad antes de publicar, sin relicenciar componentes de terceros.
- No se ha comprobado la normativa de autoría, uso de IA o depósito del TFG de la titulación. Es una revisión distinta de las licencias de software.

## Cómo están hechas las gráficas y cómo reducir su código

Actualmente **no se utiliza una biblioteca de gráficas**. React renderiza SVG en `src/components/mediciones/InformeMedicion.jsx`. `src/servicios/mediciones/analisisMedicion.js` reúne las estadísticas de muestras y etapas, las escalas, las posiciones, los segmentos y la consulta del punto de la gráfica.

El componente se comparte entre el informe, el comparador y la vista en directo. No se debe sustituir solo una pantalla dejando tres implementaciones distintas. Las bandas verdes representan intervalos clasificados como estables; no son una predicción ni se calculan a partir del aspecto de la curva. En este cambio se retira la rejilla horizontal del dibujo compartido. Se conservan ejes, curvas, bandas estables y marcas de cambio de consigna.

**Recomendación: Chart.js**, si se decide migrar el renderizado. Su [licencia MIT oficial](https://github.com/chartjs/Chart.js/blob/master/LICENSE.md) permite su utilización bajo las condiciones descritas. No exige una licencia comercial por presentar un TFG. Ofrece [tooltips](https://www.chartjs.org/docs/latest/configuration/tooltip.html), escalas y adaptación al contenedor; la rejilla se controla con [grid.display](https://www.chartjs.org/docs/latest/axes/styling.html). No hace falta añadir un wrapper React para usarla, aunque existe esa posibilidad.

La migración reduciría la lógica propia de dibujo, pero no elimina las estadísticas, la lectura de muestras ni las reglas del túnel. Las bandas de estabilidad y marcas de consigna necesitan configuración adicional o un pequeño plugin. Deben mantenerse los huecos de datos, los ceros válidos, la consulta de muestras originales, el comportamiento de registros largos y el comparador. No se cuantifica un ahorro de líneas sin implementar y comparar ambas versiones.

Chart.js dibuja en canvas: la accesibilidad no se obtiene automáticamente. Hay que conservar la tabla de muestras, el nombre accesible y un mecanismo de consulta por teclado equivalente al actual. [Documentación de accesibilidad](https://www.chartjs.org/docs/latest/general/accessibility.html).

**Estado:** Chart.js es una recomendación, no una dependencia instalada ni una migración realizada en esta revisión. Se han corregido la presentación solicitada y el campo de consigna sin cambiar el cálculo de las mediciones.
