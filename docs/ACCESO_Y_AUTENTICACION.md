# Acceso de pruebas y autenticación

La API ya no acepta roles, nombres o correos enviados por el navegador como identidad acreditada. Tampoco crea un `usuario-local` cuando no recibe identificador.

**La autenticación real de UACloud/eServices sigue pendiente.** Hasta integrarla, la configuración de producción bloquea las rutas de usuarios, ensayos, mediciones, control y el WebSocket. No hay una contraseña predeterminada ni una clave secreta incluida en el frontend.

## Configuración segura por defecto

En `backend/.env`:

```dotenv
ENTORNO=produccion
AUTENTICACION_MODO=bloqueada
```

Estos son los valores predeterminados si se omiten las variables. `AUTENTICACION_MODO=demo` junto con `ENTORNO=produccion` impide arrancar, para detectar un despliegue mal configurado. Las rutas de salud siguen disponibles sin identidad.

## Trabajar con la demo en este equipo

Para usar expresamente los perfiles de prueba, configurar únicamente en el backend local:

```dotenv
ENTORNO=desarrollo
AUTENTICACION_MODO=demo
```

Reiniciar el backend después de cambiar las variables. Arrancarlo enlazado al equipo local:

```powershell
cd C:\app\nuevo_tunelviento_app\backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8010 --no-proxy-headers
```

El navegador debe usar un origen local incluido en `CORS_ORIGINS`, por ejemplo `http://localhost:5173`. Si se utiliza `http://127.0.0.1:5173`, añadir esa dirección a `CORS_ORIGINS`. No publicar ni situar esta demo detrás de un proxy. Las peticiones remotas, los orígenes ajenos y las cabeceras de reenvío se rechazan.

Los únicos perfiles admitidos son `alu_demo` (alumno) y `prof_demo` (profesor). Sus roles se definen en el servidor. **Cualquier persona que use deliberadamente esta demo local puede seleccionar cualquiera de los dos perfiles; no es un sistema de autenticación personal.** Si uno de esos usuarios ya existe desactivado o con un rol diferente, se rechaza el acceso y no se modifica silenciosamente la base de datos.

La pantalla de entrada valida el perfil en la API antes de abrir la aplicación y muestra un error si el servidor no está disponible o bloquea el acceso. Ya no permite entrar simplemente seleccionando una tarjeta sin consultar al servidor. El WebSocket identifica el perfil demo mediante `perfil_demo`; este parámetro no debe utilizarse para tokens o contraseñas en una futura integración.

## Qué falta para UACloud

Confirmar el mecanismo oficial de identidad de eServices y validar su sesión o credencial en el servidor. El identificador y los roles deben proceder de esa validación; no se debe habilitar la demo ni volver a confiar en las cabeceras del navegador para hacer funcionar producción. La integración deberá incluir expiración, cierre de sesión y acceso al WebSocket.

Este cambio impide nuevas altas arbitrarias y la suplantación mediante identificadores ajenos a los perfiles de desarrollo. No borra usuarios ni corrige permisos que pudieran haberse guardado anteriormente; revisar esos registros antes de una implantación real.

## Comprobaciones

Desde la carpeta `backend`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Las pruebas usan SQLite en memoria, sin conectar con MySQL. Cubren bloqueo por defecto, cabeceras y cuerpos falsificados, acceso remoto y por proxy, permisos de alumno/docente, pertenencia, usuarios desactivados, configuración incompatible y WebSocket permitido/rechazado. El script de auditoría original que demostraba el acceso inseguro describe el comportamiento anterior; las pruebas de regresión actuales están en `backend/tests/test_autenticacion.py`.

Verificación del 9 de septiembre de 2026: 12 pruebas de regresión superadas, compilación de producción correcta y ESLint sin errores en los tres archivos JavaScript modificados para este cambio. En el navegador, con una API aislada y SQLite en memoria, se comprobó el bloqueo de entrada en producción, el acceso del alumno sin opción docente y el acceso del profesor a su panel. La compilación conserva el aviso previo de tamaño del módulo del visor 3D.
