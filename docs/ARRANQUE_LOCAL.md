# Arranque local de Tunelab en Windows

## Uso diario

Haz doble clic en **`iniciar-tunelab.cmd`**. Es el único archivo que necesitas abrir: comprueba MySQL, arranca la API y la web, y abre <http://127.0.0.1:5173/> cuando están preparados. No es necesario abrir tres terminales.

**`npm start` y `npm run dev` hacen lo mismo**, desde la raíz del proyecto. El comando `npm run dev:web` queda reservado para trabajar solo en el frontend con la API ya disponible. Abrir un marcador del navegador no inicia los servidores. La pantalla de acceso comprueba su disponibilidad, deshabilita los perfiles mientras faltan servicios y se recupera automáticamente sin recargar.

El lanzador:

1. Comprueba Python, las dependencias y la configuración de la web y de la API.
2. Si hace falta, inicia MySQL local usando el servicio existente o con los permisos normales del usuario. Si sus archivos requieren permisos de sistema, ofrece preparar el servicio una sola vez.
3. Ejecuta una consulta real a la base de datos con las credenciales configuradas.
4. Aplica las migraciones antes de arrancar una API nueva. No migra mientras una API existente sigue funcionando.
5. Comprueba el esquema de la base de datos y que el proceso de captura esté vivo.
6. Verifica que la API y la web pertenecen a esta carpeta y que el acceso demo local está habilitado.
7. Comprueba que el acceso de Alumno Demo funciona realmente y abre el navegador. Si hay un error, deja el mensaje visible y no abre una web incompleta. Esa comprobación puede dar de alta el perfil demo en el primer arranque; no crea ensayos ni mediciones y no se ejecuta en modo diagnóstico.

Si ya está funcionando, reutiliza los procesos. Un segundo doble clic simultáneo no lanza otro arranque. El puerto de la web es siempre **5173**: no salta silenciosamente al 5174 si encuentra otro proceso.

Cerrar el navegador no detiene los servidores ni un programa por etapas en curso. El lanzador tampoco cierra procesos existentes para resolver conflictos de puertos.

## Diagnóstico y registros

Ejecuta **`npm run diagnostico`** desde la raíz del proyecto para comprobar el estado sin iniciar servicios, aplicar migraciones, crear usuarios ni abrir el navegador. Solo consulta el estado y escribe su registro local. Un fallo devuelve código de salida 1; todas las comprobaciones correctas devuelven 0.

Los registros están en la carpeta **`logs` del proyecto**, excluida de Git:

| Archivo | Contenido |
| --- | --- |
| `arranque.log` | Resultado del último arranque o diagnóstico |
| `backend.log`, `backend-error.log` | Salida de la API iniciada por el lanzador |
| `frontend.log`, `frontend-error.log` | Salida de Vite iniciado por el lanzador |
| `migraciones.log`, `migraciones-error.log` | Actualización del esquema |
| `diagnostico-error.log` | Fallos al ejecutar las comprobaciones de configuración |
| `mysql.log`, `mysql-error.log` | Salida de MySQL cuando se inicia sin servicio |
| `mysql-servicio.log` | Preparación única del servicio de Windows |

Se reutilizan los mismos archivos en cada arranque de esos procesos, sin acumular copias. Los servidores iniciados anteriormente de otra forma pueden seguir escribiendo en sus registros originales.

La dirección <http://127.0.0.1:8010/api/listo> devuelve 200 cuando están disponibles la base de datos, el esquema y el capturador; devuelve 503 si falla alguna comprobación. `/api/salud` sigue siendo una comprobación básica del proceso, insuficiente para confirmar que se puede trabajar. Ninguna de estas rutas inicia el túnel.

## Si algo falla

| Mensaje o situación | Acción |
| --- | --- |
| Faltan dependencias | Sigue la preparación inicial de abajo. |
| Windows no autoriza preparar MySQL | Abre el lanzador directamente y acepta la preparación inicial del servicio; la aplicación no puede sustituir ese permiso. |
| MySQL se cierra al arrancar | Consulta `mysql-error.log`; no borres archivos ni inicialices otra base de datos. |
| MySQL rechaza credenciales o permisos | Revisa `DATABASE_URL` en `backend/.env`. |
| La base de datos no existe | Crea la base de datos indicada y concede permisos a su usuario; las migraciones crearán las tablas. |
| API antigua o de otra carpeta en 8010 | Termina cualquier medición/programa, cierra esa API y vuelve a lanzar Tunelab. No abras un segundo controlador. |
| Migraciones pendientes con API abierta | Termina los ensayos, cierra la API y usa el lanzador para actualizarla antes del siguiente arranque. |
| Otro proceso ocupa 5173 | Cierra esa instancia de Vite o la aplicación que ocupa el puerto. No cambies la URL al 5174. |
| Acceso demo bloqueado | Comprueba la configuración local indicada abajo y reinicia la API si la has modificado. |

## Preparación inicial en otro equipo

Esta preparación se hace una vez; el lanzador no instala programas ni modifica contraseñas automáticamente.

- Windows con MySQL instalado, una base de datos y un usuario con permisos para las tablas y migraciones de esa base.
- Node.js compatible con Vite (`^20.19.0` o `>=22.12.0`; esta revisión se ha comprobado con Node 24.14).
- Python; esta revisión se ha comprobado con Python 3.13.

En PowerShell, desde la carpeta del proyecto:

```powershell
npm ci
py -3.13 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Copia `backend/.env.example` a `backend/.env` **solo si todavía no existe**, y completa la conexión real de MySQL. No compartas el archivo con contraseñas ni lo subas al repositorio. El `.env` de la raíz es opcional: la web y el lanzador ya usan la dirección local de la API por defecto.

La plantilla `.env.example` permite indicar otra dirección cuando haga falta. Para el arranque local, la dirección es:

```dotenv
VITE_API_URL=http://127.0.0.1:8010/api
```

El control utiliza siempre la API; el servidor sigue simulando el equipo. Para habilitar deliberadamente los perfiles de pruebas en este equipo, configura en `backend/.env`:

```dotenv
ENTORNO=desarrollo
AUTENTICACION_MODO=demo
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

La configuración de ejemplo bloquea el acceso por defecto. El lanzador avisa de ello, pero no debilita la autenticación ni cambia el archivo por su cuenta. Los archivos `.env.local`, `.env.development` y las variables de entorno pueden sobrescribir la configuración de Vite; compruébalos si persiste un aviso.

## MySQL en Windows

El arranque diario utiliza el servicio existente si lo hay. Sin servicio, intenta iniciar MySQL como usuario normal. Si los archivos de datos solo son accesibles al sistema o a administradores, solicita preparar un servicio de inicio automático una sola vez; no cambia sus permisos.

También puedes preparar el servicio expresamente, sin abrir antes una terminal como administrador:

```powershell
cd C:\app\nuevo_tunelviento_app
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\instalar-mysql-servicio.ps1
```

Windows solicita elevación únicamente para ese paso. El instalador reutiliza los datos y la configuración actuales; no crea una base de datos nueva. Registra `TunelabMySQL` con inicio automático, o reutiliza un servicio que apunte al mismo ejecutable y configuración. Si encuentra otra instalación o un proceso manual, se detiene sin interrumpirlo ni crear duplicados. MySQL recomienda este modo de ejecución en su [documentación oficial para Windows](https://dev.mysql.com/doc/refman/8.4/en/windows-start-service.html).

En el equipo de desarrollo, el 13/10/2026 se comprobó que `binlog.index` requería permisos de sistema, se instaló `TunelabMySQL` y se verificó su estado **Running / Automatic**. El arranque completo y su reutilización funcionan sin otra elevación de Windows.

El lanzador busca `TunelabMySQL`, `MySQL84`, `MySQL80` o `MySQL`, y detecta otros servicios de mysqld si no encuentra esos nombres. Ante varias alternativas no identificadas exige elegir una. Puedes pasar nombre o rutas explícitamente:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\iniciar-tunelab.ps1 -ServicioMySql MiServicioMySQL
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\iniciar-tunelab.ps1 -EjecutableMySql 'D:\MySQL\bin\mysqld.exe' -ConfiguracionMySql 'D:\MySQL\my.ini'
```

El host y el puerto de MySQL se leen de `DATABASE_URL`. No se intenta arrancar un servidor remoto. Los parámetros `-NoAbrirNavegador` y `-Diagnostico` permiten utilizar el mismo lanzador desde una terminal o en las comprobaciones.

## Alcance

Este arranque sigue siendo para desarrollo y demostración local: utiliza Vite. MySQL puede instalarse como servicio; API y web siguen siendo procesos locales sin supervisor que los reinicie tras una caída. La autenticación de prueba sigue limitada al propio equipo. El despliegue universitario y UACloud quedan para una fase posterior.

## Pruebas del arranque

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/arranque-local.Tests.ps1
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Las pruebas de base de datos utilizan SQLite en memoria y no alteran los ensayos reales.
