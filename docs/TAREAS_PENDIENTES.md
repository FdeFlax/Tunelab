# Tareas pendientes

Las dudas físicas, decisiones provisionales y propuestas docentes se anotan en [COSAS_A_REVISAR.md](COSAS_A_REVISAR.md).

## Revisar el modelo 3D en Blender

Mejora futura. Mantener los ajustes actuales del visor hasta comprobar el nuevo GLB en la web.

- [ ] Corregir las coordenadas UV de los cinco aros de la turbomáquina. En el GLB actual, sus triángulos no tienen superficie útil en el mapa UV, lo que provoca problemas al aplicar el mapa de normales (relieve). Rehacer las UV o asignar a los aros un material sin relieve. Las mallas aparecen en el visor como `Circle007`, `Circle008`, `Circle009`, `Circle011` y `Circle012` y comparten el material `MetalCarne.001` con la carcasa.
- [ ] Revisar la separación entre las pegatinas y sus superficies de soporte, y configurar correctamente sus zonas transparentes para evitar parpadeos.
- [ ] Revisar el material de las ventanas de policarbonato y sus orígenes. Comprobar la transparencia en el navegador después de exportar: el resultado puede diferir del de Blender.
- [ ] Exportar un GLB de prueba y comprobarlo en Dashboard e Inspección, girando la cámara y revisando las piezas desde arriba, abajo y ambos laterales.
- [ ] Retirar de `src/components/visor/VisorTunel.jsx` únicamente los ajustes correctivos que dejen de ser necesarios tras comprobar el nuevo modelo. Conservar los ajustes propios del visor web, como iluminación, cámara, suavizado y filtrado de texturas.

Los arreglos actuales se aplican en el visor; no modifican el archivo original `public/models/tfg.glb` ni el proyecto de Blender.
