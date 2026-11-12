# Revisión de CSS

Fecha: 11 de septiembre de 2026. Análisis del código actual después de las dos limpiezas de JavaScript. La revisión inicial se completó con la limpieza y validación descritas a continuación.

**Limpieza aplicada:** se corrigieron los dos problemas de adaptación móvil y las tres variables de color sin definición. Inspección pasa a una columna bajo 960 px y reduce sus márgenes bajo 680 px; Docente conserva sus encabezados de tabla adaptables bajo 720 px. Se retiraron 113 reglas que solo apuntaban a componentes ya eliminados, 29 declaraciones de variables sin consumidores y separaciones vacías repetidas.

Los CSS activos pasan de **8.037 a 6.908 líneas**, una reducción neta de **1.129 líneas**. Hay 991 reglas y ya no quedan reglas completas que el analizador pueda asociar exclusivamente con clases ausentes. Permanecen 77 grupos de selectores repetidos, que requieren una consolidación manual posterior porque cada grupo puede aportar propiedades distintas.

La compilación de producción pasa. Se verificaron Dashboard, Ensayo, Control y su confirmación, Registro e informes con 25 muestras, Docente e Inspección, en los temas claro y oscuro. Una comparación automática cubrió esos estados a 360, 390, 768 y 1.440 px: los cambios calculados se concentran en las correcciones previstas de Inspección, las fichas móviles de Docente y el color secundario del informe. También se comprobó visualmente a 390 px que Inspección apila sus dos paneles y que las celdas de Docente ocupan el ancho disponible.

El aviso de compilación sobre el visor 3D supera 500 kB y no guarda relación con estos estilos.

## Resultado

Los 12 archivos CSS importados por `src/main.jsx` suman **8.037 líneas físicas**, incluidos comentarios y espacios. Hay **1.116 reglas de selectores**, más cuatro pasos de animación que el recuento anterior incluía como reglas (1.120 en total). Todos los archivos se cargan; las copias de `_rescate_css_20260709-081207` no forman parte de esos estilos activos.

La principal dificultad es la acumulación de ajustes sobre las mismas clases. Hay además restos de componentes retirados, variables sin consumidores y problemas concretos en reglas de color y adaptación a móvil.

| Archivo | Líneas | Bloques completos candidatos sin uso | Líneas de esos bloques |
|---|---:|---:|---:|
| global.css | 44 | 0 | 0 |
| layout.css | 490 | 0 | 0 |
| pages.css | 265 | 0 | 0 |
| dashboard2.css | 342 | 7 | 31 |
| control2.css | 1.022 | 27 | 149 |
| ensayos2.css | 414 | 0 | 0 |
| registro2.css | 433 | 7 | 32 |
| docente.css | 717 | 5 | 31 |
| inspeccion.css | 713 | 1 | 8 |
| lab-theme.css | 503 | 24 | 107 |
| lab-light-theme.css | 1.944 | 26 | 123 |
| componentes.css | 1.150 | 13 | 64 |
| **Total** | **8.037** | **110** | **545** |

Son candidatos estáticos, no una eliminación aplicada ni una estimación de mejora de velocidad. Los bloques incluyen llaves y selectores; las 545 líneas no incluyen los separadores externos. El análisis es conservador y excluye de la clasificación automática los selectores con funciones como `:is()` y `:not()`.

## 1. Inspección conserva dos columnas en móvil

En [inspeccion.css:306](C:/app/nuevo_tunelviento_app/src/styles/inspeccion.css:306), dentro del punto de corte de 680 px, `.inspescenainferior` conserva `grid-template-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr)`, 18 px de separación y 56 px de relleno horizontal. La segunda columna, la separación y el relleno ya requieren 394 px antes de dar espacio a la primera columna. Esto hace que la cuadrícula no pueda caber en un contenedor de 360–390 px.

La misma declaración completa se repite en la regla base de la línea 143 y en los puntos de corte de 1240, 960 y 680 px (líneas 246, 271 y 306). React sigue mostrando tanto la ficha como la lista de puntos dentro de ese contenedor en [PaginaInspeccion.jsx:445](C:/app/nuevo_tunelviento_app/src/pages/PaginaInspeccion.jsx:445).

Corrección propuesta: una columna en anchos pequeños y conservar dentro de cada punto de corte únicamente los cambios necesarios. Validar la distribución y el desbordamiento a 360, 390 y 768 px. El recuento de 92 grupos repetidos indicado más abajo no incluye estas copias entre distintos contextos de media query.

## 2. Docente anula parte de su adaptación a móvil

[docente.css:359](C:/app/nuevo_tunelviento_app/src/styles/docente.css:359) establece `width: 100%` para las celdas al bajar de 720 px, pero [docente.css:404](C:/app/nuevo_tunelviento_app/src/styles/docente.css:404) vuelve a fijar `width: 190px` en los encabezados, con igual especificidad y posteriormente. Por tanto, los encabezados quedan a 190 px también en móvil. Otro ajuste posterior, `.page--docente .docdetalletabla th, td` en la línea 662, sustituye el relleno compacto definido en el bloque móvil.

Corrección propuesta: colocar las reglas base antes de las adaptaciones y comprobar la ficha de autor y ensayo en pantalla estrecha. No basta con juntar selectores sin respetar su prioridad.

## 3. Tres variables de color no existen

Se encontraron siete declaraciones que usan variables sin definición ni valor alternativo:

- `--muted`, en [registro2.css:308](C:/app/nuevo_tunelviento_app/src/styles/registro2.css:308), descripción de la cabecera del informe.
- `--texto-principal`, en [registro2.css:427](C:/app/nuevo_tunelviento_app/src/styles/registro2.css:427), celdas del resumen.
- `--claro-texto`, en [lab-light-theme.css:362](C:/app/nuevo_tunelviento_app/src/styles/lab-light-theme.css:362) y líneas 1632, 1642, 1666 y 1674: confirmación de Control, uso del túnel en Docente y conexión en Control.

Si una de estas declaraciones gana la cascada, no proporciona el color pretendido: al fallar la sustitución, `color` hereda. Algunas pantallas tienen otras reglas que ganan y ocultan el problema. Las variables existentes `--text-soft` y `--text-main` permiten expresar respectivamente texto secundario y principal; hay que comprobar el resultado por tema al sustituirlas.

También aparecen `--item-borde-activo` y `--item-fondo-activo` sin definición, pero sus usos en `pages.css` incluyen alternativas válidas. No se clasifican como el mismo fallo.

## 4. Restos claros de componentes antiguos

Se han contrastado cadenas y plantillas del JS/JSX, los mapas de estilos del informe y la construcción dinámica de clases. Ejemplos revisados manualmente sin referencias actuales:

- Indicadores antiguos: `.cont2indicador` y `.cont2indicadorvalor`, desde [control2.css:66](C:/app/nuevo_tunelviento_app/src/styles/control2.css:66), con ajustes adicionales en los temas.
- Lecturas antiguas: `.cont2lecturas`, `.cont2lecturasmaniobra` y `.cont2lectura`, desde [control2.css:224](C:/app/nuevo_tunelviento_app/src/styles/control2.css:224). La pantalla vigente usa `.cont2tabla-lecturas-maniobra`.
- Tabla de rangos retirada: `.cont2rangostabla*` y `.cont2rangosnota`, desde [control2.css:338](C:/app/nuevo_tunelviento_app/src/styles/control2.css:338), con variantes claras desde `lab-light-theme.css:1905`.
- Tarjetas antiguas de resumen: `.reg2resumentarjeta` y `.reg2resumenvalor`, desde [registro2.css:46](C:/app/nuevo_tunelviento_app/src/styles/registro2.css:46).

Además de los **110 bloques completos**, hay **102 bloques mixtos** con alguna rama candidata y otras que deben conservarse. Por ejemplo, la regla de `control2.css:252` mezcla `.cont2lectura small` con clases de la gráfica todavía usadas. No se puede borrar el bloque entero.

Se conservan por precaución las familias dinámicas `app-content--*`, `sidelinkicon--*`, `lista-alarmas-nivel--*`, `dash2tarjeta--*`, `dash2evento--*` y `dash2estadoflotante--*`. Una búsqueda literal simple las marcaría incorrectamente. El listado completo de candidatos requiere validación antes de una retirada masiva.

## 5. Repetición y organización

Hay **92 grupos con el mismo texto de selector y contexto repetido**. No son 92 bloques idénticos prescindibles: pueden añadir propiedades, reemplazar solo una parte o estar separados por otras reglas que compitan con ellos.

- `.docusotunelactivo`: `docente.css:211`, `:445` y `:599` cambian sucesivamente borde y fondo.
- `.appblanca .grafmedsvg`: `lab-light-theme.css:811`, `:845` y `:1054` cambia de fondo suave a transparente y después blanco. El primer bloque también aporta una altura mínima que debe conservarse.
- Las 16 variables de `:root` de `global.css` vuelven a declararse en `lab-theme.css`. Algunas cambian y otras repiten el valor. `componentes.css:564` vuelve a ajustar el tema oscuro.
- `componentes.css` se importa después de ambos temas y contiene ajustes específicos de Control, Registro y Docente. Su nombre ya no describe todo lo que contiene; moverlo en el orden de carga puede cambiar la apariencia.

Se identificaron **10 nombres de variables sin consumidores**, repartidos en **27 declaraciones**: `--bg-card`, `--bg-soft`, `--bg-elevated`, `--warning`, `--radius-lg`, `--radius-md`, `--radius-sm`, `--shadow`, `--v2bg-panel` y `--claro-activo`. Se buscaron usos tanto en CSS como en JavaScript. Que una variable tenga nombre útil no significa que los componentes estén utilizándola: varios fondos se escriben directamente con colores literales.

## Orden de trabajo propuesto

1. Corregir la adaptación a móvil de Inspección y Docente y las variables inexistentes, con verificación visual específica.
2. Retirar las familias antiguas confirmadas y las variables sin consumidores; recortar solo las ramas obsoletas de reglas compartidas.
3. Consolidar reglas repetidas por componente, respetando cascada, temas y puntos de corte.
4. Separar estilos base, temas y componentes; mover archivos completos solo después de comparar los resultados.

Para aplicar una limpieza: comparar las seis pantallas en ambos temas, escritorio y móvil, incluyendo informes, selección, conexión, confirmaciones y estados deshabilitados. Una compilación correcta comprueba sintaxis y empaquetado, pero no demuestra equivalencia visual.

Análisis reproducible: [revisar_css.mjs](C:/app/nuevo_tunelviento_app/tmp/auditoria_redundancias_20260911/revisar_css.mjs). Inventario y candidatos: [css_detalle.json](C:/app/nuevo_tunelviento_app/tmp/auditoria_redundancias_20260911/css_detalle.json).
