<<<<<<< HEAD
﻿# Tunelab

Aplicacion React para preparar ensayos, operar el tunel de viento, inspeccionar el
modelo 3D y revisar mediciones mediante archivos importables.

Esta copia del proyecto usa un enfoque preparado para laboratorio:

- El frontend esta hecho con React y Vite.
- El backend esta hecho con FastAPI.
- Los ensayos y mediciones se guardan en MySQL.
- La pagina Ensayo permite crear y editar fichas de ensayo.
- La pagina Control usa la ficha activa para operar el tunel y registrar mediciones.
- La pagina Registro consulta los ensayos y mediciones guardados y tambien permite cargar archivos descargados.
- La pagina Docente permite revisar ensayos de usuarios y ver el uso actual del tunel.
- El acceso de usuarios queda preparado para integrarse en el futuro con UACloud/eServices.

## Como arrancar despues de reiniciar el PC

Necesitas abrir tres PowerShell distintos: uno para MySQL, otro para el backend y otro para el frontend.

### 1. Arrancar MySQL

En un PowerShell, ejecuta:

```powershell
Start-Process -FilePath "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" -ArgumentList "--defaults-file=`"C:\ProgramData\MySQL\MySQL Server 8.4\my.ini`"" -WindowStyle Hidden
```

Para comprobar que MySQL esta escuchando:

```powershell
Test-NetConnection 127.0.0.1 -Port 3306
```

Si aparece `TcpTestSucceeded : True`, MySQL esta arrancado.

### 2. Arrancar el backend

En otro PowerShell:

```powershell
cd C:\app\nuevo_tunelviento_app\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

Deja esa ventana abierta. Para comprobar que el backend funciona, abre en el navegador:

```text
http://127.0.0.1:8010/api/salud
```

Debe responder algo tipo `ok`.

### 3. Arrancar el frontend

En otro PowerShell:

```powershell
cd C:\app\nuevo_tunelviento_app
npm run dev
```

Vite mostrara una direccion parecida a esta:

```text
http://localhost:5173/
```

Abre esa direccion en el navegador. Si el puerto 5173 esta ocupado, Vite puede usar 5174 u otro; usa siempre la URL que te muestre la terminal.

### Orden recomendado

1. MySQL.
2. Backend.
3. Frontend.

Si no se guardan ensayos o mediciones, casi siempre falta MySQL o falta el backend.

## Modos de fuente del tunel

La app tiene una capa de servicio para que la interfaz no dependa directamente de
si los datos vienen de una simulacion o del tunel real.

Archivo principal:

```text
C:\app\nuevo_tunelviento_app\src\servicios\tunel\index.js
```

Por defecto usa:

```text
VITE_FUENTE_TUNEL=simulado
```

Si en el futuro se configura:

```text
VITE_FUENTE_TUNEL=real
```

la app usara:

```text
C:\app\nuevo_tunelviento_app\src\servicios\tunel\tunelReal.js
```

Ese archivo es ahora un adaptador preparado, no una conexion final al hardware.
Cuando se conozca la forma real de comunicacion con DAQ, variador o MATLAB, se
debe completar ahi, manteniendo las mismas funciones que ya consume la interfaz.

## Flujo principal

1. En `Ensayo`, se rellena nombre, objetivo y descripcion.
2. La ficha se mantiene temporalmente en memoria.
3. En `Control`, se arranca el tunel, se ajustan consignas y se inicia una medicion.
4. Al detener la medicion, se genera un resumen.
5. Desde el recap de Control se descarga el archivo `.tunelab.json`.
6. En `Registro`, se importa ese archivo para revisar los datos.

## Seguridad actual

La version simplificada reduce superficie de ataque porque no incluye backend,
base de datos propia ni contrasenas internas. Aun asi, aplica varias defensas en
la importacion de archivos de medicion:

- limite de tamano por archivo
- limite de archivos cargados a la vez
- limite de muestras y eventos
- validacion de formato y version
- validacion de tipos numericos
- validacion de rangos de velocidad, temperatura y potencia
- recalculo del resumen desde la tabla de muestras importada

Limitacion importante: un archivo `.tunelab.json` puede ser editado manualmente
por el usuario. Para que el archivo sirva como prueba oficial antifraude haria
falta anadir firma digital, hash verificable o validacion desde un sistema externo.

## Carpetas importantes

- `src/pages`: pantallas principales de la aplicacion.
- `src/components`: componentes reutilizados, visor 3D, barra lateral y barra superior.
- `src/components/control`: paneles visuales de la pantalla Control.
- `src/servicios/tunel`: estado del tunel, simulador y adaptador real futuro.
- `src/servicios/archivos`: exportacion e importacion de archivos de medicion.
- `src/styles`: estilos CSS por pantalla y estilos comunes.
- `public`: recursos estaticos, incluido el modelo 3D si se sirve desde ahi.
- `docs`: documentos de estudio y decisiones tecnicas.

## Archivos que conviene dominar

- `src/App.jsx`: decide que pantalla se muestra.
- `src/servicios/tunel/useTunel.js`: conecta React con el servicio del tunel.
- `src/servicios/tunel/tunelSimulado.js`: simula telemetria y acciones de control.
- `src/servicios/tunel/tunelReal.js`: punto futuro para conectar el tunel real.
- `src/servicios/tunel/estadoTunel.js`: estructura del estado, ensayos y mediciones.
- `src/servicios/archivos/medicionArchivo.js`: formato descargable/importable.
- `src/pages/PaginaEnsayos2.jsx`: ficha temporal del ensayo.
- `src/pages/PaginaControl2.jsx`: operacion, captura y descarga de medicion.
- `src/pages/PaginaRegistro2.jsx`: importacion y revision de archivos.
- `src/pages/PaginaInspeccion.jsx`: vista 3D e inspeccion del tunel.

## Comandos utiles

```powershell
npm run dev
npm run build
npm run lint
```

## Nota de diseno

Esta version reduce backend y dependencias para que el alcance sea defendible:
la conservacion de resultados se delega en archivos descargables. Si mas adelante
la universidad exige historico centralizado, usuarios propios o auditoria completa,
se puede recuperar el enfoque con backend y base de datos desde la copia:

```text
C:\app\copiabd_tunelviento_app
```

=======
# TFG_TunelViento
>>>>>>> e3961f54d1364e0f03a2ad995671b2af97c06358
