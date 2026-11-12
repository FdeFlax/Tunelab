# Estilos de la aplicación

La aplicación carga `index.css` desde `src/main.jsx`. Esta carpeta contiene
11 archivos CSS: el índice y diez hojas organizadas por responsabilidad.

| Archivo | Contenido |
| --- | --- |
| `base.css` | Variables, estilos básicos, márgenes, títulos y paneles comunes. |
| `estructura.css` | Estructura general, menú lateral y pantalla de acceso. |
| `formularios.css` | Campos, búsquedas, casillas, botones y sus estados. |
| `listados.css` | Listas y tablas de ensayos, mediciones y etapas. |
| `dashboard.css` | Distribución, indicadores y actividad del panel principal. |
| `control.css` | Conexión, registro de medición, seguridad y diagnóstico. |
| `ensayos.css` | Creación, edición y listado de ensayos. |
| `registro-docente.css` | Distribución y elementos propios de Registro y Docente. |
| `inspeccion.css` | Visor del túnel, etiquetas y puntos de interés. |
| `informes.css` | Informe de medición, gráficas, muestras y comparador. |

Los nombres de archivo no llevan el sufijo `2`. Las clases existentes, como
`cont2panel` o `reg2item`, se conservan para mantener los componentes actuales.

## Al modificar estilos

- Edita la regla existente y conserva sus estados de foco, selección y deshabilitado.
- Usa las variables de `base.css` para colores, tamaños y espaciado compartidos.
- El informe usa las mismas clases `analisis-*` en Control, Registro y Docente.
- Conserva los ajustes de móvil y de movimiento reducido.
- `base.css` se importa después de las pantallas para mantener la prioridad de
  sus reglas comunes. Las variables CSS también funcionan declaradas en ese punto.
  El cursor deshabilitado usa `:where()` para que los componentes mantengan su prioridad.
- Revisa la cascada antes de cambiar el orden de `index.css` o retirar alternativas de `:is()`.
- La compilación comprueba el empaquetado; los cambios visuales requieren revisar
  escritorio, móvil y los estados de cada componente.

Aerodinámica mantiene su hoja local `src/aerodinamica/estilo.css`, que utiliza
las mismas variables de la aplicación.
