# Revisión del conducto interior del túnel

18/10/2026. Primera etapa de preparación geométrica. **No está conectada al cálculo de la web y no constituye una simulación ni una validación del túnel real.**

Se ha construido un volumen provisional de aire a partir del GLB existente, con una sección de ensayo nominal explícitamente idealizada. Permite revisar el tramo principal antes de ampliar el dominio de Aerodinámica. El archivo original no se modifica.

## Resultado y alcance

| Tramo | Longitud | Procedencia |
| --- | ---: | --- |
| Contracción | 168 cm | Perfiles interiores extraídos de `Cube.012` del CAD. |
| Sección de ensayo | 100 cm | Conducto nominal de 70 × 70 cm, conforme a la decisión provisional registrada en F-01. No reproduce todos los marcos y ventanas del CAD. |
| Transición de salida | 115 cm | Perfiles extraídos de `Circle.005`, conservando y señalando la discontinuidad cercana a la brida. |

La propuesta mide 383 cm de longitud. **No equivale al túnel completo:** todavía excluye boca, cámara de estabilización, rejillas/honeycomb, soportes, objetos y ventilador con su carcasa posterior. Las tapas del volumen son superficies para identificar entrada y salida; no representan paredes que bloqueen el aire.

Archivos generados, reproducibles y excluidos de Git:

- [Figura de revisión](../output/revision-conducto/revision-conducto.png): geometría y área de cada corte. No es un mapa de velocidades.
- [Conducto provisional en GLB](../output/revision-conducto/conducto-provisional.glb): escala en metros, origen en el centro de la sección de ensayo.
- [Perfiles y comprobaciones en JSON](../output/revision-conducto/conducto.json): coordenadas en centímetros, fuente, hipótesis, incidencias y estimación de malla. Contiene `apto_para_calculo: false`.

## Hallazgos que deben revisarse

1. **El interior de la cámara no se deduce de su caja exterior.** La pieza `Caja.002` tiene una envolvente cercana a 70 × 70 cm, pero no contiene todas las paredes. Los dos planos de vidrio están separados aproximadamente 66,745 cm; las ventanas tampoco cubren por sí solas toda la longitud o altura de la cámara. Por eso no se ha presentado una caja lisa de 70 cm como extracción exacta del interior. Se mantiene como idealización nominal, pendiente de resolver con el CAD de construcción o medidas. La discrepancia documental anterior de 60 frente a 70 cm sigue abierta.
2. **La transición CAD de salida no muestra una expansión del área de paso.** Pasa aproximadamente de un cuadrado de 70 cm a una sección redondeada, con área de 0,38824 m² a 112 cm del inicio del tramo, frente a los 0,49 m² nominales del ensayo. No debe llamarse difusor expansivo por asumir que su envolvente exterior de unos 78 cm es la abertura interior.
3. **Hay un salto de radio de unos 4,011 cm cerca de la brida.** Aparece entre X=163 y 164 cm respecto al centro del ensayo. El área del último corte resulta 0,47152 m². Puede corresponder a detalles de la pieza o a la forma en que el CAD representa el paso interior; estos datos no acreditan un defecto del equipo construido. No se ha suavizado ni rellenado automáticamente.

Para resolverlo hace falta identificar qué superficies delimitan realmente el aire: caras interiores de ventanas/marcos y corte longitudinal de la transición hasta su unión con la carcasa posterior. Una confirmación del plano de construcción permite adoptar una geometría nominal; una medición permite contrastarla con el equipo. Se pueden estudiar idealizaciones, pero deben elegirse y documentarse antes del cálculo, sin presentarlas como medidas reales.

## Procedencia y método reproducible

Fuente: `public/models/tfg.glb`. SHA-256:

```text
8b19a0ae62c23bb5b62a11800734d99fab07b721ede3fc4a1c729c7774b047b0
```

Las transformaciones de cada pieza se aplican antes de medir. Se asumen metros en el GLB porque las longitudes obtenidas coinciden con las cotas nominales de 1,68, 1 y 1,15 m; esto no sustituye una comprobación del túnel construido. El sistema resultante usa X longitudinal, Y altura y Z ancho, con origen en el centro nominal del ensayo.

El extractor toma cortes separados aproximadamente 1 cm. En cada corte busca la primera intersección positiva de 96 rayos con las superficies de la pieza, desde el eje. No usa la envolvente exterior como pared interior. Presupone una sección estrellada respecto al eje: este procedimiento está preparado para estas piezas y **no es un reconstructor general de cualquier conducto**. Si un rayo no encuentra pared, produce un error; el muestreo finito no garantiza detectar todos los huecos o detalles menores.

La sección de ensayo se construye aparte con la cota nominal. En las dos uniones se adopta ese perfil: las diferencias radiales máximas con el CAD son aproximadamente 0,784 y 0,248 mm. Esta sustitución queda registrada. Los perfiles se unen con triángulos y se cierran mediante tapas de entrada/salida. Sus índices de caras se identifican en el JSON y en los metadatos GLB; no se asignan todavía condiciones de flujo.

El resultado tiene 384 perfiles, un volumen aproximado de 2,92787 m³ y una superficie cerrada con orientación coherente. Son propiedades de **la propuesta reconstruida**, no una certificación topológica del CAD original ni de precisión física.

Para reproducir con el entorno de cálculo ya instalado, desde la raíz del proyecto:

```powershell
.\tmp\evaluacion-xlb\.venv\Scripts\python.exe scripts/preparar-conducto-tunel.py
.\tmp\evaluacion-xlb\.venv\Scripts\python.exe -m unittest discover -s tests -p test_conducto_tunel.py -v
```

El script no importa XLB ni ejecuta GPU, API o base de datos. Usa NumPy, Trimesh y SciPy para geometría y Matplotlib para la figura, disponibles en ese entorno. La caché de fuentes utiliza su directorio local ya previsto. El parámetro `--output` permite elegir otra carpeta para los tres resultados.

## Coste geométrico estimado

Se ha comprobado la conectividad del aire en dos discretizaciones aproximadas, interpolando los perfiles en posición y ángulo. Ambas contienen una única región conectada y ninguna sección longitudinal completamente bloqueada. La caja se redondea hacia fuera al paso de malla, prolongando los perfiles extremos como máximo un paso. Esto estima tamaño y conectividad, no la exactitud de una futura frontera CFD.

| Paso | Nodos de la caja | Nodos de aire aproximados | Solo dos campos D3Q27 en float32 |
| --- | ---: | ---: | ---: |
| 2 cm | 194 × 73 × 72 = 1.019.664 | 375.874 | 210,0 MiB |
| 1 cm | 386 × 143 × 142 = 7.838.116 | 2.991.065 | 1.614,6 MiB |

El modelo actual usa 509.141 nodos: la caja extendida de 1 cm tiene unas 15,4 veces más nodos. **No es una predicción de tiempo ni de memoria total.** Faltan máscaras, campos auxiliares, preparación, compilación, motor y otros recursos. No se ha medido un cálculo del conducto vacío. Una malla de 2 cm tampoco tiene la misma resolución ni puede adoptarse sin revisar escalas y fronteras.

## Comprobación y siguiente etapa

Pasan cinco pruebas: elección de cara interior frente a envolvente; rechazo de cortes incompletos/no finitos; escala, volumen y orientación de un conducto conocido; conectividad y memoria de la caja; y extracción del CAD real con exportación/importación GLB, escala, volumen, puertos e incidencias explícitas. Se ha revisado visualmente la figura final.

Antes de integrar el cálculo ampliado:

1. Resolver o adoptar explícitamente una idealización de las superficies pendientes, y decidir si esta primera prueba termina antes del ventilador. El planteamiento actual no promete incluirlo todo.
2. Definir entrada, salida y paredes del nuevo dominio. Una velocidad impuesta en la entrada ancha no es la misma velocidad de referencia en la sección estrecha. Tampoco se obtiene la respuesta del ventilador a partir del GLB.
3. Ejecutar un caso vacío separado, comprobar balance de caudal, estabilidad y sensibilidad a la malla, y medir tiempo y memoria. No trasladar sin revisión los 6000 pasos ni los parámetros de la caja actual.
4. Solo después adaptar los contratos de API, coordenadas de planos y límites de importación, e introducir objetos. La compatibilidad geométrica no valida las fuerzas ni calibra las unidades de red como aire real.

La web sigue usando el dominio y las limitaciones descritos en [FLUJO_3D.md](FLUJO_3D.md). Esta revisión no cambia sus resultados.
