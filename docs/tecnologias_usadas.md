# Tecnologias usadas en Tunelab

Este documento resume las tecnologias principales usadas en el proyecto y donde se ve en el codigo que se estan utilizando. La idea es tener una referencia rapida para entender y defender la aplicacion en la memoria del TFG.

## 1. React

React es la libreria usada para construir la interfaz de usuario. Permite dividir la aplicacion en componentes reutilizables y actualizar la pantalla cuando cambian los datos.

En el proyecto se ve principalmente en:

```text
C:\app\nuevo_tunelviento_app\src\main.jsx
C:\app\nuevo_tunelviento_app\src\App.jsx
C:\app\nuevo_tunelviento_app\src\pages\
C:\app\nuevo_tunelviento_app\src\components\
```

El archivo `main.jsx` es el punto de entrada del frontend. Desde ahi React monta la aplicacion dentro del elemento principal definido en `index.html`.

## 2. Vite

Vite es la herramienta que se usa para arrancar, desarrollar y construir el frontend. No es una pantalla de la aplicacion, sino el entorno que permite ejecutar React durante el desarrollo y generar la version final para produccion.

El uso de Vite se ve en:

```text
C:\app\nuevo_tunelviento_app\package.json
C:\app\nuevo_tunelviento_app\vite.config.js
C:\app\nuevo_tunelviento_app\index.html
```

En `package.json` aparecen los comandos:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

Esto significa:

- `npm run dev` arranca la aplicacion en modo desarrollo.
- `npm run build` genera la carpeta final `dist`.
- `npm run preview` permite probar la version construida.

En `vite.config.js` se configura Vite para trabajar con React:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

En `index.html` se conecta Vite con el codigo de React:

```html
<script type="module" src="/src/main.jsx"></script>
```

Esto indica que la aplicacion empieza cargando `src/main.jsx`.

## 3. Variables de entorno del frontend

Vite permite usar variables de entorno en el frontend, pero solo expone al navegador las que empiezan por `VITE_`.

En Tunelab se usa:

```text
VITE_FUENTE_TUNEL
```

Esta variable permite elegir si la aplicacion usa el modo simulado o una posible fuente real:

```js
export const FUENTE_TUNEL_ACTIVA =
  import.meta.env.VITE_FUENTE_TUNEL === "real"
    ? "real"
    : "simulado";
```

Si `VITE_FUENTE_TUNEL` vale `real`, la aplicacion intentaria usar la fuente real. Si no existe o tiene cualquier otro valor, se usa el modo simulado.

Esto se hace para que el proyecto pueda funcionar en local sin depender del tunel fisico.

## 4. Estado del tunel en el frontend

La parte del frontend relacionada con el funcionamiento inmediato del tunel esta en:

```text
C:\app\nuevo_tunelviento_app\src\servicios\tunel\
```

Los archivos principales son:

- `estadoTunel.js`: define la estructura inicial del estado del tunel.
- `useTunel.js`: permite que las pantallas usen el estado y las acciones del tunel.
- `index.js`: decide si se usa `tunelSimulado` o `tunelReal`.
- `tunelSimulado.js`: genera datos simulados para probar la aplicacion.
- `tunelReal.js`: queda como punto de partida para una posible conexion futura.

El modo simulado no sustituye al tunel real. Su funcion es permitir que la aplicacion pueda desarrollarse, probarse y defenderse aunque no exista conexion fisica con el equipo.

## 5. Backend con FastAPI

El backend se desarrollo con FastAPI. Su funcion es actuar como parte intermedia entre el frontend y la base de datos.

El frontend no se conecta directamente a MySQL. En su lugar:

```text
Frontend React
        ↓
Backend FastAPI
        ↓
MySQL
```

Esto permite guardar ensayos, mediciones, muestras, usuarios y eventos de forma controlada.

El backend esta en:

```text
C:\app\nuevo_tunelviento_app\backend\
```

Algunos archivos importantes son:

- `app/main.py`: crea la aplicacion FastAPI y registra las rutas.
- `app/rutas.py`: define los endpoints de la API.
- `app/tablas.py`: define las tablas de la base de datos con SQLAlchemy.
- `app/datos_api.py`: define los datos que entran y salen de la API con Pydantic.
- `app/base_datos.py`: configura la conexion con la base de datos.
- `app/configuracion.py`: lee variables de configuracion como `DATABASE_URL`.

## 6. MySQL

MySQL se usa como base de datos para guardar informacion persistente. Esto significa que los datos pueden mantenerse aunque se cierre la aplicacion.

Se guardan datos como:

- usuarios;
- ensayos;
- mediciones;
- muestras;
- eventos;
- estado de ocupacion del tunel.

La conexion con MySQL no se escribe directamente en el codigo. Se configura mediante una variable de entorno:

```text
DATABASE_URL
```

Esta variable se coloca en el archivo:

```text
C:\app\nuevo_tunelviento_app\backend\.env
```

Ejemplo orientativo:

```env
DATABASE_URL=mysql+pymysql://usuario:password@127.0.0.1:3306/tunel_viento
```

## 7. SQLAlchemy

SQLAlchemy se usa en el backend para trabajar con la base de datos desde Python. En vez de escribir todas las consultas SQL manualmente, se definen clases que representan tablas.

Por ejemplo, una clase `Usuario` representa la tabla de usuarios y una clase `Ensayo` representa la tabla de ensayos.

Esto se encuentra en:

```text
C:\app\nuevo_tunelviento_app\backend\app\tablas.py
```

## 8. Pydantic

Pydantic se usa para validar los datos que entran y salen de la API.

Por ejemplo, cuando el frontend crea un ensayo, Pydantic comprueba que el nombre no este vacio y que no supere la longitud permitida.

Esto se encuentra en:

```text
C:\app\nuevo_tunelviento_app\backend\app\datos_api.py
```

## 9. Alembic

Alembic se usa para gestionar cambios en la estructura de la base de datos mediante migraciones.

Antes se podian crear tablas directamente desde codigo, pero con Alembic queda registrado que cambios se han hecho en la base de datos y en que orden.

Los archivos principales estan en:

```text
C:\app\nuevo_tunelviento_app\backend\alembic.ini
C:\app\nuevo_tunelviento_app\backend\alembic\
C:\app\nuevo_tunelviento_app\backend\alembic\versions\
```

El comando principal para aplicar migraciones es:

```powershell
alembic upgrade head
```

## 10. WebSocket

El WebSocket se usa para avisar en tiempo real a otras pantallas cuando cambia el estado de conexion del tunel.

Por ejemplo, si un alumno se conecta al tunel, otra pantalla abierta puede enterarse sin tener que recargar manualmente la pagina.

El WebSocket no sustituye a la API REST. La API REST sigue guardando y consultando datos. El WebSocket solo avisa de que algo ha cambiado.

## 11. Idea general para defender

La aplicacion se ha construido con una separacion clara:

```text
React + Vite
Interfaz de usuario y visualizacion del tunel.

Servicios del frontend
Gestion del estado inmediato y simulacion del tunel.

FastAPI
API intermedia entre la web y la base de datos.

MySQL
Persistencia de usuarios, ensayos, mediciones y eventos.

WebSocket
Avisos en tiempo real sobre cambios de ocupacion del tunel.
```

Esta organizacion permite que el proyecto funcione actualmente en local y con simulacion, pero manteniendo una estructura preparada para evolucionar hacia una conexion real o un despliegue mas completo.
