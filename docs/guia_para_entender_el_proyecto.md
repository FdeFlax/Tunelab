# Guia para entender Tunelab desde cero

Este documento es para estudiar el proyecto con calma. No esta escrito como una
memoria formal, sino como una explicacion para entender que se ha hecho, por que
se ha hecho asi y que archivos debes mirar.

## 1. Que es ahora mismo este proyecto

Tunelab es una aplicacion web hecha con React para trabajar con un tunel de
viento en un laboratorio.

La idea actual es:

1. Preparas una ficha de ensayo.
2. Vas a Control.
3. Haces una medicion.
4. Al terminar descargas un archivo `.tunelab.json`.
5. En Registro puedes volver a cargar ese archivo para ver graficas, tabla de
   muestras y eventos.

La version actual NO usa backend, base de datos ni login propio.

Esto se hizo para que el TFG sea mas defendible y no se convierta en un proyecto
demasiado grande de servidores, usuarios, permisos, PostgreSQL, Docker, etc.

La copia importante ahora es:

```text
C:\app\nuevo_tunelviento_app
```

La copia antigua con backend se conserva aqui:

```text
C:\app\copiabd_tunelviento_app
```

Esa copia antigua no es la que estas usando ahora, pero sirve por si algun dia
quieres recuperar la version con base de datos.

## 2. Por que se quito el backend

Antes el proyecto tenia backend, usuarios, base de datos, migraciones y API.
Eso estaba bien si la aplicacion iba a ser una plataforma grande con historico
central, permisos y muchos usuarios.

Pero para el TFG se estaba complicando demasiado.

Ahora se decidio algo mas sencillo:

- La app no guarda mediciones en una base de datos propia.
- Cada medicion se guarda en un archivo descargable.
- Registro lee esos archivos cuando el usuario los carga.
- El acceso de usuarios queda pensado para UACloud en el futuro.

La ventaja es que el proyecto es mas facil de explicar:

> La aplicacion se centra en preparar, capturar, visualizar y exportar mediciones.
> La persistencia se hace mediante archivos autocontenidos.

La desventaja es que no hay historico automatico dentro de la app:

> Si el usuario no guarda el archivo, la app no conserva esa medicion al cerrar.

## 3. Como arrancar el proyecto

Abre PowerShell:

```powershell
cd C:\app\nuevo_tunelviento_app
npm run dev
```

Si dice que el puerto `5173` esta ocupado, Vite abrira otro, por ejemplo:

```text
http://localhost:5174/
```

No pasa nada. Usa la URL que te diga la terminal.

Si algun dia falta `node_modules`, ejecuta:

```powershell
npm install
npm run dev
```

## 4. Que es cada carpeta

### `src`

Es el codigo principal de la aplicacion.

Aqui esta casi todo lo que debes estudiar.

### `src/pages`

Contiene las pantallas grandes.

Cada archivo es una pagina:

- `PaginaDashboard2.jsx`: vista general del tunel.
- `PaginaEnsayos2.jsx`: preparar ficha temporal de ensayo.
- `PaginaControl2.jsx`: operar el tunel y medir.
- `PaginaRegistro2.jsx`: importar archivos de medicion.
- `PaginaInspeccion.jsx`: ver el tunel en 3D y sus etiquetas.

Si quieres entender la app visualmente, empieza por aqui.

### `src/components`

Contiene piezas reutilizables.

Ejemplos:

- `BarraLateral.jsx`: menu lateral.
- `Topbar.jsx`: barra superior.
- `TunnelViewer.jsx`: visor 3D del tunel.
- `ResumenMedicion.jsx`: tarjetas y graficas reutilizables.

### `src/components/control`

Tiene los paneles internos de Control.

Archivo importante:

```text
src/components/control/PanelesControl2.jsx
```

`PaginaControl2.jsx` es la pagina, pero muchos bloques visuales estan separados
en `PanelesControl2.jsx` para que no sea un archivo aun mas gigante.

### `src/servicios`

Aqui esta la logica que no es puramente visual.

Esta carpeta es muy importante porque separa la interfaz de los datos.

### `src/servicios/tunel`

Aqui esta todo lo relacionado con el tunel:

- estado actual
- simulacion
- adaptador futuro al tunel real
- hook que conecta React con el tunel

Archivos:

- `index.js`
- `useTunel.js`
- `estadoTunel.js`
- `tunelSimulado.js`
- `tunelReal.js`
- `avisosLimite.js`

### `src/servicios/archivos`

Aqui esta el sistema de exportar e importar mediciones.

Archivo importante:

```text
src/servicios/archivos/medicionArchivo.js
```

Este archivo crea y lee los `.tunelab.json`.

### `src/styles`

Aqui esta el CSS.

Cada pantalla tiene su CSS:

- `dashboard2.css`
- `control2.css`
- `ensayos2.css`
- `registro2.css`
- `inspeccion.css`

Tambien hay CSS comun:

- `global.css`
- `layout.css`
- `pages.css`

### `public`

Aqui estan archivos publicos que el navegador puede cargar directamente.

Lo mas importante es:

```text
public\models\tfg.glb
```

Ese es el modelo 3D del tunel.

### `node_modules`

No es codigo tuyo.

Es la carpeta donde `npm install` descarga las librerias.

No se estudia, no se sube normalmente a GitHub y no se edita a mano.

## 5. Como se conectan las piezas

La cadena principal es esta:

```text
main.jsx
  -> App.jsx
    -> pagina actual
      -> useTunel
        -> servicioTunel
          -> tunelSimulado o tunelReal
```

Explicado sencillo:

`main.jsx` arranca React.

`App.jsx` decide que pagina se ve.

Cada pagina usa componentes y servicios.

`useTunel.js` es el puente entre React y el tunel.

`index.js` decide si se usa:

- `tunelSimulado.js`
- `tunelReal.js`

Ahora mismo se usa el simulador.

## 6. Que hace `App.jsx`

Archivo:

```text
src/App.jsx
```

Es el centro de navegacion.

Tiene un estado llamado `paginaActual`.

Segun ese valor, muestra una pagina u otra:

- `dashboard`
- `ensayos`
- `control`
- `registro`
- `inspeccion`

Tambien tiene un usuario falso/provisional:

```js
Usuario UACloud
```

Ese usuario esta para representar que en el futuro el acceso vendra de UACloud.
No es un login real.

## 7. Que hace `useTunel.js`

Archivo:

```text
src/servicios/tunel/useTunel.js
```

Es un hook de React.

Su trabajo es:

- pedir el estado actual del tunel
- suscribirse a cambios
- actualizar la pantalla cuando cambia algo
- devolver acciones para usar desde las paginas

Cuando Control pulsa "Encender tunel", no cambia directamente variables de React.
Llama a una accion del servicio del tunel.

Eso es bueno porque separa:

- interfaz visual
- logica del tunel

## 8. Que hace `estadoTunel.js`

Archivo:

```text
src/servicios/tunel/estadoTunel.js
```

Este archivo define la forma de los datos.

Por ejemplo:

- estado del tunel
- velocidad
- temperatura
- potencia
- alarmas
- ensayos
- mediciones
- muestras
- resumen de medicion

Tambien tiene funciones para:

- crear un ensayo
- crear una medicion
- calcular resumenes
- formatear tiempos
- limitar alarmas

Este archivo es como el idioma comun de la app.

Si una pagina quiere saber la velocidad, busca:

```js
estadoTunel.velocidadAireMs
```

Si quiere saber si hay una medicion activa:

```js
estadoTunel.medicionActiva
```

## 9. Que hace `tunelSimulado.js`

Archivo:

```text
src/servicios/tunel/tunelSimulado.js
```

Es una imitacion del tunel real.

Sirve para poder probar la app sin hardware.

Hace cosas como:

- encender el tunel
- apagar el tunel
- cambiar potencia
- iniciar una medicion
- detener una medicion
- generar muestras falsas
- crear eventos
- guardar temporalmente la medicion en memoria

No debes decir que esto controla el tunel real.

Frase buena:

> El simulador permite validar el flujo de trabajo y la interfaz mientras la
> conexion fisica con el tunel se define aparte.

## 10. Que hace `tunelReal.js`

Archivo:

```text
src/servicios/tunel/tunelReal.js
```

Es una preparacion para el futuro.

Ahora mismo no controla hardware real.

Esta ahi para que, cuando se sepa como conectar con DAQ, MATLAB o variador, se
complete ese archivo sin cambiar todas las pantallas.

La idea es que `tunelReal.js` tenga las mismas funciones que `tunelSimulado.js`.

Por ejemplo:

- `encenderTunel`
- `apagarTunel`
- `actualizarPotencia`
- `iniciarMedicion`
- `detenerMedicion`

Asi las paginas no tienen que saber de donde vienen los datos.

## 11. Que hace `medicionArchivo.js`

Archivo:

```text
src/servicios/archivos/medicionArchivo.js
```

Este archivo es clave.

Hace dos cosas:

1. Crear un archivo `.tunelab.json`.
2. Leer un archivo `.tunelab.json`.

Cuando terminas una medicion en Control, se genera un documento con:

- datos del ensayo
- datos de la medicion
- muestras
- eventos
- objetivos
- version del formato

Cuando Registro importa ese archivo, lo valida antes de mostrarlo.

Ahora mismo valida:

- tamano maximo del archivo
- numero maximo de archivos cargados
- numero maximo de muestras
- numero maximo de eventos
- formato correcto
- version correcta
- valores numericos
- rangos razonables

Ademas, al importar no se fia ciegamente del resumen guardado. Recalcula los
resumenes desde las muestras.

Esto es importante para seguridad.

## 12. Flujo completo de una medicion

### Paso 1: crear ficha

Vas a `Ensayo`.

Archivo:

```text
src/pages/PaginaEnsayos2.jsx
```

Rellenas:

- nombre
- objetivo
- descripcion

La ficha se queda en memoria.

No se guarda en base de datos.

### Paso 2: ir a Control

La app pasa a `Control`.

Archivo:

```text
src/pages/PaginaControl2.jsx
```

Aqui puedes:

- encender tunel
- cambiar potencia
- iniciar medicion
- detener medicion

### Paso 3: medir

Si se usa simulacion, `tunelSimulado.js` genera datos falsos cada cierto tiempo.

Esos datos se guardan como muestras.

Cada muestra tiene:

- segundo
- velocidad
- temperatura
- potencia

### Paso 4: detener

Al detener la medicion:

- se calcula el resumen
- aparecen tarjetas y graficas
- aparece el boton para descargar archivo

### Paso 5: descargar

Control llama a:

```js
descargarMedicionTunelab()
```

Eso crea un archivo `.tunelab.json`.

### Paso 6: importar en Registro

Vas a `Registro`.

Archivo:

```text
src/pages/PaginaRegistro2.jsx
```

Cargas el archivo.

Registro lo lee con:

```js
leerArchivoMedicionTunelab()
```

Si es valido, muestra:

- resumen
- graficas
- tabla de muestras
- eventos

## 13. Que hace Dashboard

Archivo:

```text
src/pages/PaginaDashboard2.jsx
```

Dashboard es una pantalla de supervision.

Muestra:

- estado general
- fuente de datos
- estado de control
- velocidad
- temperatura
- potencia
- alarmas
- modelo 3D ligero

No es donde se hace la medicion principal. Para medir se usa Control.

## 14. Que hace Inspeccion

Archivo:

```text
src/pages/PaginaInspeccion.jsx
```

Inspeccion muestra el tunel en 3D con puntos/etiquetas.

El modelo 3D esta en:

```text
public\models\tfg.glb
```

El visor se monta principalmente en:

```text
src/components/TunnelViewer.jsx
```

Usa librerias de Three.js:

- `three`
- `@react-three/fiber`
- `@react-three/drei`

La idea es que el usuario pueda entender visualmente donde estan partes del tunel.

## 15. Que significa lo de GLB

Un `.glb` es un archivo de modelo 3D.

Es como un objeto 3D empaquetado.

En este proyecto representa el tunel de viento.

React no entiende un `.glb` por si solo. Para verlo se usan Three.js y React
Three Fiber.

## 16. Que cosas no debes estudiar al principio

No empieces por:

- `node_modules`
- todos los CSS
- el modelo `.glb`
- `package-lock.json`
- configuraciones internas de Vite

Eso no te va a ayudar al principio.

Empieza por:

1. `App.jsx`
2. `PaginaEnsayos2.jsx`
3. `PaginaControl2.jsx`
4. `tunelSimulado.js`
5. `estadoTunel.js`
6. `medicionArchivo.js`
7. `PaginaRegistro2.jsx`
8. `PaginaInspeccion.jsx`
9. `TunnelViewer.jsx`

## 17. Que decisiones tienes que saber defender

### Decision 1: quitar backend

Respuesta:

> Se decidio simplificar el alcance porque el objetivo principal del TFG es la
> interfaz de laboratorio, la captura de datos y la visualizacion. La persistencia
> se resuelve mediante archivos importables para evitar una complejidad excesiva
> de usuarios, servidores y bases de datos.

### Decision 2: usar archivos `.tunelab.json`

Respuesta:

> Cada archivo contiene toda la informacion de una medicion: ensayo, muestras,
> resumen y eventos. Esto permite guardar y reabrir resultados sin depender de
> una base de datos propia.

### Decision 3: tener simulador

Respuesta:

> El simulador permite probar el flujo completo sin depender del hardware real.
> No sustituye al tunel real; solo imita el contrato de datos que deberia cumplir
> la conexion real.

### Decision 4: preparar `tunelReal.js`

Respuesta:

> La app esta preparada para cambiar la fuente de datos. Las pantallas no hablan
> directamente con el hardware, sino con una capa de servicio. En el futuro se
> completaria `tunelReal.js`.

### Decision 5: no tener login propio

Respuesta:

> El login propio se ha eliminado porque el acceso final podria gestionarse desde
> UACloud u otro sistema institucional. Asi se evita duplicar autenticacion.

## 18. Limitaciones actuales

Es importante reconocerlas.

La app actual:

- no guarda historico automaticamente
- no tiene usuarios reales
- no tiene permisos por rol
- no firma digitalmente los archivos
- no controla todavia el tunel real
- usa simulacion por defecto
- depende de que el usuario conserve el archivo descargado

Esto no es malo si lo explicas como alcance del proyecto.

## 19. Riesgos de seguridad actuales

Riesgos controlados:

- no hay contrasenas propias
- no hay base de datos propia
- no hay backend expuesto
- los archivos importados se validan

Riesgos pendientes:

- un `.tunelab.json` podria editarse a mano
- para uso oficial haria falta firma o validacion externa
- el acceso real debe protegerlo UACloud o un sistema equivalente
- el tunel real no debe controlarse directamente desde React

## 20. Como explicar la arquitectura en una frase

Frase corta:

> Tunelab es una aplicacion React que separa la interfaz visual, la logica del
> tunel y la conservacion de mediciones mediante archivos importables.

Frase un poco mas completa:

> La aplicacion usa una capa `servicioTunel` para no depender de si los datos
> vienen de un simulador o de una futura conexion real. Las mediciones se exportan
> como archivos `.tunelab.json`, que Registro puede volver a importar y analizar.

## 21. Ruta recomendada para estudiar

### Dia 1

Entender:

- `App.jsx`
- paginas principales
- navegacion

### Dia 2

Entender:

- `useTunel.js`
- `index.js`
- `estadoTunel.js`

### Dia 3

Entender:

- `tunelSimulado.js`
- como se inicia y detiene una medicion

### Dia 4

Entender:

- `medicionArchivo.js`
- exportacion e importacion

### Dia 5

Entender:

- `PaginaRegistro2.jsx`
- graficas y tablas

### Dia 6

Entender:

- `PaginaInspeccion.jsx`
- `TunnelViewer.jsx`
- modelo GLB

## 22. Preguntas que deberias saber responder

### Que pasa cuando creo un ensayo?

Se crea una ficha temporal en el estado del tunel. No se guarda en base de datos.
Esa ficha se usara al medir y luego se incluira en el archivo descargado.

### Que pasa cuando inicio una medicion?

Control llama a una accion del servicio del tunel. Si esta en modo simulado,
`tunelSimulado.js` empieza a generar muestras.

### Que pasa cuando detengo la medicion?

Se calcula un resumen con velocidad, temperatura, potencia, estabilidad y eventos.
Ese resumen se muestra en Control y se puede descargar.

### Que contiene el archivo descargado?

Contiene ensayo, medicion, muestras, eventos, objetivos, formato y version.

### Que hace Registro?

No busca datos en una base de datos. Lee archivos que el usuario importa.

### Como se conectaria el tunel real?

Completando `tunelReal.js` o una capa intermedia segura que cumpla el mismo
contrato que el simulador.

## 23. Lo mas importante que debes recordar

Si te pierdes, vuelve a esta idea:

```text
Ensayo prepara
Control mide
Archivo conserva
Registro revisa
Inspeccion visualiza
Dashboard supervisa
```

Esa es la app.
