# Estilos de la aplicación

La aplicación carga `index.css` desde `src/main.jsx`. Esta carpeta contiene
11 archivos CSS: el índice y diez hojas organizadas por responsabilidad.

| Archivo | Contenido |
| --- | --- |
| `base.css` | Variables, estilos básicos, márgenes, títulos y paneles comunes. |
| `estructura.css` | Estructura general, menú lateral y pantalla de acceso. |
| `formularios.css` | Campos, búsquedas, casillas, botones y sus estados. |
| `listados.css` | Listas y tablas de ensayos, mediciones y vista docente. |
| `dashboard.css` | Distribución, indicadores y actividad del panel principal. |
| `control.css` | Conexión, registro de medición, seguridad y diagnóstico. |
| `ensayos.css` | Creación, edición y listado de ensayos. |
| `registro-docente.css` | Distribución y elementos propios de Registro y Docente. |
| `inspeccion.css` | Visor del túnel, etiquetas y puntos de interés. |
| `informes.css` | Informe de medición, gráficas y muestras. |

Los prefijos de las clases identifican su pantalla: `dash2` (Dashboard), `cont2`
(Control), `ens2` (Ensayos), `reg2` (Registro), `doc` (Docente) e `insp`
(Inspección). Las clases `analisis-*` pertenecen al informe compartido.

## Al modificar estilos

- Edita la regla existente y conserva sus estados de foco, selección y deshabilitado.
- Escribe una declaración por línea y deja una línea en blanco entre reglas.
- Antes de borrar una clase, comprueba también las clases construidas desde JavaScript;
  por ejemplo, `sidelinkicon--ensayo` se genera a partir de la variante del menú.
- Usa las variables de `base.css` para colores, tamaños y espaciado compartidos.
- El informe usa las mismas clases `analisis-*` en Control, Registro y Docente.
- Conserva los ajustes de móvil y de movimiento reducido.
- `index.css` carga primero la estructura y las pantallas, después `base.css`,
  y finalmente listas, formularios e informes. Conserva ese orden: las reglas
  comunes ajustan estilos definidos antes. Las variables CSS también funcionan
  declaradas en ese punto.
  El cursor deshabilitado usa `:where()` para que los componentes mantengan su prioridad.
- Revisa la cascada antes de cambiar el orden de `index.css` o retirar alternativas de `:is()`.
- La compilación comprueba el empaquetado; los cambios visuales requieren revisar
  escritorio, móvil y los estados de cada componente.

Aerodinámica mantiene su hoja local `src/aerodinamica/estilo.css`, que utiliza
las mismas variables de la aplicación y se carga al abrir el módulo. Sus reglas
están limitadas al contenedor `.aerodinamica-lab`.
